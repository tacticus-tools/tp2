import { createFileRoute } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CampaignProgressCard } from "@/1-components/tacticus/CampaignProgressCard";
import { Button } from "@/1-components/ui/button";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore";
import { getCampaignNodeCounts } from "@/4-lib/tacticus/campaign-data";
import type { Campaign } from "@/4-lib/tacticus/enums";
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

function categorizeCampaignType(campaignValue: string): string {
	if (campaignValue.includes("Extremis") && campaignValue.includes("Challenge"))
		return "Extremis Challenge";
	if (campaignValue.includes("Extremis")) return "Extremis";
	if (campaignValue.includes("Standard") && campaignValue.includes("Challenge"))
		return "Standard Challenge";
	if (campaignValue.includes("Standard")) return "Standard";
	if (campaignValue.includes("Mirror") && campaignValue.includes("Elite"))
		return "Elite Mirror";
	if (campaignValue.includes("Elite")) return "Elite";
	if (campaignValue.includes("Mirror")) return "Mirror";
	return "Normal";
}

function getBaseName(campaignValue: string): string {
	return campaignValue
		.replace(" Mirror Elite", "")
		.replace(" Elite", "")
		.replace(" Mirror", "")
		.replace(" Extremis Challenge", "")
		.replace(" Standard Challenge", "")
		.replace(" Extremis", "")
		.replace(" Standard", "");
}

const TYPE_ORDER: Record<string, number> = {
	Normal: 0,
	Elite: 1,
	Mirror: 2,
	"Elite Mirror": 3,
	Standard: 0,
	"Standard Challenge": 1,
	Extremis: 2,
	"Extremis Challenge": 3,
};

function isEventType(type: string): boolean {
	return [
		"Standard",
		"Standard Challenge",
		"Extremis",
		"Extremis Challenge",
	].includes(type);
}

function CampaignsPage() {
	const getPlayerData = useAction(api.tacticus.actions.getPlayerData);

	const campaignProgress = usePlayerDataStore((s) => s.campaignProgress);
	const syncing = usePlayerDataStore((s) => s.syncing);
	const lastSyncedAt = usePlayerDataStore((s) => s.lastSyncedAt);
	const setPlayerData = usePlayerDataStore((s) => s.setPlayerData);
	const setSyncing = usePlayerDataStore((s) => s.setSyncing);

	const persistedProgress = useCampaignProgressStore((s) => s.progress);
	const setProgress = useCampaignProgressStore((s) => s.setProgress);
	const mergeFromApi = useCampaignProgressStore((s) => s.mergeFromApi);

	const nodeCounts = getCampaignNodeCounts();

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
		const mainOrder = ["Indomitus", "Fall of Cadia", "Octarius", "Saim-Hann"];
		const eventOrder = [
			"Adeptus Mechanicus",
			"Tyranids",
			"T'au Empire",
			"Death Guard",
		];

		const groupMap = new Map<string, CampaignGroup>();

		for (const [campaign, totalNodes] of nodeCounts) {
			if (campaign === "Onslaught") continue;

			const baseName = getBaseName(campaign);
			const type = categorizeCampaignType(campaign);
			const unlocked = persistedProgress[campaign] ?? 0;

			let group = groupMap.get(baseName);
			if (!group) {
				group = { baseName, entries: [] };
				groupMap.set(baseName, group);
			}

			group.entries.push({ campaign, type, unlocked, total: totalNodes });
		}

		for (const group of groupMap.values()) {
			group.entries.sort(
				(a, b) => (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99),
			);
		}

		const toGroups = (order: string[]) =>
			order
				.map((name) => groupMap.get(name))
				.filter((g): g is CampaignGroup => !!g);

		return {
			mainGroups: toGroups(mainOrder),
			eventGroups: toGroups(eventOrder),
		};
	}, [nodeCounts, persistedProgress]);

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
						<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
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
											name={entry.campaign}
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
						<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
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
											name={entry.campaign}
											type={entry.type}
											unlockedNodes={entry.unlocked}
											totalNodes={entry.total}
											editable={isEventType(entry.type)}
											onProgressChange={(v) => setProgress(entry.campaign, v)}
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
