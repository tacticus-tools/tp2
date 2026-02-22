import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { Data } from "./generate-data.ts";

export const DATA = Object.freeze(data) as DeepReadonly<Data>;
