import { createFileRoute } from "@tanstack/react-router";
import { CampaignProgressCard } from "@/1-components/general/CampaignProgressCard.tsx";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore.ts";
import {
	getCampaignMetadata,
	getEventCampaignBaseNames,
	getMainCampaignBaseNames,
	getUnlockedNodeCount,
} from "@/4-lib/general/campaign-data.ts";
import type { Campaign } from "@/4-lib/general/constants.ts";

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
	const persistedProgress = useCampaignProgressStore((s) => s.progress);

	const metadata = getCampaignMetadata();

	// Build grouped campaign data using persisted progress
	const { mainGroups, eventGroups } = (() => {
		const groupMap: Record<string, CampaignGroup> = {};

		for (const [key, m] of Object.entries(metadata)) {
			const campaign = key as Campaign;
			if (campaign === "Onslaught") continue;

			const rawProgress = persistedProgress[campaign] ?? 0;
			const unlocked = getUnlockedNodeCount(campaign, rawProgress);

			let group = groupMap[m.baseName];
			if (!group) {
				group = { baseName: m.baseName, entries: [] };
				groupMap[m.baseName] = group;
			}

			group.entries.push({
				campaign,
				type: m.displayType,
				unlocked: Math.min(unlocked, m.totalNodes),
				total: m.totalNodes,
			});
		}

		for (const group of Object.values(groupMap)) {
			group.entries.sort((a, b) => {
				const aM = metadata[a.campaign as keyof typeof metadata];
				const bM = metadata[b.campaign as keyof typeof metadata];
				return (aM?.typeOrder ?? 99) - (bM?.typeOrder ?? 99);
			});
		}

		const toGroups = (order: readonly string[]) =>
			order
				.map((name) => groupMap[name])
				.filter((g): g is CampaignGroup => !!g);

		return {
			mainGroups: toGroups(getMainCampaignBaseNames()),
			eventGroups: toGroups(getEventCampaignBaseNames()),
		};
	})();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
				<p className="text-muted-foreground">
					Track your campaign progression across all chapters.
				</p>
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
