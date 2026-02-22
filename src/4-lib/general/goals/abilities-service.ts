import {
	BADGES_PER_LEVEL,
	GOLD_PER_LEVEL,
} from "@/5-assets/ability-costs/index.ts";
import type { Alliance, Rarity } from "../constants.ts";
import { getRarityFromLevel } from "../rarity-data.ts";

export interface IAbilitiesMaterialsTotal {
	gold: number;
	alliance: Alliance;
	badges: Record<Rarity, number>;
}

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
