/**
 * @description Build-time pipeline: Expanded recipes and processed materials.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Reads materials/data.generated.json and produces:
 * - processed.generated.json: Materials with numeric rarity and normalized fields
 * - expanded.generated.json: BFS-expanded recipes (craftable → base materials)
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";

const RARITY_TO_NUMBER: Record<string, number> = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
	Mythic: 5,
};

interface RawMaterial {
	id: string;
	name: string;
	rarity: string;
	stat: string;
	iconFilename: string;
	recipe: Array<{ id: string; count: number }> | null;
}

export const main = () => {
	const materialsData: Record<string, RawMaterial> = JSON.parse(
		fs.readFileSync(
			join(import.meta.dirname, "..", "materials", "data.generated.json"),
			"utf-8",
		),
	);

	// Build processed materials with numeric rarity
	const processed: Record<
		string,
		{
			id: string;
			label: string;
			rarity: number;
			stat: string;
			iconFilename: string;
			crafted: boolean;
			recipe: Array<{ id: string; count: number }> | null;
		}
	> = {};

	for (const [id, mat] of Object.entries(materialsData)) {
		const rarity = RARITY_TO_NUMBER[mat.rarity] ?? 0;
		const crafted = mat.recipe != null && mat.recipe.length > 0;

		processed[id] = {
			id: mat.id,
			label: mat.name,
			rarity,
			stat: mat.stat,
			iconFilename: mat.iconFilename,
			crafted,
			recipe: crafted ? mat.recipe : null,
		};
	}

	// BFS expansion for recipes
	const expanded: Record<string, Record<string, number>> = {};

	// First pass: base (non-craftable) materials have empty expanded recipes
	for (const [id, mat] of Object.entries(processed)) {
		if (!mat.crafted) {
			expanded[id] = {};
		}
	}

	// Iteratively expand craftable materials
	let moreToExpand = true;
	let passes = 0;
	while (moreToExpand && passes < 15) {
		moreToExpand = false;
		passes++;

		for (const [id, mat] of Object.entries(processed)) {
			if (!mat.crafted || expanded[id] !== undefined) continue;

			if (!mat.recipe) continue;
			const recipe = mat.recipe;
			let canExpand = true;
			const result: Record<string, number> = {};

			for (const ingredient of recipe) {
				const subExpanded = expanded[ingredient.id];
				if (subExpanded === undefined) {
					canExpand = false;
					break;
				}

				const subMat = processed[ingredient.id];
				if (!subMat?.crafted) {
					// Base material — add directly
					result[ingredient.id] =
						(result[ingredient.id] ?? 0) + ingredient.count;
				} else {
					// Crafted ingredient — expand its sub-recipe
					for (const [subId, subCount] of Object.entries(subExpanded)) {
						result[subId] = (result[subId] ?? 0) + ingredient.count * subCount;
					}
				}
			}

			if (canExpand) {
				expanded[id] = result;
			} else {
				moreToExpand = true;
			}
		}
	}

	// Write outputs
	fs.writeFileSync(
		join(import.meta.dirname, "processed.generated.json"),
		`${JSON.stringify(processed, null, 2)}\n`,
	);

	fs.writeFileSync(
		join(import.meta.dirname, "expanded.generated.json"),
		`${JSON.stringify(expanded, null, 2)}\n`,
	);
};
