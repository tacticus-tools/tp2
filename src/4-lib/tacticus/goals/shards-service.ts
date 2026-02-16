import { getShardLocations } from "../campaign-data";
import { filterLocationsByCampaignProgress } from "../campaign-progress";
import type {
	Campaign,
	CampaignsLocationsUsage,
	Rarity,
	RarityStars,
} from "../enums";
import { charsProgression, charsUnlockShards } from "../rarity-data";

export interface IShardsEstimate {
	shardsNeeded: number;
	mythicShardsNeeded: number;
	daysTotal: number;
	energyTotal: number;
	onslaughtTokensTotal: number;
}

/** Onslaught tokens refresh every 16 hours → 1.5 per day */
const ONSLAUGHT_TOKENS_PER_DAY = 1.5;

/**
 * Calculate the total shards needed to ascend from one rarity/star level to another.
 */
export function getShardsNeeded(
	startRarity: Rarity,
	startStars: RarityStars,
	endRarity: Rarity,
	endStars: RarityStars,
	currentShards: number,
): { shards: number; mythicShards: number } {
	let totalShards = 0;
	let totalMythicShards = 0;
	const startKey = startRarity + startStars;
	const endKey = endRarity + endStars;

	for (const [keyStr, cost] of Object.entries(charsProgression)) {
		const key = Number(keyStr);
		if (key <= startKey || key > endKey) continue;
		totalShards += cost.shards ?? 0;
		totalMythicShards += cost.mythicShards ?? 0;
	}

	// Subtract currently held shards from total
	totalShards = Math.max(0, totalShards - currentShards);

	return { shards: totalShards, mythicShards: totalMythicShards };
}

/**
 * Calculate the shards needed to unlock a character of a given rarity.
 */
export function getUnlockShardsNeeded(
	rarity: Rarity,
	currentShards: number,
): number {
	const required = charsUnlockShards[rarity] ?? 0;
	return Math.max(0, required - currentShards);
}

/**
 * Estimate days to farm shards through campaign raids.
 * Uses real campaign node data to determine energy cost and shard rates.
 */
export async function estimateShardFarmingDays(
	shardsNeeded: number,
	dailyEnergy: number,
	_campaignsUsage: CampaignsLocationsUsage,
	unitId?: string,
	campaignProgress: Map<Campaign, number> = new Map(),
): Promise<IShardsEstimate> {
	if (shardsNeeded <= 0) {
		return {
			shardsNeeded: 0,
			mythicShardsNeeded: 0,
			daysTotal: 0,
			energyTotal: 0,
			onslaughtTokensTotal: 0,
		};
	}

	// Try to use real shard location data if unitId is provided
	if (unitId) {
		const allLocations = await getShardLocations(unitId);
		const filtered = filterLocationsByCampaignProgress(
			allLocations,
			campaignProgress,
		);
		const regularLocations = filtered.filter((loc) => !loc.isMythic);

		if (regularLocations.length > 0) {
			// Use the best (cheapest energy-per-shard) location
			const best = regularLocations[0];
			const raidsNeeded = Math.ceil(shardsNeeded / best.expectedShards);
			const energyTotal = raidsNeeded * best.energyCost;

			// Daily limit: min of node daily battle count and energy-limited raids
			const energyLimitedRaids = Math.floor(dailyEnergy / best.energyCost);
			const raidsPerDay = Math.min(best.dailyBattleCount, energyLimitedRaids);

			if (raidsPerDay <= 0) {
				return {
					shardsNeeded,
					mythicShardsNeeded: 0,
					daysTotal: Number.POSITIVE_INFINITY,
					energyTotal,
					onslaughtTokensTotal: 0,
				};
			}

			const shardsPerDay = raidsPerDay * best.expectedShards;
			const daysTotal = Math.ceil(shardsNeeded / shardsPerDay);

			return {
				shardsNeeded,
				mythicShardsNeeded: 0,
				daysTotal,
				energyTotal,
				onslaughtTokensTotal: 0,
			};
		}
	}

	// Fallback: use average rates if no location data found
	const SHARDS_PER_RAID = 0.333;
	const ENERGY_PER_RAID = 6;
	const MAX_DAILY_RAIDS = 10;

	const raidsPerDay = Math.min(
		MAX_DAILY_RAIDS,
		Math.floor(dailyEnergy / ENERGY_PER_RAID),
	);
	if (raidsPerDay <= 0) {
		return {
			shardsNeeded,
			mythicShardsNeeded: 0,
			daysTotal: Number.POSITIVE_INFINITY,
			energyTotal: 0,
			onslaughtTokensTotal: 0,
		};
	}

	const shardsPerDay = raidsPerDay * SHARDS_PER_RAID;
	const daysTotal = Math.ceil(shardsNeeded / shardsPerDay);
	const totalRaids = Math.ceil(shardsNeeded / SHARDS_PER_RAID);
	const energyTotal = totalRaids * ENERGY_PER_RAID;

	return {
		shardsNeeded,
		mythicShardsNeeded: 0,
		daysTotal,
		energyTotal,
		onslaughtTokensTotal: 0,
	};
}

/**
 * Estimate days to farm onslaught shards.
 */
export function estimateOnslaughtFarmingDays(
	shardsNeeded: number,
	shardsPerToken: number,
): { daysTotal: number; tokensTotal: number } {
	if (shardsNeeded <= 0 || shardsPerToken <= 0) {
		return { daysTotal: 0, tokensTotal: 0 };
	}

	const tokensNeeded = Math.ceil(shardsNeeded / shardsPerToken);
	const daysTotal = Math.ceil(tokensNeeded / ONSLAUGHT_TOKENS_PER_DAY);

	return { daysTotal, tokensTotal: tokensNeeded };
}
