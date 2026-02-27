import { useState } from "react";
import { RankIcon } from "@/1-components/general/RankIcon.tsx";
import { StarsIcon } from "@/1-components/general/StarsIcon.tsx";
import { getRarityFrameUrl } from "@/4-lib/general/image-utils.ts";
import type { EnrichedRosterUnit } from "@/4-lib/general/roster-display.ts";
import { cn } from "@/4-lib/utils.ts";
import {
	getEquipmentFrameUrl,
	getEquipmentIconUrl,
	getEquipmentTypeIconUrl,
} from "@/5-assets/equipment/index.ts";

/** Equipment type order by id prefix: Weapon (Crit) → Armor/Shield (Block/Defensive) → Booster */
const EQUIP_TYPE_ORDER: Record<string, number> = {
	I_Crit: 0,
	R_Crit: 0,
	I_Block: 1,
	R_Block: 1,
	I_Defensive: 1,
	R_Defensive: 1,
	I_Booster_Block: 2,
	R_Booster_Block: 2,
	I_Booster_Crit: 2,
	R_Booster_Crit: 2,
};

interface EquipmentSlotDisplay {
	key: string;
	slotType: string;
	equip: EnrichedRosterUnit["equipment"][number] | undefined;
}

function buildEquipmentSlots(
	unit: EnrichedRosterUnit,
): EquipmentSlotDisplay[] | undefined {
	if (!unit.equipmentSlots) return undefined;
	const matched = new Set<string>();
	return unit.equipmentSlots
		.map((slotType, i) => {
			const equip = unit.equipment.find(
				(e) => e.id.startsWith(slotType) && !matched.has(e.id),
			);
			if (equip) matched.add(equip.id);
			return { key: `${slotType}-${i}`, slotType, equip };
		})
		.sort(
			(a, b) =>
				(EQUIP_TYPE_ORDER[a.slotType] ?? 99) -
				(EQUIP_TYPE_ORDER[b.slotType] ?? 99),
		);
}

interface UnitCardProps {
	unit: EnrichedRosterUnit;
}

export function UnitCard({ unit }: UnitCardProps) {
	const frameUrl = getRarityFrameUrl(unit.rarity);
	const [imgFailed, setImgFailed] = useState(false);

	const equipmentSlots = buildEquipmentSlots(unit);

	return (
		<div
			className={cn(
				"flex h-full flex-col items-center gap-1 rounded-lg border border-border/50 bg-card p-2 text-center md:gap-2 md:p-3",
				unit.isLocked && "grayscale",
			)}
		>
			{/* Name — on top so bottom rows align across cards */}
			<p className="w-full truncate text-xs/tight font-medium md:text-base/tight">
				{unit.name}
			</p>

			{/* Portrait with stars overlay, rarity frame, and rank badge */}
			{/* Mobile: 64×84, Desktop (md+): 96×126 */}
			<div className="relative size-[64px] h-[84px] md:mt-1 md:size-[96px] md:h-[126px]">
				{unit.portrait && !imgFailed ? (
					// biome-ignore lint/a11y/noNoninteractiveElementInteractions: fallback handler, not interactive
					<img
						src={unit.portrait}
						alt={unit.name}
						width={60}
						height={80}
						loading="lazy"
						className="absolute top-[2px] left-[2px] size-[60px] h-[80px] object-cover md:size-[92px] md:h-[122px]"
						onError={() => setImgFailed(true)}
					/>
				) : (
					<div className="absolute top-[2px] left-[2px] flex size-[60px] h-[80px] items-center justify-center bg-muted text-lg font-semibold text-muted-foreground md:size-[92px] md:h-[122px] md:text-2xl">
						{(unit.name[0] ?? "?").toUpperCase()}
					</div>
				)}
				{frameUrl && (
					<img
						src={frameUrl}
						alt=""
						width={64}
						height={84}
						className="pointer-events-none absolute inset-0 z-1 size-full"
					/>
				)}
				{/* Stars centered on top edge of frame */}
				{!unit.isLocked && (
					<div className="absolute -top-[8px] right-0 left-0 z-3 flex justify-center md:-top-[12px]">
						<StarsIcon stars={unit.stars} size={14} className="md:hidden" />
						<StarsIcon
							stars={unit.stars}
							size={20}
							className="hidden md:flex"
						/>
					</div>
				)}
				{/* Rank badge — bottom-left */}
				{!unit.isMow && !unit.isLocked && (
					<div className="absolute -bottom-1 -left-1 z-2">
						<RankIcon rank={unit.rank} size={22} className="md:hidden" />
						<RankIcon rank={unit.rank} size={34} className="hidden md:block" />
					</div>
				)}
			</div>

			{/* Ability row: active level+icon | XP level | icon+passive level */}
			{!unit.isLocked && (
				<div className="flex items-center gap-1 md:gap-2">
					{/* Active: level before icon */}
					<div className="flex items-center gap-0.5 md:gap-1">
						<span className="text-[10px] font-medium text-muted-foreground tabular-nums md:text-base">
							{unit.abilities[0]}
						</span>
						{unit.activeAbilityIcon ? (
							<img
								src={unit.activeAbilityIcon}
								alt=""
								width={16}
								height={16}
								loading="lazy"
								className="size-4 shrink-0 rounded-sm md:size-7"
							/>
						) : (
							<div className="size-4 shrink-0 rounded-sm bg-muted md:size-7" />
						)}
					</div>
					{/* XP level badge */}
					<span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold tabular-nums md:size-8 md:text-sm">
						{unit.level}
					</span>
					{/* Passive: icon before level */}
					<div className="flex items-center gap-0.5 md:gap-1">
						{unit.passiveAbilityIcon ? (
							<img
								src={unit.passiveAbilityIcon}
								alt=""
								width={16}
								height={16}
								loading="lazy"
								className="size-4 shrink-0 rounded-sm md:size-7"
							/>
						) : (
							<div className="size-4 shrink-0 rounded-sm bg-muted md:size-7" />
						)}
						<span className="text-[10px] font-medium text-muted-foreground tabular-nums md:text-base">
							{unit.abilities[1]}
						</span>
					</div>
				</div>
			)}

			{/* Equipment row — pushed to bottom so cards align */}
			{equipmentSlots && !unit.isLocked && (
				<div className="mt-auto flex items-center gap-1 md:gap-2">
					{equipmentSlots.map((slot) => {
						if (slot.equip) {
							const iconUrl = getEquipmentIconUrl(slot.equip.id);
							const eqFrameUrl = getEquipmentFrameUrl(slot.equip.rarity);
							return (
								<div
									key={slot.key}
									className="flex items-center gap-0.5 md:gap-1"
								>
									<div className="relative size-5 shrink-0 md:size-8">
										{iconUrl ? (
											<img
												src={iconUrl}
												alt=""
												width={20}
												height={20}
												loading="lazy"
												className="absolute inset-0 z-1 size-full scale-85 object-contain"
											/>
										) : (
											<div className="absolute inset-0 z-1 rounded-sm bg-muted" />
										)}
										{eqFrameUrl && (
											<img
												src={eqFrameUrl}
												alt=""
												width={20}
												height={20}
												className="pointer-events-none absolute inset-0 z-2 size-full object-contain"
											/>
										)}
									</div>
									<span className="text-[10px] font-medium text-muted-foreground tabular-nums md:text-base">
										{slot.equip.level}
									</span>
								</div>
							);
						}
						const typeIconUrl = getEquipmentTypeIconUrl(slot.slotType);
						return (
							<div
								key={slot.key}
								className="flex items-center gap-0.5 opacity-40 md:gap-1"
							>
								<div className="relative size-5 shrink-0 md:size-8">
									{typeIconUrl ? (
										<img
											src={typeIconUrl}
											alt=""
											width={20}
											height={20}
											loading="lazy"
											className="absolute inset-0 z-1 size-full object-contain"
										/>
									) : (
										<div className="absolute inset-0 z-1 rounded-sm bg-muted" />
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
