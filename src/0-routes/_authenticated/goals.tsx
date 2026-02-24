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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { Campaign, PersonalGoalType } from "@/4-lib/general/constants.ts";
import {
	CampaignsLocationsUsage,
	PersonalGoalType as GoalType,
} from "@/4-lib/general/constants.ts";
import { generateDailyRaidsPlan } from "@/4-lib/general/daily-raids/service.ts";
import type { IDailyRaidsPlan } from "@/4-lib/general/daily-raids/types.ts";
import {
	calculateGoalEstimate,
	type PlayerContext,
} from "@/4-lib/general/goals/goals-service.ts";
import type {
	CharacterRaidGoalSelect,
	IGoalEstimate,
} from "@/4-lib/general/goals/types.ts";
import { goalTypeLabels } from "@/4-lib/general/goals/types.ts";
import { parsePlannerExport } from "@/4-lib/general/import-planner.ts";
import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
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
		type: number;
		data: string;
	}[],
	roster: Map<string, RosterUnit> | null,
): CharacterRaidGoalSelect[] {
	return goals.map((goal) => {
		const parsed = JSON.parse(goal.data) as Record<string, unknown>;

		// Sync UpgradeRank starting state from roster
		if (goal.type === GoalType.UpgradeRank && roster) {
			const rosterUnit = roster.get(goal.unitId);
			if (rosterUnit) {
				const storedRankStart = parsed.rankStart as number;
				if (rosterUnit.rank > storedRankStart) {
					parsed.rankStart = rosterUnit.rank;
				}
				parsed.rarity = rosterUnit.rarity;
				parsed.level = rosterUnit.level;
				parsed.xp = rosterUnit.xp;
			}
		}

		// Sync Ascend starting state from roster + backfill onslaught defaults
		if (goal.type === GoalType.Ascend) {
			parsed.onslaughtShards ??= 1;
			parsed.onslaughtMythicShards ??= 1;
			parsed.campaignsUsage ??= CampaignsLocationsUsage.LeastEnergy;
			if (roster) {
				const rosterUnit = roster.get(goal.unitId);
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
			const rosterUnit = roster.get(goal.unitId);
			if (rosterUnit) {
				parsed.activeStart = rosterUnit.abilities[0];
				parsed.passiveStart = rosterUnit.abilities[1];
				parsed.level = rosterUnit.level;
				parsed.xp = rosterUnit.xp;
			}
		}

		const unitData = unitById.get(goal.unitId);

		return {
			priority: goal.priority,
			include: goal.include,
			goalId: goal.goalId,
			unitId: goal.unitId,
			unitName: goal.unitName,
			unitAlliance: unitData?.alliance ?? ("Imperial" as const),
			notes: goal.notes ?? "",
			type: goal.type,
			...parsed,
		} as CharacterRaidGoalSelect;
	});
}

function GoalsPage() {
	const goals = useQuery(api.goals.list);
	const removeGoal = useMutation(api.goals.remove);
	const removeAllGoals = useMutation(api.goals.removeAll);
	const updateGoal = useMutation(api.goals.update);
	const reorderGoals = useMutation(api.goals.reorder);
	const importGoals = useMutation(api.goals.importBatch);

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
		imported: number;
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
	const playerContext = useMemo<PlayerContext>(() => {
		const ctx: PlayerContext = {};
		const apiProgress = parseCampaignProgress(campaignProgress);
		// Start with persisted progress (includes manually-entered event campaigns)
		const merged = new Map<string, number>();
		for (const [campaign, nodes] of Object.entries(persistedProgress)) {
			if (nodes > 0) merged.set(campaign, nodes);
		}
		// API progress overwrites persisted for trackable campaigns
		for (const [campaign, nodes] of apiProgress) {
			merged.set(campaign, nodes);
		}
		if (merged.size > 0) {
			ctx.campaignProgress = merged as Map<
				import("@/4-lib/general/constants").Campaign,
				number
			>;
		}
		if (inventory) {
			ctx.inventory = buildInventoryMap(inventory.upgrades);
		}
		// Auto-detect active campaign event from API progress (user can disable)
		ctx.campaignEvent = campaignEventEnabled
			? detectCampaignEvent(apiProgress)
			: "none";
		return ctx;
	}, [campaignProgress, inventory, persistedProgress, campaignEventEnabled]);

	// Track when the initial data sync attempt completes (success or failure)
	// so we don't compute estimates/daily-raids with empty inventory before data arrives.
	const [initialSyncDone, setInitialSyncDone] = useState(false);

	// Calculate estimates for all goals (async — uses real campaign/recipe data)
	// Goals are processed sequentially in priority order with a shared mutable
	// inventory so lower-priority goals see reduced materials.
	// Estimates are stored with the deps token that produced them.
	// During render, if the token doesn't match, estimates are treated as empty.
	const [estimatesResult, setEstimatesResult] = useState<{
		map: Map<string, IGoalEstimate>;
		token: object;
	} | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: settingsVersion is an intentional cache-buster
	const estimatesDepsToken = useMemo(
		() => ({}),
		[
			goals,
			dailyEnergy,
			shardsEnergy,
			playerContext,
			roster,
			hasHydrated,
			initialSyncDone,
			settingsVersion,
		],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: deps tracked via estimatesDepsToken
	useEffect(() => {
		if (!goals || !hasHydrated || !initialSyncDone) {
			setEstimatesResult(null);
			return;
		}

		const currentToken = estimatesDepsToken;
		const typedGoals = buildTypedGoals(goals, roster);
		const sorted = [...typedGoals].sort((a, b) => a.priority - b.priority);
		const inventoryCopy = { ...(playerContext.inventory ?? {}) };

		const results: IGoalEstimate[] = [];
		for (const goal of sorted) {
			const ctx: PlayerContext = {
				...playerContext,
				inventory: inventoryCopy,
				mutateInventory: true,
			};
			const est = calculateGoalEstimate(goal, dailyEnergy, shardsEnergy, ctx);
			results.push(est);
		}
		const map = new Map<string, IGoalEstimate>();
		for (const est of results) {
			map.set(est.goalId, est);
		}
		setEstimatesResult({ map, token: currentToken });
	}, [estimatesDepsToken]);

	// Only use estimates if they were computed with the current deps
	const activeEstimates =
		estimatesResult?.token === estimatesDepsToken
			? estimatesResult.map
			: new Map<string, IGoalEstimate>();

	// Badge coverage: allocate inventory badges to goals in priority order
	const badgeCoverageMap = useMemo(() => {
		if (!inventory || !goals || activeEstimates.size === 0) return new Map();
		const pools = buildBadgeInventory(inventory);
		const sortedGoalIds = [...goals]
			.sort((a, b) => a.priority - b.priority)
			.map((g) => g.goalId);
		return allocateBadgesToGoals(sortedGoalIds, activeEstimates, pools);
	}, [inventory, goals, activeEstimates]);

	// XP book coverage: allocate inventory XP books to goals in priority order
	const xpBookCoverageMap = useMemo(() => {
		if (!inventory || !goals || activeEstimates.size === 0) return new Map();
		const pools = buildXpBookInventory(inventory);
		const sortedGoalIds = [...goals]
			.sort((a, b) => a.priority - b.priority)
			.map((g) => g.goalId);
		return allocateXpBooksToGoals(sortedGoalIds, activeEstimates, pools);
	}, [inventory, goals, activeEstimates]);

	// Daily raids plan computation.
	// The plan is stored together with the deps token that produced it.
	// During render, if the stored token doesn't match the current token,
	// the plan is treated as stale and null is returned — no flash of old data.
	const [raidsResult, setRaidsResult] = useState<{
		plan: IDailyRaidsPlan;
		token: object;
	} | null>(null);
	const [computingRaids, setComputingRaids] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: settingsVersion is an intentional cache-buster
	const raidsDepsToken = useMemo(
		() => ({}),
		[
			viewMode,
			goals,
			dailyEnergy,
			playerContext,
			farmStrategy,
			farmOrder,
			roster,
			homeScreenEvent,
			hseMinEnemyCount,
			hasHydrated,
			initialSyncDone,
			settingsVersion,
		],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: deps tracked via raidsDepsToken
	useEffect(() => {
		if (
			viewMode !== "dailyRaids" ||
			!goals ||
			!hasHydrated ||
			!initialSyncDone
		) {
			setRaidsResult(null);
			setComputingRaids(false);
			return;
		}

		let cancelled = false;
		setComputingRaids(true);
		const currentToken = raidsDepsToken;

		const typedGoals = buildTypedGoals(goals, roster);

		const progress =
			(playerContext.campaignProgress as Map<Campaign, number>) ?? new Map();
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
		);
		if (!cancelled) {
			setRaidsResult({ plan, token: currentToken });
			setComputingRaids(false);
		}

		return () => {
			cancelled = true;
		};
	}, [raidsDepsToken]);

	// Only use the plan if it was computed with the current deps
	const raidsPlan =
		raidsResult?.token === raidsDepsToken ? raidsResult.plan : null;

	// Compute today's activity from ALL campaign nodes (plan + non-plan farming)
	const todayActivity = useMemo(
		() => parseTodayActivity(campaignProgress),
		[campaignProgress],
	);

	const handleEdit = useCallback(
		(goalId: string) => {
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
		},
		[goals],
	);

	const handleDelete = useCallback(
		async (goalId: string) => {
			await removeGoal({ goalId });
		},
		[removeGoal],
	);

	const handleToggleInclude = useCallback(
		async (goalId: string, include: boolean) => {
			await updateGoal({ goalId, include });
		},
		[updateGoal],
	);

	const handleToggleOnslaught = useCallback(
		async (goalId: string, enabled: boolean) => {
			const goal = goals?.find((g) => g.goalId === goalId);
			if (!goal) return;
			const parsed = JSON.parse(goal.data) as Record<string, unknown>;
			parsed.onslaughtShards = enabled ? 1 : 0;
			await updateGoal({ goalId, data: JSON.stringify(parsed) });
		},
		[goals, updateGoal],
	);

	const handleMoveUp = useCallback(
		async (goalId: string) => {
			if (!goals) return;
			const ids = goals.map((g) => g.goalId);
			const idx = ids.indexOf(goalId);
			if (idx <= 0) return;
			[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
			await reorderGoals({ goalIds: ids });
		},
		[goals, reorderGoals],
	);

	const handleMoveDown = useCallback(
		async (goalId: string) => {
			if (!goals) return;
			const ids = goals.map((g) => g.goalId);
			const idx = ids.indexOf(goalId);
			if (idx < 0 || idx >= ids.length - 1) return;
			[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
			await reorderGoals({ goalIds: ids });
		},
		[goals, reorderGoals],
	);

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

	const handleImport = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			setImporting(true);
			setImportResult(null);
			try {
				const text = await file.text();
				const result = parsePlannerExport(text);

				if (result.goals.length === 0) {
					setImportResult({ imported: 0, skipped: result.skipped });
					return;
				}

				await importGoals({ goals: result.goals });
				setImportResult({
					imported: result.goals.length,
					skipped: result.skipped,
				});
			} catch {
				setImportResult({
					imported: 0,
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
		},
		[importGoals],
	);

	function parseGoalData(data: string, type: number, unitId: string): GoalData {
		const parsed = JSON.parse(data) as Record<string, unknown>;
		if (roster) {
			const rosterUnit = roster.get(unitId);
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
					const storedRankStart = parsed.rankStart as number;
					if (rosterUnit.rank > storedRankStart) {
						parsed.rankStart = rosterUnit.rank;
					}
				}
			}
		}
		return { type, ...parsed } as GoalData;
	}

	// Apply goal type filter for display (doesn't affect estimates or daily raids)
	const filteredGoals = useMemo(() => {
		if (!goals || goalTypeFilter.length === 0) return goals;
		return goals.filter((g) =>
			goalTypeFilter.includes(g.type as PersonalGoalType),
		);
	}, [goals, goalTypeFilter]);

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
									<Button variant="outline" size="sm" title="Raid settings">
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
							<Button variant="outline" size="sm" disabled={importing}>
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
									Import your goals from a Tacticus Planner export file (.json).
									This will replace all existing goals.
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
								<Button variant="outline" size="sm">
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
							{importResult.imported > 0 ? (
								<p className="text-sm font-medium text-emerald-400">
									Successfully imported {importResult.imported} goals.
								</p>
							) : (
								<p className="text-sm font-medium text-destructive">
									No goals were imported.
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
									const typeNum = Number(typeVal) as PersonalGoalType;
									const active = goalTypeFilter.includes(typeNum);
									return (
										<button
											key={typeVal}
											type="button"
											onClick={() => toggleGoalTypeFilter(typeNum)}
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
									type: goal.type as PersonalGoalType,
									unitId: goal.unitId,
									unitName: goal.unitName,
									priority: goal.priority,
									include: goal.include,
									estimate: activeEstimates.get(goal.goalId),
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
									const parsedData = JSON.parse(goal.data) as Record<
										string,
										unknown
									>;
									const isAscend = goal.type === (GoalType.Ascend as number);
									return (
										<GoalCard
											key={goal.goalId}
											goalId={goal.goalId}
											type={goal.type as PersonalGoalType}
											unitId={goal.unitId}
											unitName={goal.unitName}
											priority={goal.priority}
											include={goal.include}
											notes={goal.notes}
											data={parseGoalData(goal.data, goal.type, goal.unitId)}
											estimate={activeEstimates.get(goal.goalId)}
											badgeCoverage={badgeCoverageMap.get(goal.goalId)}
											xpBookCoverage={xpBookCoverageMap.get(goal.goalId)}
											colorTint={getColorTint(
												activeEstimates.get(goal.goalId),
												colorMode,
											)}
											isFirst={index === 0}
											isLast={index === (filteredGoals ?? []).length - 1}
											onslaughtActive={
												isAscend
													? ((parsedData.onslaughtShards as number) ?? 0) > 0
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
							computing={computingRaids}
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
