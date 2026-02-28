import { z } from "zod";

export const CAMPAIGNS_LOCATIONS_USAGES = [
	"None",
	"BestTime",
	"LeastEnergy",
] as const;

export type CampaignsLocationsUsage =
	(typeof CAMPAIGNS_LOCATIONS_USAGES)[number];
export const CampaignsLocationsUsageSchema = z.enum(CAMPAIGNS_LOCATIONS_USAGES);

export const CampaignsLocationsUsage = {
	None: "None",
	BestTime: "BestTime",
	LeastEnergy: "LeastEnergy",
} as const satisfies Record<CampaignsLocationsUsage, CampaignsLocationsUsage>;

/** Maps old numeric DB values to new string values */
export const NUMERIC_TO_CAMPAIGNS_USAGE: Record<
	number,
	CampaignsLocationsUsage
> = {
	0: "None",
	1: "BestTime",
	2: "LeastEnergy",
};
