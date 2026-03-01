import { PersonalGoalType } from "#common/goal-type.ts";
import type { CampaignEventType } from "../campaign-events.ts";
import { getCombinedAbilitiesMaterials } from "./abilities-service.ts";
import { getCombinedMowMaterials } from "./mow-service.ts";
import { estimateShardFarmingDays, getShardsNeeded } from "./shards-service.ts";
import type {
	CharacterRaidGoalSelect,
	ICharacterAscendGoal,
	ICharacterUnlockGoal,
	ICharacterUpgradeAbilities,
	ICharacterUpgradeMow,
	ICharacterUpgradeRankGoal,
	IGoalEstimate,
} from "./types.ts";
import { estimateUpgradeDays } from "./upgrades-service.ts";
import {
	getXpEstimateForAbilities,
	getXpEstimateForRank,
} from "./xp-service.ts";

export interface PlayerContext {
	campaignProgress?: Record<string, number>;
	inventory?: Record<string, number>;
	campaignEvent?: CampaignEventType;
	/** When true, estimateUpgradeDays will mutate inventory in place (for sequential goal processing). */
	mutateInventory?: boolean;
}

/** Approximate days per legendary XP book (daily acquisition rate) */
const XP_BOOKS_PER_DAY = 0.5;

/**
 * Approximate badge acquisition rate per day.
 * Badges come from daily tasks, guild rewards, and other passive sources.
 */
const BADGES_PER_DAY = 5;

/**
 * Calculate estimates for a single goal.
 * Returns an IGoalEstimate with days, energy, and resource totals.
 */
export function calculateGoalEstimate(
	goal: CharacterRaidGoalSelect,
	dailyEnergy: number,
	shardsEnergy: number,
	playerContext?: PlayerContext,
): IGoalEstimate {
	const base: IGoalEstimate = {
		goalId: goal.goalId,
		daysTotal: 0,
		daysLeft: 0,
		finishByDay: 0,
		energyTotal: 0,
		oTokensTotal: 0,
		xpBooksTotal: 0,
	};

	const ctx = playerContext ?? {};

	switch (goal.type) {
		case PersonalGoalType.UpgradeRank:
			return estimateRankGoal(goal, dailyEnergy, base, ctx);
		case PersonalGoalType.Ascend:
			return estimateAscendGoal(goal, shardsEnergy, base, ctx);
		case PersonalGoalType.Unlock:
			return estimateUnlockGoal(goal, shardsEnergy, base, ctx);
		case PersonalGoalType.MowAbilities:
			return estimateMowGoal(goal, base);
		case PersonalGoalType.CharacterAbilities:
			return estimateAbilitiesGoal(goal, base);
		default:
			return base;
	}
}

function estimateRankGoal(
	goal: ICharacterUpgradeRankGoal,
	dailyEnergy: number,
	base: IGoalEstimate,
	ctx: PlayerContext,
): IGoalEstimate {
	// Upgrade material farming estimate using real recipe data
	const upgradeEst = estimateUpgradeDays(
		goal.unitId,
		goal.rankStart,
		goal.rankEnd,
		dailyEnergy,
		goal.appliedUpgrades,
		goal.upgradesRarity,
		ctx.inventory ?? {},
		ctx.campaignProgress ?? {},
		ctx.campaignEvent ?? "none",
		ctx.mutateInventory,
	);

	// XP estimate for the rank level requirement
	const xpEst = getXpEstimateForRank(goal.level, goal.xp, goal.rankEnd);
	const xpBooksTotal = xpEst?.legendaryBooks ?? 0;
	const xpMythicBooksTotal = xpEst?.mythicBooks ?? 0;
	const xpDaysLeft = xpBooksTotal > 0 ? xpBooksTotal / XP_BOOKS_PER_DAY : 0;

	// XP books are informational — not a farming bottleneck for daysTotal
	const daysTotal = upgradeEst.daysTotal;

	return {
		...base,
		daysTotal,
		daysLeft: daysTotal,
		finishByDay: daysTotal,
		xpDaysLeft: xpDaysLeft > 0 ? xpDaysLeft : undefined,
		energyTotal: upgradeEst.energyTotal,
		xpBooksTotal,
		xpMythicBooksTotal: xpMythicBooksTotal > 0 ? xpMythicBooksTotal : undefined,
		xpBooksRequired: xpBooksTotal > 0 ? xpBooksTotal : undefined,
	};
}

/** Onslaught tokens refresh every 16 hours -> 1.5 per day */
const ONSLAUGHT_TOKENS_PER_DAY = 1.5;

function estimateAscendGoal(
	goal: ICharacterAscendGoal,
	shardsEnergy: number,
	base: IGoalEstimate,
	ctx: PlayerContext,
): IGoalEstimate {
	const { shards, mythicShards } = getShardsNeeded(
		goal.rarityStart,
		goal.starsStart,
		goal.rarityEnd,
		goal.starsEnd,
		goal.shards,
		goal.mythicShards,
	);

	// Campaign shard farming estimate (provides campaignShardsPerDay + hasLocations)
	const shardEst = estimateShardFarmingDays(
		shards,
		shardsEnergy,
		goal.campaignsUsage,
		goal.unitId,
		ctx.campaignProgress ?? {},
		ctx.campaignEvent ?? "none",
	);

	// Onslaught rates from goal config
	const onslaughtShardsPerToken = goal.onslaughtShards || 0; // 0 = toggle off
	const mythicShardsPerToken = goal.onslaughtMythicShards || 1;
	const regularOnslaughtActive = onslaughtShardsPerToken > 0;
	const campaignRate = shardEst.campaignShardsPerDay;

	// Mythic shards always come from onslaught (regardless of toggle)
	const mythicTokens =
		mythicShards > 0 ? Math.ceil(mythicShards / mythicShardsPerToken) : 0;
	const mythicDays =
		mythicTokens > 0 ? mythicTokens / ONSLAUGHT_TOKENS_PER_DAY : 0;

	let combinedDays: number;
	let oTokensTotal: number;

	if (regularOnslaughtActive) {
		// Combined formula — campaign and onslaught farm regular shards in parallel.
		const totalOnslaughtRate =
			ONSLAUGHT_TOKENS_PER_DAY * onslaughtShardsPerToken;
		const combinedRate = campaignRate + totalOnslaughtRate;

		if (combinedRate > 0 && shards > 0) {
			const formulaDays =
				(shards + mythicTokens * onslaughtShardsPerToken) / combinedRate;
			combinedDays = Math.max(Math.ceil(formulaDays), Math.ceil(mythicDays));
		} else if (shards <= 0) {
			combinedDays = Math.ceil(mythicDays);
		} else {
			combinedDays = Number.POSITIVE_INFINITY;
		}

		oTokensTotal = Math.ceil(combinedDays * ONSLAUGHT_TOKENS_PER_DAY);
	} else {
		const campaignDays =
			shards > 0 && campaignRate > 0
				? Math.ceil(shards / campaignRate)
				: shardEst.daysTotal;
		combinedDays = Math.max(campaignDays, Math.ceil(mythicDays));
		oTokensTotal = mythicTokens;
	}

	return {
		...base,
		daysTotal: combinedDays,
		daysLeft: combinedDays,
		finishByDay: combinedDays,
		energyTotal: shardEst.energyTotal,
		oTokensTotal,
		hasLocations: shardEst.hasLocations,
		onslaughtActive: regularOnslaughtActive,
	};
}

function estimateUnlockGoal(
	goal: ICharacterUnlockGoal,
	shardsEnergy: number,
	base: IGoalEstimate,
	ctx: PlayerContext,
): IGoalEstimate {
	const shardsNeeded = Math.max(0, goal.shards);

	const shardEst = estimateShardFarmingDays(
		shardsNeeded,
		shardsEnergy,
		goal.campaignsUsage,
		goal.unitId,
		ctx.campaignProgress ?? {},
		ctx.campaignEvent ?? "none",
	);

	return {
		...base,
		daysTotal: shardEst.daysTotal,
		daysLeft: shardEst.daysTotal,
		finishByDay: shardEst.daysTotal,
		energyTotal: shardEst.energyTotal,
		oTokensTotal: shardEst.onslaughtTokensTotal,
	};
}

function estimateMowGoal(
	goal: ICharacterUpgradeMow,
	base: IGoalEstimate,
): IGoalEstimate {
	// Use real badge cost tables to estimate days
	const materials = getCombinedMowMaterials(
		goal.primaryStart,
		goal.primaryEnd,
		goal.secondaryStart,
		goal.secondaryEnd,
	);

	// Sum total badges across all rarities
	let totalBadges = 0;
	for (const count of Object.values(materials.badges)) {
		totalBadges += count;
	}
	for (const count of Object.values(materials.forgeBadges)) {
		totalBadges += count;
	}

	const daysTotal =
		totalBadges > 0 ? Math.ceil(totalBadges / BADGES_PER_DAY) : 0;

	return {
		...base,
		daysTotal,
		daysLeft: daysTotal,
		finishByDay: daysTotal,
		mowEstimate: materials,
	};
}

function estimateAbilitiesGoal(
	goal: ICharacterUpgradeAbilities,
	base: IGoalEstimate,
): IGoalEstimate {
	// XP needed to reach ability levels
	const activeXp = getXpEstimateForAbilities(
		goal.level,
		goal.xp,
		goal.activeEnd,
	);
	const passiveXp = getXpEstimateForAbilities(
		goal.level,
		goal.xp,
		goal.passiveEnd,
	);

	const maxXpBooks = Math.max(
		activeXp?.legendaryBooks ?? 0,
		passiveXp?.legendaryBooks ?? 0,
	);
	const maxMythicBooks = Math.max(
		activeXp?.mythicBooks ?? 0,
		passiveXp?.mythicBooks ?? 0,
	);

	// Use real badge cost tables for abilities
	const materials = getCombinedAbilitiesMaterials(
		goal.activeStart,
		goal.activeEnd,
		goal.passiveStart,
		goal.passiveEnd,
		goal.unitAlliance,
	);

	// Sum total badges across all rarities
	let totalBadges = 0;
	for (const count of Object.values(materials.badges)) {
		totalBadges += count;
	}

	const xpDaysLeft = maxXpBooks > 0 ? maxXpBooks / XP_BOOKS_PER_DAY : 0;
	const badgeDays =
		totalBadges > 0 ? Math.ceil(totalBadges / BADGES_PER_DAY) : 0;
	const daysTotal = Math.max(xpDaysLeft, badgeDays);

	return {
		...base,
		daysTotal,
		daysLeft: daysTotal,
		finishByDay: daysTotal,
		xpDaysLeft: xpDaysLeft > 0 ? xpDaysLeft : undefined,
		xpBooksTotal: maxXpBooks,
		xpMythicBooksTotal: maxMythicBooks > 0 ? maxMythicBooks : undefined,
		xpBooksRequired: maxXpBooks > 0 ? maxXpBooks : undefined,
		abilitiesEstimate: materials,
	};
}

/**
 * Calculate estimates for all goals.
 * Goals are processed sequentially in priority order with a shared mutable
 * inventory so lower-priority goals see reduced materials.
 */
export function calculateAllGoalEstimates(
	goals: CharacterRaidGoalSelect[],
	dailyEnergy: number,
	shardsEnergy: number,
	playerContext?: PlayerContext,
): IGoalEstimate[] {
	const sorted = [...goals].sort((a, b) => a.priority - b.priority);
	const inventoryCopy = { ...(playerContext?.inventory ?? {}) };
	const results: IGoalEstimate[] = [];

	// Each goal gets the full dailyEnergy for its standalone estimate.
	// The daily raids simulation handles actual energy allocation day-by-day.
	// finishByDay tracks the running max — the project isn't done until
	// the slowest goal finishes.
	let cumulativeFinishDay = 0;

	for (const goal of sorted) {
		const ctx: PlayerContext = {
			...playerContext,
			inventory: inventoryCopy,
			mutateInventory: true,
		};
		const est = calculateGoalEstimate(goal, dailyEnergy, shardsEnergy, ctx);

		cumulativeFinishDay = Math.max(cumulativeFinishDay, est.daysTotal);
		est.finishByDay = cumulativeFinishDay;

		results.push(est);
	}
	return results;
}
