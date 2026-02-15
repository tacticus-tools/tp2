import { Rarity } from "@/4-lib/tacticus/enums";
import { getRarityImageUrl } from "@/4-lib/tacticus/image-utils";

const rarityLabels: Record<Rarity, string> = {
	[Rarity.Common]: "Common",
	[Rarity.Uncommon]: "Uncommon",
	[Rarity.Rare]: "Rare",
	[Rarity.Epic]: "Epic",
	[Rarity.Legendary]: "Legendary",
	[Rarity.Mythic]: "Mythic",
};

interface RarityIconProps {
	rarity: Rarity;
	size?: number;
}

export function RarityIcon({ rarity, size = 20 }: RarityIconProps) {
	return (
		<img
			src={getRarityImageUrl(rarity)}
			alt={rarityLabels[rarity]}
			width={size}
			height={size}
			loading="lazy"
			className="shrink-0"
		/>
	);
}
