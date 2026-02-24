import { useAction } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/1-components/ui/button.tsx";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export function SyncButton() {
	const getPlayerData = useAction(api.tacticus.actions.getPlayerData);

	const syncing = usePlayerDataStore((s) => s.syncing);
	const lastSyncedAt = usePlayerDataStore((s) => s.lastSyncedAt);
	const setPlayerData = usePlayerDataStore((s) => s.setPlayerData);
	const setSyncing = usePlayerDataStore((s) => s.setSyncing);

	const handleSync = useCallback(async () => {
		setSyncing(true);
		try {
			const response = await getPlayerData();
			if (response?.player?.units) {
				setPlayerData(response);
			}
		} catch {
			// Sync failed
		} finally {
			setSyncing(false);
		}
	}, [getPlayerData, setPlayerData, setSyncing]);

	// Auto-sync once on mount if no prior sync data
	const didAutoSync = useRef(false);
	useEffect(() => {
		if (!didAutoSync.current && !lastSyncedAt) {
			didAutoSync.current = true;
			void handleSync();
		}
	}, [handleSync, lastSyncedAt]);

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleSync}
			disabled={syncing}
			title="Sync with Tacticus API"
		>
			<RefreshCw
				className={`h-[1.2rem] w-[1.2rem] ${syncing ? "animate-spin" : ""}`}
			/>
			<span className="sr-only">Sync</span>
		</Button>
	);
}
