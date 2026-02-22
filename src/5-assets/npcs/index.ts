import type { DeepReadonly } from "@/types.ts";
import DATA from "./data.generated.json" with { type: "json" };
import type { NpcData } from "./generate-data.ts";
import { DATA as RAW_IDS } from "./ids.generated.ts";
import { DATA as RAW_TRAITS } from "./traits.generated.ts";

// TODO: Implement icon mapping to files like we do for characters once we have icons for NPCs

export const NPCS = Object.freeze(DATA) as unknown as DeepReadonly<NpcData>; // Safe to cast since it's generated from the same zod schema
export const NPC_IDS = Object.freeze(RAW_IDS);
export const NPC_TRAITS = Object.freeze(RAW_TRAITS);
