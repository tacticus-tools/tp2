import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { MaterialData } from "./generate-data.ts";
import { DATA as IDS } from "./ids.generated.ts";

// `import.meta.glob` is a Vite feature that allows us to import multiple files matching a pattern.
// It is not available in the `generate-data.ts` Vite plugin, so we have to do it here.
// We use `eager: true` to import the files immediately, and `import: "default"` to get the default export (the URL of the image).
// We do this instead of referencing the images using a template string because Vite needs to know about the files at build time in order to include them in the bundle and optimize them.
const materialIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/materials/ui_icon_upgrade_*.png`,
	{ eager: true, import: "default" },
);

export type MaterialId = (typeof IDS)[number];
export const MATERIAL_IDS = IDS;

// Resolve iconFilename to Vite-bundled URLs
const raw = data as unknown as Record<string, Record<string, unknown>>;
export const MATERIALS = Object.freeze(
	Object.fromEntries(
		Object.entries(raw).map(([id, mat]) => [
			id,
			Object.freeze({
				...mat,
				iconFilename: mat.iconFilename
					? (materialIcons[
							`/src/5-assets/snowprint_assets/materials/${mat.iconFilename}`
						] ?? mat.iconFilename)
					: undefined,
			}),
		]),
	),
) as unknown as DeepReadonly<Record<MaterialId, MaterialData>>; // safe because of validation in generate-data.ts
