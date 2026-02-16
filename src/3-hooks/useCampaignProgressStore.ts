import { create } from "zustand";
import { persist } from "zustand/middleware";
import { parseCampaignProgress } from "@/4-lib/tacticus/campaign-progress";
import type { Campaign } from "@/4-lib/tacticus/enums";
import type { TacticusCampaignProgress } from "~/tacticus/types";

interface CampaignProgressState {
	/** Campaign enum value → max unlocked node number */
	progress: Record<string, number>;
	setProgress: (campaign: Campaign, value: number) => void;
	/** Merge API progress for trackable campaigns (doesn't overwrite manual entries for untracked ones) */
	mergeFromApi: (apiProgress: TacticusCampaignProgress[]) => void;
}

export const useCampaignProgressStore = create<CampaignProgressState>()(
	persist(
		(set) => ({
			progress: {},
			setProgress: (campaign, value) =>
				set((state) => ({
					progress: { ...state.progress, [campaign]: value },
				})),
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
