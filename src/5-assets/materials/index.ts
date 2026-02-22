import data from "./data.generated.json" with { type: "json" };
import type { MaterialData } from "./generate-data.ts";
import { DATA as IDS } from "./ids.generated.ts";

export type MaterialId = (typeof IDS)[number];
export const MATERIAL_IDS = IDS;
export const MATERIALS = data as unknown as Record<MaterialId, MaterialData>; // safe because of validation in generate-data.ts
