import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import {
	AlertTriangle,
	ChevronDown,
	Loader2,
	Map as MapIcon,
	RefreshCw,
	TrendingUp,
	Unlock,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CampaignIcon } from "@/1-components/general/CampaignIcon";
import { CharacterIcon } from "@/1-components/general/CharacterIcon";
import { EnergyIcon } from "@/1-components/general/EnergyIcon";
import { MaterialIcon } from "@/1-components/general/MaterialIcon";
import { Badge } from "@/1-components/ui/badge";
import { Button } from "@/1-components/ui/button";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore";
import {
	buildInventoryMap,
	parseCampaignProgress,
} from "@/4-lib/general/campaign-progress";
import { computeCampaignProgression } from "@/4-lib/general/campaign-progression/service";
import type { ICampaignProgressionResult } from "@/4-lib/general/campaign-progression/types";
import type { Campaign } from "@/4-lib/general/constants";
import { PersonalGoalType } from "@/4-lib/general/constants";
import type { CharacterRaidGoalSelect } from "@/4-lib/general/goals/types";
import { api } from "~/_generated/api";

export const Route = createFileRoute("/_authenticated/campaign-progression")({
	component: CampaignProgressionPage,
});

function CampaignProgressionPage() {
	const goals = useQuery(api.goals.list);
	const getPlayerData = useAction(api.tacticus.actions.getPlayerData);

	const campaignProgressApi = usePlayerDataStore((s) => s.campaignProgress);
	const inventory = usePlayerDataStore((s) => s.inventory);
	const syncing = usePlayerDataStore((s) => s.syncing);
	const setPlayerData = usePlayerDataStore((s) => s.setPlayerData);
	const setSyncing = usePlayerDataStore((s) => s.setSyncing);

	const persistedProgress = useCampaignProgressStore((s) => s.progress);

	const [result, setResult] = useState<ICampaignProgressionResult | null>(null);
	const [computing, setComputing] = useState(false);

	// Build merged campaign progress (API + persisted manual entries)
	const getMergedProgress = useCallback((): Map<Campaign, number> => {
		const apiProgress = parseCampaignProgress(campaignProgressApi);
		const merged = new Map<Campaign, number>();
		for (const [campaign, nodes] of Object.entries(persistedProgress)) {
			if (nodes > 0) merged.set(campaign as Campaign, nodes);
		}
		for (const [campaign, nodes] of apiProgress) {
			merged.set(campaign, nodes);
		}
		return merged;
	}, [campaignProgressApi, persistedProgress]);

	// Parse goals from Convex into typed goals
	const getTypedGoals = useCallback((): CharacterRaidGoalSelect[] => {
		if (!goals) return [];
		return goals.map((goal) => {
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
	}, [goals]);

	// Compute progression data
	useEffect(() => {
		if (!goals) return;

		let cancelled = false;
		setComputing(true);

		const typedGoals = getTypedGoals();
		const progress = getMergedProgress();
		const inv = inventory ? buildInventoryMap(inventory.upgrades) : undefined;

		void computeCampaignProgression(typedGoals, progress, inv).then((data) => {
			if (cancelled) return;
			setResult(data);
			setComputing(false);
		});

		return () => {
			cancelled = true;
		};
	}, [goals, getTypedGoals, getMergedProgress, inventory]);

	const handleSync = useCallback(async () => {
		setSyncing(true);
		try {
			const response = await getPlayerData();
			if (response?.player?.units) {
				setPlayerData(response);
			}
		} catch {
			// Sync failed
		} finally {
			setSyncing(false);
		}
	}, [getPlayerData, setPlayerData, setSyncing]);

	// Auto-sync on mount
	const didAutoSync = useRef(false);
	useEffect(() => {
		if (!didAutoSync.current) {
			didAutoSync.current = true;
			void handleSync();
		}
	}, [handleSync]);

	const isLoading = goals === undefined;
	const upgradeRankCount =
		goals?.filter((g) => g.type === PersonalGoalType.UpgradeRank).length ?? 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight">
							Campaign Planner
						</h1>
					</div>
					<p className="text-muted-foreground">
						Find the next campaign nodes to beat for the biggest farming
						benefit.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleSync}
						disabled={syncing}
					>
						<RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
						<span className="hidden sm:inline">
							{syncing ? "Syncing..." : "Sync"}
						</span>
					</Button>
				</div>
			</div>

			{/* Content */}
			{isLoading || computing ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			) : upgradeRankCount === 0 ? (
				<EmptyState />
			) : result ? (
				<ProgressionResults result={result} />
			) : null}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
			<div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50">
				<MapIcon className="size-8 text-muted-foreground" />
			</div>
			<h3 className="mb-1 text-lg font-medium text-foreground">
				No Rank Up goals
			</h3>
			<p className="text-center text-sm text-muted-foreground">
				Add Rank Up goals on the Goals page to see campaign progression
				recommendations.
			</p>
		</div>
	);
}

function ProgressionResults({
	result,
}: {
	result: ICampaignProgressionResult;
}) {
	return (
		<div className="space-y-6">
			{/* Summary */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<SummaryCard
					label="Goals Analyzed"
					value={result.goalsAnalyzed.toString()}
				/>
				<SummaryCard
					label="Current Energy"
					value={formatEnergy(result.currentTotalEnergy)}
					showEnergy
				/>
				<SummaryCard
					label="Unfarmable"
					value={result.unfarmableMaterials.length.toString()}
					variant={
						result.unfarmableMaterials.length > 0 ? "warning" : "default"
					}
				/>
			</div>

			{/* Unfarmable materials */}
			{result.unfarmableMaterials.length > 0 && (
				<UnfarmableSection materials={result.unfarmableMaterials} />
			)}

			{/* Campaign sections */}
			{result.campaigns.length > 0 ? (
				<div className="space-y-3">
					{result.campaigns.map((campaign) => (
						<CampaignSection key={campaign.campaign} data={campaign} />
					))}
				</div>
			) : (
				<div className="rounded-lg border border-border/60 bg-muted/20 p-6 text-center">
					<p className="text-sm text-muted-foreground">
						No campaign nodes found that would improve your farming efficiency.
						Your current progress covers the best nodes for your goals.
					</p>
				</div>
			)}
		</div>
	);
}

function SummaryCard({
	label,
	value,
	variant = "default",
	showEnergy = false,
}: {
	label: string;
	value: string;
	variant?: "default" | "warning";
	showEnergy?: boolean;
}) {
	return (
		<div className="rounded-lg border border-border/60 bg-card p-4">
			<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
				{label}
			</p>
			<p
				className={`mt-1 flex items-center gap-1.5 text-2xl font-bold ${variant === "warning" ? "text-amber-400" : "text-foreground"}`}
			>
				{value}
				{showEnergy && <EnergyIcon size={20} />}
			</p>
		</div>
	);
}

function UnfarmableSection({
	materials,
}: {
	materials: ICampaignProgressionResult["unfarmableMaterials"];
}) {
	return (
		<details className="group rounded-lg border border-amber-500/30 bg-amber-500/5">
			<summary className="flex cursor-pointer items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
				<AlertTriangle className="size-5 shrink-0 text-amber-400" />
				<div className="flex-1">
					<span className="text-sm font-medium text-amber-400">
						{materials.length} Unfarmable Material
						{materials.length > 1 ? "s" : ""}
					</span>
					<span className="ml-2 text-xs text-muted-foreground">
						No unlocked nodes drop these materials
					</span>
				</div>
				<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
			</summary>
			<div className="border-t border-amber-500/20 px-4 pt-2 pb-3">
				<div className="space-y-2">
					{materials.map((mat) => (
						<div key={mat.materialId} className="text-sm">
							{/* Desktop */}
							<div className="hidden sm:grid sm:grid-cols-[1.5rem_1fr_auto_auto] sm:items-center sm:gap-2">
								<MaterialIcon
									icon={mat.materialIcon}
									label={mat.materialLabel}
								/>
								<span className="truncate text-foreground">
									{mat.materialLabel}
								</span>
								<div className="flex -space-x-1">
									{mat.unitIds.map((id) => (
										<CharacterIcon key={id} unitId={id} size={20} />
									))}
								</div>
								<span className="text-muted-foreground">x{mat.count}</span>
							</div>
							{/* Mobile */}
							<div className="space-y-1 sm:hidden">
								<div className="flex items-center justify-between">
									<div className="flex min-w-0 items-center gap-1.5">
										<MaterialIcon
											icon={mat.materialIcon}
											label={mat.materialLabel}
										/>
										<span className="truncate text-foreground">
											{mat.materialLabel}
										</span>
									</div>
									<span className="shrink-0 text-muted-foreground">
										x{mat.count}
									</span>
								</div>
								<div className="flex -space-x-1 pl-7">
									{mat.unitIds.map((id) => (
										<CharacterIcon key={id} unitId={id} size={18} />
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</details>
	);
}

function CampaignSection({
	data,
}: {
	data: ICampaignProgressionResult["campaigns"][number];
}) {
	return (
		<details className="group rounded-lg border border-border/60 bg-card">
			<summary className="flex cursor-pointer items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
				<CampaignIcon campaign={data.campaign} size={32} />
				<div className="flex-1">
					<span className="text-sm font-medium text-foreground">
						{data.campaign}
					</span>
					<span className="ml-2 text-xs text-muted-foreground">
						{data.savings.length} node{data.savings.length > 1 ? "s" : ""}
					</span>
				</div>
				<Badge
					variant="secondary"
					className="bg-emerald-500/10 text-emerald-400"
				>
					<TrendingUp className="mr-1 size-3" />
					{formatEnergy(data.totalSavings)}
					<EnergyIcon size={12} />
					saved
				</Badge>
				<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
			</summary>
			<div className="border-t border-border/40 px-4 pt-2 pb-3">
				<div className="space-y-2">
					{data.savings.map((entry) => (
						<div
							key={`${entry.battleId}-${entry.materialId}`}
							className="rounded-md px-2 py-1.5 text-sm hover:bg-muted/30"
						>
							{/* Desktop: single row grid */}
							<div className="hidden sm:grid sm:grid-cols-[2rem_1.5rem_1fr_auto_3rem_5.5rem] sm:items-center sm:gap-2">
								<span className="font-mono text-xs text-muted-foreground">
									#{entry.nodeNumber}
								</span>
								<MaterialIcon
									icon={entry.materialIcon}
									label={entry.materialLabel}
									size={20}
								/>
								<span className="truncate text-foreground">
									{entry.materialLabel}
								</span>
								<div className="flex -space-x-1">
									{entry.unitIds.map((id) => (
										<CharacterIcon key={id} unitId={id} size={20} />
									))}
								</div>
								<span className="text-right text-xs text-muted-foreground">
									x{entry.materialCount}
								</span>
								{!entry.canFarmPrior ? (
									<Badge
										variant="secondary"
										className="justify-center bg-red-500/10 px-1.5 py-0 text-[10px] text-red-400"
									>
										<Unlock className="mr-0.5 size-2.5" />
										Unlocks
									</Badge>
								) : (
									<Badge
										variant="secondary"
										className="justify-center bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-400"
									>
										Saves {formatEnergy(entry.savings)}
										<EnergyIcon size={10} />
									</Badge>
								)}
							</div>

							{/* Mobile: stacked layout */}
							<div className="space-y-1 sm:hidden">
								<div className="flex min-w-0 items-center gap-2">
									<span className="shrink-0 font-mono text-xs text-muted-foreground">
										#{entry.nodeNumber}
									</span>
									<MaterialIcon
										icon={entry.materialIcon}
										label={entry.materialLabel}
										size={20}
									/>
									<span className="truncate text-foreground">
										{entry.materialLabel}
									</span>
								</div>
								<div className="flex items-center justify-between pl-8">
									<div className="flex -space-x-1">
										{entry.unitIds.map((id) => (
											<CharacterIcon key={id} unitId={id} size={18} />
										))}
									</div>
									<div className="flex items-center gap-2">
										<span className="text-xs text-muted-foreground">
											x{entry.materialCount}
										</span>
										{!entry.canFarmPrior ? (
											<Badge
												variant="secondary"
												className="bg-red-500/10 px-1.5 py-0 text-[10px] text-red-400"
											>
												<Unlock className="mr-0.5 size-2.5" />
												Unlocks
											</Badge>
										) : (
											<Badge
												variant="secondary"
												className="bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-400"
											>
												Saves {formatEnergy(entry.savings)}
												<EnergyIcon size={10} />
											</Badge>
										)}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</details>
	);
}

function formatEnergy(energy: number): string {
	if (energy >= 1000) {
		return `${(energy / 1000).toFixed(1)}k`;
	}
	return Math.round(energy).toString();
}
