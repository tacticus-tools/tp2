import { create } from "zustand";

interface GwOffenseStoreState {
	selectedBfLevel: number;
	expandedSectionIndex: number | null;
	setSelectedBfLevel: (level: number) => void;
	setExpandedSectionIndex: (index: number | null) => void;
}

export const useGwOffenseStore = create<GwOffenseStoreState>()((set) => ({
	selectedBfLevel: 3,
	expandedSectionIndex: null,
	setSelectedBfLevel: (selectedBfLevel) => set({ selectedBfLevel }),
	setExpandedSectionIndex: (expandedSectionIndex) =>
		set({ expandedSectionIndex }),
}));
