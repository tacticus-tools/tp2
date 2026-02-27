import { create } from "zustand";

interface RosterSnapshotsStoreState {
	selectedLeftIndex: number;
	selectedRightIndex: number;
	hiddenFields: Set<string>;
	setSelectedLeftIndex: (index: number) => void;
	setSelectedRightIndex: (index: number) => void;
	toggleHiddenField: (field: string) => void;
}

export const useRosterSnapshotsStore = create<RosterSnapshotsStoreState>()(
	(set) => ({
		selectedLeftIndex: 0,
		selectedRightIndex: -1,
		hiddenFields: new Set<string>(),
		setSelectedLeftIndex: (selectedLeftIndex) => set({ selectedLeftIndex }),
		setSelectedRightIndex: (selectedRightIndex) => set({ selectedRightIndex }),
		toggleHiddenField: (field) =>
			set((state) => {
				const next = new Set(state.hiddenFields);
				if (next.has(field)) {
					next.delete(field);
				} else {
					next.add(field);
				}
				return { hiddenFields: next };
			}),
	}),
);
