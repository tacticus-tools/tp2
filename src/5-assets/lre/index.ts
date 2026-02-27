import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { Data } from "./generate-data.ts";
import { DATA as IDS } from "./ids.generated.ts";

export type LreEventId = (typeof IDS)[number];
export const LRE_EVENT_IDS = IDS;

export const LRE_EVENTS = Object.freeze(data) as DeepReadonly<Data>;

// --- LRE restriction/objective icons ---

const lreIcons = import.meta.glob<string>(`/src/5-assets/lre/icons/*.png`, {
	eager: true,
	import: "default",
});

// Build filename → URL map (strip path + extension, keep original casing)
const iconByName: Record<string, string> = {};
const PREFIX = "/src/5-assets/lre/icons/";
const SUFFIX = ".png";
for (const [key, url] of Object.entries(lreIcons)) {
	const name = key.slice(PREFIX.length, -SUFFIX.length);
	iconByName[name.toLowerCase()] = url;
}

/**
 * Get the Vite-resolved URL for an LRE restriction icon by its name.
 * Lookup is case-insensitive. Returns `undefined` if no matching icon exists.
 */
export function getLreIconUrl(iconName: string): string | undefined {
	return iconByName[iconName.toLowerCase()];
}
