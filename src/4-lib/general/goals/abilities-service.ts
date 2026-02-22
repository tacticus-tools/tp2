import type { Alliance, Rarity } from "../constants.ts";
import { getRarityFromLevel } from "../rarity-data.ts";

export interface IAbilitiesMaterialsTotal {
	gold: number;
	alliance: Alliance;
	badges: Record<Rarity, number>;
}

/**
 * Badge cost to upgrade TO each ability level.
 * Source: tacticusplanner characters-lvl-up-abilities.json
 */
const BADGES_PER_LEVEL: Record<number, number> = {
	1: 1,
	2: 1,
	3: 1,
	4: 2,
	5: 2,
	6: 2,
	7: 3,
	8: 1,
	9: 1,
	10: 1,
	11: 2,
	12: 2,
	13: 2,
	14: 3,
	15: 4,
	16: 5,
	17: 1,
	18: 1,
	19: 1,
	20: 2,
	21: 2,
	22: 2,
	23: 3,
	24: 4,
	25: 5,
	26: 1,
	27: 1,
	28: 1,
	29: 2,
	30: 2,
	31: 2,
	32: 3,
	33: 4,
	34: 5,
	35: 1,
	36: 1,
	37: 1,
	38: 2,
	39: 2,
	40: 2,
	41: 3,
	42: 3,
	43: 4,
	44: 5,
	45: 6,
	46: 7,
	47: 8,
	48: 9,
	49: 10,
	50: 1,
	51: 1,
	52: 1,
	53: 2,
	54: 2,
};

/** Gold cost to upgrade TO each ability level */
const GOLD_PER_LEVEL: Record<number, number> = {
	1: 25,
	2: 50,
	3: 100,
	4: 150,
	5: 200,
	6: 300,
	7: 400,
	8: 500,
	9: 600,
	10: 700,
	11: 800,
	12: 900,
	13: 1000,
	14: 1250,
	15: 1500,
	16: 1750,
	17: 2000,
	18: 2500,
	19: 3000,
	20: 3500,
	21: 4000,
	22: 4500,
	23: 5000,
	24: 5500,
	25: 6000,
	26: 6500,
	27: 7000,
	28: 7500,
	29: 8000,
	30: 8500,
	31: 9000,
	32: 9500,
	33: 10000,
	34: 11000,
	35: 12000,
	36: 13000,
	37: 14000,
	38: 15000,
	39: 16000,
	40: 18000,
	41: 20000,
	42: 22500,
	43: 25000,
	44: 30000,
	45: 40000,
	46: 50000,
	47: 75000,
	48: 100000,
	49: 125000,
	50: 127500,
	51: 127500,
	52: 130000,
	53: 135000,
	54: 137500,
};

function createEmptyRarityRecord(): Record<Rarity, number> {
	return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/**
 * Calculate the total badge and gold costs for upgrading abilities
 * from startLevel to endLevel.
 */
export function getAbilitiesMaterials(
	startLevel: number,
	endLevel: number,
	alliance: Alliance,
): IAbilitiesMaterialsTotal {
	const badges = createEmptyRarityRecord();
	let gold = 0;

	for (let level = startLevel + 1; level <= endLevel; level++) {
		const rarity = getRarityFromLevel(level);
		const badgeCost = BADGES_PER_LEVEL[level] ?? 0;
		const goldCost = GOLD_PER_LEVEL[level] ?? 0;

		badges[rarity] += badgeCost;
		gold += goldCost;
	}

	return { gold, alliance, badges };
}

/**
 * Calculate combined ability materials for active + passive ability upgrades.
 */
export function getCombinedAbilitiesMaterials(
	activeStart: number,
	activeEnd: number,
	passiveStart: number,
	passiveEnd: number,
	alliance: Alliance,
): IAbilitiesMaterialsTotal {
	const activeMats = getAbilitiesMaterials(activeStart, activeEnd, alliance);
	const passiveMats = getAbilitiesMaterials(passiveStart, passiveEnd, alliance);

	const badges = createEmptyRarityRecord();
	for (const rarity of [0, 1, 2, 3, 4, 5] as Rarity[]) {
		badges[rarity] = activeMats.badges[rarity] + passiveMats.badges[rarity];
	}

	return {
		gold: activeMats.gold + passiveMats.gold,
		alliance,
		badges,
	};
}
