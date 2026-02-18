/**
 * Campaign data module — wraps validated pipeline data for battle nodes and campaign configs.
 *
 * Provides:
 * - Campaign config lookup (energy cost, daily battle count, drop rates)
 * - Battle node lookup by ID
 * - Index maps: nodes by upgrade material, nodes by shard unit
 * - Composed battle data with computed drop rates and energy-per-item
 */

import { CAMPAIGN_BATTLES, CAMPAIGN_CONFIGS } from "@/5-assets/campaigns";
import { Campaign, type CampaignType } from "./constants";
import { rarityStringToNumber } from "./rarity-data";

const SHARD_PREFIX_RE = /^(mythicShards_|shards_)/;

// ---------------------------------------------------------------------------
// Types derived from pipeline data
// ---------------------------------------------------------------------------

type BattleNode =
	(typeof CAMPAIGN_BATTLES)[keyof typeof CAMPAIGN_BATTLES][number];
type ConfigEntry = (typeof CAMPAIGN_CONFIGS)[keyof typeof CAMPAIGN_CONFIGS];
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

/** Map from campaign API id to Campaign enum */
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

	eventCampaign1: Campaign.AMS,
	eventCampaign2: Campaign.TS,
	eventCampaign3: Campaign.TAS,
};

/** Map from battle data campaign name to Campaign enum */
const campaignNameToEnum: Record<string, Campaign> = {
	Indomitus: Campaign.I,
	"Indomitus Elite": Campaign.IE,
	"Indomitus Mirror": Campaign.IM,
	"Indomitus Mirror Elite": Campaign.IME,
	"Fall of Cadia": Campaign.FoC,
	"Fall of Cadia Elite": Campaign.FoCE,
	"Fall of Cadia Mirror": Campaign.FoCM,
	"Fall of Cadia Mirror Elite": Campaign.FoCME,
	Octarius: Campaign.O,
	"Octarius Elite": Campaign.OE,
	"Octarius Mirror": Campaign.OM,
	"Octarius Mirror Elite": Campaign.OME,
	"Saim-Hann": Campaign.SH,
	"Saim-Hann Elite": Campaign.SHE,
	"Saim-Hann Mirror": Campaign.SHM,
	"Saim-Hann Mirror Elite": Campaign.SHME,
	"Adeptus Mechanicus Standard": Campaign.AMS,
	"Adeptus Mechanicus Standard Challenge": Campaign.AMSC,
	"Adeptus Mechanicus Extremis": Campaign.AME,
	"Adeptus Mechanicus Extremis Challenge": Campaign.AMEC,
	"Tyranids Standard": Campaign.TS,
	"Tyranids Standard Challenge": Campaign.TSC,
	"Tyranids Extremis": Campaign.TE,
	"Tyranids Extremis Challenge": Campaign.TEC,
	"T'au Empire Standard": Campaign.TAS,
	"T'au Empire Standard Challenge": Campaign.TASC,
	"T'au Empire Extremis": Campaign.TAE,
	"T'au Empire Extremis Challenge": Campaign.TAEC,
	"Death Guard Standard": Campaign.DGS,
	"Death Guard Standard Challenge": Campaign.DGSC,
	"Death Guard Extremis": Campaign.DGE,
	"Death Guard Extremis Challenge": Campaign.DGEC,
	Onslaught: Campaign.Onslaught,
};

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
	for (const [key, value] of Object.entries(CAMPAIGN_CONFIGS)) {
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
	const { MATERIALS } = await import("@/5-assets/materials");
	const recipeData = MATERIALS as Record<string, { rarity?: string }>;

	_upgradeLocations = new Map<string, IUpgradeLocation[]>();

	for (const [battleId, node] of nodes) {
		const campaign = campaignNameToEnum[node.campaign];
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
			if (dropRate <= 0) {
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
		const campaign = campaignNameToEnum[node.campaign];
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

/**
 * Max nodes per campaign, matching the game's difficulty-based structure:
 * - Standard/Mirror: 75 nodes
 * - Elite: 40 nodes
 * - Event Standard/Extremis: 30 nodes
 * - Event Challenge: 3 nodes
 */
const campaignNodeCounts: Map<Campaign, number> = new Map([
	// Indomitus
	[Campaign.I, 75],
	[Campaign.IE, 40],
	[Campaign.IM, 75],
	[Campaign.IME, 40],
	// Fall of Cadia
	[Campaign.FoC, 75],
	[Campaign.FoCE, 40],
	[Campaign.FoCM, 75],
	[Campaign.FoCME, 40],
	// Octarius
	[Campaign.O, 75],
	[Campaign.OE, 40],
	[Campaign.OM, 75],
	[Campaign.OME, 40],
	// Saim-Hann
	[Campaign.SH, 75],
	[Campaign.SHE, 40],
	[Campaign.SHM, 75],
	[Campaign.SHME, 40],
	// Adeptus Mechanicus
	[Campaign.AMS, 30],
	[Campaign.AMSC, 3],
	[Campaign.AME, 30],
	[Campaign.AMEC, 3],
	// Tyranids
	[Campaign.TS, 30],
	[Campaign.TSC, 3],
	[Campaign.TE, 30],
	[Campaign.TEC, 3],
	// T'au Empire
	[Campaign.TAS, 30],
	[Campaign.TASC, 3],
	[Campaign.TAE, 30],
	[Campaign.TAEC, 3],
	// Death Guard
	[Campaign.DGS, 30],
	[Campaign.DGSC, 3],
	[Campaign.DGE, 30],
	[Campaign.DGEC, 3],
]);

export function getCampaignNodeCounts(): Map<Campaign, number> {
	return campaignNodeCounts;
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
