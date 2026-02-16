import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { RarityIcon } from "@/1-components/tacticus/RarityIcon";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/1-components/ui/alert-dialog";
import { Input } from "@/1-components/ui/input";
import { Label } from "@/1-components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select";
import { Textarea } from "@/1-components/ui/textarea";
import { PersonalGoalType, Rank, Rarity } from "@/4-lib/tacticus/enums";
import { goalTypeLabels } from "@/4-lib/tacticus/goals/types";
import { rankToString } from "@/4-lib/tacticus/rank-data";
import { rarityToMaxRank } from "@/4-lib/tacticus/rarity-data";
import type { RosterUnit } from "@/4-lib/tacticus/roster-utils";
import { unitById } from "@/4-lib/tacticus/unit-data";
import { cn } from "@/4-lib/utils";
import { api } from "~/_generated/api";

// All ranks excluding Locked
const allSelectableRanks = Object.entries(rankToString).filter(
	([key]) => Number(key) > 0,
);

const allRarities = [
	Rarity.Common,
	Rarity.Uncommon,
	Rarity.Rare,
	Rarity.Epic,
	Rarity.Legendary,
	Rarity.Mythic,
];

const rarityLabels: Record<Rarity, string> = {
	[Rarity.Common]: "Common",
	[Rarity.Uncommon]: "Uncommon",
	[Rarity.Rare]: "Rare",
	[Rarity.Epic]: "Epic",
	[Rarity.Legendary]: "Legendary",
	[Rarity.Mythic]: "Mythic",
};

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
	const parsed = JSON.parse(goal.data) as Record<string, unknown>;
	const [rankStart, setRankStart] = useState<number>(
		(parsed.rankStart as number) ?? 1,
	);
	const [rankEnd, setRankEnd] = useState<number>(
		(parsed.rankEnd as number) ?? 13,
	);
	const [primaryEnd, setPrimaryEnd] = useState<number>(
		(parsed.primaryEnd as number) ?? 1,
	);
	const [secondaryEnd, setSecondaryEnd] = useState<number>(
		(parsed.secondaryEnd as number) ?? 1,
	);
	const [activeEnd, setActiveEnd] = useState<number>(
		(parsed.activeEnd as number) ?? 1,
	);
	const [passiveEnd, setPassiveEnd] = useState<number>(
		(parsed.passiveEnd as number) ?? 1,
	);
	const [upgradesRarity, setUpgradesRarity] = useState<Rarity[]>(
		(parsed.upgradesRarity as Rarity[]) ?? [],
	);

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
			: (unit?.initialRarity ?? Rarity.Common);
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
								className="size-4 rounded border-border"
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
								{allRarities.map((rarity) => {
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
											{rarityLabels[rarity]}
										</label>
									);
								})}
							</div>
						</div>
					)}

					{/* Include in daily raids */}
					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							id={`${uid}-include-raids`}
							checked={include}
							onChange={(e) => setInclude(e.target.checked)}
							className="size-4 rounded border-border"
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
