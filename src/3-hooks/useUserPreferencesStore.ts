import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light" | "system";

interface UserPreferencesState {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
	persist(
		(set) => ({
			theme: "system",
			setTheme: (theme) => set({ theme }),
		}),
		{
			name: "user-preferences-storage",
		},
	),
);
