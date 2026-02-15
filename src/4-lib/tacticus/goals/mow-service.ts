import type { Rarity } from "../enums";
import { getRarityFromLevel } from "../rarity-data";

export interface IMowMaterialsTotal {
	components: number;
	salvage: number;
	gold: number;
	badges: Record<Rarity, number>;
	forgeBadges: Record<Rarity, number>;
}

/**
 * Component costs per MoW ability level.
 * From tacticusplanner's mows upgrade costs data.
 */
const COMPONENTS_PER_LEVEL: Record<number, number> = {
	2: 5,
	3: 5,
	4: 5,
	5: 10,
	6: 10,
	7: 10,
	8: 10,
	9: 15,
	10: 15,
	11: 15,
	12: 15,
	13: 20,
	14: 20,
	15: 20,
	16: 20,
	17: 25,
	18: 25,
	19: 25,
	20: 25,
	21: 30,
	22: 30,
	23: 30,
	24: 30,
	25: 35,
	26: 35,
	27: 35,
	28: 35,
	29: 40,
	30: 40,
	31: 40,
	32: 40,
	33: 45,
	34: 45,
	35: 45,
	36: 45,
	37: 50,
	38: 50,
	39: 50,
	40: 50,
	41: 55,
	42: 55,
	43: 55,
	44: 55,
	45: 60,
	46: 60,
	47: 60,
	48: 60,
	49: 65,
	50: 65,
};

/** Badges per MoW ability level */
const MOW_BADGES_PER_LEVEL: Record<number, number> = {
	2: 3,
	3: 3,
	4: 3,
	5: 5,
	6: 5,
	7: 5,
	8: 5,
	9: 8,
	10: 8,
	11: 8,
	12: 8,
	13: 10,
	14: 10,
	15: 10,
	16: 10,
	17: 12,
	18: 12,
	19: 12,
	20: 12,
	21: 15,
	22: 15,
	23: 15,
	24: 15,
	25: 18,
	26: 18,
	27: 18,
	28: 18,
	29: 20,
	30: 20,
	31: 20,
	32: 20,
	33: 22,
	34: 22,
	35: 22,
	36: 22,
	37: 25,
	38: 25,
	39: 25,
	40: 25,
	41: 28,
	42: 28,
	43: 28,
	44: 28,
	45: 30,
	46: 30,
	47: 30,
	48: 30,
	49: 35,
	50: 35,
};

/** Salvage cost per MoW level */
const SALVAGE_PER_LEVEL = 100;

/** Gold cost per MoW ability level (simplified) */
const MOW_GOLD_PER_LEVEL: Record<number, number> = {
	2: 1000,
	3: 1200,
	4: 1400,
	5: 1600,
	6: 2000,
	7: 2400,
	8: 2800,
	9: 3200,
	10: 3600,
	11: 4000,
	12: 4500,
	13: 5000,
	14: 5500,
	15: 6000,
	16: 7000,
	17: 8000,
	18: 9000,
	19: 10000,
	20: 11000,
	21: 12000,
	22: 13000,
	23: 14000,
	24: 15000,
	25: 16000,
	26: 18000,
	27: 20000,
	28: 22000,
	29: 24000,
	30: 26000,
	31: 28000,
	32: 30000,
	33: 32000,
	34: 34000,
	35: 36000,
	36: 40000,
	37: 44000,
	38: 48000,
	39: 52000,
	40: 56000,
	41: 60000,
	42: 64000,
	43: 68000,
	44: 72000,
	45: 76000,
	46: 80000,
	47: 84000,
	48: 88000,
	49: 92000,
	50: 96000,
};

function createEmptyRarityRecord(): Record<Rarity, number> {
	return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

/**
 * Calculate total MoW materials needed for upgrading an ability
 * from startLevel to endLevel.
 */
export function getMowAbilityMaterials(
	startLevel: number,
	endLevel: number,
): {
	components: number;
	salvage: number;
	gold: number;
	badges: Record<Rarity, number>;
	forgeBadges: Record<Rarity, number>;
} {
	const badges = createEmptyRarityRecord();
	const forgeBadges = createEmptyRarityRecord();
	let components = 0;
	let salvage = 0;
	let gold = 0;

	for (let level = startLevel + 1; level <= endLevel; level++) {
		const rarity = getRarityFromLevel(level);
		components += COMPONENTS_PER_LEVEL[level] ?? 0;
		salvage += SALVAGE_PER_LEVEL;
		gold += MOW_GOLD_PER_LEVEL[level] ?? 0;
		badges[rarity] += MOW_BADGES_PER_LEVEL[level] ?? 0;
		// Forge badges kick in at higher levels (35+)
		if (level >= 35) {
			forgeBadges[rarity] += Math.ceil(
				(MOW_BADGES_PER_LEVEL[level] ?? 0) * 0.5,
			);
		}
	}

	return { components, salvage, gold, badges, forgeBadges };
}

/**
 * Calculate combined MoW materials for primary + secondary ability upgrades.
 */
export function getCombinedMowMaterials(
	primaryStart: number,
	primaryEnd: number,
	secondaryStart: number,
	secondaryEnd: number,
): IMowMaterialsTotal {
	const primary = getMowAbilityMaterials(primaryStart, primaryEnd);
	const secondary = getMowAbilityMaterials(secondaryStart, secondaryEnd);

	const badges = createEmptyRarityRecord();
	const forgeBadges = createEmptyRarityRecord();

	for (const rarity of [0, 1, 2, 3, 4, 5] as Rarity[]) {
		badges[rarity] = primary.badges[rarity] + secondary.badges[rarity];
		forgeBadges[rarity] =
			primary.forgeBadges[rarity] + secondary.forgeBadges[rarity];
	}

	return {
		components: primary.components + secondary.components,
		salvage: primary.salvage + secondary.salvage,
		gold: primary.gold + secondary.gold,
		badges,
		forgeBadges,
	};
}
