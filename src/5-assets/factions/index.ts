import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { FactionData } from "./generate-data.ts";

export type { FactionData };
export type { FactionEntry } from "./generate-data.ts";

export const FACTIONS = Object.freeze(data) as DeepReadonly<FactionData>;
