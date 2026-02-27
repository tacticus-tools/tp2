import type { Rank, Rarity, RarityStars } from "./constants.ts";

/**
 * Calculate estimated power for a roster unit.
 * Ported from tacticusplanner's CharactersPowerService.
 * Power scales to ~40,000 max for a fully upgraded character.
 */

const ABILITY_WEIGHT = 500000 / 41274;
const ATTRIBUTES_WEIGHT = 3000000 / 9326;

function getAbilityCoeff(level: number): number {
	if (level <= 22) return level;
	if (level <= 39) return 3.8 * (level - 22) + 22;
	if (level <= 40) return 5.3 * (level - 39) + 86.6;
	if (level <= 44) return 8.4 * (level - 40) + 91.9;
	if (level <= 50) return 17.3 * (level - 44) + 125.5;
	return 35.0 * (level - 50) + 229.3;
}

/** 1.25^(rank-1) for rank 1–21 (Stone1–Adamantine3), 0 for Locked */
function getRankCoeff(rank: Rank): number {
	if (rank <= 0) return 0;
	return 1.25 ** (rank - 1);
}

const CHAR_RARITY_COEFF: Record<number, number> = {
	0: 1.0, // Common
	1: 1.2, // Uncommon
	2: 1.4, // Rare
	3: 1.6, // Epic
	4: 1.8, // Legendary
	5: 2.0, // Mythic
};

const CHAR_STARS_COEFF: Record<number, number> = {
	0: 1.0, // None
	1: 1.1,
	2: 1.2,
	3: 1.3,
	4: 1.4,
	5: 1.5,
	6: 1.6, // Red1
	7: 1.7,
	8: 1.8,
	9: 1.9,
	10: 2.0, // Red5
	11: 2.1, // Blue1
	12: 2.2,
	13: 2.3,
	14: 2.4, // MythicWings
};

const MOW_RARITY_COEFF: Record<number, number> = {
	0: 0.0,
	1: 0.05,
	2: 0.1,
	3: 0.15,
	4: 0.2,
	5: 0.25,
};

const MOW_STARS_COEFF: Record<number, number> = {
	0: 0.0,
	1: 0.05,
	2: 0.1,
	3: 0.15,
	4: 0.2,
	5: 0.25,
	6: 0.3,
	7: 0.35,
	8: 0.4,
	9: 0.45,
	10: 0.5,
	11: 0.6,
	12: 0.7,
	13: 0.8,
	14: 0.9,
};

export function calculateCharacterPower(
	rank: Rank,
	rarity: Rarity,
	stars: RarityStars,
	activeAbilityLevel: number,
	passiveAbilityLevel: number,
	upgradeCount: number,
): number {
	if (rank <= 0) return 0;

	const rarityCoeff = CHAR_RARITY_COEFF[rarity] ?? 1.0;
	const starsCoeff = CHAR_STARS_COEFF[stars] ?? 1.0;

	const abilityPower =
		ABILITY_WEIGHT *
		rarityCoeff *
		(getAbilityCoeff(activeAbilityLevel) +
			getAbilityCoeff(passiveAbilityLevel));

	const upgradeBoost =
		(1 / 9) * (getRankCoeff((rank + 1) as Rank) - getRankCoeff(rank));
	const attributePower =
		ATTRIBUTES_WEIGHT *
		starsCoeff *
		(getRankCoeff(rank) + upgradeBoost * upgradeCount);

	return Math.round(abilityPower + attributePower);
}

export function calculateMowPower(
	rarity: Rarity,
	stars: RarityStars,
	primaryAbilityLevel: number,
	secondaryAbilityLevel: number,
): number {
	const rarityCoeff = MOW_RARITY_COEFF[rarity] ?? 0;
	const starsCoeff = MOW_STARS_COEFF[stars] ?? 0;

	const abilityPower =
		4 *
		ABILITY_WEIGHT *
		(1 + rarityCoeff + starsCoeff) *
		(getAbilityCoeff(primaryAbilityLevel) +
			getAbilityCoeff(secondaryAbilityLevel));

	return Math.round(abilityPower);
}
