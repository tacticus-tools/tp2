import { create } from "zustand";

export const GameMode = {
	GwOffense: "gwOffense",
	GwDefense: "gwDefense",
	Raid: "raid",
	Ta: "ta",
} as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

export const GAME_MODE_LABELS: Record<GameMode, string> = {
	[GameMode.GwOffense]: "GW Offense",
	[GameMode.GwDefense]: "GW Defense",
	[GameMode.Raid]: "Raid",
	[GameMode.Ta]: "TA",
};

interface TeamsStoreState {
	modeFilter: GameMode | "all";
	searchQuery: string;
	editingTeamId: string | null;
	setModeFilter: (mode: GameMode | "all") => void;
	setSearchQuery: (query: string) => void;
	setEditingTeamId: (id: string | null) => void;
}

export const useTeamsStore = create<TeamsStoreState>()((set) => ({
	modeFilter: "all",
	searchQuery: "",
	editingTeamId: null,
	setModeFilter: (modeFilter) => set({ modeFilter }),
	setSearchQuery: (searchQuery) => set({ searchQuery }),
	setEditingTeamId: (editingTeamId) => set({ editingTeamId }),
}));
