import type { Campaign } from "../enums";
import { PersonalGoalType } from "../enums";
import { getCombinedAbilitiesMaterials } from "./abilities-service";
import { getCombinedMowMaterials } from "./mow-service";
import { estimateShardFarmingDays, getShardsNeeded } from "./shards-service";
import type {
	CharacterRaidGoalSelect,
	ICharacterAscendGoal,
	ICharacterUnlockGoal,
	ICharacterUpgradeAbilities,
	ICharacterUpgradeMow,
	ICharacterUpgradeRankGoal,
	IGoalEstimate,
} from "./types";
import { estimateUpgradeDays } from "./upgrades-service";
import { getXpEstimateForAbilities, getXpEstimateForRank } from "./xp-service";

export interface PlayerContext {
	campaignProgress?: Map<Campaign, number>;
	inventory?: Record<string, number>;
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
export async function calculateGoalEstimate(
	goal: CharacterRaidGoalSelect,
	dailyEnergy: number,
	shardsEnergy: number,
	playerContext?: PlayerContext,
): Promise<IGoalEstimate> {
	const base: IGoalEstimate = {
		goalId: goal.goalId,
		daysTotal: 0,
		daysLeft: 0,
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

async function estimateRankGoal(
	goal: ICharacterUpgradeRankGoal,
	dailyEnergy: number,
	base: IGoalEstimate,
	ctx: PlayerContext,
): Promise<IGoalEstimate> {
	// Upgrade material farming estimate using real recipe data
	const upgradeEst = await estimateUpgradeDays(
		goal.unitId,
		goal.rankStart,
		goal.rankEnd,
		dailyEnergy,
		goal.appliedUpgrades,
		goal.upgradesRarity,
		ctx.inventory ?? {},
		ctx.campaignProgress ?? new Map(),
	);

	// XP estimate for the rank level requirement
	const xpEst = getXpEstimateForRank(goal.level, goal.xp, goal.rankEnd);
	const xpBooksTotal = xpEst?.legendaryBooks ?? 0;
	const xpDaysLeft = xpBooksTotal > 0 ? xpBooksTotal / XP_BOOKS_PER_DAY : 0;

	const daysTotal = Math.max(upgradeEst.daysTotal, xpDaysLeft);

	return {
		...base,
		daysTotal,
		daysLeft: daysTotal,
		xpDaysLeft: xpDaysLeft > 0 ? xpDaysLeft : undefined,
		energyTotal: upgradeEst.energyTotal,
		xpBooksTotal,
		xpBooksRequired: xpBooksTotal > 0 ? xpBooksTotal : undefined,
	};
}

async function estimateAscendGoal(
	goal: ICharacterAscendGoal,
	shardsEnergy: number,
	base: IGoalEstimate,
	ctx: PlayerContext,
): Promise<IGoalEstimate> {
	const { shards, mythicShards } = getShardsNeeded(
		goal.rarityStart,
		goal.starsStart,
		goal.rarityEnd,
		goal.starsEnd,
		goal.shards,
	);

	const shardEst = await estimateShardFarmingDays(
		shards,
		shardsEnergy,
		goal.campaignsUsage,
		goal.unitId,
		ctx.campaignProgress ?? new Map(),
	);

	// Mythic shards come from onslaught, not campaign farming
	const mythicDays =
		mythicShards > 0
			? Math.ceil(mythicShards / 1.5) // ~1.5 mythic shards per day from onslaught
			: 0;

	const daysTotal = Math.max(shardEst.daysTotal, mythicDays);

	return {
		...base,
		daysTotal,
		daysLeft: daysTotal,
		energyTotal: shardEst.energyTotal,
		oTokensTotal: shardEst.onslaughtTokensTotal,
	};
}

async function estimateUnlockGoal(
	goal: ICharacterUnlockGoal,
	shardsEnergy: number,
	base: IGoalEstimate,
	ctx: PlayerContext,
): Promise<IGoalEstimate> {
	const shardsNeeded = Math.max(0, goal.shards);

	const shardEst = await estimateShardFarmingDays(
		shardsNeeded,
		shardsEnergy,
		goal.campaignsUsage,
		goal.unitId,
		ctx.campaignProgress ?? new Map(),
	);

	return {
		...base,
		daysTotal: shardEst.daysTotal,
		daysLeft: shardEst.daysTotal,
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
		xpDaysLeft: xpDaysLeft > 0 ? xpDaysLeft : undefined,
		xpBooksTotal: maxXpBooks,
		xpBooksRequired: maxXpBooks > 0 ? maxXpBooks : undefined,
	};
}

/**
 * Calculate estimates for all goals.
 * Goals are processed in priority order.
 */
export async function calculateAllGoalEstimates(
	goals: CharacterRaidGoalSelect[],
	dailyEnergy: number,
	shardsEnergy: number,
	playerContext?: PlayerContext,
): Promise<IGoalEstimate[]> {
	const sorted = [...goals].sort((a, b) => a.priority - b.priority);
	return Promise.all(
		sorted.map((goal) =>
			calculateGoalEstimate(goal, dailyEnergy, shardsEnergy, playerContext),
		),
	);
}
