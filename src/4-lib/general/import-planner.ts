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
import { PlannerExportSchema, type PlannerGoalSchema } from "./schemas.ts";

type PlannerGoal = z.infer<typeof PlannerGoalSchema>;

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

export interface ImportResult {
	goals: ImportedGoal[];
	skipped: string[];
}

/**
 * Parse a tacticusplanner export JSON and convert goals to our format.
 */
export function parsePlannerExport(raw: string): ImportResult {
	let jsonParsed: unknown;
	try {
		jsonParsed = JSON.parse(raw);
	} catch {
		return { goals: [], skipped: ["Invalid export JSON"] };
	}
	const result = PlannerExportSchema.safeParse(jsonParsed);
	if (!result.success) {
		return { goals: [], skipped: ["Invalid export JSON"] };
	}
	const parsed = result.data;
	const goals: ImportedGoal[] = [];
	const skipped: string[] = [];

	if (!parsed.goals) {
		return { goals, skipped };
	}

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

	return { goals, skipped };
}

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
