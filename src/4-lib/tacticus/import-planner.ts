import { PersonalGoalType } from "./enums";
import { unitById } from "./unit-data";

/**
 * Shape of a goal in a tacticusplanner export JSON.
 */
interface PlannerGoal {
	id: string;
	type: number;
	priority: number;
	dailyRaids: boolean;
	character: string;
	notes?: string;

	// UpgradeRank (type 1)
	startingRank?: number;
	targetRank?: number;
	currentRank?: number;

	// Ascend (type 2)
	targetRarity?: number;
	targetStars?: number;

	// Unlock (type 3)
	campaignsUsage?: number;

	// CharacterAbilities (type 5)
	firstAbilityLevel?: number;
	secondAbilityLevel?: number;

	// MoW (type 4)
	primaryStart?: number;
	primaryEnd?: number;
	secondaryStart?: number;
	secondaryEnd?: number;

	// Material rarity filter (UpgradeRank & MoW)
	upgradesRarity?: number[];
}

interface PlannerExport {
	schemaVersion?: number;
	goals?: PlannerGoal[];
}

export interface ImportedGoal {
	goalId: string;
	type: number;
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
	let parsed: PlannerExport;
	try {
		parsed = JSON.parse(raw) as PlannerExport;
	} catch {
		return { goals: [], skipped: ["Invalid export JSON"] };
	}
	const goals: ImportedGoal[] = [];
	const skipped: string[] = [];

	if (!parsed.goals || !Array.isArray(parsed.goals)) {
		return { goals, skipped };
	}

	for (const pg of parsed.goals) {
		const unit = unitById.get(pg.character);
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

function convertGoal(pg: PlannerGoal, unitName: string): ImportedGoal | null {
	const base = {
		goalId: pg.id,
		unitId: pg.character,
		unitName,
		priority: pg.priority,
		include: pg.dailyRaids,
		notes: pg.notes?.trim() || undefined,
	};

	switch (pg.type) {
		case PersonalGoalType.UpgradeRank: {
			const rankStart = pg.currentRank ?? pg.startingRank ?? 1;
			const rankEnd = pg.targetRank ?? rankStart;
			return {
				...base,
				type: pg.type,
				data: JSON.stringify({
					type: pg.type,
					rankStart,
					rankEnd,
					upgradesRarity:
						pg.upgradesRarity && pg.upgradesRarity.length > 0
							? pg.upgradesRarity
							: undefined,
				}),
			};
		}

		case PersonalGoalType.Ascend: {
			return {
				...base,
				type: pg.type,
				data: JSON.stringify({
					type: pg.type,
				}),
			};
		}

		case PersonalGoalType.Unlock: {
			return {
				...base,
				type: pg.type,
				data: JSON.stringify({
					type: pg.type,
					campaignsUsage: pg.campaignsUsage ?? 2,
				}),
			};
		}

		case PersonalGoalType.MowAbilities: {
			return {
				...base,
				type: pg.type,
				data: JSON.stringify({
					type: pg.type,
					primaryStart: pg.primaryStart ?? 0,
					primaryEnd: pg.primaryEnd ?? 1,
					secondaryStart: pg.secondaryStart ?? 0,
					secondaryEnd: pg.secondaryEnd ?? 1,
					upgradesRarity:
						pg.upgradesRarity && pg.upgradesRarity.length > 0
							? pg.upgradesRarity
							: undefined,
				}),
			};
		}

		case PersonalGoalType.CharacterAbilities: {
			return {
				...base,
				type: pg.type,
				data: JSON.stringify({
					type: pg.type,
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
