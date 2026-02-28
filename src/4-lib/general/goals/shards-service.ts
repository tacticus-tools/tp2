import type { CampaignsLocationsUsage } from "#common/campaigns-locations-usage.ts";
import { RARITIES, type Rarity } from "#common/rarity.ts";
import { getShardLocations } from "../campaign-data.ts";
import {
	type CampaignEventType,
	filterLocationsByCampaignEvent,
} from "../campaign-events.ts";
import { filterLocationsByCampaignProgress } from "../campaign-progress.ts";
import type { Campaign, RarityStars } from "../constants.ts";
import { charsProgression, charsUnlockShards } from "../rarity-data.ts";

export interface IShardsEstimate {
	shardsNeeded: number;
	mythicShardsNeeded: number;
	daysTotal: number;
	energyTotal: number;
	onslaughtTokensTotal: number;
	hasLocations: boolean;
	campaignShardsPerDay: number;
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
	currentMythicShards = 0,
): { shards: number; mythicShards: number } {
	let totalShards = 0;
	let totalMythicShards = 0;
	const startKey = RARITIES.indexOf(startRarity) + startStars;
	const endKey = RARITIES.indexOf(endRarity) + endStars;

	for (const [keyStr, cost] of Object.entries(charsProgression)) {
		const key = Number(keyStr);
		if (key <= startKey || key > endKey) continue;
		totalShards += cost.shards ?? 0;
		totalMythicShards += cost.mythicShards ?? 0;
	}

	// Subtract currently held shards from totals
	totalShards = Math.max(0, totalShards - currentShards);
	totalMythicShards = Math.max(0, totalMythicShards - currentMythicShards);

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
export function estimateShardFarmingDays(
	shardsNeeded: number,
	dailyEnergy: number,
	_campaignsUsage: CampaignsLocationsUsage,
	unitId?: string,
	campaignProgress: Map<Campaign, number> = new Map(),
	campaignEvent: CampaignEventType = "none",
): IShardsEstimate {
	if (shardsNeeded <= 0) {
		return {
			shardsNeeded: 0,
			mythicShardsNeeded: 0,
			daysTotal: 0,
			energyTotal: 0,
			onslaughtTokensTotal: 0,
			hasLocations: false,
			campaignShardsPerDay: 0,
		};
	}

	// Try to use real shard location data if unitId is provided
	if (unitId) {
		const allLocations = getShardLocations(unitId);
		const progressFiltered = filterLocationsByCampaignProgress(
			allLocations,
			campaignProgress,
		);
		const filtered = filterLocationsByCampaignEvent(
			progressFiltered,
			campaignEvent,
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
					hasLocations: true,
					campaignShardsPerDay: 0,
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
				hasLocations: true,
				campaignShardsPerDay: shardsPerDay,
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
			hasLocations: false,
			campaignShardsPerDay: 0,
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
		hasLocations: false,
		campaignShardsPerDay: shardsPerDay,
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
