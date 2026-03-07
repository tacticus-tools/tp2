import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { RankIcon } from "@/1-components/general/RankIcon.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import type { LreEvent, TrackId } from "@/4-lib/general/lre/lre-types.ts";
import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import type { Id } from "~/_generated/dataModel.ts";
import { LreObjectiveIcon } from "./LreObjectiveIcon.tsx";
import { LreTeamDialog } from "./LreTeamDialog.tsx";

interface LreTeam {
	_id: Id<"lreTeams">;
	trackId: string;
	name: string;
	characterIds: string[];
	restrictionIds?: string[];
	expectedBattleClears?: number;
	notes?: string;
}

const characterMap: Record<
	string,
	{ name: string; roundIcon: string | undefined }
> = Object.fromEntries(
	CHARACTERS.map((c) => [c.id, { name: c.name, roundIcon: c.roundIcon }]),
);

export function LreTeamsTab({
	teams,
	event,
	trackId,
	onAddTeam,
	onUpdateTeam,
	onRemoveTeam,
	roster,
}: {
	teams: LreTeam[];
	event: LreEvent;
	trackId: TrackId;
	onAddTeam: (data: {
		trackId: string;
		name: string;
		characterIds: string[];
		restrictionIds?: string[];
		expectedBattleClears?: number;
		notes?: string;
	}) => void;
	onUpdateTeam: (
		teamId: Id<"lreTeams">,
		data: {
			trackId?: string;
			name?: string;
			characterIds?: string[];
			restrictionIds?: string[];
			expectedBattleClears?: number;
			notes?: string;
		},
	) => void;
	onRemoveTeam: (teamId: Id<"lreTeams">) => void;
	roster?: Record<string, RosterUnit>;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingTeam, setEditingTeam] = useState<LreTeam | null>(null);

	const trackTeams = teams.filter((t) => t.trackId === trackId);

	const handleAdd = () => {
		setEditingTeam(null);
		setDialogOpen(true);
	};

	const handleEdit = (team: LreTeam) => {
		setEditingTeam(team);
		setDialogOpen(true);
	};

	const handleSave = (data: {
		name: string;
		trackId: TrackId;
		characterIds: string[];
		restrictionIds: string[];
		expectedBattleClears: number;
		notes: string;
	}) => {
		if (editingTeam) {
			onUpdateTeam(editingTeam._id, {
				trackId: data.trackId,
				name: data.name,
				characterIds: data.characterIds,
				restrictionIds: data.restrictionIds,
				expectedBattleClears: data.expectedBattleClears,
				notes: data.notes || undefined,
			});
		} else {
			onAddTeam({
				trackId: data.trackId,
				name: data.name,
				characterIds: data.characterIds,
				restrictionIds: data.restrictionIds,
				expectedBattleClears: data.expectedBattleClears,
				notes: data.notes || undefined,
			});
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium text-muted-foreground">
					Teams for {event[trackId].name}
				</h3>
				<Button variant="outline" size="sm" onClick={handleAdd}>
					<Plus className="mr-1 size-4" />
					Add Team
				</Button>
			</div>

			{trackTeams.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12">
					<p className="text-sm text-muted-foreground">
						No teams saved for this track yet.
					</p>
					<Button
						variant="ghost"
						size="sm"
						className="mt-2"
						onClick={handleAdd}
					>
						<Plus className="mr-1 size-4" />
						Create your first team
					</Button>
				</div>
			) : (
				<div className="space-y-3">
					{trackTeams.map((team) => (
						<div
							key={team._id}
							className="rounded-lg border border-border/50 bg-muted/10 p-3"
						>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<p className="text-sm font-medium">{team.name}</p>
										{team.expectedBattleClears != null && (
											<Badge variant="outline" className="text-xs">
												{team.expectedBattleClears} battles
											</Badge>
										)}
									</div>

									{/* Character portraits */}
									<div className="mt-1.5 flex flex-wrap gap-1.5">
										{team.characterIds.map((charId) => {
											const char = characterMap[charId];
											const rosterUnit = roster?.[charId];
											return (
												<div
													key={charId}
													className="flex flex-col items-center gap-0.5"
													title={char?.name ?? charId}
												>
													<div className="relative">
														{char?.roundIcon ? (
															<img
																src={char.roundIcon}
																alt={char.name}
																width={32}
																height={32}
																loading="lazy"
																className="rounded-full"
															/>
														) : (
															<div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
																{(char?.name ?? charId)[0]}
															</div>
														)}
														{rosterUnit && (
															<div className="absolute -bottom-1 -left-1">
																<RankIcon rank={rosterUnit.rank} size={16} />
															</div>
														)}
													</div>
													<span className="max-w-12 truncate text-[9px] text-muted-foreground">
														{char?.name ?? charId}
													</span>
												</div>
											);
										})}
									</div>

									{/* Restriction icons */}
									{team.restrictionIds && team.restrictionIds.length > 0 && (
										<div className="mt-1.5 flex flex-wrap items-center gap-1">
											{team.restrictionIds.map((rid) => (
												<LreObjectiveIcon
													key={rid}
													requirementId={rid}
													size={24}
												/>
											))}
										</div>
									)}

									{team.notes && (
										<p className="mt-1 text-xs text-muted-foreground">
											{team.notes}
										</p>
									)}
								</div>
								<div className="flex gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => handleEdit(team)}
										aria-label={`Edit team ${team.name}`}
										title="Edit team"
									>
										<Pencil className="size-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => onRemoveTeam(team._id)}
										aria-label={`Remove team ${team.name}`}
										title="Remove team"
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<LreTeamDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				event={event}
				trackId={trackId}
				battlesCount={event.battlesCount}
				initial={
					editingTeam
						? {
								name: editingTeam.name,
								trackId: editingTeam.trackId as TrackId,
								characterIds: editingTeam.characterIds,
								restrictionIds: editingTeam.restrictionIds ?? [],
								expectedBattleClears:
									editingTeam.expectedBattleClears ?? event.battlesCount,
								notes: editingTeam.notes ?? "",
							}
						: undefined
				}
				onSave={handleSave}
			/>
		</div>
	);
}
