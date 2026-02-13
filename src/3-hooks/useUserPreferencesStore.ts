import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light" | "system";

interface UserPreferencesState {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	/**
	 * Version number for the settings structure.
	 * **IMPORTANT**: Increment this by 1 when changing the structure of the settings.
	 * This ensures old cached data is properly migrated or invalidated.
	 */
	settingsVersion: number;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
	persist(
		(set) => ({
			theme: "system",
			setTheme: (theme) => set({ theme }),
			settingsVersion: 0,
		}),
		{
			name: "user-preferences-storage",
		},
	),
);
