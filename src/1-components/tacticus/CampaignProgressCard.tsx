import { cn } from "@/4-lib/utils";

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
	name: string;
	type: string;
	unlockedNodes: number;
	totalNodes: number;
	editable?: boolean;
	onProgressChange?: (value: number) => void;
}

export function CampaignProgressCard({
	name,
	type,
	unlockedNodes,
	totalNodes,
	editable,
	onProgressChange,
}: CampaignProgressCardProps) {
	const percent = totalNodes > 0 ? (unlockedNodes / totalNodes) * 100 : 0;
	const isComplete = unlockedNodes >= totalNodes;
	const isStarted = unlockedNodes > 0;

	return (
		<div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-semibold truncate">{name}</h3>
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

			<div className="flex items-center justify-between">
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
					{editable ? "" : `${unlockedNodes} / `}
					{!editable && `${totalNodes} nodes`}
				</p>
				{editable && onProgressChange ? (
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<input
							type="number"
							min={0}
							max={totalNodes}
							value={unlockedNodes}
							onChange={(e) => {
								const v = Number.parseInt(e.target.value, 10);
								if (!Number.isNaN(v)) {
									onProgressChange(Math.max(0, Math.min(v, totalNodes)));
								}
							}}
							className="w-12 rounded border border-border bg-background px-1.5 py-0.5 text-center text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
						/>
						<span>/ {totalNodes}</span>
					</div>
				) : (
					editable || null
				)}
			</div>
		</div>
	);
}
