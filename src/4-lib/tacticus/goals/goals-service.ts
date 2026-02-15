import { PersonalGoalType } from "../enums";
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

/** Approximate days per legendary XP book (daily acquisition rate) */
const XP_BOOKS_PER_DAY = 0.5;

/**
 * Calculate estimates for a single goal.
 * Returns an IGoalEstimate with days, energy, and resource totals.
 */
export function calculateGoalEstimate(
	goal: CharacterRaidGoalSelect,
	dailyEnergy: number,
	shardsEnergy: number,
): IGoalEstimate {
	const base: IGoalEstimate = {
		goalId: goal.goalId,
		daysTotal: 0,
		daysLeft: 0,
		energyTotal: 0,
		oTokensTotal: 0,
		xpBooksTotal: 0,
	};

	switch (goal.type) {
		case PersonalGoalType.UpgradeRank:
			return estimateRankGoal(goal, dailyEnergy, base);
		case PersonalGoalType.Ascend:
			return estimateAscendGoal(goal, shardsEnergy, base);
		case PersonalGoalType.Unlock:
			return estimateUnlockGoal(goal, shardsEnergy, base);
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
): IGoalEstimate {
	// Upgrade material farming estimate
	const upgradeEst = estimateUpgradeDays(
		goal.rankStart,
		goal.rankEnd,
		dailyEnergy,
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

function estimateAscendGoal(
	goal: ICharacterAscendGoal,
	shardsEnergy: number,
	base: IGoalEstimate,
): IGoalEstimate {
	const { shards, mythicShards } = getShardsNeeded(
		goal.rarityStart,
		goal.starsStart,
		goal.rarityEnd,
		goal.starsEnd,
		goal.shards,
	);

	const shardEst = estimateShardFarmingDays(
		shards,
		shardsEnergy,
		goal.campaignsUsage,
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

function estimateUnlockGoal(
	goal: ICharacterUnlockGoal,
	shardsEnergy: number,
	base: IGoalEstimate,
): IGoalEstimate {
	const shardsNeeded = Math.max(0, goal.shards);

	const shardEst = estimateShardFarmingDays(
		shardsNeeded,
		shardsEnergy,
		goal.campaignsUsage,
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
	// MoW goals are primarily about badges and components, not energy farming
	// Estimate based on badge acquisition rate (roughly 1 day per 2 badges needed)
	const totalLevels =
		Math.max(0, goal.primaryEnd - goal.primaryStart) +
		Math.max(0, goal.secondaryEnd - goal.secondaryStart);

	const daysTotal = Math.max(1, totalLevels * 2);

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

	const totalLevels =
		Math.max(0, goal.activeEnd - goal.activeStart) +
		Math.max(0, goal.passiveEnd - goal.passiveStart);

	const xpDaysLeft = maxXpBooks > 0 ? maxXpBooks / XP_BOOKS_PER_DAY : 0;
	// Badge acquisition: roughly 1 day per 2 levels
	const badgeDays = totalLevels * 2;
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
export function calculateAllGoalEstimates(
	goals: CharacterRaidGoalSelect[],
	dailyEnergy: number,
	shardsEnergy: number,
): IGoalEstimate[] {
	const sorted = [...goals].sort((a, b) => a.priority - b.priority);
	return sorted.map((goal) =>
		calculateGoalEstimate(goal, dailyEnergy, shardsEnergy),
	);
}
