import { Badge } from "@/1-components/ui/badge.tsx";
import { cn } from "@/4-lib/utils.ts";

const TRACKS = ["alpha", "beta", "gamma"] as const;

export function LreTrackSelector({
	selectedTrack,
	trackNames,
	onSelect,
}: {
	selectedTrack: "alpha" | "beta" | "gamma";
	trackNames: { alpha: string; beta: string; gamma: string };
	onSelect: (track: "alpha" | "beta" | "gamma") => void;
}) {
	return (
		<div className="flex min-w-0 gap-1.5 sm:gap-2">
			{TRACKS.map((track) => (
				<button
					key={track}
					type="button"
					onClick={() => onSelect(track)}
					className={cn(
						"min-w-0 flex-1 truncate rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:px-3 sm:text-sm",
						selectedTrack === track
							? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
							: "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
					)}
				>
					<span className="capitalize">{track}</span>
					<Badge
						variant="outline"
						className="ml-1 hidden text-xs sm:inline-flex"
					>
						{trackNames[track].replace(
							`${track.charAt(0).toUpperCase() + track.slice(1)} `,
							"",
						)}
					</Badge>
				</button>
			))}
		</div>
	);
}
