/**
 * Campaign progress utilities — transforms API campaign progress into
 * usable formats for filtering farming locations.
 */

import type { TacticusCampaignProgress } from "~/tacticus/types";
import { idToCampaign } from "./campaign-data";
import type { Campaign } from "./enums";

/**
 * Parse API campaign progress into a Map of campaign → max unlocked node number.
 * The API battleIndex corresponds directly to the 1-based nodeNumber in battle data.
 */
export function parseCampaignProgress(
	apiProgress: TacticusCampaignProgress[],
): Map<Campaign, number> {
	const progress = new Map<Campaign, number>();

	for (const camp of apiProgress) {
		const campaign = idToCampaign[camp.id];
		if (!campaign) continue;

		if (camp.battles.length === 0) continue;

		const maxUnlockedNode = Math.max(...camp.battles.map((b) => b.battleIndex));

		progress.set(campaign, maxUnlockedNode);
	}

	return progress;
}

/**
 * Filter locations to only those the player has unlocked based on campaign progress.
 * When progress is empty (no data), returns all locations (no filtering → no regression).
 */
export function filterLocationsByCampaignProgress<
	T extends { campaign: Campaign; nodeNumber: number },
>(locations: T[], progress: Map<Campaign, number>): T[] {
	if (progress.size === 0) return locations;

	return locations.filter((loc) => {
		const maxNode = progress.get(loc.campaign);
		// If campaign not in progress data, player hasn't started it → exclude
		if (maxNode === undefined) return false;
		return loc.nodeNumber <= maxNode;
	});
}

/**
 * Build an inventory map from the API upgrade list.
 * Converts { id, amount }[] to { [id]: amount } for use in getBaseUpgradesForRankUp.
 */
export function buildInventoryMap(
	upgrades: Array<{ id: string; amount: number }>,
): Record<string, number> {
	const map: Record<string, number> = {};
	for (const u of upgrades) {
		map[u.id] = (map[u.id] ?? 0) + u.amount;
	}
	return map;
}
