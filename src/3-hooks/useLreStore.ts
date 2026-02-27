import { create } from "zustand";
import { persist } from "zustand/middleware";

type TabId = "progress" | "battles" | "teams" | "tokenomics";
type TrackId = "alpha" | "beta" | "gamma";

interface LreStoreState {
	selectedEventId: number;
	selectedTrackId: TrackId;
	activeTab: TabId;
	setSelectedEventId: (eventId: number) => void;
	setSelectedTrackId: (trackId: TrackId) => void;
	setActiveTab: (tab: TabId) => void;
}

export const useLreStore = create<LreStoreState>()(
	persist(
		(set) => ({
			selectedEventId: 14,
			selectedTrackId: "alpha" as TrackId,
			activeTab: "progress" as TabId,
			setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
			setSelectedTrackId: (selectedTrackId) => set({ selectedTrackId }),
			setActiveTab: (activeTab) => set({ activeTab }),
		}),
		{
			name: "lre-storage",
			partialize: (state) => ({
				selectedEventId: state.selectedEventId,
				selectedTrackId: state.selectedTrackId,
			}),
		},
	),
);
