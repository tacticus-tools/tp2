/**
 * Campaign data module — wraps validated pipeline data for campaign configs,
 * farming locations, and metadata.
 *
 * Provides:
 * - Farming location lookups for upgrade materials and character shards
 * - Campaign metadata lookups (baseName, displayType, isEvent, totalNodes)
 */

import { NODE_ENERGY_COSTS } from "@/5-assets/campaign-battles/index.ts";
import {
	CAMPAIGN_BASE_NAMES,
	CAMPAIGN_METADATA,
	CHALLENGE_NODES,
	EVENT_BATTLE_MAPS,
} from "@/5-assets/campaign-metadata/index.ts";
import {
	SHARD_LOCATIONS,
	type ShardLocation,
	UPGRADE_LOCATIONS,
	type UpgradeLocation,
} from "@/5-assets/farming-locations/index.ts";
import { Campaign } from "./constants.ts";

// Re-export location types from the pipeline
export type IUpgradeLocation = UpgradeLocation;
export type IShardLocation = ShardLocation;

// ---------------------------------------------------------------------------
// Static mappings
// ---------------------------------------------------------------------------

/** Map from campaign API id to Campaign enum (non-event campaigns only) */
export const idToCampaign: Record<string, Campaign> = {
	campaign1: Campaign.I,
	campaign2: Campaign.FoC,
	campaign3: Campaign.O,
	campaign4: Campaign.SH,

	mirror1: Campaign.IM,
	mirror2: Campaign.FoCM,
	mirror3: Campaign.OM,
	mirror4: Campaign.SHM,

	elite1: Campaign.IE,
	elite2: Campaign.FoCE,
	elite3: Campaign.OE,
	elite4: Campaign.SHE,

	eliteMirror1: Campaign.IME,
	eliteMirror2: Campaign.FoCME,
	eliteMirror3: Campaign.OME,
	eliteMirror4: Campaign.SHME,
};

// ---------------------------------------------------------------------------
// Event campaign mapping (API id -> Standard + Extremis Campaign pairs)
// ---------------------------------------------------------------------------

const EVENT_CAMPAIGN_MAP: Record<
	string,
	{ standard: Campaign; extremis: Campaign }
> = {
	eventcampaign1: { standard: Campaign.AMS, extremis: Campaign.AME },
	eventcampaign2: { standard: Campaign.TS, extremis: Campaign.TE },
	eventcampaign3: { standard: Campaign.TAS, extremis: Campaign.TAE },
	eventcampaign4: { standard: Campaign.DGS, extremis: Campaign.DGE },
};

// ---------------------------------------------------------------------------
// Farming location lookups (sync, from generated pipeline data)
// ---------------------------------------------------------------------------

/**
 * Get farming locations for an upgrade material, sorted by energy efficiency.
 * Returns locations where this material can be farmed as a potential drop.
 */
export function getUpgradeLocations(materialId: string): UpgradeLocation[] {
	return (
		(UPGRADE_LOCATIONS as unknown as Record<string, UpgradeLocation[]>)[
			materialId
		] ?? []
	);
}

/**
 * Get all upgrade locations indexed by material ID.
 */
export function getAllUpgradeLocations(): Readonly<
	Record<string, UpgradeLocation[]>
> {
	return UPGRADE_LOCATIONS as unknown as Record<string, UpgradeLocation[]>;
}

/**
 * Get farming locations for a character's shards, sorted by energy efficiency.
 * Includes both regular and mythic shard locations.
 */
export function getShardLocations(unitId: string): ShardLocation[] {
	return (
		(SHARD_LOCATIONS as unknown as Record<string, ShardLocation[]>)[unitId] ??
		[]
	);
}

/**
 * Get all shard locations indexed by unit ID.
 */
export function getAllShardLocations(): Readonly<
	Record<string, ShardLocation[]>
> {
	return SHARD_LOCATIONS as unknown as Record<string, ShardLocation[]>;
}

/**
 * Select the best (cheapest energy per item) locations for a material.
 * Returns locations with the minimum energyPerItem value.
 */
export function selectBestUpgradeLocations(
	materialId: string,
): UpgradeLocation[] {
	const allLocations = getUpgradeLocations(materialId);
	if (allLocations.length === 0) return [];

	const minEnergy = allLocations[0].energyPerItem;
	return allLocations.filter(
		(loc) => Math.abs(loc.energyPerItem - minEnergy) < 0.01,
	);
}

/**
 * Select the best (cheapest energy per shard) locations for a character.
 * Returns only regular shard locations (not mythic) with the best rate.
 */
export function selectBestShardLocations(unitId: string): ShardLocation[] {
	const allLocations = getShardLocations(unitId);
	const regular = allLocations.filter((loc) => !loc.isMythic);
	if (regular.length === 0) return [];

	const minEnergy = regular[0].energyPerShard;
	return regular.filter(
		(loc) => Math.abs(loc.energyPerShard - minEnergy) < 0.01,
	);
}

// ---------------------------------------------------------------------------
// Campaign metadata — sync lookups into generated pipeline data
// ---------------------------------------------------------------------------

export function getCampaignMetadata() {
	return CAMPAIGN_METADATA;
}

export function isEventType(type: string): boolean {
	return (
		type === "Standard" ||
		type === "Standard Challenge" ||
		type === "Extremis" ||
		type === "Extremis Challenge"
	);
}

export function getMainCampaignBaseNames(): readonly string[] {
	return CAMPAIGN_BASE_NAMES.main;
}

export function getEventCampaignBaseNames(): readonly string[] {
	return CAMPAIGN_BASE_NAMES.event;
}

// ---------------------------------------------------------------------------
// Event campaign helpers — sync lookups into generated pipeline data
// ---------------------------------------------------------------------------

/**
 * Get the flat battle ordering for an event base campaign.
 * Maps API battleIndex -> {nodeNumber, isChallenge}.
 */
export function getEventBattleMap(baseCampaign: Campaign) {
	return EVENT_BATTLE_MAPS[baseCampaign as keyof typeof EVENT_BATTLE_MAPS];
}

/**
 * Get the sorted challenge node numbers for a challenge campaign.
 * Returns undefined for non-challenge campaigns.
 */
export function getChallengeNodeNumbers(
	campaign: Campaign,
): readonly number[] | undefined {
	return CHALLENGE_NODES[campaign as keyof typeof CHALLENGE_NODES];
}

/**
 * Resolve an API campaign id + type to the base and challenge Campaign enum values.
 * Returns undefined for non-event campaigns.
 */
export function resolveEventCampaign(
	apiId: string,
	apiType: string,
): { base: Campaign; challenge: Campaign | undefined } | undefined {
	const entry = EVENT_CAMPAIGN_MAP[apiId.toLowerCase()];
	if (!entry) return undefined;

	const isExtremis = apiType.toLowerCase() === "extremis";
	const base = isExtremis ? entry.extremis : entry.standard;

	// Find challenge counterpart via metadata
	const baseMeta = CAMPAIGN_METADATA[base as keyof typeof CAMPAIGN_METADATA];
	if (!baseMeta) return { base, challenge: undefined };

	const challengeType = isExtremis
		? "Extremis Challenge"
		: "Standard Challenge";

	let challenge: Campaign | undefined;
	for (const [c, cm] of Object.entries(CAMPAIGN_METADATA)) {
		if (cm.baseName === baseMeta.baseName && cm.displayType === challengeType) {
			challenge = c as Campaign;
			break;
		}
	}

	return { base, challenge };
}

/**
 * Convert a max unlocked nodeNumber to a display count for challenge campaigns.
 * Challenge campaigns have sparse node numbers (e.g. [3, 13, 25]), so count
 * how many are <= maxNode. For non-challenge campaigns, returns maxNode as-is.
 */
export function getUnlockedNodeCount(
	campaign: Campaign,
	maxNode: number,
): number {
	const nodeNumbers = getChallengeNodeNumbers(campaign);
	if (!nodeNumbers) return maxNode;

	return nodeNumbers.filter((n) => n <= maxNode).length;
}

// ---------------------------------------------------------------------------
// Node energy cost lookup (from build-time generated map)
// ---------------------------------------------------------------------------

/**
 * Get the energy cost for a specific campaign node.
 * Key format: "campaign:nodeNumber" (e.g. "Indomitus:5").
 */
export function getNodeEnergyCost(
	campaign: string,
	nodeNumber: number,
): number {
	const key = `${campaign}:${nodeNumber}`;
	return (NODE_ENERGY_COSTS as unknown as Record<string, number>)[key] ?? 0;
}
