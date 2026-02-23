import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { FactionData } from "./generate-data.ts";

export type { FactionData };
export type { FactionEntry } from "./generate-data.ts";

const factionIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/factions/*.png`,
	{ eager: true, import: "default" },
);

// Pre-build a factionId → icon URL map so lookups are a simple property access
const factionIconByFactionId: Record<string, string | undefined> = {};
for (const [fid, entry] of Object.entries(data as FactionData)) {
	factionIconByFactionId[fid] =
		factionIcons[`/src/5-assets/snowprint_assets/factions/${entry.icon}`];
}

export function getFactionIconUrl(factionId: string): string | undefined {
	return factionIconByFactionId[factionId];
}

export const FACTIONS = Object.freeze(data) as DeepReadonly<FactionData>;
