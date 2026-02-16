/**
 * Campaign data module — wraps static JSON battle data and campaign configs.
 *
 * Provides:
 * - Campaign config lookup (energy cost, daily battle count, drop rates)
 * - Battle node lookup by ID
 * - Index maps: nodes by upgrade material, nodes by shard unit
 * - Composed battle data with computed drop rates and energy-per-item
 */

import { Campaign, type CampaignType } from "./enums";
import { rarityStringToNumber } from "./rarity-data";

// ---------------------------------------------------------------------------
// Raw JSON types (matching the shape of the imported data files)
// ---------------------------------------------------------------------------

interface IRawDropRate {
	common: number;
	uncommon: number;
	rare: number;
	epic: number;
	legendary: number;
	shard: number;
	mythic?: number;
	mythicShard?: number;
}

interface IRawCampaignConfig {
	type: string;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: IRawDropRate;
}

interface IRawGuaranteedReward {
	id: string;
	min: number;
	max: number;
}

interface IRawPotentialReward {
	id: string;
	chance_numerator: number;
	chance_denominator: number;
	effective_rate: number;
}

interface IRawBattleNode {
	campaign: string;
	campaignType: string;
	energyCost: number;
	nodeNumber: number;
	slots: number;
	requiredCharacterSnowprintIds: string[];
	rewards: {
		guaranteed: IRawGuaranteedReward[];
		potential: IRawPotentialReward[];
	};
	enemyPower: number;
	enemiesAlliances: string[];
	enemiesFactions: string[];
	enemiesTotal: number;
	enemiesTypes: string[];
	rawEnemyTypes: Array<{ id: string; count: number }>;
	detailedEnemyTypes: Array<{
		id: string;
		name: string;
		count: number;
		stars: number;
		rank: string;
	}>;
}

// ---------------------------------------------------------------------------
// Processed types
// ---------------------------------------------------------------------------

export interface ICampaignConfig {
	type: CampaignType;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: IRawDropRate;
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
// Lazy-initialized data
// ---------------------------------------------------------------------------

let _configs: Map<CampaignType, ICampaignConfig> | undefined;
let _battleNodes: Map<string, IRawBattleNode> | undefined;
let _upgradeLocations: Map<string, IUpgradeLocation[]> | undefined;
let _shardLocations: Map<string, IShardLocation[]> | undefined;

async function loadCampaignConfigs(): Promise<
	Map<CampaignType, ICampaignConfig>
> {
	if (_configs) return _configs;

	const mod = await import("./data/campaignConfigs.json");
	const raw = mod.default as unknown as Record<string, IRawCampaignConfig>;
	_configs = new Map<CampaignType, ICampaignConfig>();

	for (const [key, value] of Object.entries(raw)) {
		_configs.set(key as CampaignType, {
			type: key as CampaignType,
			energyCost: value.energyCost,
			dailyBattleCount: value.dailyBattleCount,
			dropRate: value.dropRate,
		});
	}

	return _configs;
}

async function loadBattleNodes(): Promise<Map<string, IRawBattleNode>> {
	if (_battleNodes) return _battleNodes;

	const mod = await import("./data/battleData.json");
	const raw = mod.default as unknown as Record<string, IRawBattleNode>;
	_battleNodes = new Map<string, IRawBattleNode>();

	for (const [key, value] of Object.entries(raw)) {
		_battleNodes.set(key, value);
	}

	return _battleNodes;
}

// ---------------------------------------------------------------------------
// Index building
// ---------------------------------------------------------------------------

/**
 * Map rarity string from recipe data to the drop rate key used in campaign configs.
 */
function rarityToDropRateKey(rarity: string): keyof IRawDropRate | undefined {
	const lower = rarity.toLowerCase();
	if (
		lower === "common" ||
		lower === "uncommon" ||
		lower === "rare" ||
		lower === "epic" ||
		lower === "legendary" ||
		lower === "mythic"
	) {
		return lower as keyof IRawDropRate;
	}
	return undefined;
}

async function buildUpgradeLocations(): Promise<
	Map<string, IUpgradeLocation[]>
> {
	if (_upgradeLocations) return _upgradeLocations;

	const configs = await loadCampaignConfigs();
	const nodes = await loadBattleNodes();

	// We also need recipe data to know material rarities for drop rate lookup
	const recipeMod = await import("./data/recipeData.json");
	const recipeData = recipeMod.default as unknown as Record<
		string,
		{ rarity?: string }
	>;

	_upgradeLocations = new Map<string, IUpgradeLocation[]>();

	for (const [battleId, node] of nodes) {
		const campaign = campaignNameToEnum[node.campaign];
		if (!campaign) continue;

		const config = configs.get(node.campaignType as CampaignType);
		if (!config) continue;

		const energyCost = node.energyCost || config.energyCost;
		const dailyBattleCount = config.dailyBattleCount;

		// Process potential rewards (upgrade material drops)
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

	const configs = await loadCampaignConfigs();
	const nodes = await loadBattleNodes();
	_shardLocations = new Map<string, IShardLocation[]>();

	for (const [battleId, node] of nodes) {
		const campaign = campaignNameToEnum[node.campaign];
		if (!campaign) continue;

		const config = configs.get(node.campaignType as CampaignType);
		if (!config) continue;

		const energyCost = node.energyCost || config.energyCost;
		const dailyBattleCount = config.dailyBattleCount;

		// Process all rewards for shard drops
		const allRewards = [
			...node.rewards.guaranteed.map((r) => ({
				id: r.id,
				rate: 1, // guaranteed
				expectedCount: (r.min + r.max) / 2,
			})),
			...node.rewards.potential
				.filter(
					(r) => r.id.startsWith("shards_") || r.id.startsWith("mythicShards_"),
				)
				.map((r) => ({
					id: r.id,
					rate: r.effective_rate || config.dropRate.shard,
					expectedCount: r.effective_rate || config.dropRate.shard,
				})),
		];

		for (const reward of allRewards) {
			const isMythic = reward.id.startsWith("mythicShards_");
			const isRegularShard = reward.id.startsWith("shards_");

			if (!isMythic && !isRegularShard) continue;

			const unitId = reward.id.replace(/^(mythicShards_|shards_)/, "");
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
	const configs = await loadCampaignConfigs();
	return configs.get(type);
}

/**
 * Get all campaign configs.
 */
export async function getAllCampaignConfigs(): Promise<
	Map<CampaignType, ICampaignConfig>
> {
	return loadCampaignConfigs();
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
	const config = await getCampaignConfig(campaignType);
	if (!config) return 0;

	const rarityNum =
		rarityStringToNumber[rarity as keyof typeof rarityStringToNumber];
	if (rarityNum === undefined) return 0;

	const keyMap: Record<number, keyof IRawDropRate> = {
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
