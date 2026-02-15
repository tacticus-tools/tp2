import { Campaign, type CampaignType } from "./enums";

export interface ICampaignBattleComposed {
	campaignId: Campaign;
	nodeNumber: number;
	campaignType: CampaignType;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: number;
	expectedShards: number;
	unitId?: string;
}

/** Map from campaign API id to Campaign enum */
export const idToCampaign: Record<string, Campaign> = {
	campaign1: Campaign.I,
	campaign2: Campaign.FoC,
	campaign3: Campaign.O,
	campaign4: Campaign.SH,

	mirror1: Campaign.IM,
	mirror2: Campaign.FoCM,
	mirror3: Campaign.OM,
	mirror4: Campaign.SHM,

	elite1: Campaign.IE,
	elite2: Campaign.FoCE,
	elite3: Campaign.OE,
	elite4: Campaign.SHE,

	eliteMirror1: Campaign.IME,
	eliteMirror2: Campaign.FoCME,
	eliteMirror3: Campaign.OME,
	eliteMirror4: Campaign.SHME,

	eventCampaign1: Campaign.AMS,
	eventCampaign2: Campaign.TS,
	eventCampaign3: Campaign.TAS,
};
