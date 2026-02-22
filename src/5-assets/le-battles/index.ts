import data from "./data.generated.json" with { type: "json" };
import type { Data } from "./generate-data.ts";

export const DATA = data as Data;
