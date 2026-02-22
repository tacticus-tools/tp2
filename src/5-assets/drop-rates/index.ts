import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { DropRateData } from "./generate-data.ts";

export const DROP_RATES = Object.freeze(data) as DeepReadonly<DropRateData>; // safe because of validation in generate-data.ts
