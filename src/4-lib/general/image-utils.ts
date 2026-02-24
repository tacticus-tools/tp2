import { type Alliance, Rank, Rarity } from "./constants.ts";

const rankFilenames: Record<Rank, string> = {
	[Rank.Locked]: "stone1.png",
	[Rank.Stone1]: "stone1.png",
	[Rank.Stone2]: "stone2.png",
	[Rank.Stone3]: "stone3.png",
	[Rank.Iron1]: "iron1.png",
	[Rank.Iron2]: "iron2.png",
	[Rank.Iron3]: "iron3.png",
	[Rank.Bronze1]: "bronze1.png",
	[Rank.Bronze2]: "bronze2.png",
	[Rank.Bronze3]: "bronze3.png",
	[Rank.Silver1]: "silver1.png",
	[Rank.Silver2]: "silver2.png",
	[Rank.Silver3]: "silver3.png",
	[Rank.Gold1]: "gold1.png",
	[Rank.Gold2]: "gold2.png",
	[Rank.Gold3]: "gold3.png",
	[Rank.Diamond1]: "diamond1.png",
	[Rank.Diamond2]: "diamond2.png",
	[Rank.Diamond3]: "diamond3.png",
	[Rank.Adamantine1]: "adamantine1.png",
	[Rank.Adamantine2]: "adamantine2.png",
	[Rank.Adamantine3]: "adamantine3.png",
};

const rarityFilenames: Record<Rarity, string> = {
	[Rarity.Common]: "common.png",
	[Rarity.Uncommon]: "uncommon.png",
	[Rarity.Rare]: "rare.png",
	[Rarity.Epic]: "epic.png",
	[Rarity.Legendary]: "legendary.png",
	[Rarity.Mythic]: "mythic.png",
};

export function getRankImageUrl(rank: Rank): string {
	const filename = rankFilenames[rank];
	return new URL(
		`../../5-assets/images/tacticus/ranks/${filename}`,
		import.meta.url,
	).href;
}

export function getRarityImageUrl(rarity: Rarity): string {
	const filename = rarityFilenames[rarity];
	return new URL(
		`../../5-assets/images/tacticus/rarity/${filename}`,
		import.meta.url,
	).href;
}

const rarityFrameFilenames: Record<Rarity, string> = {
	[Rarity.Common]: "common.png",
	[Rarity.Uncommon]: "uncommon.png",
	[Rarity.Rare]: "rare.png",
	[Rarity.Epic]: "epic.png",
	[Rarity.Legendary]: "legendary.png",
	[Rarity.Mythic]: "mythic.png",
};

export function getRarityFrameUrl(rarity: Rarity): string {
	const filename = rarityFrameFilenames[rarity];
	return new URL(
		`../../5-assets/images/tacticus/rarity_frames/${filename}`,
		import.meta.url,
	).href;
}

export function getEnergyIconUrl(): string {
	return new URL(
		"../../5-assets/images/tacticus/icons/energy.png",
		import.meta.url,
	).href;
}

export function getXpBookIconUrl(rarity: "legendary" | "mythic"): string {
	return new URL(
		`../../5-assets/images/tacticus/icons/xp_book_${rarity}.png`,
		import.meta.url,
	).href;
}

export function getCampaignImageUrl(campaign: string): string {
	return new URL(
		`../../5-assets/images/tacticus/campaigns/${campaign}.png`,
		import.meta.url,
	).href;
}

const allianceFilenames: Record<Alliance, string> = {
	Imperial: "imperial",
	Xenos: "xenos",
	Chaos: "chaos",
};

const rarityNames: Record<Rarity, string> = {
	[Rarity.Common]: "common",
	[Rarity.Uncommon]: "uncommon",
	[Rarity.Rare]: "rare",
	[Rarity.Epic]: "epic",
	[Rarity.Legendary]: "legendary",
	[Rarity.Mythic]: "mythic",
};

export function getBadgeImageUrl(alliance: Alliance, rarity: Rarity): string {
	const filename = `${allianceFilenames[alliance]}-${rarityNames[rarity]}.png`;
	return new URL(
		`../../5-assets/images/tacticus/badges/${filename}`,
		import.meta.url,
	).href;
}
