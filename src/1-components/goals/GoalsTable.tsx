import {
	ArrowUpDown,
	ChevronDown,
	ChevronUp,
	Pencil,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CharacterIcon } from "@/1-components/tacticus/CharacterIcon";
import { EnergyIcon } from "@/1-components/tacticus/EnergyIcon";
import { RarityIcon } from "@/1-components/tacticus/RarityIcon";
import { Badge } from "@/1-components/ui/badge";
import { Button } from "@/1-components/ui/button";
import type { PersonalGoalType, Rarity } from "@/4-lib/tacticus/enums";
import type { IGoalEstimate } from "@/4-lib/tacticus/goals/types";
import { goalTypeLabels } from "@/4-lib/tacticus/goals/types";
import { cn } from "@/4-lib/utils";

type SortKey = "priority" | "unitName" | "type" | "days" | "energy" | "date";
type SortDir = "asc" | "desc";

interface GoalsTableRow {
	goalId: string;
	type: PersonalGoalType;
	unitId: string;
	unitName: string;
	priority: number;
	include: boolean;
	estimate?: IGoalEstimate;
	data: string;
}

interface GoalsTableProps {
	rows: GoalsTableRow[];
	isFirst: (goalId: string) => boolean;
	isLast: (goalId: string) => boolean;
	onEdit: (goalId: string) => void;
	onDelete: (goalId: string) => void;
	onToggleInclude: (goalId: string, include: boolean) => void;
	onMoveUp: (goalId: string) => void;
	onMoveDown: (goalId: string) => void;
}

function SortHeader({
	label,
	column,
	className,
	onSort,
}: {
	label: string;
	column: SortKey;
	className?: string;
	onSort: (key: SortKey) => void;
}) {
	return (
		<th
			className={cn(
				"px-3 py-2 text-left text-xs font-medium text-muted-foreground",
				className,
			)}
		>
			<button
				type="button"
				onClick={() => onSort(column)}
				className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
			>
				{label}
				<ArrowUpDown className="size-3" />
			</button>
		</th>
	);
}

function getCompletionDate(daysTotal: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + daysTotal);
	return d;
}

function formatDate(d: Date): string {
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
	});
}

export function GoalsTable({
	rows,
	isFirst,
	isLast,
	onEdit,
	onDelete,
	onToggleInclude,
	onMoveUp,
	onMoveDown,
}: GoalsTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>("priority");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	function handleSort(key: SortKey) {
		if (sortKey === key) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	}

	const sorted = useMemo(() => {
		const copy = [...rows];
		const dir = sortDir === "asc" ? 1 : -1;
		copy.sort((a, b) => {
			switch (sortKey) {
				case "priority":
					return (a.priority - b.priority) * dir;
				case "unitName":
					return a.unitName.localeCompare(b.unitName) * dir;
				case "type":
					return (a.type - b.type) * dir;
				case "days":
					return (
						((a.estimate?.daysTotal ?? 0) - (b.estimate?.daysTotal ?? 0)) * dir
					);
				case "energy":
					return (
						((a.estimate?.energyTotal ?? 0) - (b.estimate?.energyTotal ?? 0)) *
						dir
					);
				case "date": {
					const aDate = a.estimate?.daysTotal ?? 0;
					const bDate = b.estimate?.daysTotal ?? 0;
					return (aDate - bDate) * dir;
				}
				default:
					return 0;
			}
		});
		return copy;
	}, [rows, sortKey, sortDir]);

	return (
		<div className="overflow-x-auto rounded-lg border border-border">
			<table className="w-full text-sm">
				<thead className="bg-muted/50">
					<tr>
						<SortHeader
							label="#"
							column="priority"
							className="w-12"
							onSort={handleSort}
						/>
						<SortHeader
							label="Character"
							column="unitName"
							onSort={handleSort}
						/>
						<SortHeader
							label="Type"
							column="type"
							className="w-32"
							onSort={handleSort}
						/>
						<SortHeader
							label="Days"
							column="days"
							className="w-20"
							onSort={handleSort}
						/>
						<SortHeader
							label="Energy"
							column="energy"
							className="w-24"
							onSort={handleSort}
						/>
						<SortHeader
							label="Est. Date"
							column="date"
							className="w-28"
							onSort={handleSort}
						/>
						<th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-12">
							Raids
						</th>
						<th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-36">
							Actions
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{sorted.map((row) => {
						const est = row.estimate;
						const days = est?.daysTotal ?? 0;
						const completionDate =
							days > 0 ? formatDate(getCompletionDate(days)) : "—";

						return (
							<tr
								key={row.goalId}
								className={cn(
									"transition-colors hover:bg-muted/30",
									!row.include && "opacity-50",
								)}
							>
								<td className="px-3 py-2 font-medium tabular-nums">
									{row.priority}
								</td>
								<td className="px-3 py-2">
									<div className="flex items-center gap-2">
										<CharacterIcon unitId={row.unitId} size={24} />
										<span className="font-medium">{row.unitName}</span>
									</div>
								</td>
								<td className="px-3 py-2">
									<div className="flex items-center gap-1.5">
										<Badge variant="outline" className="text-xs">
											{goalTypeLabels[row.type]}
										</Badge>
										{(() => {
											const parsed = JSON.parse(row.data) as Record<
												string,
												unknown
											>;
											const rarities = parsed.upgradesRarity as
												| number[]
												| undefined;
											if (!rarities?.length) return null;
											return rarities.map((r) => (
												<RarityIcon key={r} rarity={r as Rarity} size={14} />
											));
										})()}
									</div>
								</td>
								<td className="px-3 py-2 tabular-nums">
									{days > 0 ? `~${Math.round(days)}d` : "Ready"}
								</td>
								<td className="px-3 py-2 tabular-nums">
									{est?.energyTotal ? (
										<span className="flex items-center gap-1">
											<EnergyIcon size={14} />
											{est.energyTotal.toLocaleString()}
										</span>
									) : (
										"—"
									)}
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									{completionDate}
								</td>
								<td className="px-3 py-2">
									<button
										type="button"
										onClick={() => onToggleInclude(row.goalId, !row.include)}
										className={cn(
											"text-xs transition-colors",
											row.include
												? "text-emerald-400 hover:text-emerald-300"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										{row.include ? "Yes" : "No"}
									</button>
								</td>
								<td className="px-3 py-2">
									<div className="flex items-center justify-end gap-0.5">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => onMoveUp(row.goalId)}
											disabled={isFirst(row.goalId)}
											title="Move up"
										>
											<ChevronUp className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => onMoveDown(row.goalId)}
											disabled={isLast(row.goalId)}
											title="Move down"
										>
											<ChevronDown className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => onEdit(row.goalId)}
											title="Edit"
										>
											<Pencil className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => onDelete(row.goalId)}
											title="Delete"
											className="text-destructive hover:text-destructive"
										>
											<Trash2 className="size-3.5" />
										</Button>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
