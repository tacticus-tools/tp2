import { Rank, Rarity, RarityStars, RarityString } from "./enums";

export const rarityToStars: Record<Rarity, RarityStars> = {
	[Rarity.Common]: RarityStars.None,
	[Rarity.Uncommon]: RarityStars.TwoStars,
	[Rarity.Rare]: RarityStars.FourStars,
	[Rarity.Epic]: RarityStars.RedOneStar,
	[Rarity.Legendary]: RarityStars.RedThreeStars,
	[Rarity.Mythic]: RarityStars.OneBlueStar,
};

export const rarityToMaxStars: Record<Rarity, RarityStars> = {
	[Rarity.Common]: RarityStars.TwoStars,
	[Rarity.Uncommon]: RarityStars.FourStars,
	[Rarity.Rare]: RarityStars.RedOneStar,
	[Rarity.Epic]: RarityStars.RedThreeStars,
	[Rarity.Legendary]: RarityStars.OneBlueStar,
	[Rarity.Mythic]: RarityStars.MythicWings,
};

export const rarityToMaxRank: Record<Rarity, Rank> = {
	[Rarity.Common]: Rank.Iron1,
	[Rarity.Uncommon]: Rank.Bronze1,
	[Rarity.Rare]: Rank.Silver1,
	[Rarity.Epic]: Rank.Gold1,
	[Rarity.Legendary]: Rank.Diamond3,
	[Rarity.Mythic]: Rank.Adamantine1,
};

export const rarityStringToNumber: Record<RarityString, Rarity> = {
	[RarityString.Common]: Rarity.Common,
	[RarityString.Uncommon]: Rarity.Uncommon,
	[RarityString.Rare]: Rarity.Rare,
	[RarityString.Epic]: Rarity.Epic,
	[RarityString.Legendary]: Rarity.Legendary,
	[RarityString.Mythic]: Rarity.Mythic,
};

export function getRarityFromLevel(level: number): Rarity {
	if (level <= 8) return Rarity.Common;
	if (level <= 17) return Rarity.Uncommon;
	if (level <= 26) return Rarity.Rare;
	if (level <= 35) return Rarity.Epic;
	if (level <= 50) return Rarity.Legendary;
	return Rarity.Mythic;
}

export const charsUnlockShards: Record<Rarity, number> = {
	[Rarity.Common]: 40,
	[Rarity.Uncommon]: 80,
	[Rarity.Rare]: 130,
	[Rarity.Epic]: 250,
	[Rarity.Legendary]: 500,
	[Rarity.Mythic]: 1400,
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
	[Rarity.Common + RarityStars.None]: { shards: 0 },
	[Rarity.Common + RarityStars.OneStar]: { shards: 10 },
	[Rarity.Common + RarityStars.TwoStars]: { shards: 15 },
	[Rarity.Uncommon + RarityStars.TwoStars]: {
		shards: 15,
		orbs: 10,
		rarity: Rarity.Uncommon,
	},

	[Rarity.Uncommon + RarityStars.ThreeStars]: { shards: 15 },
	[Rarity.Uncommon + RarityStars.FourStars]: { shards: 15 },
	[Rarity.Rare + RarityStars.FourStars]: {
		shards: 20,
		orbs: 10,
		rarity: Rarity.Rare,
	},

	[Rarity.Rare + RarityStars.FiveStars]: { shards: 30 },
	[Rarity.Rare + RarityStars.RedOneStar]: { shards: 40 },
	[Rarity.Epic + RarityStars.RedOneStar]: {
		shards: 50,
		orbs: 10,
		rarity: Rarity.Epic,
	},

	[Rarity.Epic + RarityStars.RedTwoStars]: { shards: 65 },
	[Rarity.Epic + RarityStars.RedThreeStars]: { shards: 85 },
	[Rarity.Legendary + RarityStars.RedThreeStars]: {
		shards: 100,
		orbs: 10,
		rarity: Rarity.Legendary,
	},

	[Rarity.Legendary + RarityStars.RedFourStars]: {
		shards: 150,
		orbs: 10,
		rarity: Rarity.Legendary,
	},
	[Rarity.Legendary + RarityStars.RedFiveStars]: {
		shards: 250,
		orbs: 15,
		rarity: Rarity.Legendary,
	},
	[Rarity.Legendary + RarityStars.OneBlueStar]: {
		shards: 500,
		orbs: 20,
		rarity: Rarity.Legendary,
	},
	[Rarity.Mythic + RarityStars.OneBlueStar]: {
		mythicShards: 20,
		orbs: 10,
		rarity: Rarity.Mythic,
	},

	[Rarity.Mythic + RarityStars.TwoBlueStars]: {
		mythicShards: 30,
		orbs: 10,
		rarity: Rarity.Mythic,
	},
	[Rarity.Mythic + RarityStars.ThreeBlueStars]: {
		mythicShards: 50,
		orbs: 15,
		rarity: Rarity.Mythic,
	},
	[Rarity.Mythic + RarityStars.MythicWings]: {
		mythicShards: 100,
		orbs: 20,
		rarity: Rarity.Mythic,
	},
};
