import configsData from "./configs.generated.json";
import battleData from "./data.generated.json";
import type { CampaignBattleData, CampaignConfigData } from "./generate-data";

export const CAMPAIGN_BATTLES = battleData as unknown as CampaignBattleData;
export const CAMPAIGN_CONFIGS = configsData as unknown as CampaignConfigData;
