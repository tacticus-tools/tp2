import { CampaignIcon } from "@/1-components/general/CampaignIcon.tsx";
import type { Campaign } from "@/4-lib/general/constants.ts";
import { cn } from "@/4-lib/utils.ts";

const TYPE_BADGE_STYLES: Record<string, string> = {
	Normal: "bg-blue-500/15 text-blue-400",
	Elite: "bg-purple-500/15 text-purple-400",
	Mirror: "bg-amber-500/15 text-amber-400",
	"Elite Mirror": "bg-rose-500/15 text-rose-400",
	Standard: "bg-blue-500/15 text-blue-400",
	"Standard Challenge": "bg-purple-500/15 text-purple-400",
	Extremis: "bg-amber-500/15 text-amber-400",
	"Extremis Challenge": "bg-rose-500/15 text-rose-400",
};

interface CampaignProgressCardProps {
	campaign: Campaign;
	type: string;
	unlockedNodes: number;
	totalNodes: number;
}

export function CampaignProgressCard({
	campaign,
	type,
	unlockedNodes,
	totalNodes,
}: CampaignProgressCardProps) {
	const percent = totalNodes > 0 ? (unlockedNodes / totalNodes) * 100 : 0;
	const isComplete = unlockedNodes >= totalNodes;
	const isStarted = unlockedNodes > 0;

	return (
		<div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 overflow-hidden">
					<CampaignIcon campaign={campaign} size={28} />
					<h3 className="truncate text-sm font-semibold">{campaign}</h3>
				</div>
				<span
					className={cn(
						"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
						TYPE_BADGE_STYLES[type],
					)}
				>
					{type}
				</span>
			</div>

			{/* Progress bar */}
			<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-500",
						isComplete
							? "bg-emerald-500"
							: isStarted
								? "bg-amber-500"
								: "bg-muted-foreground/20",
					)}
					style={{ width: `${Math.min(percent, 100)}%` }}
				/>
			</div>

			<p
				className={cn(
					"text-xs",
					isComplete
						? "text-emerald-400"
						: isStarted
							? "text-muted-foreground"
							: "text-muted-foreground/60",
				)}
			>
				{unlockedNodes} / {totalNodes} nodes
			</p>
		</div>
	);
}
