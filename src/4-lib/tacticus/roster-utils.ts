import type { TacticusUnit } from "~/tacticus/types";
import { Rank, Rarity, RarityStars } from "./enums";

/**
 * Convert Tacticus API progressionIndex → [Rarity, RarityStars].
 * Thresholds: 0=Common, 3=Uncommon, 6=Rare, 9=Epic, 12=Legendary, 16=Mythic
 */
export function convertProgressionIndex(idx: number): [Rarity, RarityStars] {
	const thresholds: [number, Rarity, RarityStars][] = [
		[16, Rarity.Mythic, RarityStars.OneBlueStar],
		[15, Rarity.Legendary, RarityStars.OneBlueStar],
		[14, Rarity.Legendary, RarityStars.RedFiveStars],
		[13, Rarity.Legendary, RarityStars.RedFourStars],
		[12, Rarity.Legendary, RarityStars.RedThreeStars],
		[11, Rarity.Epic, RarityStars.RedThreeStars],
		[10, Rarity.Epic, RarityStars.RedTwoStars],
		[9, Rarity.Epic, RarityStars.RedOneStar],
		[8, Rarity.Rare, RarityStars.RedOneStar],
		[7, Rarity.Rare, RarityStars.FiveStars],
		[6, Rarity.Rare, RarityStars.FourStars],
		[5, Rarity.Uncommon, RarityStars.FourStars],
		[4, Rarity.Uncommon, RarityStars.ThreeStars],
		[3, Rarity.Uncommon, RarityStars.TwoStars],
		[2, Rarity.Common, RarityStars.TwoStars],
		[1, Rarity.Common, RarityStars.OneStar],
		[0, Rarity.Common, RarityStars.None],
	];

	for (const [threshold, rarity, stars] of thresholds) {
		if (idx >= threshold) return [rarity, stars];
	}
	return [Rarity.Common, RarityStars.None];
}

/**
 * Convert Tacticus API rank (0-based) → Rank enum (1-based, Stone1=1).
 * API rank 0 = Stone I, so Rank = apiRank + 1.
 */
export function convertApiRank(apiRank: number): Rank {
	const rank = apiRank + 1;
	if (rank < Rank.Stone1) return Rank.Stone1;
	if (rank > Rank.Adamantine3) return Rank.Adamantine3;
	return rank as Rank;
}

/** Roster unit info extracted from the Tacticus API */
export interface RosterUnit {
	rank: Rank;
	rarity: Rarity;
	stars: RarityStars;
	abilities: [number, number];
}

/**
 * Build a lookup Map<unitId, RosterUnit> from the Tacticus API response units.
 */
export function buildRosterMap(units: TacticusUnit[]): Map<string, RosterUnit> {
	const map = new Map<string, RosterUnit>();
	for (const u of units) {
		const [rarity, stars] = convertProgressionIndex(u.progressionIndex);
		map.set(u.id, {
			rank: convertApiRank(u.rank),
			rarity,
			stars,
			abilities: [u.abilities[0].level, u.abilities[1].level],
		});
	}
	return map;
}
