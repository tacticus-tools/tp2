/**
 * Upgrade recipe database — thin wrappers over the validated recipes pipeline.
 *
 * Provides:
 * - Material lookup by snowprintId (sync)
 * - Recipe expansion (craftable → base materials) (sync)
 * - Character rank-up material requirements
 */

import type { Rarity } from "#common/rarity.ts";
import { CHARACTER_RANK_UP_MATERIALS } from "@/5-assets/character-rank-up-materials/index.ts";
import type { CHARACTERS, CharacterId } from "@/5-assets/characters/index.ts";
import {
	EXPANDED_RECIPES,
	PROCESSED_MATERIALS,
} from "@/5-assets/recipes/index.ts";
import type { Rank } from "./constants.ts";
import { rankToString } from "./rank-data.ts";

// ---------------------------------------------------------------------------
// Public API — sync lookups into generated pipeline data
// ---------------------------------------------------------------------------

/**
 * Get all processed materials as a record indexed by snowprintId.
 */
export function getAllMaterials() {
	return PROCESSED_MATERIALS;
}

/**
 * Get a single processed material by snowprintId.
 */
export function getMaterial(id: string) {
	return PROCESSED_MATERIALS[id];
}

/**
 * Get the expanded (base-only) recipe for a material.
 * Returns a record of base material snowprintId → count.
 * For non-craftable materials, returns an empty record.
 */
export function getExpandedRecipe(materialId: string): Record<string, number> {
	return (
		(EXPANDED_RECIPES[materialId] as Record<string, number> | undefined) ?? {}
	);
}

/**
 * Get the upgrade materials needed for a character at a specific rank.
 * Returns an array of material snowprintIds (the slots for that rank).
 */
export function getRankUpgrades(
	unitId: (typeof CHARACTERS)[number]["id"],
	rankString: string,
) {
	const rankUpData = CHARACTER_RANK_UP_MATERIALS;
	return rankUpData[unitId]?.[rankString] ?? [];
}

/**
 * Recursively consume a material from inventory or expand its recipe.
 * Checks inventory at every level of the crafting tree before expanding further.
 */
function consumeOrExpand(
	materialId: string,
	count: number,
	inventoryCopy: Record<string, number>,
	upgradesRarity: Rarity[],
	baseUpgradesTotal: Record<string, number>,
): void {
	// 1. Try to consume from inventory
	const owned = inventoryCopy[materialId] ?? 0;
	if (owned >= count) {
		inventoryCopy[materialId] = owned - count;
		return;
	}
	let remaining = count;
	if (owned > 0) {
		remaining -= owned;
		inventoryCopy[materialId] = 0;
	}

	// 2. If crafted, walk the recipe tree
	const mat = PROCESSED_MATERIALS[materialId];
	if (mat?.crafted && mat.recipe) {
		for (const ingredient of mat.recipe) {
			consumeOrExpand(
				ingredient.id,
				ingredient.count * remaining,
				inventoryCopy,
				upgradesRarity,
				baseUpgradesTotal,
			);
		}
		return;
	}

	// 3. Base material — add to farming needs (apply rarity filter)
	if (
		upgradesRarity.length > 0 &&
		mat &&
		!upgradesRarity.includes(mat.rarity)
	) {
		return;
	}
	baseUpgradesTotal[materialId] =
		(baseUpgradesTotal[materialId] ?? 0) + remaining;
}

/**
 * Get all base materials needed for a character's rank-up from rankStart to rankEnd.
 * Expands craftable materials into base materials and sums across all rank transitions.
 *
 * @param unitId Character snowprintId
 * @param rankStart Starting rank (enum value)
 * @param rankEnd Ending rank (enum value)
 * @param appliedUpgrades Material IDs already applied at the current rank
 * @param upgradesRarity If non-empty, only include materials of these rarities
 * @param inventory If provided, subtract owned counts from requirements
 * @param mutateInventory When true, mutate `inventory` in place (no copy). Use when passing a shared inventory across sequential goals.
 */
export function getBaseUpgradesForRankUp(
	unitId: CharacterId,
	rankStart: number,
	rankEnd: number,
	appliedUpgrades: string[] = [],
	upgradesRarity: Rarity[] = [],
	inventory: Record<string, number> = {},
	mutateInventory = false,
): Record<string, number> {
	const rankUpData = CHARACTER_RANK_UP_MATERIALS;
	const characterData = rankUpData[unitId] ?? {};

	const baseUpgradesTotal: Record<string, number> = {};
	const inventoryCopy = mutateInventory ? inventory : { ...inventory };

	// Process each rank transition
	let isFirstRank = true;
	for (let rank = rankStart; rank < rankEnd; rank++) {
		const rankStr = rankToString[rank as Rank];
		if (!rankStr) continue;

		let upgrades = characterData[rankStr] ?? [];

		// For the first rank, filter out already-applied upgrades
		if (isFirstRank && appliedUpgrades.length > 0) {
			upgrades = upgrades.filter((u) => !appliedUpgrades.includes(u));
			isFirstRank = false;
		} else {
			isFirstRank = false;
		}

		for (const upgradeId of upgrades) {
			if (!PROCESSED_MATERIALS[upgradeId]) continue;
			consumeOrExpand(
				upgradeId,
				1,
				inventoryCopy,
				upgradesRarity,
				baseUpgradesTotal,
			);
		}
	}

	return baseUpgradesTotal;
}
