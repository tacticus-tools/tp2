import { RARITIES, type Rarity } from "#common/rarity.ts";
import { Rank, RarityStars } from "./constants.ts";

export const rarityToStars: Record<Rarity, RarityStars> = {
	Common: RarityStars.None,
	Uncommon: RarityStars.TwoStars,
	Rare: RarityStars.FourStars,
	Epic: RarityStars.RedOneStar,
	Legendary: RarityStars.RedThreeStars,
	Mythic: RarityStars.OneBlueStar,
};

export const rarityToMaxStars: Record<Rarity, RarityStars> = {
	Common: RarityStars.TwoStars,
	Uncommon: RarityStars.FourStars,
	Rare: RarityStars.RedOneStar,
	Epic: RarityStars.RedThreeStars,
	Legendary: RarityStars.OneBlueStar,
	Mythic: RarityStars.MythicWings,
};

export const rarityToMaxRank: Record<Rarity, Rank> = {
	Common: Rank.Iron1,
	Uncommon: Rank.Bronze1,
	Rare: Rank.Silver1,
	Epic: Rank.Gold1,
	Legendary: Rank.Diamond3,
	Mythic: Rank.Adamantine1,
};

export function getRarityFromLevel(level: number) {
	if (level <= 8) return "Common";
	if (level <= 17) return "Uncommon";
	if (level <= 26) return "Rare";
	if (level <= 35) return "Epic";
	if (level <= 50) return "Legendary";
	return "Mythic";
}

export const charsUnlockShards: Record<Rarity, number> = {
	Common: 40,
	Uncommon: 80,
	Rare: 130,
	Epic: 250,
	Legendary: 500,
	Mythic: 1400,
};

export interface ICharProgression {
	shards?: number;
	mythicShards?: number;
	orbs?: number;
	rarity?: Rarity;
}

/**
 * Shard progression table. Keys are computed as `Rarity + RarityStars`.
 * Each entry describes the cost (shards, mythicShards, orbs) to reach that star level.
 */
export const charsProgression: Record<number, ICharProgression> = {
	[RARITIES.indexOf("Common") + RarityStars.None]: { shards: 0 },
	[RARITIES.indexOf("Common") + RarityStars.OneStar]: { shards: 10 },
	[RARITIES.indexOf("Common") + RarityStars.TwoStars]: { shards: 15 },
	[RARITIES.indexOf("Uncommon") + RarityStars.TwoStars]: {
		shards: 15,
		orbs: 10,
		rarity: "Uncommon",
	},
	[RARITIES.indexOf("Uncommon") + RarityStars.ThreeStars]: { shards: 15 },
	[RARITIES.indexOf("Uncommon") + RarityStars.FourStars]: { shards: 15 },
	[RARITIES.indexOf("Rare") + RarityStars.FourStars]: {
		shards: 20,
		orbs: 10,
		rarity: "Rare",
	},

	[RARITIES.indexOf("Rare") + RarityStars.FiveStars]: { shards: 30 },
	[RARITIES.indexOf("Rare") + RarityStars.RedOneStar]: { shards: 40 },
	[RARITIES.indexOf("Epic") + RarityStars.RedOneStar]: {
		shards: 50,
		orbs: 10,
		rarity: "Epic",
	},

	[RARITIES.indexOf("Epic") + RarityStars.RedTwoStars]: { shards: 65 },
	[RARITIES.indexOf("Epic") + RarityStars.RedThreeStars]: { shards: 85 },
	[RARITIES.indexOf("Legendary") + RarityStars.RedThreeStars]: {
		shards: 100,
		orbs: 10,
		rarity: "Legendary",
	},

	[RARITIES.indexOf("Legendary") + RarityStars.RedFourStars]: {
		shards: 150,
		orbs: 10,
		rarity: "Legendary",
	},
	[RARITIES.indexOf("Legendary") + RarityStars.RedFiveStars]: {
		shards: 250,
		orbs: 15,
		rarity: "Legendary",
	},
	[RARITIES.indexOf("Legendary") + RarityStars.OneBlueStar]: {
		shards: 500,
		orbs: 20,
		rarity: "Legendary",
	},
	[RARITIES.indexOf("Mythic") + RarityStars.OneBlueStar]: {
		mythicShards: 20,
		orbs: 10,
		rarity: "Mythic",
	},

	[RARITIES.indexOf("Mythic") + RarityStars.TwoBlueStars]: {
		mythicShards: 30,
		orbs: 10,
		rarity: "Mythic",
	},
	[RARITIES.indexOf("Mythic") + RarityStars.ThreeBlueStars]: {
		mythicShards: 50,
		orbs: 15,
		rarity: "Mythic",
	},
	[RARITIES.indexOf("Mythic") + RarityStars.MythicWings]: {
		mythicShards: 100,
		orbs: 20,
		rarity: "Mythic",
	},
};
