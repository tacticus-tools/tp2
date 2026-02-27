import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { Data } from "./generate-data.ts";

export const DATA = Object.freeze(data) as DeepReadonly<Data>;

const leMapImages = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/le_maps/*_Visual.jpg`,
	{ eager: true, import: "default" },
);

export function getLeMapUrl(mapId: string): string | undefined {
	return leMapImages[
		`/src/5-assets/snowprint_assets/le_maps/${mapId}_Visual.jpg`
	];
}
