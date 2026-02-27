import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import {
	GAME_MODE_LABELS,
	GameMode,
	useTeamsStore,
} from "@/3-hooks/useTeamsStore.ts";

const MODES = Object.values(GameMode);

export function TeamModeFilter() {
	const modeFilter = useTeamsStore((s) => s.modeFilter);
	const setModeFilter = useTeamsStore((s) => s.setModeFilter);

	return (
		<Select
			value={modeFilter}
			onValueChange={(v) => setModeFilter(v as GameMode | "all")}
		>
			<SelectTrigger className="w-40">
				<SelectValue placeholder="Filter by mode" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">All modes</SelectItem>
				{MODES.map((mode) => (
					<SelectItem key={mode} value={mode}>
						{GAME_MODE_LABELS[mode]}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
