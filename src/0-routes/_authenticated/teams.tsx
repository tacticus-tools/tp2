import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Users2 } from "lucide-react";
import { useState } from "react";
import { TeamCard } from "@/1-components/teams/TeamCard.tsx";
import { TeamDialog } from "@/1-components/teams/TeamDialog.tsx";
import { TeamModeFilter } from "@/1-components/teams/TeamModeFilter.tsx";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/1-components/ui/alert-dialog.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { Input } from "@/1-components/ui/input.tsx";
import { type GameMode, useTeamsStore } from "@/3-hooks/useTeamsStore.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";
import type { Id } from "~/_generated/dataModel.ts";

export const Route = createFileRoute("/_authenticated/teams")({
	component: TeamsPage,
});

function TeamsPage() {
	const teams = useQuery(api.teams.list);
	const addTeam = useMutation(api.teams.add);
	const updateTeam = useMutation(api.teams.update);
	const removeTeam = useMutation(api.teams.remove);

	const modeFilter = useTeamsStore((s) => s.modeFilter);
	const searchQuery = useTeamsStore((s) => s.searchQuery);
	const setSearchQuery = useTeamsStore((s) => s.setSearchQuery);

	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [editingTeam, setEditingTeam] = useState<{
		id: string;
		name: string;
		characterIds: string[];
		mowIds: string[];
		modes: Record<GameMode, boolean>;
		notes: string;
	} | null>(null);
	const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

	const filtered = (() => {
		if (!teams) return [];
		let result = [...teams];

		if (modeFilter !== "all") {
			result = result.filter((t) => t[modeFilter as keyof typeof t] === true);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			result = result.filter((t) => t.name.toLowerCase().includes(q));
		}

		return result;
	})();

	const usedMowIds = (() => {
		const set = new Set<string>();
		for (const t of teams ?? []) {
			if (t._id === editingTeam?.id) continue;
			for (const id of t.mowIds ?? []) set.add(id);
		}
		return set;
	})();

	const handleAdd = async (data: {
		name: string;
		characterIds: string[];
		mowIds: string[];
		modes: Record<GameMode, boolean>;
		notes: string;
	}) => {
		await addTeam({
			name: data.name,
			characterIds: data.characterIds,
			mowIds: data.mowIds.length > 0 ? data.mowIds : undefined,
			gwOffense: data.modes.gwOffense || undefined,
			gwDefense: data.modes.gwDefense || undefined,
			raid: data.modes.raid || undefined,
			ta: data.modes.ta || undefined,
			notes: data.notes || undefined,
		});
	};

	const handleEdit = async (data: {
		name: string;
		characterIds: string[];
		mowIds: string[];
		modes: Record<GameMode, boolean>;
		notes: string;
	}) => {
		if (!editingTeam) return;
		await updateTeam({
			teamId: editingTeam.id as Id<"teams">,
			name: data.name,
			characterIds: data.characterIds,
			mowIds: data.mowIds.length > 0 ? data.mowIds : undefined,
			gwOffense: data.modes.gwOffense || undefined,
			gwDefense: data.modes.gwDefense || undefined,
			raid: data.modes.raid || undefined,
			ta: data.modes.ta || undefined,
			notes: data.notes || undefined,
		});
		setEditingTeam(null);
	};

	const handleDelete = async () => {
		if (!deletingTeamId) return;
		await removeTeam({
			teamId: deletingTeamId as Id<"teams">,
		});
		setDeletingTeamId(null);
	};

	if (teams === undefined) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight">Teams</h1>
						{teams.length > 0 && (
							<Badge variant="secondary">{teams.length}</Badge>
						)}
					</div>
					<p className="text-muted-foreground">
						Build and manage teams for different game modes.
					</p>
				</div>
				<Button onClick={() => setAddDialogOpen(true)}>
					<Plus className="size-4" />
					New Team
				</Button>
			</div>

			{/* Controls */}
			{teams.length > 0 && (
				<div className="flex flex-col gap-3 sm:flex-row">
					<Input
						placeholder="Search teams..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1 sm:max-w-xs"
					/>
					<TeamModeFilter />
				</div>
			)}

			{/* Team list */}
			{filtered.length > 0 ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((team) => (
						<TeamCard
							key={team._id}
							name={team.name}
							characterIds={team.characterIds}
							mowIds={team.mowIds}
							gwOffense={team.gwOffense}
							gwDefense={team.gwDefense}
							raid={team.raid}
							ta={team.ta}
							notes={team.notes}
							onEdit={() =>
								setEditingTeam({
									id: team._id,
									name: team.name,
									characterIds: team.characterIds,
									mowIds: team.mowIds ?? [],
									modes: {
										gwOffense: team.gwOffense ?? false,
										gwDefense: team.gwDefense ?? false,
										raid: team.raid ?? false,
										ta: team.ta ?? false,
									},
									notes: team.notes ?? "",
								})
							}
							onDelete={() => setDeletingTeamId(team._id)}
						/>
					))}
				</div>
			) : teams.length > 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No teams match the current filters.
				</p>
			) : (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
					<div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50">
						<Users2 className="size-8 text-muted-foreground" />
					</div>
					<h3 className="mb-1 text-lg font-medium text-foreground">
						No teams yet
					</h3>
					<p className="mb-4 text-sm text-muted-foreground">
						Create your first team to start planning.
					</p>
					<Button onClick={() => setAddDialogOpen(true)}>
						<Plus className="size-4" />
						New Team
					</Button>
				</div>
			)}

			{/* Add dialog */}
			<TeamDialog
				open={addDialogOpen}
				onOpenChange={setAddDialogOpen}
				title="New Team"
				usedMowIds={usedMowIds}
				onSave={handleAdd}
			/>

			{/* Edit dialog */}
			{editingTeam && (
				<TeamDialog
					open={true}
					onOpenChange={(open) => {
						if (!open) setEditingTeam(null);
					}}
					title="Edit Team"
					initialName={editingTeam.name}
					initialCharacterIds={editingTeam.characterIds}
					initialMowIds={editingTeam.mowIds}
					initialModes={editingTeam.modes}
					initialNotes={editingTeam.notes}
					usedMowIds={usedMowIds}
					onSave={handleEdit}
				/>
			)}

			{/* Delete confirmation */}
			<AlertDialog
				open={deletingTeamId !== null}
				onOpenChange={(open) => {
					if (!open) setDeletingTeamId(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Team?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
