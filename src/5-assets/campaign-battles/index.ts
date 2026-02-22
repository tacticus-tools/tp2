import battleData from "./data.generated.json" with { type: "json" };
import type { CampaignBattleData } from "./generate-data.ts";
import { DATA as CAMPAIGN_TYPES } from "./types.generated.ts";

export const CAMPAIGN_BATTLES = battleData as CampaignBattleData;
export { CAMPAIGN_TYPES };
