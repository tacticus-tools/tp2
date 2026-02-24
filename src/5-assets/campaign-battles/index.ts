import type { DeepReadonly } from "@/types.ts";
import battleData from "./data.generated.json" with { type: "json" };
import { DATA as ENERGY_COSTS_DATA } from "./energy-costs.generated.ts";
import type { CampaignBattleData } from "./generate-data.ts";
import { DATA as CAMPAIGN_TYPES } from "./types.generated.ts";

export const CAMPAIGN_BATTLES = Object.freeze(
	battleData,
) as DeepReadonly<CampaignBattleData>;
export { CAMPAIGN_TYPES };

/** Pre-built "campaign:nodeNumber" → energyCost lookup */
export const NODE_ENERGY_COSTS = Object.freeze(
	ENERGY_COSTS_DATA,
) as DeepReadonly<typeof ENERGY_COSTS_DATA>;
