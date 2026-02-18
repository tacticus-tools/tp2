import {
	AlertTriangle,
	Calendar,
	ChevronDown,
	Loader2,
	Swords,
} from "lucide-react";
import { CampaignIcon } from "@/1-components/general/CampaignIcon";
import { CharacterIcon } from "@/1-components/general/CharacterIcon";
import { EnergyIcon } from "@/1-components/general/EnergyIcon";
import { MaterialIcon } from "@/1-components/general/MaterialIcon";
import { Badge } from "@/1-components/ui/badge";
import type { IDailyRaidsPlan } from "@/4-lib/general/daily-raids/types";

interface DailyRaidsPlanProps {
	plan: IDailyRaidsPlan | null;
	computing: boolean;
}

export function DailyRaidsPlan({ plan, computing }: DailyRaidsPlanProps) {
	if (computing || !plan) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (plan.days.length === 0 && plan.blockedMaterials.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
				<div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50">
					<Calendar className="size-8 text-muted-foreground" />
				</div>
				<h3 className="mb-1 text-lg font-medium text-foreground">
					No raids needed
				</h3>
				<p className="text-center text-sm text-muted-foreground">
					All included Rank Up goals are already complete or have no farmable
					materials.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Summary */}
			<div className="grid grid-cols-3 gap-3">
				<SummaryCard label="Total Days" value={plan.totalDays.toString()} />
				<SummaryCard
					label="Total Energy"
					value={formatEnergy(plan.totalEnergy)}
					showEnergy
				/>
				<SummaryCard
					label="Total Raids"
					value={plan.totalRaids.toLocaleString()}
				/>
			</div>

			{/* Blocked materials */}
			{plan.blockedMaterials.length > 0 && (
				<details className="group rounded-lg border border-amber-500/30 bg-amber-500/5">
					<summary className="flex cursor-pointer items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
						<AlertTriangle className="size-5 shrink-0 text-amber-400" />
						<div className="flex-1">
							<span className="text-sm font-medium text-amber-400">
								{plan.blockedMaterials.length} Blocked Material
								{plan.blockedMaterials.length > 1 ? "s" : ""}
							</span>
							<span className="ml-2 text-xs text-muted-foreground">
								No unlocked nodes drop these materials
							</span>
						</div>
						<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
					</summary>
					<div className="border-t border-amber-500/20 px-4 pt-2 pb-3">
						<div className="space-y-2">
							{plan.blockedMaterials.map((mat) => (
								<div key={mat.materialId} className="text-sm">
									{/* Desktop */}
									<div className="hidden sm:grid sm:grid-cols-[1.5rem_1fr_auto_auto] sm:items-center sm:gap-2">
										<MaterialIcon
											icon={mat.materialIcon}
											label={mat.materialLabel}
										/>
										<span className="truncate text-foreground">
											{mat.materialLabel}
										</span>
										<div className="flex -space-x-1">
											{mat.unitIds.map((id) => (
												<CharacterIcon key={id} unitId={id} size={20} />
											))}
										</div>
										<span className="text-muted-foreground">x{mat.count}</span>
									</div>
									{/* Mobile */}
									<div className="space-y-1 sm:hidden">
										<div className="flex items-center justify-between">
											<div className="flex min-w-0 items-center gap-1.5">
												<MaterialIcon
													icon={mat.materialIcon}
													label={mat.materialLabel}
												/>
												<span className="truncate text-foreground">
													{mat.materialLabel}
												</span>
											</div>
											<span className="shrink-0 text-muted-foreground">
												x{mat.count}
											</span>
										</div>
										<div className="flex -space-x-1 pl-7">
											{mat.unitIds.map((id) => (
												<CharacterIcon key={id} unitId={id} size={18} />
											))}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</details>
			)}

			{/* Days */}
			{plan.days.length > 0 && (
				<div className="space-y-3">
					{plan.days.map((day) => (
						<details
							key={day.dayNumber}
							className="group rounded-lg border border-border/60 bg-card"
							open={day.dayNumber === 1}
						>
							<summary className="flex cursor-pointer items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
								<div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-sm font-bold text-foreground">
									{day.dayNumber}
								</div>
								<div className="flex-1">
									<span className="text-sm font-medium text-foreground">
										Day {day.dayNumber}
									</span>
									<span className="ml-2 text-xs text-muted-foreground">
										{day.raids.length} material
										{day.raids.length > 1 ? "s" : ""}
									</span>
								</div>
								<div className="flex items-center gap-3">
									<Badge variant="secondary" className="text-xs">
										<EnergyIcon size={12} />
										{day.energyTotal}
									</Badge>
									<Badge variant="secondary" className="text-xs">
										<Swords className="mr-1 size-3" />
										{day.raidsTotal}
									</Badge>
								</div>
								<ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
							</summary>
							<div className="border-t border-border/40 px-4 pt-2 pb-3">
								<div className="space-y-3">
									{day.raids.map((raid) => (
										<div
											key={`${raid.goalId}_${raid.materialId}`}
											className="space-y-1.5 rounded-md px-2 py-1.5"
										>
											{/* Material header */}
											<div className="flex items-center gap-2">
												<MaterialIcon
													icon={raid.materialIcon}
													label={raid.materialLabel}
												/>
												<span className="text-sm font-medium text-foreground">
													{raid.materialLabel}
												</span>
												<span className="text-xs text-muted-foreground tabular-nums">
													{Math.round(raid.acquiredCount)}/{raid.requiredCount}
												</span>
												<div className="flex -space-x-1">
													{raid.unitIds.map((id) => (
														<CharacterIcon key={id} unitId={id} size={18} />
													))}
												</div>
											</div>

											{/* Raid locations */}
											<div className="space-y-1 pl-7">
												{raid.raidLocations.map((loc) => (
													<div
														key={loc.battleId}
														className="flex items-center gap-2 text-xs text-muted-foreground"
													>
														<CampaignIcon campaign={loc.campaign} size={16} />
														<span>
															{loc.campaign} #{loc.nodeNumber}
														</span>
														<span className="tabular-nums">
															{loc.raidsCount} raid
															{loc.raidsCount > 1 ? "s" : ""}
														</span>
														<span className="flex items-center gap-0.5 tabular-nums">
															<EnergyIcon size={10} />
															{loc.energySpent}
														</span>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						</details>
					))}
				</div>
			)}
		</div>
	);
}

function SummaryCard({
	label,
	value,
	showEnergy = false,
}: {
	label: string;
	value: string;
	showEnergy?: boolean;
}) {
	return (
		<div className="rounded-lg border border-border/60 bg-card p-4">
			<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
				{label}
			</p>
			<p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-foreground">
				{value}
				{showEnergy && <EnergyIcon size={20} />}
			</p>
		</div>
	);
}

function formatEnergy(energy: number): string {
	if (energy >= 1000) {
		return `${(energy / 1000).toFixed(1)}k`;
	}
	return Math.round(energy).toString();
}
