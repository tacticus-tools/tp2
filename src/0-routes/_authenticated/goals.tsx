import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import {
	LayoutGrid,
	Loader2,
	Palette,
	RefreshCw,
	Table,
	Target,
	Trash2,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddGoalDialog } from "@/1-components/goals/AddGoalDialog";
import { EditGoalDialog } from "@/1-components/goals/EditGoalDialog";
import { GoalCard, type GoalData } from "@/1-components/goals/GoalCard";
import { GoalsTable } from "@/1-components/goals/GoalsTable";
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
import { Badge } from "@/1-components/ui/badge";
import { Button } from "@/1-components/ui/button";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore";
import { useGoalPreferencesStore } from "@/3-hooks/useGoalPreferencesStore";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore";
import {
	buildInventoryMap,
	parseCampaignProgress,
} from "@/4-lib/tacticus/campaign-progress";
import type { PersonalGoalType } from "@/4-lib/tacticus/enums";
import {
	type CharacterRaidGoalSelect,
	calculateGoalEstimate,
	type IGoalEstimate,
	type PlayerContext,
} from "@/4-lib/tacticus/goals";
import { parsePlannerExport } from "@/4-lib/tacticus/import-planner";
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

function GoalsPage() {
	const goals = useQuery(api.goals.list);
	const removeGoal = useMutation(api.goals.remove);
	const removeAllGoals = useMutation(api.goals.removeAll);
	const updateGoal = useMutation(api.goals.update);
	const reorderGoals = useMutation(api.goals.reorder);
	const getPlayerData = useAction(api.tacticus.actions.getPlayerData);

	const importGoals = useMutation(api.goals.importBatch);

	// Shared player data store (roster, campaign progress, inventory)
	const roster = usePlayerDataStore((s) => s.roster);
	const campaignProgress = usePlayerDataStore((s) => s.campaignProgress);
	const inventory = usePlayerDataStore((s) => s.inventory);
	const syncing = usePlayerDataStore((s) => s.syncing);
	const setPlayerData = usePlayerDataStore((s) => s.setPlayerData);
	const setSyncing = usePlayerDataStore((s) => s.setSyncing);

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

	const dailyEnergy = useGoalPreferencesStore((s) => s.dailyEnergy);
	const shardsEnergy = useGoalPreferencesStore((s) => s.shardsEnergy);
	const tableView = useGoalPreferencesStore((s) => s.goalsTableView);
	const setTableView = useGoalPreferencesStore((s) => s.setGoalsTableView);
	const colorMode = useGoalPreferencesStore((s) => s.goalColorMode);
	const setColorMode = useGoalPreferencesStore((s) => s.setGoalColorMode);

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
				import("@/4-lib/tacticus/enums").Campaign,
				number
			>;
		}
		if (inventory) {
			ctx.inventory = buildInventoryMap(inventory.upgrades);
		}
		return ctx;
	}, [campaignProgress, inventory, persistedProgress]);

	// Calculate estimates for all goals (async — uses real campaign/recipe data)
	const [estimates, setEstimates] = useState(new Map<string, IGoalEstimate>());
	useEffect(() => {
		if (!goals) {
			setEstimates(new Map());
			return;
		}

		let cancelled = false;
		const typedGoals = goals.map((goal) => {
			const parsed = JSON.parse(goal.data) as Record<string, unknown>;
			return {
				priority: goal.priority,
				include: goal.include,
				goalId: goal.goalId,
				unitId: goal.unitId,
				unitName: goal.unitName,
				unitAlliance: "Imperial" as const,
				notes: goal.notes ?? "",
				type: goal.type,
				...parsed,
			} as CharacterRaidGoalSelect;
		});

		void Promise.all(
			typedGoals.map((typed) =>
				calculateGoalEstimate(typed, dailyEnergy, shardsEnergy, playerContext),
			),
		).then((results) => {
			if (cancelled) return;
			const map = new Map<string, IGoalEstimate>();
			for (const est of results) {
				map.set(est.goalId, est);
			}
			setEstimates(map);
		});

		return () => {
			cancelled = true;
		};
	}, [goals, dailyEnergy, shardsEnergy, playerContext]);

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

	const handleSync = useCallback(async () => {
		setSyncing(true);
		try {
			const response = await getPlayerData();
			if (response?.player?.units) {
				setPlayerData(response);
			}
		} catch {
			// Sync failed — user likely hasn't configured API keys in settings
		} finally {
			setSyncing(false);
		}
	}, [getPlayerData, setPlayerData, setSyncing]);

	// Auto-fetch roster on mount so start ranks are pre-populated
	const didAutoSync = useRef(false);
	useEffect(() => {
		if (!didAutoSync.current) {
			didAutoSync.current = true;
			void handleSync();
		}
	}, [handleSync]);

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

	function parseGoalData(data: string, type: number): GoalData {
		const parsed = JSON.parse(data) as Record<string, unknown>;
		return { type, ...parsed } as GoalData;
	}

	const goalIds = goals?.map((g) => g.goalId) ?? [];
	const isFirstGoal = (id: string) => goalIds[0] === id;
	const isLastGoal = (id: string) => goalIds[goalIds.length - 1] === id;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight">Goals</h1>
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
							{/* Sync */}
							<Button
								variant="outline"
								size="sm"
								onClick={handleSync}
								disabled={syncing}
								title="Sync with Tacticus API"
							>
								<RefreshCw
									className={`size-4 ${syncing ? "animate-spin" : ""}`}
								/>
								<span className="hidden sm:inline">
									{syncing ? "Syncing..." : "Sync"}
								</span>
							</Button>

							{/* Color mode toggle */}
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

							{/* View toggle — hidden on mobile */}
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
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

			{/* Content */}
			{isLoading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			) : goalCount === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
					<div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
						<Target className="size-8 text-muted-foreground" />
					</div>
					<h3 className="text-lg font-medium text-foreground mb-1">
						No goals yet
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Set your first goal to start planning your progression.
					</p>
					<AddGoalDialog goalCount={0} roster={roster} />
				</div>
			) : tableView ? (
				<GoalsTable
					rows={goals.map((goal) => ({
						goalId: goal.goalId,
						type: goal.type as PersonalGoalType,
						unitId: goal.unitId,
						unitName: goal.unitName,
						priority: goal.priority,
						include: goal.include,
						estimate: estimates.get(goal.goalId),
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
					{goals.map((goal, index) => (
						<GoalCard
							key={goal.goalId}
							goalId={goal.goalId}
							type={goal.type as PersonalGoalType}
							unitId={goal.unitId}
							unitName={goal.unitName}
							priority={goal.priority}
							include={goal.include}
							notes={goal.notes}
							data={parseGoalData(goal.data, goal.type)}
							estimate={estimates.get(goal.goalId)}
							colorTint={getColorTint(estimates.get(goal.goalId), colorMode)}
							isFirst={index === 0}
							isLast={index === goals.length - 1}
							onEdit={handleEdit}
							onDelete={handleDelete}
							onToggleInclude={handleToggleInclude}
							onMoveUp={handleMoveUp}
							onMoveDown={handleMoveDown}
						/>
					))}
				</div>
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
