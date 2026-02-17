/**
 * Upgrade recipe database — wraps the static JSON data from tacticusplanner.
 *
 * Provides:
 * - Material lookup by snowprintId
 * - Recipe expansion (craftable → base materials)
 * - Character rank-up material requirements
 * - Farming location indexing
 */

import type { Rank, Rarity } from "./enums";
import { rankToString } from "./rank-data";
import { rarityStringToNumber } from "./rarity-data";

// ---------------------------------------------------------------------------
// Raw JSON types (matching the shape of the imported data files)
// ---------------------------------------------------------------------------

export interface IRawMaterial {
	material: string;
	snowprintId: string;
	label?: string;
	rarity: string;
	stat: string;
	icon?: string;
	craftable: boolean;
	faction?: string;
	recipe?: IRawRecipeIngredient[];
}

export interface IRawRecipeIngredient {
	material: string; // snowprintId of ingredient
	count: number;
}

/** rankUpData shape: characterSnowprintId → { "Stone I": [...materialIds], ... } */
export type IRankUpData = Record<string, Record<string, string[]>>;

// ---------------------------------------------------------------------------
// Processed types
// ---------------------------------------------------------------------------

export interface IBaseMaterial {
	id: string; // snowprintId
	label: string;
	rarity: Rarity;
	stat: string;
	icon?: string;
	crafted: false;
}

export interface ICraftedMaterial {
	id: string; // snowprintId
	label: string;
	rarity: Rarity;
	stat: string;
	icon?: string;
	crafted: true;
	recipe: Array<{ id: string; count: number }>;
}

export type IProcessedMaterial = IBaseMaterial | ICraftedMaterial;

/** Expanded recipe: maps base material snowprintId → count needed */
export type IExpandedRecipe = Record<string, number>;

// ---------------------------------------------------------------------------
// Lazy-initialized singleton data
// ---------------------------------------------------------------------------

let _recipeData: Record<string, IRawMaterial> | undefined;
let _rankUpData: IRankUpData | undefined;
let _materialsById: Map<string, IProcessedMaterial> | undefined;
let _expandedRecipes: Map<string, IExpandedRecipe> | undefined;

async function loadRecipeData(): Promise<Record<string, IRawMaterial>> {
	if (!_recipeData) {
		const mod = await import("./data/recipeData.json");
		_recipeData = mod.default as unknown as Record<string, IRawMaterial>;
	}
	return _recipeData;
}

async function loadRankUpData(): Promise<IRankUpData> {
	if (!_rankUpData) {
		const mod = await import("./data/rankUpData.json");
		_rankUpData = mod.default as unknown as IRankUpData;
	}
	return _rankUpData;
}

// ---------------------------------------------------------------------------
// Material processing
// ---------------------------------------------------------------------------

function extractIconFilename(iconPath?: string): string | undefined {
	if (!iconPath) return undefined;
	const lastSlash = iconPath.lastIndexOf("/");
	return lastSlash >= 0 ? iconPath.slice(lastSlash + 1) : iconPath;
}

function processRawMaterial(raw: IRawMaterial): IProcessedMaterial {
	const rarity =
		rarityStringToNumber[raw.rarity as keyof typeof rarityStringToNumber] ?? 0;
	const icon = extractIconFilename(raw.icon);

	if (!raw.craftable) {
		return {
			id: raw.snowprintId,
			label: raw.label ?? raw.material,
			rarity,
			stat: raw.stat,
			icon,
			crafted: false,
		};
	}

	return {
		id: raw.snowprintId,
		label: raw.label ?? raw.material,
		rarity,
		stat: raw.stat,
		icon,
		crafted: true,
		recipe: raw.recipe?.map((r) => ({ id: r.material, count: r.count })) ?? [],
	};
}

/**
 * Build the processed materials map from raw recipe data.
 */
async function getMaterialsById(): Promise<Map<string, IProcessedMaterial>> {
	if (_materialsById) return _materialsById;

	const raw = await loadRecipeData();
	_materialsById = new Map<string, IProcessedMaterial>();

	for (const [key, value] of Object.entries(raw)) {
		const processed = processRawMaterial(value);
		_materialsById.set(key, processed);
	}

	return _materialsById;
}

// ---------------------------------------------------------------------------
// Recipe expansion — BFS to resolve craftable → base materials
// ---------------------------------------------------------------------------

async function getExpandedRecipes(): Promise<Map<string, IExpandedRecipe>> {
	if (_expandedRecipes) return _expandedRecipes;

	const materials = await getMaterialsById();
	_expandedRecipes = new Map<string, IExpandedRecipe>();

	// First pass: base (non-craftable) materials have empty expanded recipes
	for (const [id, mat] of materials) {
		if (!mat.crafted) {
			_expandedRecipes.set(id, {});
		}
	}

	// BFS expansion for craftable materials
	let moreToExpand = true;
	let passes = 0;
	while (moreToExpand && passes < 15) {
		moreToExpand = false;
		passes++;

		for (const [id, mat] of materials) {
			if (!mat.crafted || _expandedRecipes.has(id)) continue;

			// Try to expand this recipe
			const expanded: IExpandedRecipe = {};
			let canExpand = true;

			for (const ingredient of mat.recipe) {
				const subExpanded = _expandedRecipes.get(ingredient.id);
				if (subExpanded === undefined) {
					// This ingredient hasn't been expanded yet
					canExpand = false;
					break;
				}

				const subMat = materials.get(ingredient.id);
				if (!subMat?.crafted) {
					// Base material — add directly
					expanded[ingredient.id] =
						(expanded[ingredient.id] ?? 0) + ingredient.count;
				} else {
					// Crafted ingredient — expand its sub-recipe
					for (const [subId, subCount] of Object.entries(subExpanded)) {
						expanded[subId] =
							(expanded[subId] ?? 0) + ingredient.count * subCount;
					}
				}
			}

			if (canExpand) {
				_expandedRecipes.set(id, expanded);
			} else {
				moreToExpand = true;
			}
		}
	}

	return _expandedRecipes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all materials indexed by snowprintId.
 */
export async function getAllMaterials(): Promise<
	Map<string, IProcessedMaterial>
> {
	return getMaterialsById();
}

/**
 * Get a single material by snowprintId.
 */
export async function getMaterial(
	id: string,
): Promise<IProcessedMaterial | undefined> {
	const materials = await getMaterialsById();
	return materials.get(id);
}

/**
 * Get the expanded (base-only) recipe for a material.
 * Returns a map of base material snowprintId → count.
 * For non-craftable materials, returns an empty record.
 */
export async function getExpandedRecipe(
	materialId: string,
): Promise<IExpandedRecipe> {
	const recipes = await getExpandedRecipes();
	return recipes.get(materialId) ?? {};
}

/**
 * Get the upgrade materials needed for a character at a specific rank.
 * Returns an array of 6 material snowprintIds (the slots for that rank).
 */
export async function getRankUpgrades(
	unitId: string,
	rankString: string,
): Promise<string[]> {
	const data = await loadRankUpData();
	return data[unitId]?.[rankString] ?? [];
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
 */
export async function getBaseUpgradesForRankUp(
	unitId: string,
	rankStart: number,
	rankEnd: number,
	appliedUpgrades: string[] = [],
	upgradesRarity: Rarity[] = [],
	inventory: Record<string, number> = {},
): Promise<Record<string, number>> {
	const data = await loadRankUpData();
	const materials = await getMaterialsById();
	const recipes = await getExpandedRecipes();
	const characterData = data[unitId] ?? {};

	const baseUpgradesTotal: Record<string, number> = {};
	const inventoryCopy = { ...inventory };

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
			const mat = materials.get(upgradeId);
			if (!mat) continue;

			if (mat.crafted) {
				// Get expanded recipe and apply inventory
				const expanded = recipes.get(upgradeId);
				if (expanded) {
					// Check if we have the crafted material in inventory
					const owned = inventoryCopy[upgradeId] ?? 0;
					if (owned > 0) {
						inventoryCopy[upgradeId] = owned - 1;
						continue;
					}
					for (const [baseId, count] of Object.entries(expanded)) {
						const baseMat = materials.get(baseId);
						if (
							upgradesRarity.length > 0 &&
							baseMat &&
							!upgradesRarity.includes(baseMat.rarity)
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
				if (upgradesRarity.length > 0 && !upgradesRarity.includes(mat.rarity)) {
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
