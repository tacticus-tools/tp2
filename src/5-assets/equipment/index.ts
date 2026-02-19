import data from "./data.generated.json" with { type: "json" };
import type { EquipmentData } from "./generate-data.ts";
import { DATA as IDS } from "./ids.generated.ts";

export const EQUIPMENT = data as EquipmentData; // Safe to cast since it's generated from the same zod schema
export const EQUIPMENT_IDS = IDS;
