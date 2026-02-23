/**
 * Upgrade recipe database — thin wrappers over the validated recipes pipeline.
 *
 * Provides:
 * - Material lookup by snowprintId (sync)
 * - Recipe expansion (craftable → base materials) (sync)
 * - Character rank-up material requirements
 */

import { CHARACTER_RANK_UP_MATERIALS } from "@/5-assets/character-rank-up-materials/index.ts";
import type { CHARACTERS, CharacterId } from "@/5-assets/characters/index.ts";
import {
	EXPANDED_RECIPES,
	PROCESSED_MATERIALS,
} from "@/5-assets/recipes/index.ts";
import type { Rank, Rarity } from "./constants.ts";
import { rankToString } from "./rank-data.ts";

// ---------------------------------------------------------------------------
// Public API — sync lookups into generated pipeline data
// ---------------------------------------------------------------------------

/**
 * Get all processed materials as a Map indexed by snowprintId.
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
			const mat = PROCESSED_MATERIALS[upgradeId];
			if (!mat) continue;

			if (mat.crafted) {
				// Get expanded recipe and apply inventory
				const expanded = EXPANDED_RECIPES[upgradeId] as
					| Record<string, number>
					| undefined;
				if (expanded) {
					// Check if we have the crafted material in inventory
					const owned = inventoryCopy[upgradeId] ?? 0;
					if (owned > 0) {
						inventoryCopy[upgradeId] = owned - 1;
						continue;
					}
					for (const [baseId, count] of Object.entries(expanded)) {
						const baseMat = PROCESSED_MATERIALS[baseId];
						if (
							upgradesRarity.length > 0 &&
							baseMat &&
							!upgradesRarity.includes(baseMat.rarity as Rarity)
						) {
							continue;
						}

						// Subtract inventory
						const ownedBase = inventoryCopy[baseId] ?? 0;
						const needed = count;
						if (ownedBase >= needed) {
							inventoryCopy[baseId] = ownedBase - needed;
						} else {
							const remaining = needed - ownedBase;
							inventoryCopy[baseId] = 0;
							baseUpgradesTotal[baseId] =
								(baseUpgradesTotal[baseId] ?? 0) + remaining;
						}
					}
				}
			} else {
				// Base material
				if (
					upgradesRarity.length > 0 &&
					!upgradesRarity.includes(mat.rarity as Rarity)
				) {
					continue;
				}

				const owned = inventoryCopy[upgradeId] ?? 0;
				if (owned > 0) {
					inventoryCopy[upgradeId] = owned - 1;
				} else {
					baseUpgradesTotal[upgradeId] =
						(baseUpgradesTotal[upgradeId] ?? 0) + 1;
				}
			}
		}
	}

	return baseUpgradesTotal;
}
