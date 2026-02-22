import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { AbilityCost } from "./generate-data.ts";

export type { AbilityCost };

export const ABILITY_COSTS = Object.freeze(data) as DeepReadonly<AbilityCost[]>;

/** Badge cost to upgrade TO each ability level, keyed by level number. */
export const BADGES_PER_LEVEL: Readonly<Record<number, number>> = Object.freeze(
	Object.fromEntries(data.map((entry) => [entry.level, entry.badges])),
);

/** Gold cost to upgrade TO each ability level, keyed by level number. */
export const GOLD_PER_LEVEL: Readonly<Record<number, number>> = Object.freeze(
	Object.fromEntries(data.map((entry) => [entry.level, entry.gold])),
);
