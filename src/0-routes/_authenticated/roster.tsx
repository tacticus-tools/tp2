import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Alliance } from "#common/alliance.ts";
import { RosterControls } from "@/1-components/roster/RosterControls.tsx";
import { RosterGrid } from "@/1-components/roster/RosterGrid.tsx";
import { ShareRosterDialog } from "@/1-components/roster/ShareRosterDialog.tsx";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
import {
	enrichRoster,
	filterRoster,
	type RosterSortKey,
} from "@/4-lib/general/roster-display.ts";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import { FACTIONS } from "@/5-assets/factions/index.ts";
import { MOWS } from "@/5-assets/mows/index.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export const Route = createFileRoute("/_authenticated/roster")({
	component: RosterPage,
});

function RosterPage() {
	const shareRoster = useMutation({
		mutationFn: useConvexMutation(api.roster.share),
		onSuccess: () => {
			toast.success("Roster shared successfully");
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to share roster",
			);
		},
	});

	const roster = usePlayerDataStore((s) => s.roster);

	const [search, setSearch] = useState("");
	const [allianceFilter, setAllianceFilter] = useState<Alliance | "all">("all");
	const [sortBy, setSortBy] = useState<RosterSortKey>("rank");
	const [viewMode, setViewMode] = useState<"faction" | "all">("faction");

	const gridRef = useRef<HTMLDivElement>(null);

	const enriched = enrichRoster(roster, CHARACTERS, MOWS, {
		includeUnowned: true,
	});

	const filtered = filterRoster(enriched, search, allianceFilter);

	const handleShare = async () => {
		const result = await shareRoster.mutateAsync({
			roster: JSON.stringify(roster),
		});
		return result?.token ?? null;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Roster</h1>
					<p className="text-muted-foreground">
						Your owned characters and machines of war.
					</p>
				</div>

				{Object.keys(roster).length > 0 && (
					<ShareRosterDialog gridRef={gridRef} onShare={handleShare} />
				)}
			</div>

			{/* Controls */}
			<RosterControls
				search={search}
				onSearchChange={setSearch}
				allianceFilter={allianceFilter}
				onAllianceChange={setAllianceFilter}
				sortBy={sortBy}
				onSortChange={setSortBy}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
				unitCount={filtered.filter((u) => !u.isLocked).length}
			/>

			{/* Grid */}
			<RosterGrid
				units={filtered}
				factions={FACTIONS}
				viewMode={viewMode}
				sortBy={sortBy}
				gridRef={gridRef}
			/>
		</div>
	);
}
