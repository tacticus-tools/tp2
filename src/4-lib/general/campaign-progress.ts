/**
 * Campaign progress utilities — transforms API campaign progress into
 * usable formats for filtering farming locations.
 */

import type { TacticusCampaignProgress } from "~/tacticus/types.ts";
import {
	getEventBattleMap,
	idToCampaign,
	resolveEventCampaign,
} from "./campaign-data.ts";
import type { Campaign } from "./constants.ts";

/**
 * Parse API campaign progress into a Map of campaign → max unlocked node number.
 *
 * For non-event campaigns the API battleIndex maps directly to 1-based nodeNumber.
 *
 * For event campaigns the API interleaves challenge battles (at flat indices 3, 14, 27)
 * within the base campaign sequence. We use the flat battle map to split progress
 * into separate base and challenge entries.
 */
export function parseCampaignProgress(
	apiProgress: TacticusCampaignProgress[],
): Map<Campaign, number> {
	const progress = new Map<Campaign, number>();

	for (const camp of apiProgress) {
		// Try event campaign resolution first
		const eventResolved = resolveEventCampaign(camp.id, camp.type);

		if (eventResolved) {
			if (camp.battles.length === 0) continue;

			const flatMap = getEventBattleMap(eventResolved.base);
			if (!flatMap) continue;

			let maxBaseNode = 0;
			let maxChallengeNode = 0;

			for (const battle of camp.battles) {
				const entry = flatMap[battle.battleIndex];
				if (!entry) continue;

				if (entry.isChallenge) {
					maxChallengeNode = Math.max(maxChallengeNode, entry.nodeNumber);
				} else {
					maxBaseNode = Math.max(maxBaseNode, entry.nodeNumber);
				}
			}

			if (maxBaseNode > 0) {
				progress.set(eventResolved.base, maxBaseNode);
			}
			if (maxChallengeNode > 0 && eventResolved.challenge) {
				progress.set(eventResolved.challenge, maxChallengeNode);
			}
		} else {
			// Non-event campaign: battleIndex = nodeNumber directly
			const campaign = idToCampaign[camp.id];
			if (!campaign) continue;
			if (camp.battles.length === 0) continue;

			const maxUnlockedNode = Math.max(
				...camp.battles.map((b) => b.battleIndex),
			);
			progress.set(campaign, maxUnlockedNode);
		}
	}

	return progress;
}

/**
 * Filter locations to only those the player has unlocked based on campaign progress.
 * When progress is empty (no data), returns all locations (no filtering → no regression).
 */
export function filterLocationsByCampaignProgress<
	T extends { campaign: string; nodeNumber: number },
>(locations: T[], progress: Map<Campaign, number>): T[] {
	if (progress.size === 0) return locations;

	return locations.filter((loc) => {
		const maxNode = progress.get(loc.campaign as Campaign);
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
