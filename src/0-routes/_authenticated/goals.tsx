import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	LayoutGrid,
	Loader2,
	Palette,
	Settings,
	Table,
	Target,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CampaignsLocationsUsage } from "#common/campaigns-locations-usage.ts";
import {
	PersonalGoalType as GoalType,
	type PersonalGoalType,
} from "#common/goal-type.ts";
import { AddGoalDialog } from "@/1-components/goals/AddGoalDialog.tsx";
import { DailyRaidsPlan } from "@/1-components/goals/DailyRaidsPlan.tsx";
import { EditGoalDialog } from "@/1-components/goals/EditGoalDialog.tsx";
import { GoalCard, type GoalData } from "@/1-components/goals/GoalCard.tsx";
import { GoalSettingsForm } from "@/1-components/goals/GoalSettingsForm.tsx";
import { GoalsTable } from "@/1-components/goals/GoalsTable.tsx";
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
} from "@/1-components/ui/alert-dialog.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/1-components/ui/popover.tsx";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/1-components/ui/tabs.tsx";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore.ts";
import {
	useGoalPreferencesStore,
	useHasHydrated,
} from "@/3-hooks/useGoalPreferencesStore.ts";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
import {
	allocateBadgesToGoals,
	allocateXpBooksToGoals,
	buildBadgeInventory,
	buildXpBookInventory,
} from "@/4-lib/general/badge-inventory.ts";
import { detectCampaignEvent } from "@/4-lib/general/campaign-events.ts";
import {
	buildInventoryMap,
	parseBattleAttempts,
	parseCampaignProgress,
	parseTodayActivity,
} from "@/4-lib/general/campaign-progress.ts";
import { generateDailyRaidsPlan } from "@/4-lib/general/daily-raids/service.ts";
import type { IDailyRaidsPlan } from "@/4-lib/general/daily-raids/types.ts";
import {
	calculateAllGoalEstimates,
	type PlayerContext,
} from "@/4-lib/general/goals/goals-service.ts";
import type {
	CharacterRaidGoalSelect,
	IGoalEstimate,
} from "@/4-lib/general/goals/types.ts";
import { goalTypeLabels } from "@/4-lib/general/goals/types.ts";
import { parsePlannerExport } from "@/4-lib/general/import-planner.ts";
import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
import { GoalDataSchema } from "@/4-lib/general/schemas.ts";
import { unitById } from "@/5-assets/game-units/index.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export const Route = createFileRoute("/_authenticated/goals")({
	component: GoalsPage,
});

const COLOR_MODE_LABELS = ["Off", "Battle Pass", "Guild Raid"] as const;

/**
 * Returns a subtle background tint class based on estimated days and color mode.
 * Mode 0: none
 * Mode 1: Battle Pass season (~30 day cycle) — green/yellow/red
 * Mode 2: Guild Raid season (~14 day cycle) — green/yellow/red
 */
function getColorTint(
	estimate: IGoalEstimate | undefined,
	colorMode: number,
): string {
	if (colorMode === 0 || !estimate) return "";
	const days = estimate.daysTotal;
	const threshold = colorMode === 1 ? 30 : 14;

	if (days <= 0) return "ring-1 ring-emerald-500/30 bg-emerald-500/5";
	if (days <= threshold * 0.5)
		return "ring-1 ring-emerald-500/20 bg-emerald-500/5";
	if (days <= threshold) return "ring-1 ring-amber-500/20 bg-amber-500/5";
	return "ring-1 ring-red-500/20 bg-red-500/5";
}

/**
 * Build typed goals from stored Convex data, applying roster overrides.
 * If the player's current rank (from sync) is higher than the stored rankStart,
 * use the roster rank so estimates reflect in-game progress.
 */
function buildTypedGoals(
	goals: {
		goalId: string;
		unitId: string;
		unitName: string;
		priority: number;
		include: boolean;
		notes?: string;
		type: string;
		data: string;
	}[],
	roster: Record<string, RosterUnit> | null,
): CharacterRaidGoalSelect[] {
	return goals.map((goal) => {
		const parsed = GoalDataSchema.parse(JSON.parse(goal.data));

		// Sync UpgradeRank starting state from roster
		if (goal.type === GoalType.UpgradeRank && roster) {
			const rosterUnit = roster[goal.unitId];
			if (rosterUnit) {
				const storedRankStart = parsed.rankStart ?? 0;
				if (rosterUnit.rank > storedRankStart) {
					parsed.rankStart = rosterUnit.rank;
				}
				parsed.rarity = rosterUnit.rarity;
				parsed.level = rosterUnit.level;
				parsed.xp = rosterUnit.xp;
				// Sync applied upgrades so estimation skips already-equipped materials
				if (rosterUnit.rank === (parsed.rankStart ?? 0)) {
					parsed.appliedUpgrades = rosterUnit.appliedUpgrades;
				}
			}
		}

		// Sync Ascend starting state from roster + backfill onslaught defaults
		if (goal.type === GoalType.Ascend) {
			parsed.onslaughtShards ??= 1;
			parsed.onslaughtMythicShards ??= 1;
			parsed.campaignsUsage ??= CampaignsLocationsUsage.LeastEnergy;
			if (roster) {
				const rosterUnit = roster[goal.unitId];
				if (rosterUnit) {
					parsed.rarityStart = rosterUnit.rarity;
					parsed.starsStart = rosterUnit.stars;
					parsed.shards = rosterUnit.shards;
					parsed.mythicShards = rosterUnit.mythicShards;
				}
			}
		}

		// Sync Abilities starting state from roster
		if (goal.type === GoalType.CharacterAbilities && roster) {
			const rosterUnit = roster[goal.unitId];
			if (rosterUnit) {
				parsed.activeStart = rosterUnit.abilities[0];
				parsed.passiveStart = rosterUnit.abilities[1];
				parsed.level = rosterUnit.level;
				parsed.xp = rosterUnit.xp;
			}
		}

		const unitData = unitById[goal.unitId];

		return {
			...parsed,
			priority: goal.priority,
			include: goal.include,
			goalId: goal.goalId,
			unitId: goal.unitId,
			unitName: goal.unitName,
			unitAlliance: unitData?.alliance ?? ("Imperial" as const),
			notes: goal.notes ?? "",
			type: goal.type,
		} as CharacterRaidGoalSelect;
	});
}

function GoalsPage() {
	const goals = useQuery(api.goals.list);
	const removeGoal = useMutation(api.goals.remove);
	const removeAllGoals = useMutation(api.goals.removeAll);
	const updateGoal = useMutation(api.goals.update);
	const reorderGoals = useMutation(api.goals.reorder);
	const importAll = useMutation(api.import.importAll);

	// Shared player data store (roster, campaign progress, inventory)
	const roster = usePlayerDataStore((s) => s.roster);
	const campaignProgress = usePlayerDataStore((s) => s.campaignProgress);
	const inventory = usePlayerDataStore((s) => s.inventory);
	const syncing = usePlayerDataStore((s) => s.syncing);
	const lastSyncedAt = usePlayerDataStore((s) => s.lastSyncedAt);

	const [editingGoal, setEditingGoal] = useState<{
		goalId: string;
		type: PersonalGoalType;
		unitId: string;
		unitName: string;
		include: boolean;
		notes?: string;
		data: string;
	} | null>(null);
	const [importing, setImporting] = useState(false);
	const [importResult, setImportResult] = useState<{
		goals: number;
		campaigns: number;
		snapshots: number;
		lreEvents: number;
		lreTeams: number;
		skipped: string[];
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Persisted campaign progress (includes manually-entered event campaign data)
	const persistedProgress = useCampaignProgressStore((s) => s.progress);

	const hasHydrated = useHasHydrated();
	const dailyEnergy = useGoalPreferencesStore((s) => s.dailyEnergy);
	const shardsEnergy = useGoalPreferencesStore((s) => s.shardsEnergy);
	const tableView = useGoalPreferencesStore((s) => s.goalsTableView);
	const setTableView = useGoalPreferencesStore((s) => s.setGoalsTableView);
	const colorMode = useGoalPreferencesStore((s) => s.goalColorMode);
	const setColorMode = useGoalPreferencesStore((s) => s.setGoalColorMode);
	const farmStrategy = useGoalPreferencesStore((s) => s.farmStrategy);
	const farmOrder = useGoalPreferencesStore((s) => s.farmOrder);
	const viewMode = useGoalPreferencesStore((s) => s.goalsViewMode);
	const setViewMode = useGoalPreferencesStore((s) => s.setGoalsViewMode);
	const campaignEventEnabled = useGoalPreferencesStore(
		(s) => s.campaignEventEnabled,
	);
	const homeScreenEvent = useGoalPreferencesStore((s) => s.homeScreenEvent);
	const hseMinEnemyCount = useGoalPreferencesStore((s) => s.hseMinEnemyCount);
	const settingsVersion = useGoalPreferencesStore((s) => s.settingsVersion);
	const customFarmSelections = useGoalPreferencesStore(
		(s) => s.customFarmSelections,
	);
	const goalTypeFilter = useGoalPreferencesStore((s) => s.goalTypeFilter);
	const toggleGoalTypeFilter = useGoalPreferencesStore(
		(s) => s.toggleGoalTypeFilter,
	);
	const clearGoalTypeFilter = useGoalPreferencesStore(
		(s) => s.clearGoalTypeFilter,
	);

	const isLoading = goals === undefined;
	const goalCount = goals?.length ?? 0;

	// Derive player context from store for estimation pipeline
	// Merges API-derived progress with persisted progress (includes manual event entries)
	const playerContext: PlayerContext = (() => {
		const ctx: PlayerContext = {};
		const apiProgress = parseCampaignProgress(campaignProgress);
		// Start with persisted progress (includes manually-entered event campaigns)
		const merged: Record<string, number> = {};
		for (const [campaign, nodes] of Object.entries(persistedProgress)) {
			if (nodes > 0) merged[campaign] = nodes;
		}
		// API progress overwrites persisted for trackable campaigns
		for (const [campaign, nodes] of Object.entries(apiProgress)) {
			merged[campaign] = nodes;
		}
		if (Object.keys(merged).length > 0) {
			ctx.campaignProgress = merged;
		}
		if (inventory) {
			ctx.inventory = buildInventoryMap(inventory.upgrades);
		}
		// Auto-detect active campaign event from API progress (user can disable)
		ctx.campaignEvent = campaignEventEnabled
			? detectCampaignEvent(apiProgress)
			: "none";
		return ctx;
	})();

	// Track when the initial data sync attempt completes (success or failure)
	// so we don't compute estimates/daily-raids with empty inventory before data arrives.
	const [initialSyncDone, setInitialSyncDone] = useState(false);

	// Calculate estimates for all goals — uses real campaign/recipe data.
	// Goals are processed sequentially in priority order with a shared mutable
	// inventory so lower-priority goals see reduced materials.
	const [activeEstimates, setActiveEstimates] = useState<
		Record<string, IGoalEstimate>
	>({});

	// Daily raids plan — computed in the estimates effect below.
	const [raidsPlan, setRaidsPlan] = useState<IDailyRaidsPlan | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: settingsVersion is an intentional cache-buster
	useEffect(() => {
		if (!goals || !hasHydrated || !initialSyncDone) {
			setActiveEstimates({});
			setRaidsPlan(null);
			return;
		}

		const typedGoals = buildTypedGoals(goals, roster);

		// 1. Run the daily raids simulation (always, not just in dailyRaids view).
		//    This produces the day-by-day schedule from which we extract accurate
		//    daysTotal/daysLeft for UpgradeRank goals.
		const progress = playerContext.campaignProgress ?? {};
		const inv = playerContext.inventory ?? {};
		const attempts = parseBattleAttempts(campaignProgress);

		const plan = generateDailyRaidsPlan(
			typedGoals,
			dailyEnergy,
			progress,
			inv,
			farmStrategy,
			farmOrder,
			playerContext.campaignEvent ?? "none",
			homeScreenEvent,
			hseMinEnemyCount,
			attempts,
			customFarmSelections,
		);
		setRaidsPlan(plan);

		// 2. Extract daysTotal/daysLeft from the plan for each UpgradeRank goal.
		//    daysTotal = number of days this goal has materials being farmed.
		//    daysLeft  = firstFarmDay + daysTotal (absolute completion day).
		//    Only count days with actual raids (raidsCount > 0), not zero-attempt
		//    placeholders or finished-material injections.
		const hasRealRaids = (day: (typeof plan.days)[number], goalId: string) =>
			day.raids.some(
				(raid) =>
					raid.goalId === goalId &&
					raid.raidLocations.some((loc) => loc.raidsCount > 0),
			);
		const planDays: Record<string, { daysTotal: number; daysLeft: number }> =
			{};
		for (const goal of typedGoals) {
			if (goal.type !== GoalType.UpgradeRank) continue;
			const goalId = goal.goalId;
			const firstFarmDay = plan.days.findIndex((day) =>
				hasRealRaids(day, goalId),
			);
			const farmDayCount = plan.days.filter((day) =>
				hasRealRaids(day, goalId),
			).length;
			planDays[goalId] = {
				daysTotal: farmDayCount,
				daysLeft: firstFarmDay >= 0 ? firstFarmDay + farmDayCount : 0,
			};
		}

		// 3. Compute estimates (energy, XP, badges, and non-UpgradeRank goals).
		const results = calculateAllGoalEstimates(
			typedGoals,
			dailyEnergy,
			shardsEnergy,
			playerContext,
		);

		// 4. Override UpgradeRank estimates with simulation-derived values,
		//    then recompute cumulative finishByDay so it stays monotonic.
		for (const est of results) {
			const pd = planDays[est.goalId];
			if (pd) {
				est.daysTotal = pd.daysTotal;
				est.daysLeft = pd.daysLeft;
				est.finishByDay = pd.daysLeft;
			}
		}
		let cumulativeFinishDay = 0;
		for (const est of results) {
			cumulativeFinishDay = Math.max(cumulativeFinishDay, est.finishByDay);
			est.finishByDay = cumulativeFinishDay;
		}

		const estimateRecord: Record<string, IGoalEstimate> = {};
		for (const est of results) {
			estimateRecord[est.goalId] = est;
		}
		setActiveEstimates(estimateRecord);
	}, [
		goals,
		dailyEnergy,
		shardsEnergy,
		roster,
		farmStrategy,
		farmOrder,
		customFarmSelections,
		homeScreenEvent,
		hseMinEnemyCount,
		hasHydrated,
		initialSyncDone,
		settingsVersion,
		campaignProgress,
		persistedProgress,
		inventory,
		campaignEventEnabled,
	]);

	// Badge coverage: allocate inventory badges to goals in priority order
	const badgeCoverageMap = (() => {
		if (!inventory || !goals || Object.keys(activeEstimates).length === 0)
			return {};
		const pools = buildBadgeInventory(inventory);
		const sortedGoalIds = [...goals]
			.sort((a, b) => a.priority - b.priority)
			.map((g) => g.goalId);
		return allocateBadgesToGoals(sortedGoalIds, activeEstimates, pools);
	})();

	// XP book coverage: allocate inventory XP books to goals in priority order
	const xpBookCoverageMap = (() => {
		if (!inventory || !goals || Object.keys(activeEstimates).length === 0)
			return {};
		const pools = buildXpBookInventory(inventory);
		const sortedGoalIds = [...goals]
			.sort((a, b) => a.priority - b.priority)
			.map((g) => g.goalId);
		return allocateXpBooksToGoals(sortedGoalIds, activeEstimates, pools);
	})();

	// Compute today's activity from ALL campaign nodes (plan + non-plan farming)
	const todayActivity = parseTodayActivity(campaignProgress);

	const handleEdit = (goalId: string) => {
		const goal = goals?.find((g) => g.goalId === goalId);
		if (goal) {
			setEditingGoal({
				goalId: goal.goalId,
				type: goal.type as PersonalGoalType,
				unitId: goal.unitId,
				unitName: goal.unitName,
				include: goal.include,
				notes: goal.notes,
				data: goal.data,
			});
		}
	};

	const handleDelete = async (goalId: string) => {
		await removeGoal({ goalId });
	};

	const handleToggleInclude = async (goalId: string, include: boolean) => {
		await updateGoal({ goalId, include });
	};

	const handleToggleOnslaught = async (goalId: string, enabled: boolean) => {
		const goal = goals?.find((g) => g.goalId === goalId);
		if (!goal) return;
		const parsed = GoalDataSchema.parse(JSON.parse(goal.data));
		parsed.onslaughtShards = enabled ? 1 : 0;
		await updateGoal({ goalId, data: JSON.stringify(parsed) });
	};

	const handleMoveUp = async (goalId: string) => {
		if (!goals) return;
		const ids = goals.map((g) => g.goalId);
		const idx = ids.indexOf(goalId);
		if (idx <= 0) return;
		[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
		await reorderGoals({ goalIds: ids });
	};

	const handleMoveDown = async (goalId: string) => {
		if (!goals) return;
		const ids = goals.map((g) => g.goalId);
		const idx = ids.indexOf(goalId);
		if (idx < 0 || idx >= ids.length - 1) return;
		[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
		await reorderGoals({ goalIds: ids });
	};

	// Wait for initial data sync (triggered by SyncButton in header) before
	// computing estimates/daily-raids so they use real inventory data.
	const hasSyncStarted = useRef(lastSyncedAt !== null);
	useEffect(() => {
		if (initialSyncDone) return;
		if (lastSyncedAt !== null) {
			setInitialSyncDone(true);
		} else if (syncing) {
			hasSyncStarted.current = true;
		} else if (hasSyncStarted.current) {
			// Sync started and ended without success — proceed with empty data
			setInitialSyncDone(true);
		}
	}, [lastSyncedAt, syncing, initialSyncDone]);

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setImporting(true);
		setImportResult(null);
		try {
			const text = await file.text();
			const result = parsePlannerExport(text);

			const hasAnyData =
				result.goals.length > 0 ||
				result.campaignProgress !== null ||
				result.rosterSnapshots !== null ||
				(result.lreProgress !== null && result.lreProgress.length > 0) ||
				(result.lreTeams !== null && result.lreTeams.length > 0);

			if (!hasAnyData) {
				setImportResult({
					goals: 0,
					campaigns: 0,
					snapshots: 0,
					lreEvents: 0,
					lreTeams: 0,
					skipped: result.skipped,
				});
				return;
			}

			await importAll({
				goals: result.goals.length > 0 ? result.goals : undefined,
				campaignProgress: result.campaignProgress
					? JSON.stringify(result.campaignProgress)
					: undefined,
				rosterSnapshots: result.rosterSnapshots ?? undefined,
				lreProgress:
					result.lreProgress && result.lreProgress.length > 0
						? result.lreProgress
						: undefined,
				lreTeams:
					result.lreTeams && result.lreTeams.length > 0
						? result.lreTeams
						: undefined,
			});

			// Update the Zustand campaign progress store so the campaigns page
			// reflects imported data immediately (without needing an API sync)
			if (result.campaignProgress) {
				useCampaignProgressStore.setState({
					progress: result.campaignProgress,
				});
			}

			setImportResult({
				goals: result.goals.length,
				campaigns: result.campaignProgress
					? Object.keys(result.campaignProgress).length
					: 0,
				snapshots: result.rosterSnapshots ? 1 : 0,
				lreEvents: result.lreProgress?.length ?? 0,
				lreTeams: result.lreTeams?.length ?? 0,
				skipped: result.skipped,
			});
		} catch {
			setImportResult({
				goals: 0,
				campaigns: 0,
				snapshots: 0,
				lreEvents: 0,
				lreTeams: 0,
				skipped: [
					"Failed to parse file. Make sure it's a valid Tacticus Planner export.",
				],
			});
		} finally {
			setImporting(false);
			// Reset file input so the same file can be re-selected
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	function buildGoalCardData(
		data: string,
		type: string,
		unitId: string,
	): GoalData {
		const parsed = GoalDataSchema.parse(JSON.parse(data));
		if (roster) {
			const rosterUnit = roster[unitId];
			if (rosterUnit) {
				if (type === GoalType.Ascend) {
					parsed.rarityStart = rosterUnit.rarity;
					parsed.starsStart = rosterUnit.stars;
				}
				if (type === GoalType.CharacterAbilities) {
					parsed.activeStart = rosterUnit.abilities[0];
					parsed.passiveStart = rosterUnit.abilities[1];
				}
				if (type === GoalType.UpgradeRank) {
					const storedRankStart = parsed.rankStart ?? 0;
					if (rosterUnit.rank > storedRankStart) {
						parsed.rankStart = rosterUnit.rank;
					}
				}
			}
		}
		return { ...parsed, type } as GoalData;
	}

	// Apply goal type filter for display (doesn't affect estimates or daily raids)
	const filteredGoals = (() => {
		if (!goals || goalTypeFilter.length === 0) return goals;
		return goals.filter((g) => goalTypeFilter.includes(g.type as GoalType));
	})();

	const goalIds = goals?.map((g) => g.goalId) ?? [];
	const isFirstGoal = (id: string) => goalIds[0] === id;
	const isLastGoal = (id: string) => goalIds[goalIds.length - 1] === id;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight">
							Goals / Daily Raids
						</h1>
						{goalCount > 0 && <Badge variant="secondary">{goalCount}</Badge>}
					</div>
					<p className="text-muted-foreground">
						Plan and track your character progression.
					</p>
				</div>

				{/* Toolbar */}
				<div className="flex flex-wrap items-center gap-2">
					{goalCount > 0 && (
						<>
							{/* Color mode toggle — only in Goals view */}
							{viewMode === "goals" && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setColorMode((colorMode + 1) % 3)}
									title={`Color: ${COLOR_MODE_LABELS[colorMode]}`}
									aria-label={`Color: ${COLOR_MODE_LABELS[colorMode]}`}
								>
									<Palette className="size-4" />
									<span className="hidden sm:inline">
										{COLOR_MODE_LABELS[colorMode]}
									</span>
								</Button>
							)}

							{/* View toggle — only in Goals view, hidden on mobile */}
							{viewMode === "goals" && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setTableView(!tableView)}
									title={tableView ? "Card view" : "Table view"}
									aria-label={tableView ? "Card view" : "Table view"}
									className="hidden md:inline-flex"
								>
									{tableView ? (
										<LayoutGrid className="size-4" />
									) : (
										<Table className="size-4" />
									)}
								</Button>
							)}

							{/* Settings popover */}
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										title="Raid settings"
										aria-label="Raid settings"
									>
										<Settings className="size-4" />
										<span className="hidden sm:inline">Settings</span>
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-80" align="end">
									<div className="mb-3 text-sm font-medium">Raid Settings</div>
									<GoalSettingsForm
										detectedCampaignEvent={
											playerContext.campaignEvent ?? "none"
										}
									/>
								</PopoverContent>
							</Popover>
						</>
					)}

					<AddGoalDialog goalCount={goalCount} roster={roster} />

					{/* Import from Tacticus Planner */}
					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						onChange={handleImport}
						className="hidden"
					/>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								disabled={importing}
								aria-label={importing ? "Importing..." : "Import"}
							>
								<Upload className="size-4" />
								<span className="hidden sm:inline">
									{importing ? "Importing..." : "Import"}
								</span>
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									Import from Tacticus Planner
								</AlertDialogTitle>
								<AlertDialogDescription>
									Import your data from a Tacticus Planner export file (.json).
									This will import goals, campaign progress, roster snapshots,
									LRE progress, and LRE teams. Existing data in imported
									sections will be replaced.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => fileInputRef.current?.click()}
								>
									Choose File
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>

					{goalCount > 0 && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline" size="sm" aria-label="Delete All">
									<Trash2 className="size-4" />
									<span className="hidden sm:inline">Delete All</span>
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete all goals?</AlertDialogTitle>
									<AlertDialogDescription>
										This will permanently delete all {goalCount} goals. This
										action cannot be undone.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => removeAllGoals({})}
										className="bg-destructive text-white hover:bg-destructive/90"
									>
										Delete All
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</div>
			</div>

			{/* Import result */}
			{importResult && (
				<div className="rounded-lg border border-border bg-muted/30 p-4">
					<div className="flex items-start justify-between gap-2">
						<div className="space-y-1">
							{importResult.goals > 0 ||
							importResult.campaigns > 0 ||
							importResult.snapshots > 0 ||
							importResult.lreEvents > 0 ||
							importResult.lreTeams > 0 ? (
								<p className="text-sm font-medium text-emerald-400">
									Imported:{" "}
									{[
										importResult.goals > 0 && `${importResult.goals} goals`,
										importResult.campaigns > 0 &&
											`${importResult.campaigns} campaigns`,
										importResult.snapshots > 0 &&
											`${importResult.snapshots} roster snapshot`,
										importResult.lreEvents > 0 &&
											`${importResult.lreEvents} LRE events`,
										importResult.lreTeams > 0 &&
											`${importResult.lreTeams} LRE teams`,
									]
										.filter(Boolean)
										.join(", ")}
								</p>
							) : (
								<p className="text-sm font-medium text-destructive">
									No data was imported.
								</p>
							)}
							{importResult.skipped.length > 0 && (
								<p className="text-xs text-muted-foreground">
									Skipped: {importResult.skipped.join(", ")}
								</p>
							)}
						</div>
						<button
							type="button"
							onClick={() => setImportResult(null)}
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							Dismiss
						</button>
					</div>
				</div>
			)}

			{/* Content — wait for goals, Zustand hydration, and initial sync */}
			{isLoading || !hasHydrated || !initialSyncDone ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			) : goalCount === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
					<div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50">
						<Target className="size-8 text-muted-foreground" />
					</div>
					<h3 className="mb-1 text-lg font-medium text-foreground">
						No goals yet
					</h3>
					<p className="mb-4 text-sm text-muted-foreground">
						Set your first goal to start planning your progression.
					</p>
					<AddGoalDialog goalCount={0} roster={roster} />
				</div>
			) : (
				<Tabs
					value={viewMode}
					onValueChange={(val) => setViewMode(val as "goals" | "dailyRaids")}
				>
					<TabsList className="h-10 gap-1 rounded-xl p-1">
						<TabsTrigger
							value="goals"
							className="rounded-lg px-4 py-1.5 data-active:text-emerald-400 dark:data-active:text-emerald-400"
						>
							Goals
						</TabsTrigger>
						<TabsTrigger
							value="dailyRaids"
							className="rounded-lg px-4 py-1.5 data-active:text-emerald-400 dark:data-active:text-emerald-400"
						>
							Daily Raids
						</TabsTrigger>
					</TabsList>

					{/* Goal type filter chips — only in Goals view */}
					{viewMode === "goals" && (
						<div className="mt-3 flex flex-wrap items-center gap-1.5">
							{(Object.entries(goalTypeLabels) as [string, string][]).map(
								([typeVal, label]) => {
									const goalTypeVal = typeVal as PersonalGoalType;
									const active = goalTypeFilter.includes(goalTypeVal);
									return (
										<button
											key={typeVal}
											type="button"
											onClick={() => toggleGoalTypeFilter(goalTypeVal)}
											className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
												active
													? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
													: "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
											}`}
										>
											{label}
										</button>
									);
								},
							)}
							{goalTypeFilter.length > 0 && (
								<button
									type="button"
									onClick={clearGoalTypeFilter}
									className="inline-flex items-center rounded-full border border-border bg-muted/30 p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
									title="Clear filters"
									aria-label="Clear filters"
								>
									<X className="size-3" />
								</button>
							)}
						</div>
					)}

					<TabsContent value="goals">
						{tableView ? (
							<GoalsTable
								rows={(filteredGoals ?? []).map((goal) => ({
									goalId: goal.goalId,
									type: goal.type as GoalType,
									unitId: goal.unitId,
									unitName: goal.unitName,
									priority: goal.priority,
									include: goal.include,
									estimate: activeEstimates[goal.goalId],
									data: goal.data,
								}))}
								isFirst={isFirstGoal}
								isLast={isLastGoal}
								onEdit={handleEdit}
								onDelete={handleDelete}
								onToggleInclude={handleToggleInclude}
								onMoveUp={handleMoveUp}
								onMoveDown={handleMoveDown}
							/>
						) : (
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
								{(filteredGoals ?? []).map((goal, index) => {
									const parsedData = GoalDataSchema.parse(
										JSON.parse(goal.data),
									);
									const isAscend = goal.type === GoalType.Ascend;
									return (
										<GoalCard
											key={goal.goalId}
											goalId={goal.goalId}
											type={goal.type as GoalType}
											unitId={goal.unitId}
											unitName={goal.unitName}
											priority={goal.priority}
											include={goal.include}
											notes={goal.notes}
											data={buildGoalCardData(
												goal.data,
												goal.type,
												goal.unitId,
											)}
											estimate={activeEstimates[goal.goalId]}
											badgeCoverage={badgeCoverageMap[goal.goalId]}
											xpBookCoverage={xpBookCoverageMap[goal.goalId]}
											colorTint={getColorTint(
												activeEstimates[goal.goalId],
												colorMode,
											)}
											isFirst={index === 0}
											isLast={index === (filteredGoals ?? []).length - 1}
											onslaughtActive={
												isAscend
													? (parsedData.onslaughtShards ?? 0) > 0
													: undefined
											}
											onEdit={handleEdit}
											onDelete={handleDelete}
											onToggleInclude={handleToggleInclude}
											onToggleOnslaught={handleToggleOnslaught}
											onMoveUp={handleMoveUp}
											onMoveDown={handleMoveDown}
										/>
									);
								})}
							</div>
						)}
					</TabsContent>

					<TabsContent value="dailyRaids">
						<DailyRaidsPlan
							plan={raidsPlan}
							computing={false}
							dailyEnergy={dailyEnergy}
							todayActivity={todayActivity}
						/>
					</TabsContent>
				</Tabs>
			)}

			{/* Edit dialog */}
			{editingGoal && (
				<EditGoalDialog
					open={!!editingGoal}
					onOpenChange={(open) => {
						if (!open) setEditingGoal(null);
					}}
					goal={editingGoal}
					roster={roster}
				/>
			)}
		</div>
	);
}
