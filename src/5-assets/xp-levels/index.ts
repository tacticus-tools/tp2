import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { XpLevelThreshold } from "./generate-data.ts";

export type { XpLevelThreshold };

export const XP_LEVEL_THRESHOLDS = Object.freeze(data) as DeepReadonly<
	XpLevelThreshold[]
>;
