import type { Rarity } from "#common/rarity.ts";
import { CHARACTER_RANK_UP_MATERIALS } from "@/5-assets/character-rank-up-materials/index.ts";
import type { TacticusUnit } from "~/tacticus/types.ts";
import { Rank, RarityStars } from "./constants.ts";
import { rankToString } from "./rank-data.ts";

/**
 * Convert Tacticus API progressionIndex → [Rarity, RarityStars].
 * Thresholds: 0=Common, 3=Uncommon, 6=Rare, 9=Epic, 12=Legendary, 16=Mythic
 */
const THRESHOLDS: [number, Rarity, RarityStars][] = [
	[16, "Mythic", RarityStars.OneBlueStar],
	[15, "Legendary", RarityStars.OneBlueStar],
	[14, "Legendary", RarityStars.RedFiveStars],
	[13, "Legendary", RarityStars.RedFourStars],
	[12, "Legendary", RarityStars.RedThreeStars],
	[11, "Epic", RarityStars.RedThreeStars],
	[10, "Epic", RarityStars.RedTwoStars],
	[9, "Epic", RarityStars.RedOneStar],
	[8, "Rare", RarityStars.RedOneStar],
	[7, "Rare", RarityStars.FiveStars],
	[6, "Rare", RarityStars.FourStars],
	[5, "Uncommon", RarityStars.FourStars],
	[4, "Uncommon", RarityStars.ThreeStars],
	[3, "Uncommon", RarityStars.TwoStars],
	[2, "Common", RarityStars.TwoStars],
	[1, "Common", RarityStars.OneStar],
	[0, "Common", RarityStars.None],
] as const;

export function convertProgressionIndex(idx: number) {
	for (const [threshold, rarity, stars] of THRESHOLDS) {
		if (idx >= threshold) return { rarity, stars };
	}
	return { rarity: "Common", stars: RarityStars.None } as const;
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

export interface RosterEquipment {
	id: string;
	level: number;
	rarity: Rarity;
	slotId: string;
}

/** Roster unit info extracted from the Tacticus API */
export interface RosterUnit {
	rank: Rank;
	rarity: Rarity;
	stars: RarityStars;
	abilities: [number, number];
	shards: number;
	mythicShards: number;
	level: number;
	xp: number;
	/** Number of applied rank upgrades (0–6) */
	upgradeCount: number;
	/** Material IDs of upgrades already applied at the current rank */
	appliedUpgrades: string[];
	equipment: RosterEquipment[];
}

/**
 * Build a lookup Record<unitId, RosterUnit> from the Tacticus API response units.
 */
export function buildRosterMap(
	units: TacticusUnit[],
): Record<string, RosterUnit> {
	const record: Record<string, RosterUnit> = {};
	for (const u of units) {
		const { rarity, stars } = convertProgressionIndex(u.progressionIndex);
		const rank = convertApiRank(u.rank);

		// Derive applied upgrade material IDs from slot indices
		const rankStr = rankToString[rank];
		const charData =
			CHARACTER_RANK_UP_MATERIALS[
				u.id as keyof typeof CHARACTER_RANK_UP_MATERIALS
			];
		const rankMaterials = rankStr && charData ? (charData[rankStr] ?? []) : [];
		// u.upgrades is an array of slot indices (e.g. [0, 2, 4] = 3 upgrades applied)
		const appliedUpgrades: string[] = [];
		for (const slotIndex of u.upgrades) {
			if (rankMaterials[slotIndex]) {
				appliedUpgrades.push(rankMaterials[slotIndex]);
			}
		}

		record[u.id] = {
			rank,
			rarity,
			stars,
			abilities: [u.abilities[0].level, u.abilities[1].level],
			shards: u.shards,
			mythicShards: u.mythicShards,
			level: u.xpLevel,
			xp: u.xp,
			upgradeCount: u.upgrades.length,
			appliedUpgrades,
			equipment: u.items.map((item) => ({
				id: item.id,
				level: item.level,
				rarity: item.rarity,
				slotId: item.slotId,
			})),
		};
	}
	return record;
}
