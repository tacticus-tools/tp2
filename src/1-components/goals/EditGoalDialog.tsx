import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import z from "zod";
import { RARITIES, type Rarity, RaritySchema } from "#common/rarity.ts";
import { RarityIcon } from "@/1-components/general/RarityIcon.tsx";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/1-components/ui/alert-dialog.tsx";
import { Input } from "@/1-components/ui/input.tsx";
import { Label } from "@/1-components/ui/label.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import { Textarea } from "@/1-components/ui/textarea.tsx";
import {
	PersonalGoalType,
	Rank,
	RarityStars,
} from "@/4-lib/general/constants.ts";
import { goalTypeLabels } from "@/4-lib/general/goals/types.ts";
import { rankToString } from "@/4-lib/general/rank-data.ts";
import { rarityToMaxRank } from "@/4-lib/general/rarity-data.ts";
import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
import { cn } from "@/4-lib/utils.ts";
import { unitById } from "@/5-assets/game-units/index.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

// All ranks excluding Locked
const allSelectableRanks = Object.entries(rankToString).filter(
	([key]) => Number(key) > 0,
);

const starsOptions = [
	{ value: RarityStars.None, label: "No stars" },
	{ value: RarityStars.OneStar, label: "\u2605" },
	{ value: RarityStars.TwoStars, label: "\u2605\u2605" },
	{ value: RarityStars.ThreeStars, label: "\u2605\u2605\u2605" },
	{ value: RarityStars.FourStars, label: "\u2605\u2605\u2605\u2605" },
	{ value: RarityStars.FiveStars, label: "\u2605\u2605\u2605\u2605\u2605" },
	{ value: RarityStars.RedOneStar, label: "\u2605 (Red)" },
	{ value: RarityStars.RedTwoStars, label: "\u2605\u2605 (Red)" },
	{ value: RarityStars.RedThreeStars, label: "\u2605\u2605\u2605 (Red)" },
	{ value: RarityStars.RedFourStars, label: "\u2605\u2605\u2605\u2605 (Red)" },
	{
		value: RarityStars.RedFiveStars,
		label: "\u2605\u2605\u2605\u2605\u2605 (Red)",
	},
	{ value: RarityStars.OneBlueStar, label: "\u2605 (Blue)" },
	{ value: RarityStars.TwoBlueStars, label: "\u2605\u2605 (Blue)" },
	{ value: RarityStars.ThreeBlueStars, label: "\u2605\u2605\u2605 (Blue)" },
	{ value: RarityStars.MythicWings, label: "Mythic Wings" },
];

interface EditGoalDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	goal: {
		goalId: string;
		type: PersonalGoalType;
		unitId: string;
		unitName: string;
		include: boolean;
		notes?: string;
		data: string;
	};
	roster: Map<string, RosterUnit>;
}

const GoalSchema = z.object({
	rankStart: z.int().optional().default(1),
	rankEnd: z.int().optional().default(13),
	primaryEnd: z.int().optional().default(1),
	secondaryEnd: z.int().optional().default(1),
	activeEnd: z.number().optional().default(1),
	passiveEnd: z.number().optional().default(1),
	upgradesRarity: z.array(RaritySchema).optional().default([]),
	onslaughtShards: z.number().optional().default(0),
	rarityEnd: RaritySchema.optional().default("Legendary"),
	starsEnd: z.nativeEnum(RarityStars).optional().default(RarityStars.None),
});

export function EditGoalDialog({
	open,
	onOpenChange,
	goal,
	roster,
}: EditGoalDialogProps) {
	const uid = useId();
	const [saving, setSaving] = useState(false);
	const [include, setInclude] = useState(goal.include);
	const [notes, setNotes] = useState(goal.notes ?? "");

	// Parse data fields
	const parsed = GoalSchema.parse(JSON.parse(goal.data));
	const [rankStart, setRankStart] = useState(parsed.rankStart);
	const [rankEnd, setRankEnd] = useState(parsed.rankEnd);
	const [primaryEnd, setPrimaryEnd] = useState(parsed.primaryEnd);
	const [secondaryEnd, setSecondaryEnd] = useState(parsed.secondaryEnd);
	const [activeEnd, setActiveEnd] = useState(parsed.activeEnd);
	const [passiveEnd, setPassiveEnd] = useState(parsed.passiveEnd);
	const [upgradesRarity, setUpgradesRarity] = useState(parsed.upgradesRarity);
	const [onslaughtShards, setOnslaughtShards] = useState(
		parsed.onslaughtShards,
	);
	const [rarityEnd, setRarityEnd] = useState(parsed.rarityEnd);
	const [starsEnd, setStarsEnd] = useState(parsed.starsEnd);

	// Override toggle
	const [overrideMode, setOverrideMode] = useState(false);

	const updateGoal = useMutation(api.goals.update);

	const hasRoster = roster.size > 0;

	// Compute max rank for this unit based on rarity (only when roster is available)
	const maxRank = useMemo(() => {
		if (!hasRoster) return Rank.Adamantine3;
		const rosterUnit = roster.get(goal.unitId);
		const unit = unitById.get(goal.unitId);
		const rarity = rosterUnit
			? rosterUnit.rarity
			: (unit?.initialRarity ?? "Common");
		return rarityToMaxRank[rarity];
	}, [goal.unitId, roster, hasRoster]);

	// Target rank: only ranks strictly greater than rankStart, capped by maxRank unless override
	const targetRanks = useMemo(() => {
		const cap = overrideMode || !hasRoster ? Rank.Adamantine3 : maxRank;
		return allSelectableRanks.filter(
			([key]) => Number(key) > rankStart && Number(key) <= cap,
		);
	}, [rankStart, maxRank, overrideMode, hasRoster]);

	// Clamp rankEnd when the cap shrinks (e.g. override off, roster change)
	useEffect(() => {
		if (overrideMode || !hasRoster) return;
		if (rankEnd > maxRank) {
			setRankEnd(maxRank);
		} else if (rankEnd <= rankStart && maxRank > rankStart) {
			setRankEnd((rankStart + 1) as Rank);
		}
	}, [rankStart, rankEnd, maxRank, overrideMode, hasRoster]);

	// Save button validation
	const isSaveDisabled = useMemo(() => {
		if (saving) return true;
		switch (goal.type) {
			case PersonalGoalType.UpgradeRank:
				return rankEnd <= rankStart;
			case PersonalGoalType.MowAbilities:
				return primaryEnd < 1 || secondaryEnd < 1;
			case PersonalGoalType.CharacterAbilities:
				return activeEnd < 1 || passiveEnd < 1;
			default:
				return false;
		}
	}, [
		saving,
		goal.type,
		rankStart,
		rankEnd,
		primaryEnd,
		secondaryEnd,
		activeEnd,
		passiveEnd,
	]);

	// Reset form when goal changes
	useEffect(() => {
		setInclude(goal.include);
		setNotes(goal.notes ?? "");
		const p = JSON.parse(goal.data) as Record<string, unknown>;
		setRankStart((p.rankStart as number) ?? 1);
		setRankEnd((p.rankEnd as number) ?? 13);
		setPrimaryEnd((p.primaryEnd as number) ?? 1);
		setSecondaryEnd((p.secondaryEnd as number) ?? 1);
		setActiveEnd((p.activeEnd as number) ?? 1);
		setPassiveEnd((p.passiveEnd as number) ?? 1);
		setUpgradesRarity((p.upgradesRarity as Rarity[]) ?? []);
		setOnslaughtShards((p.onslaughtShards as number) ?? 0);
		setRarityEnd((p.rarityEnd as Rarity) ?? "Legendary");
		setStarsEnd((p.starsEnd as RarityStars) ?? RarityStars.None);
		setOverrideMode(false);
	}, [goal]);

	function handleRankStartChange(value: string) {
		const newStart = Number(value) as Rank;
		setRankStart(newStart);
		if (rankEnd <= newStart) {
			setRankEnd(newStart + 1);
		}
	}

	function toggleRarity(rarity: Rarity) {
		setUpgradesRarity((prev) =>
			prev.includes(rarity)
				? prev.filter((r) => r !== rarity)
				: [...prev, rarity],
		);
	}

	// Clamp rankEnd when override turns off
	function handleOverrideToggle(checked: boolean) {
		setOverrideMode(checked);
		if (!checked && rankEnd > maxRank) {
			setRankEnd(maxRank);
		}
	}

	async function handleSave() {
		setSaving(true);
		try {
			let data: Record<string, unknown> = { ...parsed };

			switch (goal.type) {
				case PersonalGoalType.UpgradeRank:
					data = {
						...data,
						rankStart,
						rankEnd,
						upgradesRarity:
							upgradesRarity.length > 0 ? upgradesRarity : undefined,
					};
					break;
				case PersonalGoalType.Ascend:
					data = { ...data, rarityEnd, starsEnd, onslaughtShards };
					break;
				case PersonalGoalType.MowAbilities:
					data = {
						...data,
						primaryEnd,
						secondaryEnd,
						upgradesRarity:
							upgradesRarity.length > 0 ? upgradesRarity : undefined,
					};
					break;
				case PersonalGoalType.CharacterAbilities:
					data = { ...data, activeEnd, passiveEnd };
					break;
			}

			await updateGoal({
				goalId: goal.goalId,
				include,
				notes: notes.trim() || undefined,
				data: JSON.stringify(data),
			});

			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	}

	const showRarityFilter =
		goal.type === PersonalGoalType.UpgradeRank ||
		goal.type === PersonalGoalType.MowAbilities;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<AlertDialogHeader>
					<AlertDialogTitle>Edit Goal</AlertDialogTitle>
					<AlertDialogDescription>
						{goal.unitName} — {goalTypeLabels[goal.type]}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-4 py-2">
					{/* Override toggle — only shown when roster is populated */}
					{hasRoster && (
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								id={`${uid}-override`}
								checked={overrideMode}
								onChange={(e) => handleOverrideToggle(e.target.checked)}
								className="size-4 rounded-sm border-border"
							/>
							<Label
								htmlFor={`${uid}-override`}
								className="text-sm font-normal"
								title="Show locked characters and allow ranks beyond current rarity cap"
							>
								Override roster constraints
							</Label>
						</div>
					)}

					{/* Type-specific fields */}
					{goal.type === PersonalGoalType.UpgradeRank && (
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label>Start Rank</Label>
								<Select
									value={String(rankStart)}
									onValueChange={handleRankStartChange}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{allSelectableRanks.map(([key, label]) => (
											<SelectItem key={key} value={key}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Target Rank</Label>
								<Select
									value={String(rankEnd)}
									onValueChange={(v) => setRankEnd(Number(v) as Rank)}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{targetRanks.map(([key, label]) => (
											<SelectItem key={key} value={key}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					)}

					{goal.type === PersonalGoalType.MowAbilities && (
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label>Primary Target Level</Label>
								<Input
									type="number"
									min={1}
									max={50}
									value={primaryEnd}
									onChange={(e) => setPrimaryEnd(Number(e.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label>Secondary Target Level</Label>
								<Input
									type="number"
									min={1}
									max={50}
									value={secondaryEnd}
									onChange={(e) => setSecondaryEnd(Number(e.target.value))}
								/>
							</div>
						</div>
					)}

					{goal.type === PersonalGoalType.CharacterAbilities && (
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label>Active Target Level</Label>
								<Input
									type="number"
									min={1}
									max={50}
									value={activeEnd}
									onChange={(e) => setActiveEnd(Number(e.target.value))}
								/>
							</div>
							<div className="space-y-2">
								<Label>Passive Target Level</Label>
								<Input
									type="number"
									min={1}
									max={50}
									value={passiveEnd}
									onChange={(e) => setPassiveEnd(Number(e.target.value))}
								/>
							</div>
						</div>
					)}

					{/* Upgrades rarity filter */}
					{showRarityFilter && (
						<div className="space-y-2">
							<Label title="Limit which rarity of upgrade materials to include in the estimate. Useful for pre-farming Legendary upgrades.">
								Material Rarity Filter{" "}
								<span className="text-muted-foreground">(optional)</span>
							</Label>
							<div className="flex flex-wrap gap-2">
								{RARITIES.map((rarity) => {
									const checked = upgradesRarity.includes(rarity);
									return (
										<label
											key={rarity}
											className={cn(
												"flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
												checked
													? "border-primary bg-primary/10 text-foreground"
													: "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
											)}
										>
											<input
												type="checkbox"
												checked={checked}
												onChange={() => toggleRarity(rarity)}
												className="sr-only"
											/>
											<RarityIcon rarity={rarity} size={16} />
											{rarity}
										</label>
									);
								})}
							</div>
						</div>
					)}

					{/* Ascend fields */}
					{goal.type === PersonalGoalType.Ascend && (
						<>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label>Target Rarity</Label>
									<Select
										value={rarityEnd}
										onValueChange={(v) => setRarityEnd(RaritySchema.parse(v))}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{RARITIES.map((rarity) => (
												<SelectItem key={rarity} value={String(rarity)}>
													<span className="flex items-center gap-1.5">
														<RarityIcon rarity={rarity} size={16} />
														{rarity}
													</span>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Target Stars</Label>
									<Select
										value={String(starsEnd)}
										onValueChange={(v) => setStarsEnd(Number(v) as RarityStars)}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{starsOptions.map((opt) => (
												<SelectItem key={opt.value} value={String(opt.value)}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id={`${uid}-onslaught`}
									checked={onslaughtShards > 0}
									onChange={(e) => setOnslaughtShards(e.target.checked ? 1 : 0)}
									className="size-4 rounded-sm border-border"
								/>
								<Label
									htmlFor={`${uid}-onslaught`}
									className="text-sm font-normal"
								>
									Use onslaught tokens for regular shards
								</Label>
							</div>
						</>
					)}

					{/* Include in daily raids */}
					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							id={`${uid}-include-raids`}
							checked={include}
							onChange={(e) => setInclude(e.target.checked)}
							className="size-4 rounded-sm border-border"
						/>
						<Label
							htmlFor={`${uid}-include-raids`}
							className="text-sm font-normal"
						>
							Include in daily raids
						</Label>
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<Label>
							Notes <span className="text-muted-foreground">(optional)</span>
						</Label>
						<Textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Any notes about this goal..."
							rows={2}
						/>
					</div>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							handleSave();
						}}
						disabled={isSaveDisabled}
					>
						{saving ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Saving...
							</>
						) : (
							"Save Changes"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
