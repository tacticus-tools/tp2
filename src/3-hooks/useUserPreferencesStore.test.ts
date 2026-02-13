import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { useUserPreferencesStore } from "./useUserPreferencesStore";

beforeEach(() => {
	// Clear localStorage before each test
	localStorage.clear();
	// Reset the store to initial state
	useUserPreferencesStore.setState({ theme: "system" });
});

afterEach(() => {
	// Clean up
	localStorage.clear();
});

test("should initialize with system theme", () => {
	const { result } = renderHook(() => useUserPreferencesStore());
	expect(result.current.theme).toBe("system");
});

test("should update theme", () => {
	const { result } = renderHook(() => useUserPreferencesStore());

	act(() => {
		result.current.setTheme("dark");
	});

	expect(result.current.theme).toBe("dark");
});

test("should persist theme to localStorage", () => {
	const { result } = renderHook(() => useUserPreferencesStore());

	act(() => {
		result.current.setTheme("light");
	});

	// Check that it's persisted
	const stored = localStorage.getItem("user-preferences-storage");
	expect(stored).toBeTruthy();

	const parsed = JSON.parse(stored || "{}");
	expect(parsed.state?.theme).toBe("light");
});

test("should restore theme from localStorage", () => {
	// Clear state first, but keep localStorage intact for this test
	useUserPreferencesStore.persist.clearStorage();

	// Set initial value in localStorage
	localStorage.setItem(
		"user-preferences-storage",
		JSON.stringify({
			state: { theme: "dark" },
			version: 0,
		}),
	);

	// Rehydrate from storage
	useUserPreferencesStore.persist.rehydrate();

	// Get current state
	const state = useUserPreferencesStore.getState();
	expect(state.theme).toBe("dark");
});
