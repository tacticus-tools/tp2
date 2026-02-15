import {
	ArrowRight,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Pencil,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { CharacterIcon } from "@/1-components/tacticus/CharacterIcon";
import { EnergyIcon } from "@/1-components/tacticus/EnergyIcon";
import { RankIcon } from "@/1-components/tacticus/RankIcon";
import { RarityIcon } from "@/1-components/tacticus/RarityIcon";
import { Badge } from "@/1-components/ui/badge";
import { Button } from "@/1-components/ui/button";
import { Card, CardContent } from "@/1-components/ui/card";
import {
	PersonalGoalType,
	type Rank,
	type Rarity,
	type RarityStars,
} from "@/4-lib/tacticus/enums";
import type { IGoalEstimate } from "@/4-lib/tacticus/goals/types";
import { goalTypeLabels } from "@/4-lib/tacticus/goals/types";
import { rankToString } from "@/4-lib/tacticus/rank-data";
import { cn } from "@/4-lib/utils";

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
	colorTint?: string;
	isFirst: boolean;
	isLast: boolean;
	onEdit: (goalId: string) => void;
	onDelete: (goalId: string) => void;
	onToggleInclude: (goalId: string, include: boolean) => void;
	onMoveUp: (goalId: string) => void;
	onMoveDown: (goalId: string) => void;
}

export type GoalData =
	| {
			type: PersonalGoalType.UpgradeRank;
			rankStart: Rank;
			rankEnd: Rank;
			upgradesRarity?: number[];
	  }
	| {
			type: PersonalGoalType.Ascend;
			rarityStart: Rarity;
			rarityEnd: Rarity;
			starsStart: RarityStars;
			starsEnd: RarityStars;
	  }
	| { type: PersonalGoalType.Unlock }
	| {
			type: PersonalGoalType.MowAbilities;
			primaryStart: number;
			primaryEnd: number;
			secondaryStart: number;
			secondaryEnd: number;
			upgradesRarity?: number[];
	  }
	| {
			type: PersonalGoalType.CharacterAbilities;
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

function RarityFilterIcons({ upgradesRarity }: { upgradesRarity?: number[] }) {
	if (!upgradesRarity || upgradesRarity.length === 0) return null;
	return (
		<div className="flex items-center gap-1">
			{upgradesRarity.map((r) => (
				<RarityIcon key={r} rarity={r as Rarity} size={16} />
			))}
		</div>
	);
}

function GoalProgress({ data }: { data: GoalData }) {
	switch (data.type) {
		case PersonalGoalType.UpgradeRank:
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
					</div>
					<RarityFilterIcons upgradesRarity={data.upgradesRarity} />
				</div>
			);
		case PersonalGoalType.Ascend:
			return (
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<span>Ascend to target rarity</span>
				</div>
			);
		case PersonalGoalType.Unlock:
			return (
				<div className="text-sm text-muted-foreground">Unlock character</div>
			);
		case PersonalGoalType.MowAbilities:
			return (
				<div className="space-y-1.5">
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<span>
							Primary {data.primaryStart}
							<ArrowRight className="mx-1 inline size-3" />
							{data.primaryEnd}
						</span>
						<span className="text-muted-foreground/40">|</span>
						<span>
							Secondary {data.secondaryStart}
							<ArrowRight className="mx-1 inline size-3" />
							{data.secondaryEnd}
						</span>
					</div>
					<RarityFilterIcons upgradesRarity={data.upgradesRarity} />
				</div>
			);
		case PersonalGoalType.CharacterAbilities:
			return (
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<span>
						Active {data.activeStart}
						<ArrowRight className="mx-1 inline size-3" />
						{data.activeEnd}
					</span>
					<span className="text-muted-foreground/40">|</span>
					<span>
						Passive {data.passiveStart}
						<ArrowRight className="mx-1 inline size-3" />
						{data.passiveEnd}
					</span>
				</div>
			);
	}
}

function GoalEstimateDisplay({ estimate }: { estimate: IGoalEstimate }) {
	const completionDate = new Date();
	completionDate.setDate(completionDate.getDate() + estimate.daysTotal);
	const dateStr = completionDate.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year:
			completionDate.getFullYear() !== new Date().getFullYear()
				? "numeric"
				: undefined,
	});

	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
			<span className="text-foreground font-medium">
				{estimate.daysTotal > 0
					? `~${Math.round(estimate.daysTotal)}d`
					: "Ready"}
			</span>
			{estimate.daysTotal > 0 && (
				<span className="text-muted-foreground">est. {dateStr}</span>
			)}
			{estimate.energyTotal > 0 && (
				<span className="flex items-center gap-1 text-muted-foreground">
					<EnergyIcon size={14} />
					{estimate.energyTotal.toLocaleString()}
				</span>
			)}
			{estimate.xpBooksTotal > 0 && (
				<span className="text-muted-foreground">
					{estimate.xpBooksTotal} books
				</span>
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
	colorTint,
	isFirst,
	isLast,
	onEdit,
	onDelete,
	onToggleInclude,
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
					<div className="flex items-center gap-2.5 min-w-0">
						<span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
							{priority}
						</span>
						<CharacterIcon unitId={unitId} size={30} />
						<div className="min-w-0">
							<p className="truncate font-medium text-foreground">{unitName}</p>
						</div>
					</div>
					<div className="flex items-center gap-0.5 shrink-0">
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

				{/* Goal type badge + include toggle */}
				<div className="flex items-center gap-2">
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
				</div>

				{/* Progress visualization */}
				<GoalProgress data={data} />

				{/* Estimation */}
				{estimate ? (
					<GoalEstimateDisplay estimate={estimate} />
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
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							{notesExpanded ? "Hide notes" : "Show notes"}
						</button>
						{notesExpanded && (
							<p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
								{notes}
							</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
