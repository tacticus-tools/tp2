import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/1-components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import { CHARACTER_RANK_UP_MATERIALS } from "@/5-assets/character-rank-up-materials/index.ts";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import { MATERIALS } from "@/5-assets/materials/index.ts";

export const Route = createFileRoute("/data/upgrades")({
	component: UpgradesPage,
});

const charLookup = new Map(CHARACTERS.map((c) => [c.id as string, c]));

function UpgradesPage() {
	const [search, setSearch] = useState("");
	const [selectedCharId, setSelectedCharId] = useState("all");

	const characterEntries = useMemo(() => {
		const entries = Object.entries(CHARACTER_RANK_UP_MATERIALS)
			.map(([id, ranks]) => ({
				id,
				name: charLookup.get(id)?.name ?? id,
				roundIcon: charLookup.get(id)?.roundIcon,
				ranks: ranks as Record<string, readonly string[]>,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		if (selectedCharId !== "all") {
			return entries.filter((e) => e.id === selectedCharId);
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			return entries.filter((e) => e.name.toLowerCase().includes(q));
		}
		return entries;
	}, [search, selectedCharId]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Rank-Up Materials</h1>
				<p className="text-muted-foreground">
					Browse materials required for each character rank-up.
				</p>
			</div>

			<div className="flex gap-3">
				<Input
					placeholder="Search character..."
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setSelectedCharId("all");
					}}
					className="max-w-xs"
				/>
				<Select
					value={selectedCharId}
					onValueChange={(v) => {
						setSelectedCharId(v);
						setSearch("");
					}}
				>
					<SelectTrigger className="w-52">
						<SelectValue placeholder="Select character" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All characters</SelectItem>
						{[...charLookup.entries()]
							.sort(([, a], [, b]) => a.name.localeCompare(b.name))
							.map(([id, c]) => (
								<SelectItem key={id} value={id}>
									{c.name}
								</SelectItem>
							))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-6">
				{characterEntries.map((entry) => (
					<div
						key={entry.id}
						className="rounded-lg border border-border/50 bg-card"
					>
						<div className="flex items-center gap-3 border-b border-border/30 p-3">
							{entry.roundIcon && (
								<img
									src={entry.roundIcon}
									alt=""
									width={32}
									height={32}
									loading="lazy"
									className="rounded-full"
								/>
							)}
							<h3 className="font-medium">{entry.name}</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-muted/30">
									<tr className="border-b border-border/30">
										<th className="px-3 py-2 text-left font-medium">Rank</th>
										<th className="px-3 py-2 text-left font-medium">
											Materials (6 slots)
										</th>
									</tr>
								</thead>
								<tbody>
									{Object.entries(entry.ranks).map(([rank, materialIds]) => (
										<tr
											key={rank}
											className="border-b border-border/20 last:border-0"
										>
											<td className="px-3 py-2 font-medium whitespace-nowrap">
												{rank}
											</td>
											<td className="px-3 py-2">
												<div className="flex flex-wrap gap-1">
													{materialIds.map((matId, idx) => {
														const mat = (
															MATERIALS as unknown as Record<
																string,
																| {
																		name: string;
																		iconFilename: string | undefined;
																  }
																| undefined
															>
														)[matId];
														return (
															<div
																key={`${rank}-${String(idx)}`}
																className="flex items-center gap-1"
																title={mat?.name ?? matId}
															>
																{mat?.iconFilename ? (
																	<img
																		src={mat.iconFilename}
																		alt={mat.name}
																		width={28}
																		height={28}
																		loading="lazy"
																		className="shrink-0"
																	/>
																) : (
																	<span className="inline-flex size-7 items-center justify-center rounded-sm bg-muted font-mono text-[8px] text-muted-foreground">
																		{matId.slice(-4)}
																	</span>
																)}
															</div>
														);
													})}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				))}
			</div>

			{characterEntries.length === 0 && (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No characters match the search.
				</p>
			)}
		</div>
	);
}
