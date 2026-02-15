import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GoalPreferencesState {
	dailyEnergy: number;
	shardsEnergy: number;
	farmStrategy: "leastEnergy" | "leastTime";
	goalsTableView: boolean;
	goalColorMode: number;
	setDailyEnergy: (energy: number) => void;
	setShardsEnergy: (energy: number) => void;
	setFarmStrategy: (strategy: "leastEnergy" | "leastTime") => void;
	setGoalsTableView: (tableView: boolean) => void;
	setGoalColorMode: (mode: number) => void;
}

export const useGoalPreferencesStore = create<GoalPreferencesState>()(
	persist(
		(set) => ({
			dailyEnergy: 288,
			shardsEnergy: 0,
			farmStrategy: "leastEnergy",
			goalsTableView: false,
			goalColorMode: 0,
			setDailyEnergy: (dailyEnergy) => set({ dailyEnergy }),
			setShardsEnergy: (shardsEnergy) => set({ shardsEnergy }),
			setFarmStrategy: (farmStrategy) => set({ farmStrategy }),
			setGoalsTableView: (goalsTableView) => set({ goalsTableView }),
			setGoalColorMode: (goalColorMode) => set({ goalColorMode }),
		}),
		{
			name: "goal-preferences-storage",
		},
	),
);
