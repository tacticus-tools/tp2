import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { RosterControls } from "@/1-components/roster/RosterControls.tsx";
import { RosterGrid } from "@/1-components/roster/RosterGrid.tsx";
import { ShareRosterDialog } from "@/1-components/roster/ShareRosterDialog.tsx";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
import type { Alliance } from "@/4-lib/general/constants.ts";
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
	const shareRoster = useMutation(api.roster.share);

	const roster = usePlayerDataStore((s) => s.roster);

	const [search, setSearch] = useState("");
	const [allianceFilter, setAllianceFilter] = useState<Alliance | "all">("all");
	const [sortBy, setSortBy] = useState<RosterSortKey>("rank");
	const [viewMode, setViewMode] = useState<"faction" | "all">("faction");

	const gridRef = useRef<HTMLDivElement>(null);

	const enriched = useMemo(
		() => enrichRoster(roster, CHARACTERS, MOWS),
		[roster],
	);

	const filtered = useMemo(
		() => filterRoster(enriched, search, allianceFilter),
		[enriched, search, allianceFilter],
	);

	const handleShare = useCallback(async () => {
		const obj = Object.fromEntries(
			Array.from(roster.entries()).map(([id, unit]) => [id, unit]),
		);
		const result = await shareRoster({
			roster: JSON.stringify(obj),
		});
		return result.token;
	}, [roster, shareRoster]);

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

				{roster.size > 0 && (
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
				unitCount={filtered.length}
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
