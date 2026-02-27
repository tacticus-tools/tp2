import { Input } from "@/1-components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import type { Alliance } from "@/4-lib/general/constants.ts";
import type { RosterSortKey } from "@/4-lib/general/roster-display.ts";

interface RosterControlsProps {
	search: string;
	onSearchChange: (value: string) => void;
	allianceFilter: Alliance | "all";
	onAllianceChange: (value: Alliance | "all") => void;
	sortBy: RosterSortKey;
	onSortChange: (value: RosterSortKey) => void;
	viewMode: "faction" | "all";
	onViewModeChange: (value: "faction" | "all") => void;
	unitCount: number;
}

export function RosterControls({
	search,
	onSearchChange,
	allianceFilter,
	onAllianceChange,
	sortBy,
	onSortChange,
	viewMode,
	onViewModeChange,
	unitCount,
}: RosterControlsProps) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Input
				placeholder="Search..."
				value={search}
				onChange={(e) => onSearchChange(e.target.value)}
				className="w-40"
			/>

			<Select
				value={allianceFilter}
				onValueChange={(v) => onAllianceChange(v as Alliance | "all")}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Alliances</SelectItem>
					<SelectItem value="Imperial">Imperial</SelectItem>
					<SelectItem value="Chaos">Chaos</SelectItem>
					<SelectItem value="Xenos">Xenos</SelectItem>
				</SelectContent>
			</Select>

			<Select
				value={sortBy}
				onValueChange={(v) => onSortChange(v as RosterSortKey)}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="rank">Sort: Rank</SelectItem>
					<SelectItem value="rarity">Sort: Rarity</SelectItem>
					<SelectItem value="name">Sort: Name</SelectItem>
					<SelectItem value="faction">Sort: Faction</SelectItem>
					<SelectItem value="level">Sort: Level</SelectItem>
					<SelectItem value="power">Sort: Power</SelectItem>
				</SelectContent>
			</Select>

			<Select
				value={viewMode}
				onValueChange={(v) => onViewModeChange(v as "faction" | "all")}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="faction">By Faction</SelectItem>
					<SelectItem value="all">All Units</SelectItem>
				</SelectContent>
			</Select>

			<span className="ml-auto text-xs text-muted-foreground">
				{unitCount} units
			</span>
		</div>
	);
}
