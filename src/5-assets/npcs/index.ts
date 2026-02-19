import DATA from "./data.generated.json" with { type: "json" };
import type { NpcData } from "./generate-data.ts";
import { DATA as NPC_IDS } from "./ids.generated.ts";
import { DATA as NPC_TRAITS } from "./traits.generated.ts";

// TODO: Implement icon mapping to files like we do for characters once we have icons for NPCs

export const NPCS = DATA as NpcData; // Safe to cast since it's generated from the same zod schema
export { NPC_IDS, NPC_TRAITS };
