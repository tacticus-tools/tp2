import type { Rank } from "@/4-lib/general/constants.ts";
import { getRankImageUrl } from "@/4-lib/general/image-utils.ts";
import { rankToString } from "@/4-lib/general/rank-data.ts";

interface RankIconProps {
	rank: Rank;
	size?: number;
}

export function RankIcon({ rank, size = 20 }: RankIconProps) {
	return (
		<img
			src={getRankImageUrl(rank)}
			alt={rankToString[rank]}
			width={size}
			height={size}
			loading="lazy"
			className="shrink-0"
		/>
	);
}
