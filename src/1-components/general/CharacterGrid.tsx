import { useMemo, useState } from "react";
import { RankIcon } from "@/1-components/general/RankIcon.tsx";
import { Input } from "@/1-components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
import { cn } from "@/4-lib/utils.ts";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import { FACTIONS, getFactionIconUrl } from "@/5-assets/factions/index.ts";

interface CharacterGridProps {
	selected: string[];
	onToggle: (characterId: string) => void;
	maxSelections?: number;
	/** When provided, only show characters whose IDs are in this set */
	allowedIds?: Set<string>;
	/** When provided, characters not in roster are grayed out and rank icons are shown */
	roster?: Map<string, RosterUnit>;
}

const allFactions = Object.entries(FACTIONS)
	.map(([id, f]) => ({ id, name: (f as { name: string }).name }))
	.sort((a, b) => a.name.localeCompare(b.name));

export function CharacterGrid({
	selected,
	onToggle,
	maxSelections,
	allowedIds,
	roster,
}: CharacterGridProps) {
	const [search, setSearch] = useState("");
	const [factionFilter, setFactionFilter] = useState("all");

	const selectedSet = useMemo(() => new Set(selected), [selected]);

	const filtered = useMemo(() => {
		let chars = [...CHARACTERS];
		if (allowedIds) {
			chars = chars.filter((c) => allowedIds.has(c.id));
		}
		if (factionFilter !== "all") {
			chars = chars.filter((c) => c.factionId === factionFilter);
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			chars = chars.filter((c) => c.name.toLowerCase().includes(q));
		}
		// Sort: roster characters first (by rank descending), then locked alphabetically
		if (roster) {
			return chars.sort((a, b) => {
				const aUnit = roster.get(a.id);
				const bUnit = roster.get(b.id);
				if (aUnit && !bUnit) return -1;
				if (!aUnit && bUnit) return 1;
				if (aUnit && bUnit) return bUnit.rank - aUnit.rank;
				return a.name.localeCompare(b.name);
			});
		}
		return chars.sort((a, b) => a.name.localeCompare(b.name));
	}, [search, factionFilter, allowedIds, roster]);

	const atMax = maxSelections !== undefined && selected.length >= maxSelections;

	return (
		<div className="space-y-3">
			<div className="flex gap-2">
				<Input
					placeholder="Search characters..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="flex-1"
				/>
				<Select value={factionFilter} onValueChange={setFactionFilter}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Faction" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All factions</SelectItem>
						{allFactions.map((f) => (
							<SelectItem key={f.id} value={f.id}>
								{f.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid max-h-64 grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-6 md:grid-cols-8">
				{filtered.map((char) => {
					const isSelected = selectedSet.has(char.id);
					const rosterUnit = roster?.get(char.id);
					const isLocked = roster !== undefined && !rosterUnit;
					const disabled = (!isSelected && atMax) || (isLocked && !isSelected);
					const iconUrl = getFactionIconUrl(char.factionId);

					return (
						<button
							key={char.id}
							type="button"
							disabled={disabled}
							onClick={() => onToggle(char.id)}
							className={cn(
								"relative flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-center transition-colors",
								isSelected
									? "border-emerald-500 bg-emerald-500/10"
									: "border-border/50 hover:border-border",
								disabled && "cursor-not-allowed opacity-40",
								isLocked && "grayscale",
							)}
						>
							{char.roundIcon ? (
								<img
									src={char.roundIcon}
									alt={char.name}
									width={36}
									height={36}
									loading="lazy"
									className="rounded-full object-cover"
								/>
							) : (
								<div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
									{char.name[0]}
								</div>
							)}
							<span className="w-full truncate text-[10px] leading-tight">
								{char.name}
							</span>
							{iconUrl && (
								<img
									src={iconUrl}
									alt=""
									width={12}
									height={12}
									className="absolute top-0.5 right-0.5"
								/>
							)}
							{rosterUnit && (
								<div className="absolute -bottom-1 -left-1">
									<RankIcon rank={rosterUnit.rank} size={16} />
								</div>
							)}
						</button>
					);
				})}
			</div>

			{maxSelections !== undefined && (
				<p className="text-xs text-muted-foreground">
					{selected.length}/{maxSelections} selected
				</p>
			)}
		</div>
	);
}
