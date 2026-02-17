import data from "./data.generated.json";
import type { EquipmentData } from "./generate-data";
import { DATA as IDS } from "./ids.generated";

export const EQUIPMENT = data as EquipmentData; // Safe to cast since it's generated from the same zod schema
export const EQUIPMENT_IDS = IDS;
