/**
 * Campaign progress utilities — transforms API campaign progress into
 * usable formats for filtering farming locations.
 */

import type { TacticusCampaignProgress } from "~/tacticus/types.ts";
import {
	getEventBattleMap,
	getNodeEnergyCost,
	idToCampaign,
	resolveEventCampaign,
} from "./campaign-data.ts";
import type { Campaign } from "./constants.ts";
import type { ITodayActivity } from "./daily-raids/types.ts";

/**
 * Parse API campaign progress into a Map of campaign → max unlocked node number.
 *
 * For non-event campaigns the API battleIndex is 0-indexed; pipeline nodeNumber is
 * 1-indexed, so we add 1.
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
			// Non-event campaign: API battleIndex is 0-based, nodeNumber is 1-based
			const campaign = idToCampaign[camp.id];
			if (!campaign) continue;
			if (camp.battles.length === 0) continue;

			const maxUnlockedNode = Math.max(
				...camp.battles.map((b) => b.battleIndex + 1),
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
 * Parse API campaign progress into a Map of "campaign:nodeNumber" → attemptsLeft.
 * This captures how many daily raid attempts remain on each node today.
 *
 * For non-event campaigns the API battleIndex is 0-indexed; we add 1 to match
 * the pipeline's 1-based nodeNumber.
 * For event campaigns, the flat battle map resolves to the appropriate campaign + node.
 */
export function parseBattleAttempts(
	apiProgress: TacticusCampaignProgress[],
): Map<string, number> {
	const attempts = new Map<string, number>();

	for (const camp of apiProgress) {
		const eventResolved = resolveEventCampaign(camp.id, camp.type);

		if (eventResolved) {
			const flatMap = getEventBattleMap(eventResolved.base);
			if (!flatMap) continue;

			for (const battle of camp.battles) {
				const entry = flatMap[battle.battleIndex];
				if (!entry) continue;

				const campaign = entry.isChallenge
					? eventResolved.challenge
					: eventResolved.base;
				if (!campaign) continue;

				attempts.set(`${campaign}:${entry.nodeNumber}`, battle.attemptsLeft);
			}
		} else {
			const campaign = idToCampaign[camp.id];
			if (!campaign) continue;

			for (const battle of camp.battles) {
				// API battleIndex is 0-based, pipeline nodeNumber is 1-based
				attempts.set(
					`${campaign}:${battle.battleIndex + 1}`,
					battle.attemptsLeft,
				);
			}
		}
	}

	return attempts;
}

/**
 * Parse today's farming activity from API campaign progress.
 * Iterates ALL campaign nodes, finds any with attemptsUsed > 0,
 * and computes total energy spent + battles done across ALL nodes
 * (not just plan nodes — includes shard farming, extra farming, etc.).
 */
export function parseTodayActivity(
	apiProgress: TacticusCampaignProgress[],
): ITodayActivity {
	let energySpent = 0;
	let battlesDone = 0;

	for (const camp of apiProgress) {
		const eventResolved = resolveEventCampaign(camp.id, camp.type);

		if (eventResolved) {
			const flatMap = getEventBattleMap(eventResolved.base);
			if (!flatMap) continue;

			for (const battle of camp.battles) {
				if (battle.attemptsUsed <= 0) continue;
				const entry = flatMap[battle.battleIndex];
				if (!entry) continue;

				const campaign = entry.isChallenge
					? eventResolved.challenge
					: eventResolved.base;
				if (!campaign) continue;

				battlesDone += battle.attemptsUsed;
				const cost = getNodeEnergyCost(campaign, entry.nodeNumber);
				energySpent += battle.attemptsUsed * cost;
			}
		} else {
			const campaign = idToCampaign[camp.id];
			if (!campaign) continue;

			for (const battle of camp.battles) {
				if (battle.attemptsUsed <= 0) continue;
				battlesDone += battle.attemptsUsed;
				// API battleIndex is 0-based, pipeline nodeNumber is 1-based
				const cost = getNodeEnergyCost(campaign, battle.battleIndex + 1);
				energySpent += battle.attemptsUsed * cost;
			}
		}
	}

	return { energySpent, battlesDone };
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
