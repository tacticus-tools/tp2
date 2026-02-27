import { useCallback, useId, useState } from "react";
import { CharacterGrid } from "@/1-components/general/CharacterGrid.tsx";
import { MowGrid } from "@/1-components/general/MowGrid.tsx";
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
import { Label } from "@/1-components/ui/label.tsx";
import { GAME_MODE_LABELS, GameMode } from "@/3-hooks/useTeamsStore.ts";

const MODES = Object.values(GameMode);

interface TeamDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	initialName?: string;
	initialCharacterIds?: string[];
	initialMowIds?: string[];
	initialModes?: Record<GameMode, boolean>;
	initialNotes?: string;
	usedMowIds?: Set<string>;
	onSave: (data: {
		name: string;
		characterIds: string[];
		mowIds: string[];
		modes: Record<GameMode, boolean>;
		notes: string;
	}) => void;
}

export function TeamDialog({
	open,
	onOpenChange,
	title,
	initialName = "",
	initialCharacterIds = [],
	initialMowIds = [],
	initialModes,
	initialNotes = "",
	usedMowIds,
	onSave,
}: TeamDialogProps) {
	const nameId = useId();
	const notesId = useId();
	const [name, setName] = useState(initialName);
	const [characterIds, setCharacterIds] =
		useState<string[]>(initialCharacterIds);
	const [mowIds, setMowIds] = useState<string[]>(initialMowIds);
	const [modes, setModes] = useState<Record<GameMode, boolean>>(
		initialModes ?? {
			[GameMode.GwOffense]: false,
			[GameMode.GwDefense]: false,
			[GameMode.Raid]: false,
			[GameMode.Ta]: false,
		},
	);
	const [notes, setNotes] = useState(initialNotes);

	const handleToggle = useCallback((charId: string) => {
		setCharacterIds((prev) =>
			prev.includes(charId)
				? prev.filter((id) => id !== charId)
				: [...prev, charId],
		);
	}, []);

	const handleMowToggle = useCallback((mowId: string) => {
		setMowIds((prev) =>
			prev.includes(mowId)
				? prev.filter((id) => id !== mowId)
				: [...prev, mowId],
		);
	}, []);

	const handleModeToggle = useCallback((mode: GameMode, checked: boolean) => {
		setModes((prev) => ({ ...prev, [mode]: checked }));
	}, []);

	const handleSave = useCallback(() => {
		if (!name.trim()) return;
		onSave({
			name: name.trim(),
			characterIds,
			mowIds,
			modes,
			notes: notes.trim(),
		});
		onOpenChange(false);
	}, [name, characterIds, mowIds, modes, notes, onSave, onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto md:max-w-3xl lg:max-w-5xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={nameId}>Team Name</Label>
						<Input
							id={nameId}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. GW Zone 1"
						/>
					</div>

					<fieldset>
						<legend className="mb-2 text-sm font-medium">Game Modes</legend>
						<div className="flex flex-wrap gap-4">
							{MODES.map((mode) => (
								<div key={mode} className="flex items-center gap-2 text-sm">
									<Checkbox
										id={`mode-${mode}`}
										checked={modes[mode]}
										onCheckedChange={(checked) =>
											handleModeToggle(mode, checked === true)
										}
									/>
									<Label htmlFor={`mode-${mode}`}>
										{GAME_MODE_LABELS[mode]}
									</Label>
								</div>
							))}
						</div>
					</fieldset>

					<div>
						<p className="mb-2 text-sm font-medium">Characters (max 5)</p>
						<CharacterGrid
							selected={characterIds}
							onToggle={handleToggle}
							maxSelections={5}
						/>
					</div>

					<div>
						<p className="mb-2 text-sm font-medium">Machines of War (max 3)</p>
						<MowGrid
							selected={mowIds}
							onToggle={handleMowToggle}
							maxSelections={3}
							disabledIds={usedMowIds}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor={notesId}>Notes (optional)</Label>
						<Input
							id={notesId}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Strategy notes..."
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={!name.trim()}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
