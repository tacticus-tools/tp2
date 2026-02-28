import type { Rarity } from "#common/rarity.ts";
import { RARITY_ICON_URLS } from "@/4-lib/general/image-utils.ts";

interface RarityIconProps {
	rarity: Rarity;
	size?: number;
}

export function RarityIcon({ rarity, size = 20 }: RarityIconProps) {
	return (
		<img
			src={RARITY_ICON_URLS[rarity]}
			alt={rarity}
			width={size}
			height={size}
			loading="lazy"
			className="shrink-0"
		/>
	);
}
