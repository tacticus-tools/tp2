import type { Rank } from "@/4-lib/general/constants.ts";
import { getRankImageUrl } from "@/4-lib/general/image-utils.ts";
import { rankToString } from "@/4-lib/general/rank-data.ts";
import { cn } from "@/4-lib/utils.ts";

interface RankIconProps {
	rank: Rank;
	size?: number;
	className?: string;
}

export function RankIcon({ rank, size = 20, className }: RankIconProps) {
	return (
		<img
			src={getRankImageUrl(rank)}
			alt={rankToString[rank]}
			width={size}
			height={size}
			loading="lazy"
			className={cn("shrink-0", className)}
		/>
	);
}
