import { create } from "zustand";
import { persist } from "zustand/middleware";
import { parseCampaignProgress } from "@/4-lib/general/campaign-progress.ts";
import type { TacticusCampaignProgress } from "~/tacticus/types.ts";

interface CampaignProgressState {
	/** Campaign enum value → max unlocked node number */
	progress: Record<string, number>;
	/** Merge API progress for trackable campaigns (doesn't overwrite manual entries for untracked ones) */
	mergeFromApi: (apiProgress: TacticusCampaignProgress[]) => void;
}

export const useCampaignProgressStore = create<CampaignProgressState>()(
	persist(
		(set) => ({
			progress: {},
			mergeFromApi: (apiProgress) =>
				set((state) => {
					const parsed = parseCampaignProgress(apiProgress);
					const merged = { ...state.progress };
					for (const [campaign, nodes] of parsed) {
						merged[campaign] = nodes;
					}
					return { progress: merged };
				}),
		}),
		{ name: "campaign-progress-storage" },
	),
);
