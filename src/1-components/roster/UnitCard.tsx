import { useState } from "react";
import { RankIcon } from "@/1-components/general/RankIcon.tsx";
import { getRarityFrameUrl } from "@/4-lib/general/image-utils.ts";
import type { EnrichedRosterUnit } from "@/4-lib/general/roster-display.ts";
import { starsColor, starsLabel } from "@/4-lib/general/roster-display.ts";
import { cn } from "@/4-lib/utils.ts";

function AbilityBadge({
	icon,
	level,
}: {
	icon: string | undefined;
	level: number;
}) {
	return (
		<div className="flex items-center gap-0.5">
			{icon ? (
				<img
					src={icon}
					alt=""
					width={16}
					height={16}
					loading="lazy"
					className="shrink-0 rounded-sm"
				/>
			) : (
				<div className="size-4 shrink-0 rounded-sm bg-muted" />
			)}
			<span className="text-[10px] font-medium text-muted-foreground tabular-nums">
				{level}
			</span>
		</div>
	);
}

interface UnitCardProps {
	unit: EnrichedRosterUnit;
}

export function UnitCard({ unit }: UnitCardProps) {
	const stars = starsLabel(unit.stars);
	const frameUrl = getRarityFrameUrl(unit.rarity);
	const [imgFailed, setImgFailed] = useState(false);

	return (
		<div className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-card p-2 text-center">
			{/* Portrait with rarity frame and rank badge */}
			<div className="relative" style={{ width: 64, height: 84 }}>
				{unit.portrait && !imgFailed ? (
					// biome-ignore lint/a11y/noNoninteractiveElementInteractions: fallback handler, not interactive
					<img
						src={unit.portrait}
						alt={unit.name}
						width={60}
						height={80}
						loading="lazy"
						className="absolute top-[2px] left-[2px] object-cover"
						onError={() => setImgFailed(true)}
					/>
				) : (
					<div
						className="absolute top-[2px] left-[2px] flex items-center justify-center bg-muted text-lg font-semibold text-muted-foreground"
						style={{ width: 60, height: 80 }}
					>
						{(unit.name[0] ?? "?").toUpperCase()}
					</div>
				)}
				{frameUrl && (
					<img
						src={frameUrl}
						alt=""
						width={64}
						height={84}
						className="pointer-events-none absolute inset-0 z-1"
					/>
				)}
				{!unit.isMow && (
					<div className="absolute -right-1 -bottom-1 z-2">
						<RankIcon rank={unit.rank} size={20} />
					</div>
				)}
			</div>

			{/* Stars */}
			{stars && (
				<span className={cn("text-xs leading-none", starsColor(unit.stars))}>
					{stars}
				</span>
			)}

			{/* Ability levels */}
			<div className="flex items-center gap-1">
				<AbilityBadge icon={unit.activeAbilityIcon} level={unit.abilities[0]} />
				<AbilityBadge
					icon={unit.passiveAbilityIcon}
					level={unit.abilities[1]}
				/>
			</div>

			{/* Name */}
			<p className="w-full truncate text-xs/tight font-medium">{unit.name}</p>
		</div>
	);
}
