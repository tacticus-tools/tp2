import type { Alliance, Rarity } from "../enums";
import { getRarityFromLevel } from "../rarity-data";

export interface IAbilitiesMaterialsTotal {
	gold: number;
	alliance: Alliance;
	badges: Record<Rarity, number>;
}

/**
 * Badge costs per ability level, indexed by rarity tier.
 * These values are from tacticusplanner's character abilities data.
 */
const BADGES_PER_LEVEL: Record<number, number> = {
	1: 0,
	2: 5,
	3: 5,
	4: 5,
	5: 10,
	6: 10,
	7: 10,
	8: 10,
	9: 10,
	10: 15,
	11: 15,
	12: 15,
	13: 15,
	14: 15,
	15: 20,
	16: 20,
	17: 20,
	18: 20,
	19: 20,
	20: 25,
	21: 25,
	22: 25,
	23: 25,
	24: 25,
	25: 30,
	26: 30,
	27: 30,
	28: 30,
	29: 30,
	30: 35,
	31: 35,
	32: 35,
	33: 35,
	34: 35,
	35: 40,
	36: 40,
	37: 40,
	38: 40,
	39: 40,
	40: 45,
	41: 45,
	42: 45,
	43: 45,
	44: 45,
	45: 50,
	46: 50,
	47: 50,
	48: 50,
	49: 50,
	50: 55,
};

/** Gold cost per ability level */
const GOLD_PER_LEVEL: Record<number, number> = {
	1: 0,
	2: 500,
	3: 600,
	4: 700,
	5: 800,
	6: 1000,
	7: 1200,
	8: 1400,
	9: 1600,
	10: 2000,
	11: 2400,
	12: 2800,
	13: 3200,
	14: 3600,
	15: 4000,
	16: 4500,
	17: 5000,
	18: 5500,
	19: 6000,
	20: 7000,
	21: 8000,
	22: 9000,
	23: 10000,
	24: 11000,
	25: 12000,
	26: 13000,
	27: 14000,
	28: 15000,
	29: 16000,
	30: 18000,
	31: 20000,
	32: 22000,
	33: 24000,
	34: 26000,
	35: 28000,
	36: 30000,
	37: 32000,
	38: 34000,
	39: 36000,
	40: 40000,
	41: 44000,
	42: 48000,
	43: 52000,
	44: 56000,
	45: 60000,
	46: 64000,
	47: 68000,
	48: 72000,
	49: 76000,
	50: 80000,
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
