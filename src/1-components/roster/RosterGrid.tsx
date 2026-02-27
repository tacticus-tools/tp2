import type React from "react";
import type {
	EnrichedRosterUnit,
	RosterSortKey,
} from "@/4-lib/general/roster-display.ts";
import { groupByFaction, sortRoster } from "@/4-lib/general/roster-display.ts";
import {
	type FactionData,
	getFactionIconUrl,
} from "@/5-assets/factions/index.ts";
import { UnitCard } from "./UnitCard.tsx";

interface RosterGridProps {
	units: EnrichedRosterUnit[];
	factions: FactionData;
	viewMode: "faction" | "all";
	sortBy: RosterSortKey;
	gridRef?: React.RefObject<HTMLDivElement | null>;
}

const gridCols =
	"grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3";

export function RosterGrid({
	units,
	factions,
	viewMode,
	sortBy,
	gridRef,
}: RosterGridProps) {
	if (units.length === 0) {
		return (
			<p className="py-12 text-center text-muted-foreground">
				No units to display. Sync your roster first.
			</p>
		);
	}

	if (viewMode === "faction") {
		const groups = groupByFaction(sortRoster(units, sortBy), factions);

		return (
			<div ref={gridRef} className="space-y-6">
				{groups.map((group) => {
					const iconUrl = getFactionIconUrl(group.factionId);
					return (
						<section key={group.factionId}>
							<div className="mb-2 flex items-center gap-2">
								{iconUrl ? (
									<img
										src={iconUrl}
										alt=""
										width={20}
										height={20}
										className="shrink-0"
									/>
								) : (
									<div
										className="size-5 shrink-0 rounded-full"
										style={{ backgroundColor: group.factionColor }}
									/>
								)}
								<h3 className="text-sm font-semibold">{group.factionName}</h3>
								<span className="text-xs text-muted-foreground">
									({group.units.length})
								</span>
							</div>
							<div className={gridCols}>
								{group.units.map((unit) => (
									<UnitCard key={unit.id} unit={unit} />
								))}
							</div>
						</section>
					);
				})}
			</div>
		);
	}

	const sorted = sortRoster(units, sortBy);

	return (
		<div ref={gridRef} className={gridCols}>
			{sorted.map((unit) => (
				<UnitCard key={unit.id} unit={unit} />
			))}
		</div>
	);
}
