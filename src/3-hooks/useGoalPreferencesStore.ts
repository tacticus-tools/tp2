import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GoalPreferencesState {
	dailyEnergy: number;
	shardsEnergy: number;
	farmStrategy: "leastEnergy" | "leastTime";
	farmOrder: "goalPriority" | "totalMaterials";
	goalsTableView: boolean;
	goalColorMode: number;
	goalsViewMode: "goals" | "dailyRaids";
	setDailyEnergy: (energy: number) => void;
	setShardsEnergy: (energy: number) => void;
	setFarmStrategy: (strategy: "leastEnergy" | "leastTime") => void;
	setFarmOrder: (order: "goalPriority" | "totalMaterials") => void;
	setGoalsTableView: (tableView: boolean) => void;
	setGoalColorMode: (mode: number) => void;
	setGoalsViewMode: (mode: "goals" | "dailyRaids") => void;
}

export const useGoalPreferencesStore = create<GoalPreferencesState>()(
	persist(
		(set) => ({
			dailyEnergy: 288,
			shardsEnergy: 0,
			farmStrategy: "leastEnergy",
			farmOrder: "goalPriority",
			goalsTableView: false,
			goalColorMode: 0,
			goalsViewMode: "goals",
			setDailyEnergy: (dailyEnergy) => set({ dailyEnergy }),
			setShardsEnergy: (shardsEnergy) => set({ shardsEnergy }),
			setFarmStrategy: (farmStrategy) => set({ farmStrategy }),
			setFarmOrder: (farmOrder) => set({ farmOrder }),
			setGoalsTableView: (goalsTableView) => set({ goalsTableView }),
			setGoalColorMode: (goalColorMode) => set({ goalColorMode }),
			setGoalsViewMode: (goalsViewMode) => set({ goalsViewMode }),
		}),
		{
			name: "goal-preferences-storage",
		},
	),
);
