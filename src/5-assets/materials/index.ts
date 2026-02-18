import data from "./data.generated.json";
import rankUpRawData from "./rank-up-data.generated.json";

// `import.meta.glob` is a Vite feature that allows us to import multiple files matching a pattern.
// We use `eager: true` to import the files immediately, and `import: "default"` to get the default export (the URL of the image).
// We do this instead of referencing the images using a template string because Vite needs to know about the files at build time in order to include them in the bundle and optimize them.
const materialIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/materials/ui_icon_upgrade_*.png`,
	{ eager: true, import: "default" },
);

type RawMaterial = (typeof data)[keyof typeof data];

function resolveMaterial(mat: RawMaterial) {
	return {
		...mat,
		iconUrl: mat.iconFilename
			? (materialIcons[
					`/src/5-assets/snowprint_assets/materials/${mat.iconFilename}`
				] ?? null)
			: null,
	};
}

export type Material = ReturnType<typeof resolveMaterial>;

export const MATERIALS = Object.fromEntries(
	Object.entries(data).map(([id, mat]) => [id, resolveMaterial(mat)]),
) as Record<string, Material>;

export const RANK_UP_DATA = rankUpRawData;
