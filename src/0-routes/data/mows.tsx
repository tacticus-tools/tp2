import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/1-components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import { MOWS } from "@/5-assets/mows/index.ts";

export const Route = createFileRoute("/data/mows")({
	component: MowsPage,
});

const ALLIANCES = ["all", "Imperial", "Chaos", "Xenos"] as const;

function MowsPage() {
	const [search, setSearch] = useState("");
	const [allianceFilter, setAllianceFilter] = useState("all");

	const filtered = (() => {
		let result = [...MOWS];
		if (allianceFilter !== "all") {
			result = result.filter((m) => m.alliance === allianceFilter);
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			result = result.filter((m) => m.name.toLowerCase().includes(q));
		}
		return result.sort((a, b) => a.name.localeCompare(b.name));
	})();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Machines of War</h1>
				<p className="text-muted-foreground">
					Browse all {MOWS.length} machines of war.
				</p>
			</div>

			<div className="flex gap-3">
				<Input
					placeholder="Search..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="max-w-xs"
				/>
				<Select value={allianceFilter} onValueChange={setAllianceFilter}>
					<SelectTrigger className="w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ALLIANCES.map((a) => (
							<SelectItem key={a} value={a}>
								{a === "all" ? "All alliances" : a}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="overflow-x-auto rounded-lg border border-border/50">
				<table className="w-full text-sm">
					<thead className="bg-muted/50">
						<tr className="border-b border-border/50">
							<th className="px-3 py-2 text-left font-medium">MoW</th>
							<th className="px-3 py-2 text-left font-medium">Faction</th>
							<th className="px-3 py-2 text-left font-medium">Alliance</th>
							<th className="px-3 py-2 text-left font-medium">Rarity</th>
							<th className="px-3 py-2 text-left font-medium">
								Primary Ability
							</th>
							<th className="px-3 py-2 text-left font-medium">
								Secondary Ability
							</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((mow) => (
							<tr
								key={mow.id}
								className="border-b border-border/30 last:border-0"
							>
								<td className="px-3 py-2">
									<div className="flex items-center gap-2">
										{mow.roundIcon && (
											<img
												src={mow.roundIcon}
												alt=""
												width={28}
												height={28}
												loading="lazy"
												className="shrink-0 rounded-full"
											/>
										)}
										<span className="font-medium">{mow.name}</span>
									</div>
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									{mow.factionId}
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									{mow.alliance}
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									{mow.initialRarity}
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									{mow.primaryAbility ?? "—"}
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									{mow.secondaryAbility ?? "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{filtered.length === 0 && (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No machines of war match the filters.
				</p>
			)}
		</div>
	);
}
