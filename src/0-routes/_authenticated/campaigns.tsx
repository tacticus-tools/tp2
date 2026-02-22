import { createFileRoute } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CampaignProgressCard } from "@/1-components/general/CampaignProgressCard.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore.ts";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
import {
	getCampaignMetadata,
	getEventCampaignBaseNames,
	getMainCampaignBaseNames,
	getUnlockedNodeCount,
} from "@/4-lib/general/campaign-data.ts";
import type { Campaign } from "@/4-lib/general/constants.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export const Route = createFileRoute("/_authenticated/campaigns")({
	component: CampaignsPage,
});

interface CampaignGroup {
	baseName: string;
	entries: Array<{
		campaign: Campaign;
		type: string;
		unlocked: number;
		total: number;
	}>;
}

function CampaignsPage() {
	const getPlayerData = useAction(api.tacticus.actions.getPlayerData);

	const campaignProgress = usePlayerDataStore((s) => s.campaignProgress);
	const syncing = usePlayerDataStore((s) => s.syncing);
	const lastSyncedAt = usePlayerDataStore((s) => s.lastSyncedAt);
	const setPlayerData = usePlayerDataStore((s) => s.setPlayerData);
	const setSyncing = usePlayerDataStore((s) => s.setSyncing);

	const persistedProgress = useCampaignProgressStore((s) => s.progress);
	const mergeFromApi = useCampaignProgressStore((s) => s.mergeFromApi);

	const metadata = getCampaignMetadata();

	// When API campaign progress changes, merge into persisted store
	useEffect(() => {
		if (campaignProgress.length > 0) {
			mergeFromApi(campaignProgress);
		}
	}, [campaignProgress, mergeFromApi]);

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

	// Auto-sync on mount only if store has no data
	const didAutoSync = useRef(false);
	useEffect(() => {
		if (!didAutoSync.current && !lastSyncedAt) {
			didAutoSync.current = true;
			void handleSync();
		}
	}, [handleSync, lastSyncedAt]);

	// Build grouped campaign data using persisted progress
	const { mainGroups, eventGroups } = useMemo(() => {
		const groupMap = new Map<string, CampaignGroup>();

		for (const [campaign, m] of metadata) {
			if (campaign === "Onslaught") continue;

			const rawProgress = persistedProgress[campaign] ?? 0;
			const unlocked = getUnlockedNodeCount(campaign, rawProgress);

			let group = groupMap.get(m.baseName);
			if (!group) {
				group = { baseName: m.baseName, entries: [] };
				groupMap.set(m.baseName, group);
			}

			group.entries.push({
				campaign,
				type: m.displayType,
				unlocked,
				total: m.totalNodes,
			});
		}

		for (const group of groupMap.values()) {
			group.entries.sort((a, b) => {
				const aM = metadata.get(a.campaign);
				const bM = metadata.get(b.campaign);
				return (aM?.typeOrder ?? 99) - (bM?.typeOrder ?? 99);
			});
		}

		const toGroups = (order: readonly string[]) =>
			order
				.map((name) => groupMap.get(name))
				.filter((g): g is CampaignGroup => !!g);

		return {
			mainGroups: toGroups(getMainCampaignBaseNames()),
			eventGroups: toGroups(getEventCampaignBaseNames()),
		};
	}, [metadata, persistedProgress]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
					<p className="text-muted-foreground">
						Track your campaign progression across all chapters.
					</p>
				</div>

				<Button
					variant="outline"
					size="sm"
					onClick={handleSync}
					disabled={syncing}
					title="Sync with Tacticus API"
				>
					<RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
					<span className="hidden sm:inline">
						{syncing ? "Syncing..." : "Sync"}
					</span>
				</Button>
			</div>

			{/* Content */}
			<div className="space-y-10">
				{mainGroups.length > 0 && (
					<section className="space-y-6">
						<h2 className="text-xs font-semibold tracking-wider text-muted-foreground/60 uppercase">
							Main Campaigns
						</h2>
						{mainGroups.map((group) => (
							<div key={group.baseName} className="space-y-3">
								<h3 className="text-lg font-semibold tracking-tight">
									{group.baseName}
								</h3>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
									{group.entries.map((entry) => (
										<CampaignProgressCard
											key={entry.campaign}
											campaign={entry.campaign}
											type={entry.type}
											unlockedNodes={entry.unlocked}
											totalNodes={entry.total}
										/>
									))}
								</div>
							</div>
						))}
					</section>
				)}

				{eventGroups.length > 0 && (
					<section className="space-y-6">
						<h2 className="text-xs font-semibold tracking-wider text-muted-foreground/60 uppercase">
							Event Campaigns
						</h2>
						{eventGroups.map((group) => (
							<div key={group.baseName} className="space-y-3">
								<h3 className="text-lg font-semibold tracking-tight">
									{group.baseName}
								</h3>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
									{group.entries.map((entry) => (
										<CampaignProgressCard
											key={entry.campaign}
											campaign={entry.campaign}
											type={entry.type}
											unlockedNodes={entry.unlocked}
											totalNodes={entry.total}
										/>
									))}
								</div>
							</div>
						))}
					</section>
				)}
			</div>
		</div>
	);
}
