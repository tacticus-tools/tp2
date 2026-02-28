import {
	ArrowRight,
	Check,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Info,
	Pencil,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import type { Alliance } from "#common/alliance.ts";
import { RARITIES, type Rarity } from "#common/rarity.ts";
import { CharacterIcon } from "@/1-components/general/CharacterIcon.tsx";
import { EnergyIcon } from "@/1-components/general/EnergyIcon.tsx";
import { RankIcon } from "@/1-components/general/RankIcon.tsx";
import { RarityIcon } from "@/1-components/general/RarityIcon.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { Card, CardContent } from "@/1-components/ui/card.tsx";
import type {
	IBadgeCoverage,
	IRarityCoverage,
	IXpBookCoverage,
} from "@/4-lib/general/badge-inventory.ts";
import {
	PersonalGoalType,
	type Rank,
	RarityStars,
	type RarityStars as RarityStarsType,
} from "@/4-lib/general/constants.ts";
import type { IGoalEstimate } from "@/4-lib/general/goals/types.ts";
import { goalTypeLabels } from "@/4-lib/general/goals/types.ts";
import { BADGE_URLS, BOOK_URLS } from "@/4-lib/general/image-utils.ts";
import { rankToString } from "@/4-lib/general/rank-data.ts";
import { cn } from "@/4-lib/utils.ts";

function starsLabel(stars: RarityStarsType): string {
	if (stars >= RarityStars.OneBlueStar) {
		if (stars === RarityStars.MythicWings) return "Wings";
		return "★".repeat(stars - RarityStars.OneBlueStar + 1);
	}
	if (stars >= RarityStars.RedOneStar) {
		return "★".repeat(stars - RarityStars.RedOneStar + 1);
	}
	if (stars >= RarityStars.OneStar) {
		return "★".repeat(stars);
	}
	return "";
}

function starsColor(stars: RarityStarsType): string {
	if (stars >= RarityStars.OneBlueStar) return "text-blue-400";
	if (stars >= RarityStars.RedOneStar) return "text-red-400";
	return "text-yellow-400";
}

interface GoalCardProps {
	goalId: string;
	type: PersonalGoalType;
	unitId: string;
	unitName: string;
	priority: number;
	include: boolean;
	notes?: string;
	data: GoalData;
	estimate?: IGoalEstimate;
	badgeCoverage?: IBadgeCoverage;
	xpBookCoverage?: IXpBookCoverage;
	colorTint?: string;
	isFirst: boolean;
	isLast: boolean;
	onslaughtActive?: boolean;
	onEdit: (goalId: string) => void;
	onDelete: (goalId: string) => void;
	onToggleInclude: (goalId: string, include: boolean) => void;
	onToggleOnslaught?: (goalId: string, enabled: boolean) => void;
	onMoveUp: (goalId: string) => void;
	onMoveDown: (goalId: string) => void;
}

export type GoalData =
	| {
			type: typeof PersonalGoalType.UpgradeRank;
			rankStart: Rank;
			rankEnd: Rank;
			upgradesRarity?: Rarity[];
	  }
	| {
			type: typeof PersonalGoalType.Ascend;
			rarityStart: Rarity;
			rarityEnd: Rarity;
			starsStart: RarityStarsType;
			starsEnd: RarityStarsType;
	  }
	| { type: typeof PersonalGoalType.Unlock }
	| {
			type: typeof PersonalGoalType.MowAbilities;
			primaryStart: number;
			primaryEnd: number;
			secondaryStart: number;
			secondaryEnd: number;
			upgradesRarity?: Rarity[];
	  }
	| {
			type: typeof PersonalGoalType.CharacterAbilities;
			activeStart: number;
			activeEnd: number;
			passiveStart: number;
			passiveEnd: number;
	  };

const goalTypeBadgeColor: Record<PersonalGoalType, string> = {
	[PersonalGoalType.UpgradeRank]:
		"bg-amber-500/15 text-amber-400 border-amber-500/30",
	[PersonalGoalType.Ascend]:
		"bg-purple-500/15 text-purple-400 border-purple-500/30",
	[PersonalGoalType.Unlock]:
		"bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
	[PersonalGoalType.MowAbilities]:
		"bg-rose-500/15 text-rose-400 border-rose-500/30",
	[PersonalGoalType.CharacterAbilities]:
		"bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

function RarityFilterIcons({ upgradesRarity }: { upgradesRarity?: Rarity[] }) {
	if (!upgradesRarity || upgradesRarity.length === 0) return null;
	return (
		<div className="flex items-center gap-1" title="Upgrade rarity filter">
			{upgradesRarity.map((rarity) => (
				<span key={rarity} title={`${rarity} upgrades`}>
					<RarityIcon rarity={rarity} size={16} />
				</span>
			))}
		</div>
	);
}

function CompletedCheck() {
	return (
		<span title="Goal completed">
			<Check className="size-4 text-emerald-400" />
		</span>
	);
}

function GoalProgress({ data }: { data: GoalData }) {
	switch (data.type) {
		case PersonalGoalType.UpgradeRank: {
			const completed = data.rankStart >= data.rankEnd;
			return (
				<div className="space-y-1.5">
					<div className="flex items-center gap-2 text-sm">
						<div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
							<RankIcon rank={data.rankStart} size={20} />
							<span className="text-muted-foreground">
								{rankToString[data.rankStart]}
							</span>
						</div>
						<div className="flex items-center text-muted-foreground/40">
							<ChevronRight className="size-4" />
						</div>
						<div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 ring-1 ring-amber-500/20">
							<RankIcon rank={data.rankEnd} size={20} />
							<span className="font-medium text-foreground">
								{rankToString[data.rankEnd]}
							</span>
						</div>
						{completed && <CompletedCheck />}
					</div>
					<RarityFilterIcons upgradesRarity={data.upgradesRarity} />
				</div>
			);
		}
		case PersonalGoalType.Ascend: {
			const startIdx =
				RARITIES.indexOf(data.rarityStart) * 100 + data.starsStart;
			const endIdx = RARITIES.indexOf(data.rarityEnd) * 100 + data.starsEnd;
			const completed = startIdx >= endIdx;
			return (
				<div className="flex items-center gap-2 text-sm">
					<div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
						<RarityIcon rarity={data.rarityStart} size={20} />
						<span className="text-muted-foreground">{data.rarityStart}</span>
						{starsLabel(data.starsStart) && (
							<span className={cn("text-xs", starsColor(data.starsStart))}>
								{starsLabel(data.starsStart)}
							</span>
						)}
					</div>
					<div className="flex items-center text-muted-foreground/40">
						<ChevronRight className="size-4" />
					</div>
					<div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 ring-1 ring-purple-500/20">
						<RarityIcon rarity={data.rarityEnd} size={20} />
						<span className="font-medium text-foreground">
							{data.rarityEnd}
						</span>
						{starsLabel(data.starsEnd) && (
							<span className={cn("text-xs", starsColor(data.starsEnd))}>
								{starsLabel(data.starsEnd)}
							</span>
						)}
					</div>
					{completed && <CompletedCheck />}
				</div>
			);
		}
		case PersonalGoalType.Unlock:
			return (
				<div className="text-sm text-muted-foreground">Unlock character</div>
			);
		case PersonalGoalType.MowAbilities: {
			return (
				<div className="space-y-1.5">
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<span className="flex items-center">
							Primary {data.primaryStart}
							<ArrowRight className="mx-1 inline size-3" />
							{data.primaryEnd}
							{data.primaryStart >= data.primaryEnd && <CompletedCheck />}
						</span>
						<span className="text-muted-foreground/40">|</span>
						<span className="flex items-center">
							Secondary {data.secondaryStart}
							<ArrowRight className="mx-1 inline size-3" />
							{data.secondaryEnd}
							{data.secondaryStart >= data.secondaryEnd && <CompletedCheck />}
						</span>
					</div>
					<RarityFilterIcons upgradesRarity={data.upgradesRarity} />
				</div>
			);
		}
		case PersonalGoalType.CharacterAbilities: {
			return (
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<span className="flex items-center">
						Active {data.activeStart}
						<ArrowRight className="mx-1 inline size-3" />
						{data.activeEnd}
						{data.activeStart >= data.activeEnd && <CompletedCheck />}
					</span>
					<span className="text-muted-foreground/40">|</span>
					<span className="flex items-center">
						Passive {data.passiveStart}
						<ArrowRight className="mx-1 inline size-3" />
						{data.passiveEnd}
						{data.passiveStart >= data.passiveEnd && <CompletedCheck />}
					</span>
				</div>
			);
		}
	}
}

function BadgeBreakdown({
	badges,
	alliance,
	coverage,
}: {
	badges: Record<Rarity, number>;
	alliance?: Alliance;
	coverage?: Record<Rarity, IRarityCoverage>;
}) {
	const nonZero = RARITIES.filter((r) => badges[r] > 0);
	if (nonZero.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{nonZero.map((rarity) => {
				const cov = coverage?.[rarity];
				const isFullyCovered = cov != null && cov.covered >= cov.needed;
				const label = alliance
					? `${rarity} ${alliance} badge`
					: `${rarity} badge`;
				const titleSuffix =
					cov != null ? ` (${cov.covered}/${cov.needed} in inventory)` : "";
				return (
					<span
						key={rarity}
						className="flex items-center gap-0.5"
						title={`${badges[rarity]} ${label}${badges[rarity] !== 1 ? "s" : ""}${titleSuffix}`}
					>
						<span className="relative shrink-0">
							{alliance ? (
								<img
									src={BADGE_URLS[alliance][rarity]}
									alt={label}
									width={16}
									height={16}
									loading="lazy"
								/>
							) : (
								<RarityIcon rarity={rarity} size={14} />
							)}
							{isFullyCovered && (
								<Check className="absolute -right-1 -bottom-1 size-2.5 text-emerald-400" />
							)}
						</span>
						<span
							className={cn(
								"text-xs",
								isFullyCovered ? "text-emerald-400" : "text-muted-foreground",
							)}
						>
							{rarity}
						</span>
					</span>
				);
			})}
		</div>
	);
}

function XpBookDisplay({
	estimate,
	xpBookCoverage,
}: {
	estimate: IGoalEstimate;
	xpBookCoverage?: IXpBookCoverage;
}) {
	const legCov = xpBookCoverage?.legendaryCoverage;
	const legFullyCovered = legCov != null && legCov.covered >= legCov.needed;
	const legTitleSuffix =
		legCov != null ? ` (${legCov.covered}/${legCov.needed} in inventory)` : "";

	const mythCov = xpBookCoverage?.mythicCoverage;
	const mythFullyCovered = mythCov != null && mythCov.covered >= mythCov.needed;
	const mythTitleSuffix =
		mythCov != null
			? ` (${mythCov.covered}/${mythCov.needed} in inventory)`
			: "";

	return (
		<span className="flex items-center gap-1 text-muted-foreground">
			<span
				className="flex items-center gap-0.5"
				title={`${estimate.xpBooksTotal} Legendary XP book${estimate.xpBooksTotal !== 1 ? "s" : ""} (12,500 XP each)${legTitleSuffix}`}
			>
				<span className="relative shrink-0">
					<img
						src={BOOK_URLS.Legendary}
						alt="Legendary XP book"
						width={14}
						height={14}
						loading="lazy"
					/>
					{legFullyCovered && (
						<Check className="absolute -right-1 -bottom-1 size-2.5 text-emerald-400" />
					)}
				</span>
				<span
					className={cn(
						"text-xs",
						legFullyCovered ? "text-emerald-400" : "text-muted-foreground",
					)}
				>
					{estimate.xpBooksTotal}
				</span>
			</span>
			{estimate.xpMythicBooksTotal != null && (
				<>
					<span className="text-muted-foreground/40">or</span>
					<span
						className="flex items-center gap-0.5"
						title={`${estimate.xpMythicBooksTotal} Mythic XP book${estimate.xpMythicBooksTotal !== 1 ? "s" : ""} (62,500 XP each)${mythTitleSuffix}`}
					>
						<span className="relative shrink-0">
							<img
								src={BOOK_URLS.Mythic}
								alt="Mythic XP book"
								width={14}
								height={14}
								loading="lazy"
							/>
							{mythFullyCovered && (
								<Check className="absolute -right-1 -bottom-1 size-2.5 text-emerald-400" />
							)}
						</span>
						<span
							className={cn(
								"text-xs",
								mythFullyCovered ? "text-emerald-400" : "text-muted-foreground",
							)}
						>
							{estimate.xpMythicBooksTotal}
						</span>
					</span>
				</>
			)}
		</span>
	);
}

function GoalEstimateDisplay({
	estimate,
	type,
	badgeCoverage,
	xpBookCoverage,
}: {
	estimate: IGoalEstimate;
	type: PersonalGoalType;
	badgeCoverage?: IBadgeCoverage;
	xpBookCoverage?: IXpBookCoverage;
}) {
	const isAbilityGoal =
		type === PersonalGoalType.CharacterAbilities ||
		type === PersonalGoalType.MowAbilities;

	const isDaysFinite =
		!isAbilityGoal &&
		Number.isFinite(estimate.daysTotal) &&
		estimate.daysTotal <= 99999;

	const completionDate = isDaysFinite ? new Date() : null;
	if (completionDate) {
		completionDate.setDate(completionDate.getDate() + estimate.daysTotal);
	}
	const dateStr = completionDate
		? completionDate.toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year:
					completionDate.getFullYear() !== new Date().getFullYear()
						? "numeric"
						: undefined,
			})
		: null;

	const abilitiesBadges = estimate.abilitiesEstimate?.badges;
	const mowBadges = estimate.mowEstimate?.badges;
	const gold =
		(estimate.abilitiesEstimate?.gold ?? 0) + (estimate.mowEstimate?.gold ?? 0);

	// Show energy tooltip when campaign nodes exist but no energy is configured
	const showEnergyHint =
		!isAbilityGoal &&
		estimate.hasLocations &&
		estimate.energyTotal === 0 &&
		!isDaysFinite;

	return (
		<div className="space-y-1.5">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
				{!isAbilityGoal &&
					(isDaysFinite ? (
						<>
							<span className="font-medium text-foreground">
								{estimate.daysTotal > 0
									? `~${Math.round(estimate.daysTotal)}d`
									: "Ready"}
							</span>
							{estimate.daysTotal > 0 && dateStr && (
								<span className="text-muted-foreground">est. {dateStr}</span>
							)}
						</>
					) : (
						<span className="font-medium text-muted-foreground">No source</span>
					))}
				{showEnergyHint && (
					<span
						className="flex items-center gap-1 text-amber-400"
						title="This character has campaign shard nodes. Add energy in Settings to speed up farming."
					>
						<Info className="size-3.5" />
						<span>Add shard energy</span>
					</span>
				)}
				{estimate.energyTotal > 0 && (
					<span
						className="flex items-center gap-1 text-muted-foreground"
						title="Total energy required"
					>
						<EnergyIcon size={14} />
						{estimate.energyTotal.toLocaleString()}
					</span>
				)}
				{estimate.xpBooksTotal > 0 && (
					<XpBookDisplay estimate={estimate} xpBookCoverage={xpBookCoverage} />
				)}
				{estimate.oTokensTotal > 0 && (
					<span
						className="text-muted-foreground"
						title="Onslaught tokens needed"
					>
						{estimate.oTokensTotal} tokens
					</span>
				)}
				{gold > 0 && (
					<span className="text-yellow-500/80" title="Gold required">
						{gold.toLocaleString()} gold
					</span>
				)}
			</div>
			{abilitiesBadges && (
				<BadgeBreakdown
					badges={abilitiesBadges}
					alliance={estimate.abilitiesEstimate?.alliance}
					coverage={badgeCoverage?.abilityCoverage}
				/>
			)}
			{mowBadges && (
				<BadgeBreakdown
					badges={mowBadges}
					coverage={badgeCoverage?.forgeCoverage}
				/>
			)}
		</div>
	);
}

export function GoalCard({
	goalId,
	type,
	unitId,
	unitName,
	priority,
	include,
	notes,
	data,
	estimate,
	badgeCoverage,
	xpBookCoverage,
	colorTint,
	isFirst,
	isLast,
	onslaughtActive,
	onEdit,
	onDelete,
	onToggleInclude,
	onToggleOnslaught,
	onMoveUp,
	onMoveDown,
}: GoalCardProps) {
	const [notesExpanded, setNotesExpanded] = useState(false);

	return (
		<Card
			className={cn(
				"relative transition-all",
				!include && "opacity-60",
				colorTint,
			)}
		>
			<CardContent className="space-y-3">
				{/* Top row: priority + unit name + actions */}
				<div className="flex items-start justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2.5">
						<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
							{priority}
						</span>
						<CharacterIcon unitId={unitId} size={30} />
						<div className="min-w-0">
							<p className="truncate font-medium text-foreground">{unitName}</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-0.5">
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => onMoveUp(goalId)}
							disabled={isFirst}
							title="Move up"
						>
							<ChevronUp className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => onMoveDown(goalId)}
							disabled={isLast}
							title="Move down"
						>
							<ChevronDown className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => onEdit(goalId)}
							title="Edit goal"
						>
							<Pencil className="size-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => onDelete(goalId)}
							title="Delete goal"
							className="text-destructive hover:text-destructive"
						>
							<Trash2 className="size-3.5" />
						</Button>
					</div>
				</div>

				{/* Goal type badge + include toggle + onslaught toggle */}
				<div className="flex flex-wrap items-center gap-2">
					<Badge
						variant="outline"
						className={cn("text-xs", goalTypeBadgeColor[type])}
					>
						{goalTypeLabels[type]}
					</Badge>
					<button
						type="button"
						onClick={() => onToggleInclude(goalId, !include)}
						className={cn(
							"text-xs transition-colors",
							include
								? "text-emerald-400 hover:text-emerald-300"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{include ? "Included in raids" : "Excluded from raids"}
					</button>
					{type === PersonalGoalType.Ascend && onToggleOnslaught && (
						<button
							type="button"
							onClick={() => onToggleOnslaught(goalId, !onslaughtActive)}
							className={cn(
								"text-xs transition-colors",
								onslaughtActive
									? "text-purple-400 hover:text-purple-300"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{onslaughtActive ? "Onslaught on" : "Onslaught off"}
						</button>
					)}
				</div>

				{/* Progress visualization */}
				<GoalProgress data={data} />

				{/* Estimation */}
				{estimate ? (
					<GoalEstimateDisplay
						estimate={estimate}
						type={type}
						badgeCoverage={badgeCoverage}
						xpBookCoverage={xpBookCoverage}
					/>
				) : (
					<div className="text-xs text-muted-foreground/60">
						Estimation available after sync
					</div>
				)}

				{/* Notes */}
				{notes && (
					<div>
						<button
							type="button"
							onClick={() => setNotesExpanded(!notesExpanded)}
							className="text-xs text-muted-foreground transition-colors hover:text-foreground"
						>
							{notesExpanded ? "Hide notes" : "Show notes"}
						</button>
						{notesExpanded && (
							<p className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">
								{notes}
							</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
