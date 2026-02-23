import type { DeepReadonly } from "@/types.ts";
import { DATA } from "./data.generated.ts";

// Resolve roundIcon filenames to Vite-bundled URLs
const roundIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/characters/ui_image_RoundPortrait_*.png`,
	{ eager: true, import: "default" },
);

function resolveRoundIcon(filename: string): string {
	return (
		roundIcons[`/src/5-assets/snowprint_assets/characters/${filename}`] ??
		filename
	);
}

const units = DATA.map((unit) => ({
	...unit,
	roundIcon: resolveRoundIcon(unit.roundIconFilename),
}));

export type GameUnit = (typeof units)[number];
export type GameUnitId = GameUnit["id"];

/** All game units (characters + MoWs) with resolved icon URLs */
export const GAME_UNITS = Object.freeze(units) as DeepReadonly<typeof units>;

/** Lookup map: unitId → GameUnit (accepts any string key for API-sourced IDs) */
export const unitById: ReadonlyMap<string, GameUnit> = new Map(
	GAME_UNITS.map((u) => [u.id, u]),
);

/** All game units sorted by name (for combobox display) */
export const allGameUnitsSorted = Object.freeze(
	[...GAME_UNITS].sort((a, b) => a.name.localeCompare(b.name)),
) as DeepReadonly<typeof units>;
