import { ALLIANCES, type Alliance } from "#common/alliance.ts";
import { RARITIES, type Rarity } from "#common/rarity.ts";
import type { TacticusInventory } from "~/tacticus/types.ts";
import type { IGoalEstimate } from "./goals/types.ts";

/** Per-rarity coverage info for a single badge category within a goal */
export interface IRarityCoverage {
	needed: number;
	covered: number;
}

/** XP book coverage for a single goal */
export interface IXpBookCoverage {
	legendaryCoverage: IRarityCoverage;
	mythicCoverage: IRarityCoverage;
}

/** Badge coverage for a single goal, split by category */
export interface IBadgeCoverage {
	abilityCoverage?: Record<Rarity, IRarityCoverage>;
	mowCoverage?: Record<Rarity, IRarityCoverage>;
	forgeCoverage?: Record<Rarity, IRarityCoverage>;
}

/** Mutable badge pools used during allocation */
interface BadgeInventoryPools {
	ability: Record<Alliance, Record<Rarity, number>>;
	forge: Record<Rarity, number>;
}

function emptyRarityPool(): Record<Rarity, number> {
	return {
		Common: 0,
		Uncommon: 0,
		Rare: 0,
		Epic: 0,
		Legendary: 0,
		Mythic: 0,
	} as const;
}

/**
 * Convert the API inventory into numeric badge pools.
 */
export function buildBadgeInventory(inventory: TacticusInventory) {
	const ability = {
		Imperial: emptyRarityPool(),
		Xenos: emptyRarityPool(),
		Chaos: emptyRarityPool(),
	};

	for (const alliance of ALLIANCES) {
		const badges = inventory.abilityBadges[alliance];
		if (!badges) continue;
		for (const badge of badges) {
			ability[alliance][badge.rarity] += badge.amount;
		}
	}

	const forge = emptyRarityPool();
	for (const badge of inventory.forgeBadges) {
		forge[badge.rarity] += badge.amount;
	}

	return { ability, forge };
}

/**
 * Allocate badge inventory to goals in priority order.
 * Higher-priority goals (lower index in sortedGoalIds) consume badges first.
 * Returns a Map from goalId → IBadgeCoverage.
 */
export function allocateBadgesToGoals(
	sortedGoalIds: string[],
	estimates: Map<string, IGoalEstimate>,
	pools: BadgeInventoryPools,
): Map<string, IBadgeCoverage> {
	// Deep-clone pools so allocation is non-destructive to the caller
	const abilityPool: Record<Alliance, Record<Rarity, number>> = {
		Imperial: { ...pools.ability.Imperial },
		Xenos: { ...pools.ability.Xenos },
		Chaos: { ...pools.ability.Chaos },
	};
	const forgePool: Record<Rarity, number> = { ...pools.forge };

	const result = new Map<string, IBadgeCoverage>();

	for (const goalId of sortedGoalIds) {
		const est = estimates.get(goalId);
		if (!est) continue;

		const coverage: IBadgeCoverage = {};

		// Character ability badges (alliance-specific)
		if (est.abilitiesEstimate) {
			const { alliance, badges } = est.abilitiesEstimate;
			const pool = abilityPool[alliance];
			const cov = {} as Record<Rarity, IRarityCoverage>;

			for (const r of RARITIES) {
				const needed = badges[r];
				if (needed <= 0) {
					cov[r] = { needed: 0, covered: 0 };
					continue;
				}
				const available = pool[r];
				const covered = Math.min(needed, available);
				pool[r] -= covered;
				cov[r] = { needed, covered };
			}

			coverage.abilityCoverage = cov;
		}

		// MoW badges (not alliance-specific — mowEstimate.badges uses a generic pool)
		// MoW badges are the same as ability badges per alliance, but mowEstimate
		// doesn't have an alliance field. MoW badges come from the same alliance pool
		// but since mowEstimate.badges doesn't specify alliance, we skip allocation
		// for them (they can't be matched to a pool).
		// Only forge badges (which are alliance-independent) are allocated.
		if (est.mowEstimate) {
			const { forgeBadges } = est.mowEstimate;
			const forgeCov = {} as Record<Rarity, IRarityCoverage>;

			for (const r of RARITIES) {
				const needed = forgeBadges[r];
				if (needed <= 0) {
					forgeCov[r] = { needed: 0, covered: 0 };
					continue;
				}
				const available = forgePool[r];
				const covered = Math.min(needed, available);
				forgePool[r] -= covered;
				forgeCov[r] = { needed, covered };
			}

			coverage.forgeCoverage = forgeCov;
		}

		result.set(goalId, coverage);
	}

	return result;
}

/** Mutable XP book pools used during allocation */
export interface XpBookInventoryPools {
	legendary: number;
	mythic: number;
}

/**
 * Convert the API inventory into numeric XP book pools.
 */
export function buildXpBookInventory(
	inventory: TacticusInventory,
): XpBookInventoryPools {
	let legendary = 0;
	let mythic = 0;

	for (const book of inventory.xpBooks) {
		if (book.rarity === "Legendary") {
			legendary += book.amount;
		} else if (book.rarity === "Mythic") {
			mythic += book.amount;
		}
	}

	return { legendary, mythic };
}

/**
 * Allocate XP book inventory to goals in priority order.
 * Higher-priority goals (lower index in sortedGoalIds) consume books first.
 * Returns a Map from goalId → IXpBookCoverage.
 */
export function allocateXpBooksToGoals(
	sortedGoalIds: string[],
	estimates: Map<string, IGoalEstimate>,
	pools: XpBookInventoryPools,
): Map<string, IXpBookCoverage> {
	let legendaryPool = pools.legendary;
	let mythicPool = pools.mythic;

	const result = new Map<string, IXpBookCoverage>();

	for (const goalId of sortedGoalIds) {
		const est = estimates.get(goalId);
		if (!est) continue;

		const legendaryNeeded = est.xpBooksTotal;
		const mythicNeeded = est.xpMythicBooksTotal ?? 0;

		if (legendaryNeeded <= 0 && mythicNeeded <= 0) continue;

		const legendaryCovered = Math.min(legendaryNeeded, legendaryPool);
		legendaryPool -= legendaryCovered;

		const mythicCovered = Math.min(mythicNeeded, mythicPool);
		mythicPool -= mythicCovered;

		result.set(goalId, {
			legendaryCoverage: { needed: legendaryNeeded, covered: legendaryCovered },
			mythicCoverage: { needed: mythicNeeded, covered: mythicCovered },
		});
	}

	return result;
}
