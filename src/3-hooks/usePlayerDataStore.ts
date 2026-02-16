import { create } from "zustand";
import { buildRosterMap, type RosterUnit } from "@/4-lib/tacticus/roster-utils";
import type {
	TacticusCampaignProgress,
	TacticusInventory,
	TacticusPlayerResponse,
} from "~/tacticus/types";

interface PlayerDataState {
	roster: Map<string, RosterUnit>;
	campaignProgress: TacticusCampaignProgress[];
	inventory: TacticusInventory | null;
	syncing: boolean;
	lastSyncedAt: number | null;
	syncError: string | null;
	setPlayerData: (response: TacticusPlayerResponse) => void;
	setSyncing: (syncing: boolean) => void;
	setSyncError: (err: string | null) => void;
}

export const usePlayerDataStore = create<PlayerDataState>()((set) => ({
	roster: new Map(),
	campaignProgress: [],
	inventory: null,
	syncing: false,
	lastSyncedAt: null,
	syncError: null,
	setPlayerData: (response) =>
		set({
			roster: buildRosterMap(response.player.units),
			campaignProgress: response.player.progress.campaigns,
			inventory: response.player.inventory,
			lastSyncedAt: Date.now(),
			syncError: null,
		}),
	setSyncing: (syncing) => set({ syncing }),
	setSyncError: (syncError) => set({ syncError }),
}));
