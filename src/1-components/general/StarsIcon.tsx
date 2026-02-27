import {
	type RarityStars,
	RarityStars as RS,
} from "@/4-lib/general/constants.ts";
import { getStarIconUrl } from "@/4-lib/general/image-utils.ts";
import { cn } from "@/4-lib/utils.ts";

interface StarsIconProps {
	stars: RarityStars;
	size?: number;
	className?: string;
}

const STAR_KEYS = ["s1", "s2", "s3", "s4", "s5"] as const;

/** Blue star aspect ratio (256×82 source image) */
const BLUE_STAR_RATIO = 256 / 82;
/** Mythic wings aspect ratio (512×164 source image) */
const MYTHIC_WINGS_RATIO = 512 / 164;

export function StarsIcon({ stars, size = 12, className }: StarsIconProps) {
	if (stars === RS.None) return null;

	if (stars === RS.MythicWings) {
		const h = size * 1.5;
		const w = h * MYTHIC_WINGS_RATIO;
		return (
			<div className={cn("flex items-center justify-center", className)}>
				<img
					src={getStarIconUrl("mythic-wings")}
					alt="Mythic Wings"
					width={Math.round(w)}
					height={Math.round(h)}
					className="shrink-0"
				/>
			</div>
		);
	}

	if (stars >= RS.OneBlueStar) {
		const count = stars - RS.OneBlueStar + 1;
		const iconUrl = getStarIconUrl("blue");
		const h = size * 1.2;
		const w = h * BLUE_STAR_RATIO;
		return (
			<div
				className={cn("flex items-end justify-center -space-x-1", className)}
			>
				{STAR_KEYS.slice(0, count).map((key) => (
					<img
						key={key}
						src={iconUrl}
						alt=""
						width={Math.round(w)}
						height={Math.round(h)}
						className="shrink-0"
					/>
				))}
			</div>
		);
	}

	let type: "gold" | "red";
	let count: number;

	if (stars >= RS.RedOneStar) {
		type = "red";
		count = stars - RS.RedOneStar + 1;
	} else {
		type = "gold";
		count = stars;
	}

	const iconUrl = getStarIconUrl(type);
	const enlarged = count === 5 ? size * 1.3 : 0;

	return (
		<div
			className={cn("flex items-end justify-center -space-x-0.5", className)}
		>
			{STAR_KEYS.slice(0, count).map((key, i) => {
				const isCenter = count === 5 && i === 2;
				const s = isCenter ? enlarged : size;
				return (
					<img
						key={key}
						src={iconUrl}
						alt=""
						width={s}
						height={s}
						className="shrink-0"
					/>
				);
			})}
		</div>
	);
}
