import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Camera, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { SnapshotComparisonView } from "@/1-components/roster-snapshots/SnapshotComparisonView.tsx";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/1-components/ui/alert-dialog.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { Checkbox } from "@/1-components/ui/checkbox.tsx";
import { Input } from "@/1-components/ui/input.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
import { useRosterSnapshotsStore } from "@/3-hooks/useRosterSnapshotsStore.ts";
import {
	createEmptyState,
	createSnapshot,
	deleteSnapshot,
	restoreSnapshot,
	rosterMapToSnapshot,
} from "@/4-lib/general/roster-snapshots/snapshot-service.ts";
import type { RosterSnapshotsState } from "@/4-lib/general/roster-snapshots/snapshot-types.ts";
import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
import { RosterSnapshotsStateSchema } from "@/4-lib/general/schemas.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export const Route = createFileRoute("/_authenticated/roster-snapshots")({
	component: RosterSnapshotsPage,
});

function parseState(data: string | null | undefined): RosterSnapshotsState {
	if (!data) return createEmptyState();
	try {
		return RosterSnapshotsStateSchema.parse(JSON.parse(data));
	} catch {
		return createEmptyState();
	}
}

function RosterSnapshotsPage() {
	const doc = useQuery(api.rosterSnapshots.get);
	const save = useMutation(api.rosterSnapshots.save);
	const roster = usePlayerDataStore((s) => s.roster);
	const lastSyncedAt = usePlayerDataStore((s) => s.lastSyncedAt);

	const selectedLeftIndex = useRosterSnapshotsStore((s) => s.selectedLeftIndex);
	const selectedRightIndex = useRosterSnapshotsStore(
		(s) => s.selectedRightIndex,
	);
	const setSelectedLeftIndex = useRosterSnapshotsStore(
		(s) => s.setSelectedLeftIndex,
	);
	const setSelectedRightIndex = useRosterSnapshotsStore(
		(s) => s.setSelectedRightIndex,
	);
	const hiddenFields = useRosterSnapshotsStore((s) => s.hiddenFields);
	const toggleHiddenField = useRosterSnapshotsStore((s) => s.toggleHiddenField);

	const snapshotNameId = useId();
	const [snapshotName, setSnapshotName] = useState("");
	const [showDeleted, setShowDeleted] = useState(false);

	const state = parseState(doc?.data);

	const handleTakeSnapshot = async () => {
		if (Object.keys(roster).length === 0) return;
		const name =
			snapshotName.trim() ||
			`Snapshot ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
		const newState = createSnapshot(state, roster, name);
		try {
			await save({ data: JSON.stringify(newState) });
			setSnapshotName("");
		} catch {
			toast.error("Failed to save snapshot.");
		}
	};

	const handleDelete = async (index: number) => {
		const newState = deleteSnapshot(state, index);
		try {
			await save({ data: JSON.stringify(newState) });
		} catch {
			toast.error("Failed to delete snapshot.");
		}
	};

	const handleRestore = async (deletedIndex: number) => {
		const newState = restoreSnapshot(state, deletedIndex);
		try {
			await save({ data: JSON.stringify(newState) });
		} catch {
			toast.error("Failed to restore snapshot.");
		}
	};

	if (doc === undefined) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const canTakeSnapshot =
		Object.keys(roster).length > 0 && lastSyncedAt !== null;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold tracking-tight">
						Roster Snapshots
					</h1>
					{state.snapshots.length > 0 && (
						<Badge variant="secondary">{state.snapshots.length}</Badge>
					)}
				</div>
				<p className="text-muted-foreground">
					Capture and compare your roster over time.
				</p>
			</div>

			{/* Take snapshot */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<div className="flex-1">
					<label
						htmlFor={snapshotNameId}
						className="mb-1 block text-sm font-medium"
					>
						Snapshot Name (optional)
					</label>
					<Input
						id={snapshotNameId}
						placeholder="e.g. Before GW Season 5"
						value={snapshotName}
						onChange={(e) => setSnapshotName(e.target.value)}
					/>
				</div>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button disabled={!canTakeSnapshot}>
							<Camera className="size-4" />
							Take Snapshot
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Take Roster Snapshot?</AlertDialogTitle>
							<AlertDialogDescription>
								This will capture your current roster state (
								{Object.keys(roster).length} units). You can compare it with
								future snapshots to see your progress.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={handleTakeSnapshot}>
								Take Snapshot
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			{!canTakeSnapshot && (
				<p className="text-sm text-amber-400">
					Sync your roster first to take a snapshot.
				</p>
			)}

			{/* Snapshot list */}
			{state.snapshots.length > 0 && (
				<div>
					<h3 className="mb-2 text-sm font-medium text-muted-foreground">
						Snapshots
					</h3>
					<div className="space-y-2">
						{state.snapshots.map((snapshot, i) => (
							<div
								key={snapshot.createdAt}
								className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 p-3"
							>
								<div>
									<p className="text-sm font-medium">{snapshot.name}</p>
									<p className="text-xs text-muted-foreground">
										{new Date(snapshot.createdAt).toLocaleString()} —{" "}
										{Object.keys(snapshot.units).length} units
									</p>
								</div>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => handleDelete(i)}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Deleted snapshots */}
			{state.deletedSnapshots.length > 0 && (
				<div>
					<button
						type="button"
						onClick={() => setShowDeleted(!showDeleted)}
						className="mb-2 text-sm text-muted-foreground hover:text-foreground"
					>
						{showDeleted ? "Hide" : "Show"} deleted snapshots (
						{state.deletedSnapshots.length})
					</button>
					{showDeleted && (
						<div className="space-y-2">
							{state.deletedSnapshots.map((snapshot, i) => (
								<div
									key={snapshot.createdAt}
									className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 p-3 opacity-60"
								>
									<div>
										<p className="text-sm font-medium line-through">
											{snapshot.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{new Date(snapshot.createdAt).toLocaleString()}
										</p>
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => handleRestore(i)}
										title="Restore"
									>
										<RotateCcw className="size-4" />
									</Button>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Comparison */}
			{state.snapshots.length >= 1 && (
				<ComparisonSection
					state={state}
					roster={roster}
					selectedLeftIndex={selectedLeftIndex}
					selectedRightIndex={selectedRightIndex}
					setSelectedLeftIndex={setSelectedLeftIndex}
					setSelectedRightIndex={setSelectedRightIndex}
					hiddenFields={hiddenFields}
					toggleHiddenField={toggleHiddenField}
				/>
			)}

			{state.snapshots.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
					<div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50">
						<Camera className="size-8 text-muted-foreground" />
					</div>
					<h3 className="mb-1 text-lg font-medium text-foreground">
						No snapshots yet
					</h3>
					<p className="text-sm text-muted-foreground">
						Take your first snapshot to start tracking your roster progress.
					</p>
				</div>
			)}
		</div>
	);
}

const TOGGLEABLE_FIELDS = [
	{ field: "shards", label: "Shards" },
	{ field: "xp", label: "XP" },
	{ field: "mythicShards", label: "Mythic Shards" },
] as const;

function ComparisonSection({
	state,
	roster,
	selectedLeftIndex,
	selectedRightIndex,
	setSelectedLeftIndex,
	setSelectedRightIndex,
	hiddenFields,
	toggleHiddenField,
}: {
	state: RosterSnapshotsState;
	roster: Record<string, RosterUnit>;
	selectedLeftIndex: number;
	selectedRightIndex: number;
	setSelectedLeftIndex: (i: number) => void;
	setSelectedRightIndex: (i: number) => void;
	hiddenFields: Set<string>;
	toggleHiddenField: (field: string) => void;
}) {
	const leftSnapshot = state.snapshots[selectedLeftIndex];
	const rightSnapshot =
		selectedRightIndex === -1
			? Object.keys(roster).length > 0
				? rosterMapToSnapshot(roster, "Current Roster")
				: undefined
			: state.snapshots[selectedRightIndex];

	const isSameSnapshot =
		selectedRightIndex !== -1 && selectedLeftIndex === selectedRightIndex;

	return (
		<div className="space-y-4">
			<h3 className="text-sm font-medium text-muted-foreground">
				Compare Snapshots
			</h3>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Select
					value={String(selectedLeftIndex)}
					onValueChange={(v) => setSelectedLeftIndex(Number(v))}
				>
					<SelectTrigger className="w-60">
						<SelectValue placeholder="Select left snapshot" />
					</SelectTrigger>
					<SelectContent>
						{state.snapshots.map((s, i) => (
							<SelectItem key={s.createdAt} value={String(i)}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<span className="text-muted-foreground">vs</span>
				<Select
					value={String(selectedRightIndex)}
					onValueChange={(v) => setSelectedRightIndex(Number(v))}
				>
					<SelectTrigger className="w-60">
						<SelectValue placeholder="Select right snapshot" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="-1">Current Roster</SelectItem>
						{state.snapshots.map((s, i) => (
							<SelectItem key={s.createdAt} value={String(i)}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Field toggles */}
			<div className="flex flex-wrap items-center gap-4">
				{TOGGLEABLE_FIELDS.map(({ field, label }) => (
					<label
						key={field}
						htmlFor={`toggle-${field}`}
						className="flex items-center gap-2 text-sm text-muted-foreground"
					>
						<Checkbox
							id={`toggle-${field}`}
							checked={!hiddenFields.has(field)}
							onCheckedChange={() => toggleHiddenField(field)}
						/>
						Show {label}
					</label>
				))}
			</div>

			{leftSnapshot && rightSnapshot && !isSameSnapshot && (
				<SnapshotComparisonView
					left={leftSnapshot}
					right={rightSnapshot}
					hiddenFields={hiddenFields}
				/>
			)}
		</div>
	);
}
