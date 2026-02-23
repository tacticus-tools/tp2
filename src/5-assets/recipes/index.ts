import type { DeepReadonly } from "@/types.ts";
import expandedData from "./expanded.generated.json" with { type: "json" };
import processedData from "./processed.generated.json" with { type: "json" };

// Icon resolution via Vite's import.meta.glob (not available in build-time generate-data.ts)
const materialIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/materials/ui_icon_upgrade_*.png`,
	{ eager: true, import: "default" },
);

function resolveIcon(iconFilename: string): string {
	return (
		materialIcons[`/src/5-assets/snowprint_assets/materials/${iconFilename}`] ??
		iconFilename
	);
}

// Resolve icon URLs and freeze
const processedWithIcons = Object.freeze(
	Object.fromEntries(
		Object.entries(
			processedData as Record<
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
			>,
		).map(([id, mat]) => [
			id,
			Object.freeze({
				...mat,
				icon: resolveIcon(mat.iconFilename),
			}),
		]),
	),
) as DeepReadonly<
	Record<
		string,
		{
			id: string;
			label: string;
			rarity: number;
			stat: string;
			iconFilename: string;
			crafted: boolean;
			recipe: ReadonlyArray<{ id: string; count: number }> | null;
			icon: string;
		}
	>
>;

/** Processed materials with numeric rarity and resolved icon URLs */
export const PROCESSED_MATERIALS = processedWithIcons;

/** BFS-expanded recipes: materialId → Record<baseMaterialId, count> */
export const EXPANDED_RECIPES = Object.freeze(expandedData) as DeepReadonly<
	Record<string, Record<string, number>>
>;
