import { create } from "zustand";
import {
	buildRosterMap,
	type RosterUnit,
} from "@/4-lib/general/roster-utils.ts";
import type {
	TacticusCampaignProgress,
	TacticusInventory,
	TacticusLegendaryEventProgress,
	TacticusPlayerResponse,
} from "~/tacticus/types.ts";

interface PlayerDataState {
	roster: Record<string, RosterUnit>;
	campaignProgress: TacticusCampaignProgress[];
	legendaryEvents: TacticusLegendaryEventProgress[];
	inventory: TacticusInventory | null;
	syncing: boolean;
	lastSyncedAt: number | null;
	syncError: string | null;
	setPlayerData: (response: TacticusPlayerResponse) => void;
	setSyncing: (syncing: boolean) => void;
	setSyncError: (err: string | null) => void;
}

export const usePlayerDataStore = create<PlayerDataState>()((set) => ({
	roster: {},
	campaignProgress: [],
	legendaryEvents: [],
	inventory: null,
	syncing: false,
	lastSyncedAt: null,
	syncError: null,
	setPlayerData: (response) =>
		set({
			roster: buildRosterMap(response.player.units),
			campaignProgress: response.player.progress.campaigns,
			legendaryEvents: response.player.progress.legendaryEvents ?? [],
			inventory: response.player.inventory,
			lastSyncedAt: Date.now(),
			syncError: null,
		}),
	setSyncing: (syncing) => set({ syncing }),
	setSyncError: (syncError) => set({ syncError }),
}));
