/**
 * Campaign Event (CE) and Home Screen Event (HSE) types, constants, and helpers.
 *
 * CE: Only one campaign event can be active at a time. Locations belonging to
 *     inactive CE campaigns are excluded from farming.
 * HSE: Prioritises battles with target enemy types so the player can complete
 *     the active home-screen event faster.
 */

import { CAMPAIGN_BATTLES } from "@/5-assets/campaign-battles/index.ts";
import { NPCS } from "@/5-assets/npcs/index.ts";
import { getCampaignMetadata } from "./campaign-data.ts";
import type { Campaign } from "./constants.ts";

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

const BASE_NAME_TO_EVENT_TYPE: Record<
	string,
	Exclude<CampaignEventType, "none">
> = {
	"Adeptus Mechanicus": "adMech",
	Tyranids: "tyranids",
	"T'au Empire": "tau",
	"Death Guard": "deathGuard",
};

function buildCampaignEventGroups(): Record<
	Exclude<CampaignEventType, "none">,
	Campaign[]
> {
	const groups: Record<string, Campaign[]> = {
		adMech: [],
		tyranids: [],
		tau: [],
		deathGuard: [],
	};
	for (const [campaign, m] of getCampaignMetadata()) {
		if (!m.isEvent) continue;
		const eventType = BASE_NAME_TO_EVENT_TYPE[m.baseName];
		if (eventType) groups[eventType].push(campaign);
	}
	return groups as Record<Exclude<CampaignEventType, "none">, Campaign[]>;
}

let _campaignEventGroups:
	| Record<Exclude<CampaignEventType, "none">, Campaign[]>
	| undefined;

/** Maps each CE type to the Campaign values it activates. */
export function getCampaignEventGroups(): Record<
	Exclude<CampaignEventType, "none">,
	Campaign[]
> {
	if (!_campaignEventGroups) _campaignEventGroups = buildCampaignEventGroups();
	return _campaignEventGroups;
}

let _allCeCampaigns: Set<Campaign> | undefined;

/** Flat set of every campaign that belongs to any campaign event. */
export function getAllCeCampaigns(): Set<Campaign> {
	if (!_allCeCampaigns) {
		_allCeCampaigns = new Set(Object.values(getCampaignEventGroups()).flat());
	}
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
	progress: Map<Campaign, number>,
): CampaignEventType {
	for (const [eventType, campaigns] of Object.entries(
		getCampaignEventGroups(),
	)) {
		if (campaigns.some((c) => progress.has(c))) {
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
export function filterLocationsByCampaignEvent<
	T extends { campaign: Campaign },
>(locations: T[], campaignEvent: CampaignEventType): T[] {
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
// HSE — enemy counting
// ---------------------------------------------------------------------------

interface BattleEnemyCounts {
	tyranids: number;
	chaos: number;
	mechanical: number;
}

let _battleEnemyCounts: Map<string, BattleEnemyCounts> | undefined;

/** Build a lookup from NPC id → { faction, alliance, traits }. */
function buildNpcLookup(): Map<
	string,
	{
		faction: string | null;
		alliance: string | null;
		traits: readonly string[];
	}
> {
	const lookup = new Map<
		string,
		{
			faction: string | null;
			alliance: string | null;
			traits: readonly string[];
		}
	>();
	for (const npc of NPCS) {
		lookup.set(npc.id, {
			faction: npc.faction,
			alliance: npc.alliance,
			traits: npc.traits,
		});
	}
	return lookup;
}

/**
 * Lazy-built map from battle ID → HSE-relevant enemy counts.
 * Iterates every battle node's `detailedEnemyTypes`, looks up the NPC's
 * faction / alliance / traits, and counts non-Summon enemies.
 */
export function getBattleEnemyCounts(): Map<string, BattleEnemyCounts> {
	if (_battleEnemyCounts) return _battleEnemyCounts;

	const npcLookup = buildNpcLookup();
	_battleEnemyCounts = new Map();

	for (const nodes of Object.values(CAMPAIGN_BATTLES)) {
		for (const node of nodes) {
			let tyranids = 0;
			let chaos = 0;
			let mechanical = 0;

			for (const enemy of node.detailedEnemyTypes) {
				const npc = npcLookup.get(enemy.id);
				if (!npc) continue;
				// Skip summoned units
				if (npc.traits.includes("Summon")) continue;

				if (npc.faction === "Tyranids") tyranids += enemy.count;
				if (npc.alliance === "Chaos") chaos += enemy.count;
				if (npc.traits.includes("Mechanical")) mechanical += enemy.count;
			}

			_battleEnemyCounts.set(node.id, { tyranids, chaos, mechanical });
		}
	}

	return _battleEnemyCounts;
}

/**
 * Check whether a battle meets the HSE minimum enemy threshold.
 */
export function passesHseFilter(
	battleId: string,
	hse: HomeScreenEventType,
	minCount: number,
): boolean {
	if (hse === "none") return true;

	const counts = getBattleEnemyCounts().get(battleId);
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
	const counts = getBattleEnemyCounts().get(battleId);
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
