import type { Campaign } from "@/4-lib/general/constants.ts";
import { getCampaignImageUrl } from "@/4-lib/general/image-utils.ts";

interface CampaignIconProps {
	campaign: Campaign;
	size?: number;
}

export function CampaignIcon({ campaign, size = 24 }: CampaignIconProps) {
	return (
		<img
			src={getCampaignImageUrl(campaign)}
			alt={campaign}
			width={size}
			height={size}
			loading="lazy"
			className="shrink-0 rounded-sm"
		/>
	);
}
