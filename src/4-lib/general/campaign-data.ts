/**
 * Campaign data module — wraps validated pipeline data for battle nodes and campaign configs.
 *
 * Provides:
 * - Campaign config lookup (energy cost, daily battle count, drop rates)
 * - Battle node lookup by ID
 * - Index maps: nodes by upgrade material, nodes by shard unit
 * - Composed battle data with computed drop rates and energy-per-item
 */

import { CAMPAIGN_BATTLES } from "@/5-assets/campaign-battles/index.ts";
import { DROP_RATES } from "@/5-assets/drop-rates/index.ts";
import { Campaign, type CampaignType } from "./constants.ts";
import { rarityStringToNumber } from "./rarity-data.ts";

const SHARD_PREFIX_RE = /^(mythicShards_|shards_)/;

// ---------------------------------------------------------------------------
// Types derived from pipeline data
// ---------------------------------------------------------------------------

type BattleNode =
	(typeof CAMPAIGN_BATTLES)[keyof typeof CAMPAIGN_BATTLES][number];
type ConfigEntry = (typeof DROP_RATES)[keyof typeof DROP_RATES];
type DropRate = ConfigEntry["dropRate"];

// ---------------------------------------------------------------------------
// Processed types (public API — unchanged)
// ---------------------------------------------------------------------------

export interface ICampaignConfig {
	type: CampaignType;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: DropRate;
}

export interface ICampaignBattleComposed {
	campaignId: Campaign;
	nodeNumber: number;
	campaignType: CampaignType;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: number;
	expectedShards: number;
	unitId?: string;
}

/** A farming location for a specific upgrade material */
export interface IUpgradeLocation {
	battleId: string;
	campaign: Campaign;
	campaignType: CampaignType;
	nodeNumber: number;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: number;
	energyPerItem: number;
}

/** A farming location for character shards */
export interface IShardLocation {
	battleId: string;
	campaign: Campaign;
	campaignType: CampaignType;
	nodeNumber: number;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: number;
	expectedShards: number;
	energyPerShard: number;
	isMythic: boolean;
}

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
// Event campaign mapping (API id → Standard + Extremis Campaign pairs)
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

/** Reverse lookup: Campaign display-name string → Campaign enum value.
 *  Campaign enum values ARE the display names, so this is an identity map. */
const campaignValues = new Map<string, Campaign>(
	Object.values(Campaign).map((v) => [v, v]),
);

function toCampaign(name: string): Campaign | undefined {
	return campaignValues.get(name);
}

// ---------------------------------------------------------------------------
// Lazy-initialized data (built synchronously from pipeline imports on first access)
// ---------------------------------------------------------------------------

let _configs: Map<CampaignType, ICampaignConfig> | undefined;
let _battleNodes: Map<string, BattleNode & { campaign: string }> | undefined;
let _upgradeLocations: Map<string, IUpgradeLocation[]> | undefined;
let _shardLocations: Map<string, IShardLocation[]> | undefined;

function getConfigs(): Map<CampaignType, ICampaignConfig> {
	if (_configs) return _configs;

	_configs = new Map<CampaignType, ICampaignConfig>();
	for (const [key, value] of Object.entries(DROP_RATES)) {
		_configs.set(key as CampaignType, {
			type: key as CampaignType,
			energyCost: value.energyCost,
			dailyBattleCount: value.dailyBattleCount,
			dropRate: value.dropRate,
		});
	}
	return _configs;
}

function getBattleNodes(): Map<string, BattleNode & { campaign: string }> {
	if (_battleNodes) return _battleNodes;

	_battleNodes = new Map();
	for (const [campaignName, nodes] of Object.entries(CAMPAIGN_BATTLES)) {
		for (const node of nodes) {
			_battleNodes.set(node.id, { ...node, campaign: campaignName });
		}
	}
	return _battleNodes;
}

// ---------------------------------------------------------------------------
// Index building
// ---------------------------------------------------------------------------

/**
 * Map rarity string from recipe data to the drop rate key used in campaign configs.
 */
function rarityToDropRateKey(rarity: string): keyof DropRate | undefined {
	const lower = rarity.toLowerCase();
	if (
		lower === "common" ||
		lower === "uncommon" ||
		lower === "rare" ||
		lower === "epic" ||
		lower === "legendary" ||
		lower === "mythic"
	) {
		return lower as keyof DropRate;
	}
	return undefined;
}

async function buildUpgradeLocations(): Promise<
	Map<string, IUpgradeLocation[]>
> {
	if (_upgradeLocations) return _upgradeLocations;

	const configs = getConfigs();
	const nodes = getBattleNodes();

	// We need material rarities for drop rate lookup
	const { MATERIALS } = await import("@/5-assets/materials/index.ts");
	const recipeData = MATERIALS as Record<string, { rarity?: string }>;

	_upgradeLocations = new Map<string, IUpgradeLocation[]>();

	for (const [battleId, node] of nodes) {
		const campaign = toCampaign(node.campaign);
		if (!campaign) continue;

		const config = configs.get(node.campaignType as CampaignType);
		if (!config) continue;

		const energyCost = node.energyCost || config.energyCost;
		const dailyBattleCount = config.dailyBattleCount;

		// Process potential rewards (upgrade material drops)
		if (!node.rewards.potential) continue;

		for (const reward of node.rewards.potential) {
			if (
				!reward.id ||
				reward.id.startsWith("shards_") ||
				reward.id.startsWith("mythicShards_") ||
				reward.id === "gold"
			) {
				continue;
			}

			// Determine drop rate: use node-specific effective_rate if available,
			// otherwise fall back to campaign config rate by rarity
			let dropRate = reward.effective_rate;
			if (dropRate == null || dropRate <= 0) {
				const materialRarity = recipeData[reward.id]?.rarity;
				if (materialRarity) {
					const key = rarityToDropRateKey(materialRarity);
					if (key) {
						dropRate = config.dropRate[key] ?? 0;
					}
				}
			}

			if (dropRate <= 0) continue;

			const location: IUpgradeLocation = {
				battleId,
				campaign,
				campaignType: node.campaignType as CampaignType,
				nodeNumber: node.nodeNumber,
				energyCost,
				dailyBattleCount,
				dropRate,
				energyPerItem: energyCost / dropRate,
			};

			const existing = _upgradeLocations.get(reward.id);
			if (existing) {
				existing.push(location);
			} else {
				_upgradeLocations.set(reward.id, [location]);
			}
		}
	}

	// Sort each material's locations by energy efficiency (cheapest first)
	for (const locations of _upgradeLocations.values()) {
		locations.sort((a, b) => a.energyPerItem - b.energyPerItem);
	}

	return _upgradeLocations;
}

async function buildShardLocations(): Promise<Map<string, IShardLocation[]>> {
	if (_shardLocations) return _shardLocations;

	const configs = getConfigs();
	const nodes = getBattleNodes();
	_shardLocations = new Map<string, IShardLocation[]>();

	for (const [battleId, node] of nodes) {
		const campaign = toCampaign(node.campaign);
		if (!campaign) continue;

		const config = configs.get(node.campaignType as CampaignType);
		if (!config) continue;

		const energyCost = node.energyCost || config.energyCost;
		const dailyBattleCount = config.dailyBattleCount;

		// Process all rewards for shard drops
		const allRewards: Array<{
			id: string;
			rate: number;
			expectedCount: number;
		}> = [];

		if (node.rewards.guaranteed) {
			for (const r of node.rewards.guaranteed) {
				allRewards.push({
					id: r.id,
					rate: 1, // guaranteed
					expectedCount: (r.min + r.max) / 2,
				});
			}
		}

		if (node.rewards.potential) {
			for (const r of node.rewards.potential) {
				if (r.id.startsWith("shards_") || r.id.startsWith("mythicShards_")) {
					allRewards.push({
						id: r.id,
						rate: r.effective_rate || config.dropRate.shard,
						expectedCount: r.effective_rate || config.dropRate.shard,
					});
				}
			}
		}

		for (const reward of allRewards) {
			const isMythic = reward.id.startsWith("mythicShards_");
			const isRegularShard = reward.id.startsWith("shards_");

			if (!isMythic && !isRegularShard) continue;

			const unitId = reward.id.replace(SHARD_PREFIX_RE, "");
			const dropRate = reward.rate;
			const expectedShards = reward.expectedCount;

			if (dropRate <= 0) continue;

			const location: IShardLocation = {
				battleId,
				campaign,
				campaignType: node.campaignType as CampaignType,
				nodeNumber: node.nodeNumber,
				energyCost,
				dailyBattleCount,
				dropRate,
				expectedShards,
				energyPerShard:
					expectedShards > 0 ? energyCost / expectedShards : Infinity,
				isMythic,
			};

			const existing = _shardLocations.get(unitId);
			if (existing) {
				existing.push(location);
			} else {
				_shardLocations.set(unitId, [location]);
			}
		}
	}

	// Sort each unit's locations by energy efficiency (cheapest first)
	for (const locations of _shardLocations.values()) {
		locations.sort((a, b) => a.energyPerShard - b.energyPerShard);
	}

	return _shardLocations;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get campaign config by campaign type.
 */
export async function getCampaignConfig(
	type: CampaignType,
): Promise<ICampaignConfig | undefined> {
	return getConfigs().get(type);
}

/**
 * Get all campaign configs.
 */
export async function getAllCampaignConfigs(): Promise<
	Map<CampaignType, ICampaignConfig>
> {
	return getConfigs();
}

/**
 * Get farming locations for an upgrade material, sorted by energy efficiency.
 * Returns locations where this material can be farmed as a potential drop.
 */
export async function getUpgradeLocations(
	materialId: string,
): Promise<IUpgradeLocation[]> {
	const locations = await buildUpgradeLocations();
	return locations.get(materialId) ?? [];
}

/**
 * Get all upgrade locations indexed by material ID.
 */
export async function getAllUpgradeLocations(): Promise<
	Map<string, IUpgradeLocation[]>
> {
	return buildUpgradeLocations();
}

/**
 * Get farming locations for a character's shards, sorted by energy efficiency.
 * Includes both regular and mythic shard locations.
 */
export async function getShardLocations(
	unitId: string,
): Promise<IShardLocation[]> {
	const locations = await buildShardLocations();
	return locations.get(unitId) ?? [];
}

/**
 * Get all shard locations indexed by unit ID.
 */
export async function getAllShardLocations(): Promise<
	Map<string, IShardLocation[]>
> {
	return buildShardLocations();
}

/**
 * Select the best (cheapest energy per item) locations for a material.
 * Returns locations with the minimum energyPerItem value.
 */
export async function selectBestUpgradeLocations(
	materialId: string,
): Promise<IUpgradeLocation[]> {
	const allLocations = await getUpgradeLocations(materialId);
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
export async function selectBestShardLocations(
	unitId: string,
): Promise<IShardLocation[]> {
	const allLocations = await getShardLocations(unitId);
	const regular = allLocations.filter((loc) => !loc.isMythic);
	if (regular.length === 0) return [];

	const minEnergy = regular[0].energyPerShard;
	return regular.filter(
		(loc) => Math.abs(loc.energyPerShard - minEnergy) < 0.01,
	);
}

let _campaignNodeCounts: Map<Campaign, number> | undefined;

function buildCampaignNodeCounts(): Map<Campaign, number> {
	if (_campaignNodeCounts) return _campaignNodeCounts;

	_campaignNodeCounts = new Map<Campaign, number>();
	for (const [name, nodes] of Object.entries(CAMPAIGN_BATTLES)) {
		const campaign = toCampaign(name);
		if (!campaign) continue;
		_campaignNodeCounts.set(campaign, nodes.length);
	}
	return _campaignNodeCounts;
}

export function getCampaignNodeCounts(): Map<Campaign, number> {
	return buildCampaignNodeCounts();
}

// ---------------------------------------------------------------------------
// Campaign metadata — derived from pipeline data + Campaign enum
// ---------------------------------------------------------------------------

export interface CampaignMetadata {
	campaign: Campaign;
	baseName: string;
	displayType: string;
	typeOrder: number;
	isEvent: boolean;
	totalNodes: number;
}

const TYPE_ORDER: Record<string, number> = {
	Normal: 0,
	Elite: 1,
	Mirror: 2,
	"Elite Mirror": 3,
	Standard: 0,
	"Standard Challenge": 1,
	Extremis: 2,
	"Extremis Challenge": 3,
};

function categorizeCampaignType(campaignValue: string): string {
	if (campaignValue.includes("Extremis") && campaignValue.includes("Challenge"))
		return "Extremis Challenge";
	if (campaignValue.includes("Extremis")) return "Extremis";
	if (campaignValue.includes("Standard") && campaignValue.includes("Challenge"))
		return "Standard Challenge";
	if (campaignValue.includes("Standard")) return "Standard";
	if (campaignValue.includes("Mirror") && campaignValue.includes("Elite"))
		return "Elite Mirror";
	if (campaignValue.includes("Elite")) return "Elite";
	if (campaignValue.includes("Mirror")) return "Mirror";
	return "Normal";
}

function getBaseName(campaignValue: string): string {
	return campaignValue
		.replace(" Mirror Elite", "")
		.replace(" Elite", "")
		.replace(" Mirror", "")
		.replace(" Extremis Challenge", "")
		.replace(" Standard Challenge", "")
		.replace(" Extremis", "")
		.replace(" Standard", "");
}

export function isEventType(type: string): boolean {
	return [
		"Standard",
		"Standard Challenge",
		"Extremis",
		"Extremis Challenge",
	].includes(type);
}

let _campaignMetadata: ReadonlyMap<Campaign, CampaignMetadata> | undefined;

export function getCampaignMetadata(): ReadonlyMap<Campaign, CampaignMetadata> {
	if (_campaignMetadata) return _campaignMetadata;

	const nodeCounts = buildCampaignNodeCounts();
	const meta = new Map<Campaign, CampaignMetadata>();

	for (const campaign of Object.values(Campaign)) {
		const totalNodes = nodeCounts.get(campaign);
		if (totalNodes === undefined) continue;

		const displayType = categorizeCampaignType(campaign);
		meta.set(campaign, {
			campaign,
			baseName: getBaseName(campaign),
			displayType,
			typeOrder: TYPE_ORDER[displayType] ?? 99,
			isEvent: isEventType(displayType),
			totalNodes,
		});
	}

	_campaignMetadata = meta;
	return _campaignMetadata;
}

let _baseNameLists:
	| { main: readonly string[]; event: readonly string[] }
	| undefined;

function getBaseNameLists(): {
	main: readonly string[];
	event: readonly string[];
} {
	if (_baseNameLists) return _baseNameLists;

	const meta = getCampaignMetadata();
	const mainSeen = new Set<string>();
	const eventSeen = new Set<string>();
	const main: string[] = [];
	const event: string[] = [];

	// Iterate Campaign enum values to preserve game progression order
	for (const campaign of Object.values(Campaign)) {
		const m = meta.get(campaign);
		if (!m) continue;

		if (m.isEvent) {
			if (!eventSeen.has(m.baseName)) {
				eventSeen.add(m.baseName);
				event.push(m.baseName);
			}
		} else {
			if (!mainSeen.has(m.baseName)) {
				mainSeen.add(m.baseName);
				main.push(m.baseName);
			}
		}
	}

	_baseNameLists = { main, event };
	return _baseNameLists;
}

export function getMainCampaignBaseNames(): readonly string[] {
	return getBaseNameLists().main;
}

export function getEventCampaignBaseNames(): readonly string[] {
	return getBaseNameLists().event;
}

/**
 * Get drop rate for a material rarity from a specific campaign type config.
 */
export async function getDropRateForRarity(
	campaignType: CampaignType,
	rarity: string,
): Promise<number> {
	const config = getConfigs().get(campaignType);
	if (!config) return 0;

	const rarityNum =
		rarityStringToNumber[rarity as keyof typeof rarityStringToNumber];
	if (rarityNum === undefined) return 0;

	const keyMap: Record<number, keyof DropRate> = {
		0: "common",
		1: "uncommon",
		2: "rare",
		3: "epic",
		4: "legendary",
		5: "mythic",
	};

	const key = keyMap[rarityNum];
	if (!key) return 0;

	return config.dropRate[key] ?? 0;
}

// ---------------------------------------------------------------------------
// Event campaign helpers — flat battle map + resolution
// ---------------------------------------------------------------------------

interface FlatBattleEntry {
	nodeNumber: number;
	isChallenge: boolean;
}

let _eventBattleMaps: Map<Campaign, readonly FlatBattleEntry[]> | undefined;

function buildEventBattleMaps(): Map<Campaign, readonly FlatBattleEntry[]> {
	if (_eventBattleMaps) return _eventBattleMaps;

	_eventBattleMaps = new Map();
	const meta = getCampaignMetadata();

	// For each event base campaign (Standard/Extremis), build the flat map
	for (const [campaign, m] of meta) {
		if (m.displayType !== "Standard" && m.displayType !== "Extremis") continue;

		// Find the matching challenge campaign by baseName + challenge displayType
		const challengeType =
			m.displayType === "Standard"
				? "Standard Challenge"
				: "Extremis Challenge";
		let challengeNodeNumbers: number[] = [];

		for (const [c, cm] of meta) {
			if (cm.baseName === m.baseName && cm.displayType === challengeType) {
				// Get actual nodeNumbers from battle data
				const nodes = CAMPAIGN_BATTLES[c as keyof typeof CAMPAIGN_BATTLES];
				if (nodes) {
					challengeNodeNumbers = (
						nodes as ReadonlyArray<{ nodeNumber: number }>
					).map((n) => n.nodeNumber);
				}
				break;
			}
		}

		const challengeSet = new Set(challengeNodeNumbers);
		const baseNodes = CAMPAIGN_BATTLES[
			campaign as keyof typeof CAMPAIGN_BATTLES
		] as ReadonlyArray<{ nodeNumber: number }> | undefined;
		if (!baseNodes) continue;

		const flatMap: FlatBattleEntry[] = [];
		for (const node of baseNodes) {
			flatMap.push({ nodeNumber: node.nodeNumber, isChallenge: false });
			if (challengeSet.has(node.nodeNumber)) {
				flatMap.push({ nodeNumber: node.nodeNumber, isChallenge: true });
			}
		}

		_eventBattleMaps.set(campaign, flatMap);
	}

	return _eventBattleMaps;
}

/**
 * Get the flat battle ordering for an event base campaign.
 * Maps API battleIndex → {nodeNumber, isChallenge}.
 */
export function getEventBattleMap(
	baseCampaign: Campaign,
): readonly FlatBattleEntry[] | undefined {
	return buildEventBattleMaps().get(baseCampaign);
}

/**
 * Get the sorted challenge node numbers for a challenge campaign.
 * Returns undefined for non-challenge campaigns.
 */
export function getChallengeNodeNumbers(
	campaign: Campaign,
): readonly number[] | undefined {
	const meta = getCampaignMetadata().get(campaign);
	if (
		!meta ||
		(meta.displayType !== "Standard Challenge" &&
			meta.displayType !== "Extremis Challenge")
	)
		return undefined;

	const nodes = CAMPAIGN_BATTLES[campaign as keyof typeof CAMPAIGN_BATTLES] as
		| ReadonlyArray<{ nodeNumber: number }>
		| undefined;
	if (!nodes) return undefined;

	return nodes.map((n) => n.nodeNumber).sort((a, b) => a - b);
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
	const meta = getCampaignMetadata();
	const baseMeta = meta.get(base);
	if (!baseMeta) return { base, challenge: undefined };

	const challengeType = isExtremis
		? "Extremis Challenge"
		: "Standard Challenge";

	let challenge: Campaign | undefined;
	for (const [c, cm] of meta) {
		if (cm.baseName === baseMeta.baseName && cm.displayType === challengeType) {
			challenge = c;
			break;
		}
	}

	return { base, challenge };
}

/**
 * Convert a max unlocked nodeNumber to a display count for challenge campaigns.
 * Challenge campaigns have sparse node numbers (e.g. [3, 13, 25]), so count
 * how many are ≤ maxNode. For non-challenge campaigns, returns maxNode as-is.
 */
export function getUnlockedNodeCount(
	campaign: Campaign,
	maxNode: number,
): number {
	const nodeNumbers = getChallengeNodeNumbers(campaign);
	if (!nodeNumbers) return maxNode;

	return nodeNumbers.filter((n) => n <= maxNode).length;
}
