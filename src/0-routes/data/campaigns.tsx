import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/1-components/ui/badge.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import {
	CAMPAIGN_BATTLES,
	NODE_ENERGY_COSTS,
} from "@/5-assets/campaign-battles/index.ts";

export const Route = createFileRoute("/data/campaigns")({
	component: CampaignsDataPage,
});

function CampaignsDataPage() {
	const campaignNames = useMemo(() => Object.keys(CAMPAIGN_BATTLES).sort(), []);
	const [selectedCampaign, setSelectedCampaign] = useState(
		campaignNames[0] ?? "",
	);

	const battles = useMemo(() => {
		const key = selectedCampaign as keyof typeof CAMPAIGN_BATTLES;
		return CAMPAIGN_BATTLES[key] ?? [];
	}, [selectedCampaign]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Campaign Battles</h1>
				<p className="text-muted-foreground">
					Browse battles, enemies, and energy costs across{" "}
					{campaignNames.length} campaigns.
				</p>
			</div>

			<Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
				<SelectTrigger className="w-72">
					<SelectValue placeholder="Select campaign" />
				</SelectTrigger>
				<SelectContent>
					{campaignNames.map((name) => (
						<SelectItem key={name} value={name}>
							{name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{battles.length > 0 && (
				<div className="overflow-x-auto rounded-lg border border-border/50">
					<table className="w-full text-sm">
						<thead className="bg-muted/50">
							<tr className="border-b border-border/50">
								<th className="px-3 py-2 text-left font-medium">Node</th>
								<th className="px-3 py-2 text-right font-medium">Energy</th>
								<th className="px-3 py-2 text-right font-medium">Slots</th>
								<th className="px-3 py-2 text-right font-medium">Power</th>
								<th className="px-3 py-2 text-right font-medium">Enemies</th>
								<th className="px-3 py-2 text-left font-medium">Factions</th>
								<th className="px-3 py-2 text-left font-medium">Enemy Types</th>
							</tr>
						</thead>
						<tbody>
							{battles.map((battle) => {
								const energyKey =
									`${selectedCampaign}:${String(battle.nodeNumber)}` as keyof typeof NODE_ENERGY_COSTS;
								const energy = NODE_ENERGY_COSTS[energyKey];

								return (
									<tr
										key={battle.id}
										className="border-b border-border/30 last:border-0"
									>
										<td className="px-3 py-2 font-medium">{battle.id}</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{energy ?? "—"}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{battle.slots}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{battle.enemyPower.toLocaleString()}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{battle.enemiesTotal}
										</td>
										<td className="px-3 py-2">
											<div className="flex flex-wrap gap-1">
												{battle.enemiesFactions.map((f) => (
													<Badge
														key={f}
														variant="outline"
														className="text-[10px]"
													>
														{f}
													</Badge>
												))}
											</div>
										</td>
										<td className="px-3 py-2 text-muted-foreground">
											{battle.enemiesTypes.join(", ")}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
