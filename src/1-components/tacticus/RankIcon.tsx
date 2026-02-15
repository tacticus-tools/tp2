import type { Rank } from "@/4-lib/tacticus/enums";
import { getRankImageUrl } from "@/4-lib/tacticus/image-utils";
import { rankToString } from "@/4-lib/tacticus/rank-data";

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
