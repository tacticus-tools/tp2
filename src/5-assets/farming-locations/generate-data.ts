/**
 * @description Build-time pipeline: Farming location indexes for upgrades and shards.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Reads campaign-battles, drop-rates, and materials data to build:
 * - upgrade-locations.generated.json: Record<materialId, UpgradeLocation[]> sorted by energyPerItem
 * - shard-locations.generated.json: Record<unitId, ShardLocation[]> sorted by energyPerShard
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";

const SHARD_PREFIX_RE = /^(mythicShards_|shards_)/;

// Must match the Campaign const values in constants.ts
const VALID_CAMPAIGNS = new Set([
	"Indomitus",
	"Indomitus Elite",
	"Indomitus Mirror",
	"Indomitus Mirror Elite",
	"Fall of Cadia",
	"Fall of Cadia Elite",
	"Fall of Cadia Mirror",
	"Fall of Cadia Mirror Elite",
	"Octarius",
	"Octarius Elite",
	"Octarius Mirror",
	"Octarius Mirror Elite",
	"Saim-Hann",
	"Saim-Hann Elite",
	"Saim-Hann Mirror",
	"Saim-Hann Mirror Elite",
	"Adeptus Mechanicus Standard",
	"Adeptus Mechanicus Standard Challenge",
	"Adeptus Mechanicus Extremis",
	"Adeptus Mechanicus Extremis Challenge",
	"Tyranids Standard",
	"Tyranids Standard Challenge",
	"Tyranids Extremis",
	"Tyranids Extremis Challenge",
	"T'au Empire Standard",
	"T'au Empire Standard Challenge",
	"T'au Empire Extremis",
	"T'au Empire Extremis Challenge",
	"Death Guard Standard",
	"Death Guard Standard Challenge",
	"Death Guard Extremis",
	"Death Guard Extremis Challenge",
]);

const RARITY_TO_DROP_KEY: Record<string, string> = {
	Common: "common",
	Uncommon: "uncommon",
	Rare: "rare",
	Epic: "epic",
	Legendary: "legendary",
	Mythic: "mythic",
};

interface BattleNode {
	id: string;
	nodeNumber: number;
	campaignType: string;
	energyCost: number;
	rewards: {
		guaranteed: Array<{ id: string; min: number; max: number }> | null;
		potential: Array<{
			id: string;
			effective_rate: number;
		}> | null;
	};
}

interface DropRateConfig {
	type: string;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: Record<string, number>;
}

interface RawMaterial {
	rarity: string;
}

export const main = () => {
	// Read source data
	const campaignBattles: Record<string, BattleNode[]> = JSON.parse(
		fs.readFileSync(
			join(
				import.meta.dirname,
				"..",
				"campaign-battles",
				"data.generated.json",
			),
			"utf-8",
		),
	);

	const dropRates: Record<string, DropRateConfig> = JSON.parse(
		fs.readFileSync(
			join(import.meta.dirname, "..", "drop-rates", "data.generated.json"),
			"utf-8",
		),
	);

	const materials: Record<string, RawMaterial> = JSON.parse(
		fs.readFileSync(
			join(import.meta.dirname, "..", "materials", "data.generated.json"),
			"utf-8",
		),
	);

	// Build flat node map with campaign name
	const allNodes: Array<BattleNode & { campaign: string }> = [];
	for (const [campaignName, nodes] of Object.entries(campaignBattles)) {
		if (!VALID_CAMPAIGNS.has(campaignName)) continue;
		for (const node of nodes) {
			allNodes.push({ ...node, campaign: campaignName });
		}
	}

	// Build upgrade locations
	const upgradeLocations: Record<
		string,
		Array<{
			battleId: string;
			campaign: string;
			campaignType: string;
			nodeNumber: number;
			energyCost: number;
			dailyBattleCount: number;
			dropRate: number;
			energyPerItem: number;
		}>
	> = {};

	// Build shard locations
	const shardLocations: Record<
		string,
		Array<{
			battleId: string;
			campaign: string;
			campaignType: string;
			nodeNumber: number;
			energyCost: number;
			dailyBattleCount: number;
			dropRate: number;
			expectedShards: number;
			energyPerShard: number;
			isMythic: boolean;
		}>
	> = {};

	for (const node of allNodes) {
		const config = dropRates[node.campaignType];
		if (!config) {
			throw new Error(
				`No drop-rate config for campaignType "${node.campaignType}" (battle "${node.id}"). Add it to drop-rates data.`,
			);
		}

		const energyCost = node.energyCost ?? config.energyCost;
		const dailyBattleCount = config.dailyBattleCount;

		// --- Upgrade locations (potential rewards, excluding shards and gold) ---
		if (node.rewards.potential) {
			for (const reward of node.rewards.potential) {
				if (
					!reward.id ||
					reward.id.startsWith("shards_") ||
					reward.id.startsWith("mythicShards_") ||
					reward.id === "gold"
				) {
					continue;
				}

				// Determine drop rate
				let dropRate = reward.effective_rate ?? 0;
				if (dropRate <= 0) {
					const materialRarity = materials[reward.id]?.rarity;
					if (materialRarity) {
						const key = RARITY_TO_DROP_KEY[materialRarity];
						if (key) {
							dropRate = config.dropRate[key] ?? 0;
						}
					}
				}

				if (dropRate <= 0) continue;

				const location = {
					battleId: node.id,
					campaign: node.campaign,
					campaignType: node.campaignType,
					nodeNumber: node.nodeNumber,
					energyCost,
					dailyBattleCount,
					dropRate,
					energyPerItem: energyCost / dropRate,
				};

				if (!upgradeLocations[reward.id]) {
					upgradeLocations[reward.id] = [];
				}
				upgradeLocations[reward.id].push(location);
			}
		}

		// --- Shard locations (guaranteed + potential shard rewards) ---
		const shardRewards: Array<{
			id: string;
			rate: number;
			expectedCount: number;
		}> = [];

		if (node.rewards.guaranteed) {
			for (const r of node.rewards.guaranteed) {
				shardRewards.push({
					id: r.id,
					rate: 1,
					expectedCount: (r.min + r.max) / 2,
				});
			}
		}

		if (node.rewards.potential) {
			for (const r of node.rewards.potential) {
				if (r.id.startsWith("shards_") || r.id.startsWith("mythicShards_")) {
					shardRewards.push({
						id: r.id,
						rate: r.effective_rate || config.dropRate.shard,
						expectedCount: r.effective_rate || config.dropRate.shard,
					});
				}
			}
		}

		for (const reward of shardRewards) {
			const isMythic = reward.id.startsWith("mythicShards_");
			const isRegularShard = reward.id.startsWith("shards_");

			if (!isMythic && !isRegularShard) continue;

			const unitId = reward.id.replace(SHARD_PREFIX_RE, "");
			const dropRate = reward.rate;
			const expectedShards = reward.expectedCount;

			if (dropRate <= 0) continue;

			const location = {
				battleId: node.id,
				campaign: node.campaign,
				campaignType: node.campaignType,
				nodeNumber: node.nodeNumber,
				energyCost,
				dailyBattleCount,
				dropRate,
				expectedShards,
				energyPerShard: expectedShards > 0 ? energyCost / expectedShards : 9999,
				isMythic,
			};

			if (!shardLocations[unitId]) {
				shardLocations[unitId] = [];
			}
			shardLocations[unitId].push(location);
		}
	}

	// Sort upgrade locations by energyPerItem (cheapest first)
	for (const locations of Object.values(upgradeLocations)) {
		locations.sort((a, b) => a.energyPerItem - b.energyPerItem);
	}

	// Sort shard locations by energyPerShard (cheapest first)
	for (const locations of Object.values(shardLocations)) {
		locations.sort((a, b) => a.energyPerShard - b.energyPerShard);
	}

	// Write outputs
	fs.writeFileSync(
		join(import.meta.dirname, "upgrade-locations.generated.json"),
		`${JSON.stringify(upgradeLocations, null, 2)}\n`,
	);

	fs.writeFileSync(
		join(import.meta.dirname, "shard-locations.generated.json"),
		`${JSON.stringify(shardLocations, null, 2)}\n`,
	);
};
