/**
 * Campaign Event (CE) and Home Screen Event (HSE) types, constants, and helpers.
 *
 * CE: Only one campaign event can be active at a time. Locations belonging to
 *     inactive CE campaigns are excluded from farming.
 * HSE: Prioritises battles with target enemy types so the player can complete
 *     the active home-screen event faster.
 */

import {
	ALL_CE_CAMPAIGNS,
	BATTLE_ENEMY_COUNTS,
	EVENT_GROUPS,
} from "@/5-assets/campaign-derived/index.ts";

// ---------------------------------------------------------------------------
// Campaign Event types & constants
// ---------------------------------------------------------------------------

export type CampaignEventType =
	| "none"
	| "adMech"
	| "tyranids"
	| "tau"
	| "deathGuard";

export type HomeScreenEventType =
	| "none"
	| "purgeOrder"
	| "warpSurge"
	| "machineHunt";

export const CAMPAIGN_EVENT_LABELS: Record<CampaignEventType, string> = {
	none: "None",
	adMech: "Adeptus Mechanicus",
	tyranids: "Tyranids",
	tau: "T'au Empire",
	deathGuard: "Death Guard",
};

export const HSE_LABELS: Record<HomeScreenEventType, string> = {
	none: "None",
	purgeOrder: "Purge Order",
	warpSurge: "Warp Surge",
	machineHunt: "Machine Hunt",
};

// ---------------------------------------------------------------------------
// CE data (from generated pipeline)
// ---------------------------------------------------------------------------

type EventGroupKey = Exclude<CampaignEventType, "none">;

/** Maps each CE type to the Campaign values it activates. */
export function getCampaignEventGroups(): Record<
	EventGroupKey,
	readonly string[]
> {
	return EVENT_GROUPS as unknown as Record<EventGroupKey, readonly string[]>;
}

const _allCeCampaigns = new Set(ALL_CE_CAMPAIGNS as unknown as string[]);

/** Flat set of every campaign that belongs to any campaign event. */
export function getAllCeCampaigns(): ReadonlySet<string> {
	return _allCeCampaigns;
}

// ---------------------------------------------------------------------------
// CE auto-detection
// ---------------------------------------------------------------------------

/**
 * Detect the active campaign event from parsed campaign progress.
 * If the player has progress in any campaign belonging to an event group,
 * that event is considered active. Returns "none" if no event campaigns
 * have progress.
 */
export function detectCampaignEvent(
	progress: Record<string, number>,
): CampaignEventType {
	for (const [eventType, campaigns] of Object.entries(
		getCampaignEventGroups(),
	)) {
		if (campaigns.some((c) => c in progress)) {
			return eventType as CampaignEventType;
		}
	}
	return "none";
}

// ---------------------------------------------------------------------------
// CE filtering
// ---------------------------------------------------------------------------

/**
 * Filter locations by the active campaign event.
 * - If no CE is selected ("none"), all CE-campaign locations are excluded.
 * - If a CE is selected, only that CE's locations are kept; other CE locations
 *   are excluded. Non-CE locations always pass through.
 */
export function filterLocationsByCampaignEvent<T extends { campaign: string }>(
	locations: T[],
	campaignEvent: CampaignEventType,
): T[] {
	const allCe = getAllCeCampaigns();
	if (campaignEvent === "none") {
		// Exclude all CE campaigns
		return locations.filter((loc) => !allCe.has(loc.campaign));
	}

	const activeGroup = new Set(getCampaignEventGroups()[campaignEvent]);
	return locations.filter(
		(loc) => !allCe.has(loc.campaign) || activeGroup.has(loc.campaign),
	);
}

// ---------------------------------------------------------------------------
// HSE — enemy counting (from generated pipeline)
// ---------------------------------------------------------------------------

/**
 * Check whether a battle meets the HSE minimum enemy threshold.
 */
export function passesHseFilter(
	battleId: string,
	hse: HomeScreenEventType,
	minCount: number,
): boolean {
	if (hse === "none") return true;

	const counts = (
		BATTLE_ENEMY_COUNTS as unknown as Record<
			string,
			{ tyranids: number; chaos: number; mechanical: number }
		>
	)[battleId];
	if (!counts) return false;

	switch (hse) {
		case "purgeOrder":
			return counts.tyranids >= minCount;
		case "warpSurge":
			return counts.chaos >= minCount;
		case "machineHunt":
			return counts.mechanical >= minCount;
	}
}

/**
 * Return the HSE-relevant enemy count for a specific battle.
 */
function getHseCount(battleId: string, hse: HomeScreenEventType): number {
	const counts = (
		BATTLE_ENEMY_COUNTS as unknown as Record<
			string,
			{ tyranids: number; chaos: number; mechanical: number }
		>
	)[battleId];
	if (!counts) return 0;
	switch (hse) {
		case "purgeOrder":
			return counts.tyranids;
		case "warpSurge":
			return counts.chaos;
		case "machineHunt":
			return counts.mechanical;
		default:
			return 0;
	}
}

/**
 * Reorder material estimates so that estimates whose locations contain
 * HSE-eligible battles come first. Maintains relative order within each group.
 */
export function sortEstimatesForHse<
	T extends { locations: Array<{ battleId: string }> },
>(estimates: T[], hse: HomeScreenEventType, minCount: number): T[] {
	if (hse === "none") return estimates;

	// Partition into HSE-eligible and non-eligible
	const eligible: T[] = [];
	const rest: T[] = [];

	for (const est of estimates) {
		const hasEligible = est.locations.some((loc) =>
			passesHseFilter(loc.battleId, hse, minCount),
		);
		if (hasEligible) {
			eligible.push(est);
		} else {
			rest.push(est);
		}
	}

	// Within eligible, sort by best HSE count descending
	eligible.sort((a, b) => {
		const aMax = Math.max(
			...a.locations.map((l) => getHseCount(l.battleId, hse)),
		);
		const bMax = Math.max(
			...b.locations.map((l) => getHseCount(l.battleId, hse)),
		);
		return bMax - aMax;
	});

	return [...eligible, ...rest];
}
