import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PersonalGoalType } from "#common/goal-type.ts";
import { NUMERIC_TO_GOAL_TYPE } from "#common/goal-type.ts";
import type { HomeScreenEventType } from "@/4-lib/general/campaign-events.ts";
import {
	type CustomFarmSelections,
	DEFAULT_CUSTOM_FARM_SELECTIONS,
	type FarmStrategy,
} from "@/4-lib/general/daily-raids/types.ts";

export type { CustomFarmSelections, FarmStrategy };

interface GoalPreferencesState {
	dailyEnergy: number;
	shardsEnergy: number;
	farmStrategy: FarmStrategy;
	farmOrder: "goalPriority" | "totalMaterials";
	goalsTableView: boolean;
	goalColorMode: number;
	goalsViewMode: "goals" | "dailyRaids";
	/** Whether to include auto-detected campaign event nodes in farming. */
	campaignEventEnabled: boolean;
	homeScreenEvent: HomeScreenEventType;
	hseMinEnemyCount: number;
	/** Monotonically increasing counter — bumped on every settings change to force recomputation. */
	settingsVersion: number;
	/** Active goal type filters (empty = show all). */
	goalTypeFilter: PersonalGoalType[];
	customFarmSelections: CustomFarmSelections;
	setDailyEnergy: (energy: number) => void;
	setShardsEnergy: (energy: number) => void;
	setFarmStrategy: (strategy: FarmStrategy) => void;
	setFarmOrder: (order: "goalPriority" | "totalMaterials") => void;
	setGoalsTableView: (tableView: boolean) => void;
	setGoalColorMode: (mode: number) => void;
	setGoalsViewMode: (mode: "goals" | "dailyRaids") => void;
	setCampaignEventEnabled: (enabled: boolean) => void;
	setHomeScreenEvent: (event: HomeScreenEventType) => void;
	setHseMinEnemyCount: (count: number) => void;
	toggleGoalTypeFilter: (type: PersonalGoalType) => void;
	clearGoalTypeFilter: () => void;
	setCustomFarmSelections: (selections: CustomFarmSelections) => void;
}

export const useGoalPreferencesStore = create<GoalPreferencesState>()(
	persist(
		(set, get) => ({
			dailyEnergy: 288,
			shardsEnergy: 0,
			farmStrategy: "leastEnergy" as FarmStrategy,
			farmOrder: "goalPriority",
			goalsTableView: false,
			goalColorMode: 0,
			goalsViewMode: "goals",
			campaignEventEnabled: true,
			homeScreenEvent: "none",
			hseMinEnemyCount: 5,
			settingsVersion: 0,
			goalTypeFilter: [],
			customFarmSelections: DEFAULT_CUSTOM_FARM_SELECTIONS,
			setDailyEnergy: (dailyEnergy) =>
				set((s) => ({ dailyEnergy, settingsVersion: s.settingsVersion + 1 })),
			setShardsEnergy: (shardsEnergy) =>
				set((s) => ({
					shardsEnergy,
					settingsVersion: s.settingsVersion + 1,
				})),
			setFarmStrategy: (farmStrategy) =>
				set((s) => ({
					farmStrategy,
					settingsVersion: s.settingsVersion + 1,
				})),
			setFarmOrder: (farmOrder) =>
				set((s) => ({ farmOrder, settingsVersion: s.settingsVersion + 1 })),
			setGoalsTableView: (goalsTableView) => set({ goalsTableView }),
			setGoalColorMode: (goalColorMode) => set({ goalColorMode }),
			setGoalsViewMode: (goalsViewMode) => set({ goalsViewMode }),
			setCampaignEventEnabled: (campaignEventEnabled) =>
				set((s) => ({
					campaignEventEnabled,
					settingsVersion: s.settingsVersion + 1,
				})),
			setHomeScreenEvent: (homeScreenEvent) =>
				set((s) => ({
					homeScreenEvent,
					settingsVersion: s.settingsVersion + 1,
				})),
			setHseMinEnemyCount: (hseMinEnemyCount) =>
				set((s) => ({
					hseMinEnemyCount,
					settingsVersion: s.settingsVersion + 1,
				})),
			toggleGoalTypeFilter: (type) => {
				const current = get().goalTypeFilter;
				const next = current.includes(type)
					? current.filter((t) => t !== type)
					: [...current, type];
				set({ goalTypeFilter: next });
			},
			clearGoalTypeFilter: () => set({ goalTypeFilter: [] }),
			setCustomFarmSelections: (customFarmSelections) =>
				set((s) => ({
					customFarmSelections,
					settingsVersion: s.settingsVersion + 1,
				})),
		}),
		{
			name: "goal-preferences-storage",
			partialize: (state) => {
				const { goalsViewMode: _, ...rest } = state;
				return rest;
			},
			merge: (persisted, current) => {
				const merged = { ...current, ...(persisted as object) };
				// Migrate legacy "leastTime" → "leastEnergy"
				if (
					(merged as GoalPreferencesState).farmStrategy ===
					("leastTime" as string)
				) {
					(merged as GoalPreferencesState).farmStrategy = "leastEnergy";
				}
				// Migrate legacy numeric goalTypeFilter values to strings
				const filter = (merged as GoalPreferencesState).goalTypeFilter;
				if (Array.isArray(filter)) {
					(merged as GoalPreferencesState).goalTypeFilter = filter
						.map((v) =>
							typeof v === "number"
								? (NUMERIC_TO_GOAL_TYPE[v] as PersonalGoalType | undefined)
								: v,
						)
						.filter((v): v is PersonalGoalType => v != null);
				}
				return merged as GoalPreferencesState;
			},
		},
	),
);

/**
 * Returns `true` once the Zustand persist store has finished hydrating from localStorage.
 * Use this to delay computations that depend on persisted settings so they don't
 * run twice (once with defaults, once with hydrated values).
 */
export function useHasHydrated() {
	const [hydrated, setHydrated] = useState(
		useGoalPreferencesStore.persist.hasHydrated(),
	);

	useEffect(() => {
		const unsub = useGoalPreferencesStore.persist.onFinishHydration(() => {
			setHydrated(true);
		});
		return unsub;
	}, []);

	return hydrated;
}
