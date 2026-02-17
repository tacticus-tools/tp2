import { createFileRoute } from "@tanstack/react-router";
import { ONSLAUGHT_TRACKS } from "@/5-assets/onslaught";

export const Route = createFileRoute("/data/onslaught")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<h1 className="w-full text-center text-5xl font-bold">ONSLAUGHT</h1>
			<div className="grid w-full grid-cols-6 gap-4">
				{ONSLAUGHT_TRACKS.map((track) => (
					<div
						key={track.alliance}
						className="flex flex-col items-center gap-2 border"
					>
						<span>Alliance: {track.alliance}</span>
						<span>Sectors: {track.sectors.length}</span>
						<span>Badge Rewards: {track.badgeAlliance}</span>
					</div>
				))}
			</div>
		</div>
	);
}
