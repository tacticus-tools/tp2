import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore.ts";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

/**
 * Headless sync bridge that persists campaign progress to Convex.
 *
 * Phase A: Load from Convex (once) — merge with localStorage via highest-value-wins
 * Phase B: Merge from API — replaces the useEffect that was in campaigns.tsx
 * Phase C: Save to Convex — on store changes, save to DB
 */
export function CampaignProgressSync() {
	const campaignProgressQuery = useQuery(convexQuery(api.campaignProgress.get));
	const saveMutation = useMutation({
		mutationFn: useConvexMutation(api.campaignProgress.save),
	});

	const convexMergedRef = useRef(false);
	const lastSavedRef = useRef<string | null>(null);

	const progress = useCampaignProgressStore((s) => s.progress);
	const apiCampaignProgress = usePlayerDataStore((s) => s.campaignProgress);

	// Phase A: Load from Convex (once per session)
	useEffect(() => {
		if (convexMergedRef.current) return;
		if (!campaignProgressQuery.isSuccess) return;

		convexMergedRef.current = true;

		// convexDoc is null if no row exists
		if (campaignProgressQuery.data === null) return;

		let convexProgress: Record<string, number>;
		try {
			convexProgress = JSON.parse(campaignProgressQuery.data.data) as Record<
				string,
				number
			>;
		} catch {
			return;
		}

		// Highest-value-wins merge into Zustand
		const currentProgress = useCampaignProgressStore.getState().progress;
		const merged = { ...currentProgress };
		let changed = false;

		for (const [campaign, nodes] of Object.entries(convexProgress)) {
			if (typeof nodes === "number" && nodes > (merged[campaign] ?? 0)) {
				merged[campaign] = nodes;
				changed = true;
			}
		}

		if (changed) {
			useCampaignProgressStore.setState({ progress: merged });
		}

		// Set lastSavedRef to prevent immediate re-save
		lastSavedRef.current = JSON.stringify(
			useCampaignProgressStore.getState().progress,
		);
	}, [campaignProgressQuery.data, campaignProgressQuery.isSuccess]);

	// Phase B: Merge from API (replaces campaigns.tsx useEffect)
	useEffect(() => {
		if (apiCampaignProgress.length > 0) {
			useCampaignProgressStore.getState().mergeFromApi(apiCampaignProgress);
		}
	}, [apiCampaignProgress]);

	// Phase C: Save to Convex on store change
	useEffect(() => {
		if (!convexMergedRef.current) return;

		const serialized = JSON.stringify(progress);
		if (serialized === "{}") return;
		if (serialized === lastSavedRef.current) return;

		void (async () => {
			try {
				await saveMutation.mutateAsync({ data: serialized });
				lastSavedRef.current = serialized;
			} catch {
				// Keep lastSavedRef unchanged so next state change retries
			}
		})();
	}, [progress, saveMutation]);

	return null;
}
