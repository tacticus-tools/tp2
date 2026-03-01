import type z from "zod";
import {
	CampaignsLocationsUsage,
	NUMERIC_TO_CAMPAIGNS_USAGE,
} from "#common/campaigns-locations-usage.ts";
import {
	type GoalType,
	NUMERIC_TO_GOAL_TYPE,
	PersonalGoalType,
} from "#common/goal-type.ts";
import { RARITIES, type Rarity } from "#common/rarity.ts";
import { unitById } from "@/5-assets/game-units/index.ts";
import {
	type LreProgressData,
	REQUIREMENT_STATUS,
	type RequirementStatus,
	type TrackId,
} from "./lre/lre-types.ts";
import { PlannerExportSchema, type PlannerGoalSchema } from "./schemas.ts";

type PlannerGoal = z.infer<typeof PlannerGoalSchema>;

const VALID_TRACK_IDS = new Set<TrackId>(["alpha", "beta", "gamma"]);

function isTrackId(value: string): value is TrackId {
	return VALID_TRACK_IDS.has(value as TrackId);
}

const VALID_REQUIREMENT_STATUSES = new Set<number>(
	Object.values(REQUIREMENT_STATUS),
);

function toRequirementStatus(value: number): RequirementStatus {
	return VALID_REQUIREMENT_STATUSES.has(value)
		? (value as RequirementStatus)
		: REQUIREMENT_STATUS.NotCleared;
}

/** Convert a numeric rarity index to its string equivalent */
function toRarity(numericRarity: number | undefined): Rarity | undefined {
	if (numericRarity == null) return undefined;
	return RARITIES[numericRarity];
}

/** Convert a numeric rarity array to string equivalents */
function toRarityArray(arr: number[] | undefined): Rarity[] | undefined {
	if (!arr || arr.length === 0) return undefined;
	return arr
		.map((n) => RARITIES[n])
		.filter((r): r is Rarity => r !== undefined);
}

export interface ImportedGoal {
	goalId: string;
	type: string;
	unitId: string;
	unitName: string;
	priority: number;
	include: boolean;
	notes?: string;
	data: string;
}

export interface ImportedLreTeam {
	eventId: number;
	trackId: string;
	name: string;
	characterIds: string[];
	restrictionIds?: string[];
	expectedBattleClears?: number;
	notes?: string;
}

export interface ImportResult {
	goals: ImportedGoal[];
	skipped: string[];
	campaignProgress: Record<string, number> | null;
	rosterSnapshots: string | null;
	lreProgress: { eventId: number; data: string }[] | null;
	lreTeams: ImportedLreTeam[] | null;
}

/**
 * Parse a tacticusplanner export JSON and convert all sections to our format.
 */
export function parsePlannerExport(raw: string): ImportResult {
	const empty: ImportResult = {
		goals: [],
		skipped: [],
		campaignProgress: null,
		rosterSnapshots: null,
		lreProgress: null,
		lreTeams: null,
	};

	let jsonParsed: unknown;
	try {
		jsonParsed = JSON.parse(raw);
	} catch {
		return { ...empty, skipped: ["Invalid export JSON"] };
	}
	const result = PlannerExportSchema.safeParse(jsonParsed);
	if (!result.success) {
		return { ...empty, skipped: ["Invalid export JSON"] };
	}
	const parsed = result.data;

	// ─── Goals ──────────────────────────────────────────────────────
	const goals: ImportedGoal[] = [];
	const skipped: string[] = [];

	if (parsed.goals) {
		for (const pg of parsed.goals) {
			const unit = unitById[pg.character];
			if (!unit) {
				skipped.push(pg.character);
				continue;
			}

			const converted = convertGoal(pg, unit.name);
			if (converted) {
				goals.push(converted);
			} else {
				skipped.push(`${unit.name} (unsupported type ${pg.type})`);
			}
		}

		// Re-assign sequential priorities
		goals.sort((a, b) => a.priority - b.priority);
		for (let i = 0; i < goals.length; i++) {
			goals[i].priority = i + 1;
		}
	}

	// ─── Campaign Progress ──────────────────────────────────────────
	const campaignProgress =
		parsed.campaignsProgress && Object.keys(parsed.campaignsProgress).length > 0
			? parsed.campaignsProgress
			: null;

	// ─── Roster Snapshots ───────────────────────────────────────────
	const rosterSnapshots = convertRosterSnapshots(parsed.rosterSnapshots);

	// ─── LRE Progress ───────────────────────────────────────────────
	const lreProgress = convertLreProgress(parsed.leProgress);

	// ─── LRE Teams ──────────────────────────────────────────────────
	const lreTeams = convertLreTeams(parsed.leTeams);

	return {
		goals,
		skipped,
		campaignProgress,
		rosterSnapshots,
		lreProgress,
		lreTeams,
	};
}

// ─── Roster Snapshots Transform ─────────────────────────────────────

type PlannerExport = z.infer<typeof PlannerExportSchema>;

function convertRosterSnapshots(
	data: PlannerExport["rosterSnapshots"],
): string | null {
	if (!data?.base) return null;

	const base = data.base;
	const units: Record<
		string,
		{
			rank: number;
			rarity: Rarity;
			stars: number;
			abilities: [number, number];
			shards: number;
			mythicShards: number;
			level: number;
			xp: number;
		}
	> = {};

	for (const char of base.chars) {
		const rarity = toRarity(char.rarity);
		if (!rarity) continue;

		units[char.id] = {
			rank: char.rank,
			rarity,
			stars: char.stars,
			abilities: [char.activeAbilityLevel, char.passiveAbilityLevel],
			shards: char.shards,
			mythicShards: char.mythicShards,
			level: char.xpLevel,
			xp: 0,
		};
	}

	return JSON.stringify({
		snapshots: [
			{
				name: base.name,
				createdAt: base.dateMillisUtc,
				units,
			},
		],
		deletedSnapshots: [],
	});
}

// ─── LRE Progress Transform ────────────────────────────────────────

function convertLreProgress(
	data: PlannerExport["leProgress"],
): { eventId: number; data: string }[] | null {
	if (!data) return null;

	const entries = Object.values(data);
	if (entries.length === 0) return null;

	const results: { eventId: number; data: string }[] = [];

	for (const entry of entries) {
		// Group battles by trackId
		const trackMap: Record<
			string,
			{
				battleIndex: number;
				requirements: { id: string; status: RequirementStatus }[];
			}[]
		> = {};

		for (const battle of entry.battlesProgress) {
			if (!trackMap[battle.trackId]) {
				trackMap[battle.trackId] = [];
			}
			trackMap[battle.trackId].push({
				battleIndex: battle.battleIndex,
				requirements: battle.requirements.map((req) => ({
					id: req.id,
					// Old format uses "state", new uses "status" — same numeric values
					status: toRequirementStatus(req.status ?? req.state ?? 0),
				})),
			});
		}

		const progressData: LreProgressData = {
			tracksProgress: Object.entries(trackMap)
				.filter(([trackId]) => isTrackId(trackId))
				.map(([trackId, battles]) => ({
					trackId: trackId as TrackId,
					battles,
				})),
			occurrenceProgress: [],
			notes: entry.notes ?? "",
		};

		results.push({
			eventId: entry.id,
			data: JSON.stringify(progressData),
		});
	}

	return results.length > 0 ? results : null;
}

// ─── LRE Teams Transform ───────────────────────────────────────────

function convertLreTeams(
	data: PlannerExport["leTeams"],
): ImportedLreTeam[] | null {
	if (!data) return null;

	const teams: ImportedLreTeam[] = [];

	for (const entry of Object.values(data)) {
		if (!entry.teams || entry.teams.length === 0) continue;

		for (const team of entry.teams) {
			teams.push({
				eventId: entry.id,
				trackId: team.section,
				name: team.name,
				characterIds: team.charSnowprintIds,
				restrictionIds:
					team.restrictionsIds && team.restrictionsIds.length > 0
						? team.restrictionsIds
						: undefined,
				expectedBattleClears: team.expectedBattleClears,
				notes: team.notes?.trim() || undefined,
			});
		}
	}

	return teams.length > 0 ? teams : null;
}

// ─── Goal Conversion ────────────────────────────────────────────────

/** Convert a numeric planner goal type to our string GoalType */
function toGoalType(numericType: number): GoalType | undefined {
	return NUMERIC_TO_GOAL_TYPE[numericType];
}

function convertGoal(pg: PlannerGoal, unitName: string): ImportedGoal | null {
	const goalType = toGoalType(pg.type);
	if (!goalType) return null;

	const base = {
		goalId: pg.id,
		unitId: pg.character,
		unitName,
		priority: pg.priority,
		include: pg.dailyRaids,
		notes: pg.notes?.trim() || undefined,
	};

	switch (goalType) {
		case PersonalGoalType.UpgradeRank: {
			const rankStart = pg.currentRank ?? pg.startingRank ?? 1;
			const rankEnd = pg.targetRank ?? rankStart;
			return {
				...base,
				type: goalType,
				data: JSON.stringify({
					type: goalType,
					rankStart,
					rankEnd,
					upgradesRarity: toRarityArray(pg.upgradesRarity),
				}),
			};
		}

		case PersonalGoalType.Ascend: {
			return {
				...base,
				type: goalType,
				data: JSON.stringify({
					type: goalType,
					rarityEnd: toRarity(pg.targetRarity),
					starsEnd: pg.targetStars,
					onslaughtShards: pg.shardsPerToken ?? 0,
					onslaughtMythicShards: pg.mythicShardsPerToken ?? 0,
					campaignsUsage: CampaignsLocationsUsage.LeastEnergy,
				}),
			};
		}

		case PersonalGoalType.Unlock: {
			const campaignsUsage =
				pg.campaignsUsage != null
					? (NUMERIC_TO_CAMPAIGNS_USAGE[pg.campaignsUsage] ??
						CampaignsLocationsUsage.LeastEnergy)
					: CampaignsLocationsUsage.LeastEnergy;
			return {
				...base,
				type: goalType,
				data: JSON.stringify({
					type: goalType,
					campaignsUsage,
				}),
			};
		}

		case PersonalGoalType.MowAbilities: {
			return {
				...base,
				type: goalType,
				data: JSON.stringify({
					type: goalType,
					primaryStart: pg.primaryStart ?? 0,
					primaryEnd: pg.primaryEnd ?? 1,
					secondaryStart: pg.secondaryStart ?? 0,
					secondaryEnd: pg.secondaryEnd ?? 1,
					upgradesRarity: toRarityArray(pg.upgradesRarity),
				}),
			};
		}

		case PersonalGoalType.CharacterAbilities: {
			return {
				...base,
				type: goalType,
				data: JSON.stringify({
					type: goalType,
					activeStart: 0,
					activeEnd: pg.firstAbilityLevel ?? 1,
					passiveStart: 0,
					passiveEnd: pg.secondAbilityLevel ?? 1,
				}),
			};
		}

		default:
			return null;
	}
}
