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

import MATERIALS_DATA from "../materials/data.generated.json" with {
	type: "json",
};

export const main = () => {
	// Build processed materials with numeric rarity
	const processed: Record<
		string,
		{
			id: string;
			label: string;
			rarity: string;
			stat: string;
			iconFilename: string;
			crafted: boolean;
			recipe: Array<{ id: string; count: number }> | null;
		}
	> = {};

	for (const [id, mat] of Object.entries(MATERIALS_DATA)) {
		const crafted = mat.recipe != null && mat.recipe.length > 0;

		processed[id] = {
			id: mat.id,
			label: mat.name,
			rarity: mat.rarity,
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
				if (!processed[ingredient.id]) {
					throw new Error(
						`Material "${id}" references unknown ingredient "${ingredient.id}". Fix the source data.`,
					);
				}

				const subExpanded = expanded[ingredient.id];
				if (subExpanded === undefined) {
					canExpand = false;
					break;
				}

				const subMat = processed[ingredient.id];
				if (!subMat.crafted) {
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

	// Check for unresolvable recipes (likely circular dependencies)
	const unresolved = Object.keys(processed).filter(
		(id) => processed[id].crafted && expanded[id] === undefined,
	);
	if (unresolved.length > 0) {
		throw new Error(
			`Failed to expand recipes after ${passes} passes. Unresolved: ${unresolved.join(", ")}. Check for circular dependencies.`,
		);
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
