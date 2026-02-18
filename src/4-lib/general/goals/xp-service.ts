import { rankToLevel } from "../rank-data";
import { xpLevelThresholds } from "../xp-data";

export interface IXpEstimate {
	legendaryBooks: number;
	currentLevel: number;
	targetLevel: number;
	xpLeft: number;
}

const LEGENDARY_BOOK_XP = 12_500;

/**
 * Calculate total XP needed to go from one level to another.
 * Accounts for current XP already accumulated at the current level.
 */
export function getXpNeeded(
	currentLevel: number,
	currentXp: number,
	targetLevel: number,
): number {
	if (targetLevel <= currentLevel) return 0;

	const currentThreshold = xpLevelThresholds[currentLevel];
	const targetThreshold = xpLevelThresholds[targetLevel];

	if (!currentThreshold || !targetThreshold) return 0;

	const totalXpNeeded = targetThreshold.totalXp - currentThreshold.totalXp;
	return Math.max(0, totalXpNeeded - currentXp);
}

/**
 * Get XP estimate for a rank upgrade goal.
 */
export function getXpEstimateForRank(
	currentLevel: number,
	currentXp: number,
	targetRank: number,
): IXpEstimate | undefined {
	const targetLevel = rankToLevel[targetRank];
	if (targetLevel === undefined || targetLevel <= currentLevel)
		return undefined;

	const xpLeft = getXpNeeded(currentLevel, currentXp, targetLevel);
	if (xpLeft <= 0) return undefined;

	return {
		legendaryBooks: Math.ceil(xpLeft / LEGENDARY_BOOK_XP),
		currentLevel,
		targetLevel,
		xpLeft,
	};
}

/**
 * Get XP estimate for an ability upgrade goal.
 */
export function getXpEstimateForAbilities(
	currentLevel: number,
	currentXp: number,
	targetAbilityLevel: number,
): IXpEstimate | undefined {
	if (targetAbilityLevel <= currentLevel) return undefined;

	const xpLeft = getXpNeeded(currentLevel, currentXp, targetAbilityLevel);
	if (xpLeft <= 0) return undefined;

	return {
		legendaryBooks: Math.ceil(xpLeft / LEGENDARY_BOOK_XP),
		currentLevel,
		targetLevel: targetAbilityLevel,
		xpLeft,
	};
}
