import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { EquipmentData } from "./generate-data.ts";
import { DATA as IDS } from "./ids.generated.ts";

type EquipmentEntry = EquipmentData[string];
export const EQUIPMENT_IDS = IDS;
export type EquipmentId = (typeof IDS)[number];
export const EQUIPMENT = Object.freeze(data) as DeepReadonly<
	Record<EquipmentId, EquipmentEntry>
>; // Safe to cast since it's generated from the same zod schema
