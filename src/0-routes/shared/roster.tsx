import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import z from "zod";
import type { Alliance } from "#common/alliance.ts";
import { RosterControls } from "@/1-components/roster/RosterControls.tsx";
import { RosterGrid } from "@/1-components/roster/RosterGrid.tsx";
import {
	enrichRoster,
	filterRoster,
	type RosterSortKey,
} from "@/4-lib/general/roster-display.ts";
import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
import { RosterUnitSchema } from "@/4-lib/general/schemas.ts";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import { FACTIONS } from "@/5-assets/factions/index.ts";
import { MOWS } from "@/5-assets/mows/index.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export const Route = createFileRoute("/shared/roster")({
	component: SharedRosterPage,
	validateSearch: (search: Record<string, unknown>) => ({
		token: (search.token as string) ?? "",
	}),
});

function deserializeRoster(json: string): Record<string, RosterUnit> {
	return z.record(z.string(), RosterUnitSchema).parse(JSON.parse(json));
}

function SharedRosterPage() {
	const { token } = useSearch({ from: "/shared/roster" });
	const dataQuery = useQuery({
		...convexQuery(api.roster.getShared, { token }),
		enabled: !!token,
	});

	const [search, setSearch] = useState("");
	const [allianceFilter, setAllianceFilter] = useState<Alliance | "all">("all");
	const [sortBy, setSortBy] = useState<RosterSortKey>("rank");
	const [viewMode, setViewMode] = useState<"faction" | "all">("faction");

	const roster = dataQuery.data?.roster
		? deserializeRoster(dataQuery.data.roster)
		: {};

	const enriched = enrichRoster(roster, CHARACTERS, MOWS);

	const filtered = filterRoster(enriched, search, allianceFilter);

	if (!token) {
		return (
			<div className="py-20 text-center text-muted-foreground">
				No roster token provided.
			</div>
		);
	}

	if (dataQuery.isPending) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (dataQuery.data === null) {
		return (
			<div className="py-20 text-center text-muted-foreground">
				Roster not found or link has expired.
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Shared Roster</h1>
				<p className="text-muted-foreground">
					Last updated{" "}
					{new Date(dataQuery.data!.updatedAt).toLocaleDateString(undefined, {
						year: "numeric",
						month: "short",
						day: "numeric",
					})}
				</p>
			</div>

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

			<RosterGrid
				units={filtered}
				factions={FACTIONS}
				viewMode={viewMode}
				sortBy={sortBy}
			/>
		</div>
	);
}
