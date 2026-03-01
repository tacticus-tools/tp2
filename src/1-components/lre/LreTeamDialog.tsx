import { useEffect, useState } from "react";
import { CharacterGrid } from "@/1-components/general/CharacterGrid.tsx";
import { RankIcon } from "@/1-components/general/RankIcon.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { Checkbox } from "@/1-components/ui/checkbox.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/1-components/ui/dialog.tsx";
import { Input } from "@/1-components/ui/input.tsx";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
import {
	characterMatchesObjective,
	filterAllowedCharacters,
	objectiveKey,
} from "@/4-lib/general/lre/lre-character-filter.ts";
import type { LreEvent, TrackId } from "@/4-lib/general/lre/lre-types.ts";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import type { Data as LeBattleData } from "@/5-assets/le-battles/generate-data.ts";
import { DATA as LE_BATTLES } from "@/5-assets/le-battles/index.ts";
import type { DeepReadonly } from "@/types.ts";
import { LreObjectiveIcon } from "./LreObjectiveIcon.tsx";

const characterMap: Record<
	string,
	{ name: string; roundIcon: string | undefined }
> = Object.fromEntries(
	CHARACTERS.map((c) => [c.id, { name: c.name, roundIcon: c.roundIcon }]),
);

type LeBattle = DeepReadonly<LeBattleData[number]>;

interface TeamFormData {
	name: string;
	trackId: TrackId;
	characterIds: string[];
	restrictionIds: string[];
	expectedBattleClears: number;
	notes: string;
}

interface LreTeamDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	event: LreEvent;
	trackId: TrackId;
	battlesCount: number;
	initial?: Partial<TeamFormData>;
	onSave: (data: TeamFormData) => void;
}

function findLeBattleData(eventId: number): LeBattle | undefined {
	return LE_BATTLES.find((e) => e.id === String(eventId));
}

export function LreTeamDialog({
	open,
	onOpenChange,
	event,
	trackId: defaultTrackId,
	battlesCount,
	initial,
	onSave,
}: LreTeamDialogProps) {
	const roster = usePlayerDataStore((s) => s.roster);
	const [name, setName] = useState(initial?.name ?? "");
	const [trackId, setTrackId] = useState<TrackId>(
		initial?.trackId ?? defaultTrackId,
	);
	const [characterIds, setCharacterIds] = useState<string[]>(
		initial?.characterIds ?? [],
	);
	const [restrictionIds, setRestrictionIds] = useState<string[]>(
		initial?.restrictionIds ?? [],
	);
	const [expectedBattleClears, setExpectedBattleClears] = useState(
		initial?.expectedBattleClears ?? battlesCount,
	);
	const [notes, setNotes] = useState(initial?.notes ?? "");

	// Reset form state when dialog opens
	useEffect(() => {
		if (open) {
			setName(initial?.name ?? "");
			setTrackId(initial?.trackId ?? defaultTrackId);
			setCharacterIds(initial?.characterIds ?? []);
			setRestrictionIds(initial?.restrictionIds ?? []);
			setExpectedBattleClears(initial?.expectedBattleClears ?? battlesCount);
			setNotes(initial?.notes ?? "");
		}
	}, [open, initial, defaultTrackId, battlesCount]);

	const leBattle = findLeBattleData(event.id);
	const leTrack = leBattle?.[trackId];

	const objectives = (() => {
		if (!leTrack) return [];
		return leTrack.objectives.map((obj) => ({
			key: objectiveKey(obj),
			type: obj.type,
			target: obj.target,
			label: obj.target ? `${obj.type}: ${String(obj.target)}` : obj.type,
			points: obj.points,
		}));
	})();

	// Filter characters: exclude disallowed factions, then intersect with selected restrictions
	const allowedCharacterIds = (() => {
		// 1. Remove characters from disallowed factions
		const disallowed = leTrack?.disallowedFactions ?? [];
		const trackAllowed = filterAllowedCharacters(
			disallowed,
			CHARACTERS as unknown as import("@/5-assets/characters/index.ts").Character[],
		);

		// 2. If restrictions are selected, keep only characters matching ALL selected restrictions
		const selectedObjs = objectives.filter((o) =>
			restrictionIds.includes(o.key),
		);
		if (selectedObjs.length === 0) {
			return new Set(trackAllowed.map((c) => c.id));
		}

		const filtered = trackAllowed.filter((c) =>
			selectedObjs.every((obj) => characterMatchesObjective(c, obj)),
		);
		return new Set(filtered.map((c) => c.id));
	})();

	// Prune selected characters that are no longer allowed when restrictions/track change
	useEffect(() => {
		const disallowed = leTrack?.disallowedFactions ?? [];
		const trackAllowed = filterAllowedCharacters(
			disallowed,
			CHARACTERS as unknown as import("@/5-assets/characters/index.ts").Character[],
		);
		const selectedObjs = (leTrack?.objectives ?? []).filter((obj) =>
			restrictionIds.includes(objectiveKey(obj)),
		);

		const allowed =
			selectedObjs.length === 0
				? new Set(trackAllowed.map((c) => c.id))
				: new Set(
						trackAllowed
							.filter((c) =>
								selectedObjs.every((obj) => characterMatchesObjective(c, obj)),
							)
							.map((c) => c.id as string),
					);

		setCharacterIds((prev) => prev.filter((id) => allowed.has(id)));
	}, [leTrack, restrictionIds]);

	const handleToggleCharacter = (charId: string) => {
		setCharacterIds((prev) =>
			prev.includes(charId)
				? prev.filter((id) => id !== charId)
				: [...prev, charId],
		);
	};

	const handleToggleRestriction = (key: string) => {
		setRestrictionIds((prev) =>
			prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key],
		);
	};

	const handleSave = () => {
		if (!name.trim()) return;
		onSave({
			name: name.trim(),
			trackId,
			characterIds,
			restrictionIds,
			expectedBattleClears,
			notes: notes.trim(),
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{initial ? "Edit Team" : "Add Team"}</DialogTitle>
				</DialogHeader>

				<div className="max-h-[60vh] space-y-4 overflow-y-auto">
					{/* Team name */}
					<div>
						<p className="mb-2 text-xs text-muted-foreground">Team Name</p>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Melee Team"
						/>
					</div>

					{/* Track selector */}
					<div>
						<p className="mb-2 text-xs text-muted-foreground">Track</p>
						<div className="flex gap-2">
							{(["alpha", "beta", "gamma"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setTrackId(t)}
									className={`rounded-lg border px-3 py-1 text-sm capitalize transition-colors ${
										trackId === t
											? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
											: "border-border text-muted-foreground"
									}`}
								>
									{t}
								</button>
							))}
						</div>
					</div>

					{/* Restriction checkboxes */}
					{objectives.length > 0 && (
						<div>
							<p className="mb-2 text-xs text-muted-foreground">
								Restrictions Covered
							</p>
							<div className="space-y-1.5">
								{objectives.map((obj) => (
									<button
										key={obj.key}
										type="button"
										onClick={() => handleToggleRestriction(obj.key)}
										className="flex cursor-pointer items-center gap-2"
									>
										<Checkbox
											checked={restrictionIds.includes(obj.key)}
											tabIndex={-1}
										/>
										<LreObjectiveIcon requirementId={obj.key} size={24} />
										<span className="text-sm text-muted-foreground">
											+{obj.points}
										</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Expected battle clears */}
					<div>
						<p className="mb-2 text-xs text-muted-foreground">
							Expected Battle Clears (1-{battlesCount})
						</p>
						<Input
							type="number"
							min={1}
							max={battlesCount}
							value={expectedBattleClears}
							onChange={(e) =>
								setExpectedBattleClears(
									Math.min(
										battlesCount,
										Math.max(1, Number(e.target.value) || 1),
									),
								)
							}
							className="w-24"
						/>
					</div>

					{/* Character selection */}
					<div>
						<p className="mb-2 text-xs text-muted-foreground">
							Characters (max 5)
						</p>
						{characterIds.length > 0 && (
							<div className="mb-2 flex flex-wrap gap-1.5">
								{characterIds.map((id) => {
									const char = characterMap[id];
									const rosterUnit = roster?.[id];
									return (
										<button
											key={id}
											type="button"
											onClick={() => handleToggleCharacter(id)}
											className="group relative flex flex-col items-center gap-0.5"
											title={`Remove ${char?.name ?? id}`}
										>
											<div className="relative">
												{char?.roundIcon ? (
													<img
														src={char.roundIcon}
														alt={char.name}
														width={32}
														height={32}
														loading="lazy"
														className="rounded-full ring-2 ring-emerald-500 group-hover:ring-red-400"
													/>
												) : (
													<div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-emerald-500 group-hover:ring-red-400">
														{(char?.name ?? id)[0]}
													</div>
												)}
												{rosterUnit && (
													<div className="absolute -bottom-1 -left-1">
														<RankIcon rank={rosterUnit.rank} size={16} />
													</div>
												)}
											</div>
											<span className="max-w-[48px] truncate text-[9px] text-muted-foreground">
												{char?.name ?? id}
											</span>
										</button>
									);
								})}
							</div>
						)}
						<CharacterGrid
							selected={characterIds}
							onToggle={handleToggleCharacter}
							maxSelections={5}
							allowedIds={allowedCharacterIds}
							roster={roster}
						/>
					</div>

					{/* Notes */}
					<div>
						<p className="mb-2 text-xs text-muted-foreground">Notes</p>
						<Input
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Optional notes..."
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={!name.trim() || characterIds.length === 0}
					>
						{initial ? "Save Changes" : "Add Team"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
