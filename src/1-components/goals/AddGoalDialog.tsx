import { useMutation } from "convex/react";
import { Loader2, Lock, Plus, Search, X } from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
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
	AlertDialogTrigger,
} from "@/1-components/ui/alert-dialog";
import { Button } from "@/1-components/ui/button";
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
import {
	CampaignsLocationsUsage,
	PersonalGoalType,
	Rank,
	Rarity,
} from "@/4-lib/tacticus/enums";
import { goalTypeLabels } from "@/4-lib/tacticus/goals/types";
import { rankToString } from "@/4-lib/tacticus/rank-data";
import { rarityToMaxRank } from "@/4-lib/tacticus/rarity-data";
import type { RosterUnit } from "@/4-lib/tacticus/roster-utils";
import {
	allGameUnitsSorted,
	type IGameUnit,
	unitById,
} from "@/4-lib/tacticus/unit-data";
import { cn } from "@/4-lib/utils";
import { api } from "~/_generated/api";

interface AddGoalDialogProps {
	goalCount: number;
	roster: Map<string, RosterUnit>;
}

// All ranks excluding Locked
const allSelectableRanks = Object.entries(rankToString).filter(
	([key]) => Number(key) > Rank.Locked,
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

export function AddGoalDialog({ goalCount, roster }: AddGoalDialogProps) {
	const uid = useId();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	// Form state
	const [goalType, setGoalType] = useState<PersonalGoalType>(
		PersonalGoalType.UpgradeRank,
	);
	const [selectedUnit, setSelectedUnit] = useState<IGameUnit | null>(null);
	const [notes, setNotes] = useState("");
	const [include, setInclude] = useState(true);

	// UpgradeRank fields
	const [rankStart, setRankStart] = useState<Rank>(Rank.Stone1);
	const [rankEnd, setRankEnd] = useState<Rank>(Rank.Gold1);

	// MoW fields
	const [primaryEnd, setPrimaryEnd] = useState(1);
	const [secondaryEnd, setSecondaryEnd] = useState(1);

	// Abilities fields
	const [activeEnd, setActiveEnd] = useState(1);
	const [passiveEnd, setPassiveEnd] = useState(1);

	// Upgrades rarity filter
	const [upgradesRarity, setUpgradesRarity] = useState<Rarity[]>([]);

	// Override toggle
	const [overrideMode, setOverrideMode] = useState(false);

	const addGoal = useMutation(api.goals.add);

	const [unitSearch, setUnitSearch] = useState("");
	const listRef = useRef<HTMLDivElement>(null);

	const hasRoster = roster.size > 0;

	// Compute max rank for selected unit based on rarity
	const maxRank = useMemo(() => {
		if (!selectedUnit) return Rank.Adamantine3;
		const rosterUnit = roster.get(selectedUnit.id);
		const rarity = rosterUnit
			? rosterUnit.rarity
			: (unitById.get(selectedUnit.id)?.initialRarity ?? Rarity.Common);
		return rarityToMaxRank[rarity];
	}, [selectedUnit, roster]);

	// Target rank: only ranks strictly greater than rankStart, capped by maxRank unless override
	const targetRanks = useMemo(() => {
		const cap = overrideMode ? Rank.Adamantine3 : maxRank;
		return allSelectableRanks.filter(
			([key]) => Number(key) > rankStart && Number(key) <= cap,
		);
	}, [rankStart, maxRank, overrideMode]);

	// Clamp rankEnd when the cap shrinks (e.g. unit/rarity change, override off)
	useEffect(() => {
		if (overrideMode) return;
		if (rankEnd > maxRank) {
			setRankEnd(maxRank);
		} else if (rankEnd <= rankStart && maxRank > rankStart) {
			setRankEnd((rankStart + 1) as Rank);
		}
	}, [rankStart, rankEnd, maxRank, overrideMode]);

	// Filter units based on goal type, search query, and roster
	const filteredUnits = useMemo(() => {
		const byType = allGameUnitsSorted.filter((u) =>
			goalType === PersonalGoalType.MowAbilities
				? u.unitType === "mow"
				: u.unitType === "character",
		);

		// When roster is populated and override is off, hide locked characters
		const byRoster =
			hasRoster && !overrideMode
				? byType.filter((u) => roster.has(u.id))
				: byType;

		if (!unitSearch.trim()) return byRoster;
		const q = unitSearch.toLowerCase();
		return byRoster.filter(
			(u) =>
				u.name.toLowerCase().includes(q) || u.faction.toLowerCase().includes(q),
		);
	}, [goalType, unitSearch, hasRoster, overrideMode, roster]);

	// Save button validation
	const isSaveDisabled = useMemo(() => {
		if (saving || !selectedUnit) return true;
		switch (goalType) {
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
		selectedUnit,
		goalType,
		rankStart,
		rankEnd,
		primaryEnd,
		secondaryEnd,
		activeEnd,
		passiveEnd,
	]);

	function handleUnitSelect(unit: IGameUnit) {
		setSelectedUnit(unit);
		setUnitSearch("");

		// Auto-set starting rank from roster
		const rosterUnit = roster.get(unit.id);
		if (rosterUnit) {
			setRankStart(rosterUnit.rank);
			// Auto-bump target rank if needed
			if (rankEnd <= rosterUnit.rank) {
				setRankEnd((rosterUnit.rank + 1) as Rank);
			}
		}
	}

	function handleRankStartChange(value: string) {
		const newStart = Number(value) as Rank;
		setRankStart(newStart);
		// Auto-bump target rank if needed
		if (rankEnd <= newStart) {
			setRankEnd((newStart + 1) as Rank);
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

	const resetForm = useCallback(() => {
		setGoalType(PersonalGoalType.UpgradeRank);
		setSelectedUnit(null);
		setUnitSearch("");
		setNotes("");
		setInclude(true);
		setRankStart(Rank.Stone1);
		setRankEnd(Rank.Gold1);
		setPrimaryEnd(1);
		setSecondaryEnd(1);
		setActiveEnd(1);
		setPassiveEnd(1);
		setUpgradesRarity([]);
		setOverrideMode(false);
	}, []);

	async function handleSave() {
		if (!selectedUnit) return;

		setSaving(true);
		try {
			let data: Record<string, unknown> = {};

			switch (goalType) {
				case PersonalGoalType.UpgradeRank:
					data = {
						type: goalType,
						rankStart,
						rankEnd,
						upgradesRarity:
							upgradesRarity.length > 0 ? upgradesRarity : undefined,
					};
					break;
				case PersonalGoalType.Ascend:
					data = { type: goalType };
					break;
				case PersonalGoalType.Unlock:
					data = {
						type: goalType,
						campaignsUsage: CampaignsLocationsUsage.LeastEnergy,
					};
					break;
				case PersonalGoalType.MowAbilities:
					data = {
						type: goalType,
						primaryStart: 0,
						primaryEnd,
						secondaryStart: 0,
						secondaryEnd,
						upgradesRarity:
							upgradesRarity.length > 0 ? upgradesRarity : undefined,
					};
					break;
				case PersonalGoalType.CharacterAbilities:
					data = {
						type: goalType,
						activeStart: 0,
						activeEnd,
						passiveStart: 0,
						passiveEnd,
					};
					break;
			}

			await addGoal({
				goalId: crypto.randomUUID(),
				type: goalType,
				unitId: selectedUnit.id,
				unitName: selectedUnit.name,
				priority: goalCount + 1,
				include,
				notes: notes.trim() || undefined,
				data: JSON.stringify(data),
			});

			resetForm();
			setOpen(false);
		} finally {
			setSaving(false);
		}
	}

	const showRarityFilter =
		goalType === PersonalGoalType.UpgradeRank ||
		goalType === PersonalGoalType.MowAbilities;

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) resetForm();
			}}
		>
			<AlertDialogTrigger asChild>
				<Button size="sm">
					<Plus className="size-4" />
					<span className="hidden sm:inline">Add Goal</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<AlertDialogHeader>
					<AlertDialogTitle>Add Goal</AlertDialogTitle>
					<AlertDialogDescription>
						Set a new goal for one of your characters.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-4 py-2">
					{/* Goal Type */}
					<div className="space-y-2">
						<Label>Goal Type</Label>
						<Select
							value={String(goalType)}
							onValueChange={(v) => {
								const newType = Number(v) as PersonalGoalType;
								setGoalType(newType);
								// Clear unit when switching between MoW and character goal types
								setSelectedUnit(null);
								setUpgradesRarity([]);
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(goalTypeLabels).map(([key, label]) => (
									<SelectItem key={key} value={key}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

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

					{/* Unit Picker */}
					<div className="space-y-2">
						<Label>Character / Unit</Label>
						{selectedUnit ? (
							<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
								{hasRoster && !roster.has(selectedUnit.id) && (
									<Lock className="size-3.5 text-muted-foreground shrink-0" />
								)}
								<span className="text-sm font-medium">{selectedUnit.name}</span>
								<span className="text-xs text-muted-foreground">
									{selectedUnit.faction}
								</span>
								<button
									type="button"
									onClick={() => {
										setSelectedUnit(null);
										setUnitSearch("");
									}}
									className="ml-auto text-muted-foreground hover:text-foreground"
								>
									<X className="size-4" />
								</button>
							</div>
						) : (
							<>
								<div className="relative">
									<Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										placeholder="Search units..."
										value={unitSearch}
										onChange={(e) => setUnitSearch(e.target.value)}
										className="pl-9"
									/>
								</div>
								<div
									ref={listRef}
									className="max-h-40 overflow-y-auto rounded-md border border-border"
								>
									{filteredUnits.length === 0 ? (
										<div className="py-3 text-center text-sm text-muted-foreground">
											No units found
										</div>
									) : (
										filteredUnits.map((unit) => {
											const isLocked = hasRoster && !roster.has(unit.id);
											return (
												<button
													key={unit.id}
													type="button"
													onClick={() => handleUnitSelect(unit)}
													className={cn(
														"flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent",
													)}
												>
													{isLocked && (
														<Lock className="size-3.5 text-muted-foreground shrink-0" />
													)}
													<span>{unit.name}</span>
													<span className="ml-auto text-xs text-muted-foreground">
														{unit.faction}
													</span>
												</button>
											);
										})
									)}
								</div>
							</>
						)}
					</div>

					{/* Type-specific fields */}
					{goalType === PersonalGoalType.UpgradeRank && (
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

					{goalType === PersonalGoalType.MowAbilities && (
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

					{goalType === PersonalGoalType.CharacterAbilities && (
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
					<AlertDialogCancel onClick={resetForm}>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={handleSave} disabled={isSaveDisabled}>
						{saving ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Saving...
							</>
						) : (
							"Add Goal"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
