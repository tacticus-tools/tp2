import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
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

function deserializeRoster(json: string): Map<string, RosterUnit> {
	const obj = z.record(z.string(), RosterUnitSchema).parse(JSON.parse(json));
	const map = new Map<string, RosterUnit>();
	for (const [id, unit] of Object.entries(obj)) {
		map.set(id, unit);
	}
	return map;
}

function SharedRosterPage() {
	const { token } = useSearch({ from: "/shared/roster" });
	const data = useQuery(api.roster.getShared, token ? { token } : "skip");

	const [search, setSearch] = useState("");
	const [allianceFilter, setAllianceFilter] = useState<Alliance | "all">("all");
	const [sortBy, setSortBy] = useState<RosterSortKey>("rank");
	const [viewMode, setViewMode] = useState<"faction" | "all">("faction");

	const roster = useMemo(() => {
		if (!data?.roster) return new Map<string, RosterUnit>();
		return deserializeRoster(data.roster);
	}, [data?.roster]);

	const enriched = useMemo(
		() => enrichRoster(roster, CHARACTERS, MOWS),
		[roster],
	);

	const filtered = useMemo(
		() => filterRoster(enriched, search, allianceFilter),
		[enriched, search, allianceFilter],
	);

	if (!token) {
		return (
			<div className="py-20 text-center text-muted-foreground">
				No roster token provided.
			</div>
		);
	}

	if (data === undefined) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (data === null) {
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
					{new Date(data.updatedAt).toLocaleDateString(undefined, {
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
