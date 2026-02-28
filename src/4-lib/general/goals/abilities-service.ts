import type { Alliance } from "#common/alliance.ts";
import { RARITIES, type Rarity } from "#common/rarity.ts";
import {
	BADGES_PER_LEVEL,
	GOLD_PER_LEVEL,
} from "@/5-assets/ability-costs/index.ts";
import { getRarityFromLevel } from "../rarity-data.ts";

export interface IAbilitiesMaterialsTotal {
	gold: number;
	alliance: Alliance;
	badges: Record<Rarity, number>;
}

function createEmptyRarityRecord(): Record<Rarity, number> {
	return { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0, Mythic: 0 };
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
	for (const rarity of RARITIES) {
		badges[rarity] = activeMats.badges[rarity] + passiveMats.badges[rarity];
	}

	return {
		gold: activeMats.gold + passiveMats.gold,
		alliance,
		badges,
	};
}
