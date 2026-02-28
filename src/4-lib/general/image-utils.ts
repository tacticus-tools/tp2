import ChaosCommonBadge from "@/5-assets/images/tacticus/badges/chaos-common.png";
import ChaosEpicBadge from "@/5-assets/images/tacticus/badges/chaos-epic.png";
import ChaosLegendaryBadge from "@/5-assets/images/tacticus/badges/chaos-legendary.png";
import ChaosMythicBadge from "@/5-assets/images/tacticus/badges/chaos-mythic.png";
import ChaosRareBadge from "@/5-assets/images/tacticus/badges/chaos-rare.png";
import ChaosUncommonBadge from "@/5-assets/images/tacticus/badges/chaos-uncommon.png";
import ImperialCommonBadge from "@/5-assets/images/tacticus/badges/imperial-common.png";
import ImperialEpicBadge from "@/5-assets/images/tacticus/badges/imperial-epic.png";
import ImperialLegendaryBadge from "@/5-assets/images/tacticus/badges/imperial-legendary.png";
import ImperialMythicBadge from "@/5-assets/images/tacticus/badges/imperial-mythic.png";
import ImperialRareBadge from "@/5-assets/images/tacticus/badges/imperial-rare.png";
import ImperialUncommonBadge from "@/5-assets/images/tacticus/badges/imperial-uncommon.png";
import XenosCommonBadge from "@/5-assets/images/tacticus/badges/xenos-common.png";
import XenosEpicBadge from "@/5-assets/images/tacticus/badges/xenos-epic.png";
import XenosLegendaryBadge from "@/5-assets/images/tacticus/badges/xenos-legendary.png";
import XenosMythicBadge from "@/5-assets/images/tacticus/badges/xenos-mythic.png";
import XenosRareBadge from "@/5-assets/images/tacticus/badges/xenos-rare.png";
import XenosUncommonBadge from "@/5-assets/images/tacticus/badges/xenos-uncommon.png";
import LegendaryBook from "@/5-assets/images/tacticus/icons/xp_book_legendary.png";
import MythicBook from "@/5-assets/images/tacticus/icons/xp_book_mythic.png";
import CommonIcon from "@/5-assets/images/tacticus/rarity/common.png";
import EpicIcon from "@/5-assets/images/tacticus/rarity/epic.png";
import LegendaryIcon from "@/5-assets/images/tacticus/rarity/legendary.png";
import MythicIcon from "@/5-assets/images/tacticus/rarity/mythic.png";
import RareIcon from "@/5-assets/images/tacticus/rarity/rare.png";
import UncommonIcon from "@/5-assets/images/tacticus/rarity/uncommon.png";
import CommonFrame from "@/5-assets/images/tacticus/rarity_frames/common.png";
import EpicFrame from "@/5-assets/images/tacticus/rarity_frames/epic.png";
import LegendaryFrame from "@/5-assets/images/tacticus/rarity_frames/legendary.png";
import MythicFrame from "@/5-assets/images/tacticus/rarity_frames/mythic.png";
import RareFrame from "@/5-assets/images/tacticus/rarity_frames/rare.png";
import UncommonFrame from "@/5-assets/images/tacticus/rarity_frames/uncommon.png";
import { Rank } from "./constants.ts";

export const FRAME_URLS = {
	Common: CommonFrame,
	Uncommon: UncommonFrame,
	Rare: RareFrame,
	Epic: EpicFrame,
	Legendary: LegendaryFrame,
	Mythic: MythicFrame,
} as const;

export const BADGE_URLS = {
	Imperial: {
		Common: ImperialCommonBadge,
		Uncommon: ImperialUncommonBadge,
		Rare: ImperialRareBadge,
		Epic: ImperialEpicBadge,
		Legendary: ImperialLegendaryBadge,
		Mythic: ImperialMythicBadge,
	},
	Chaos: {
		Common: ChaosCommonBadge,
		Uncommon: ChaosUncommonBadge,
		Rare: ChaosRareBadge,
		Epic: ChaosEpicBadge,
		Legendary: ChaosLegendaryBadge,
		Mythic: ChaosMythicBadge,
	},
	Xenos: {
		Common: XenosCommonBadge,
		Uncommon: XenosUncommonBadge,
		Rare: XenosRareBadge,
		Epic: XenosEpicBadge,
		Legendary: XenosLegendaryBadge,
		Mythic: XenosMythicBadge,
	},
} as const;

export const BOOK_URLS = {
	Legendary: LegendaryBook,
	Mythic: MythicBook,
};

export const RARITY_ICON_URLS = {
	Common: CommonIcon,
	Uncommon: UncommonIcon,
	Rare: RareIcon,
	Epic: EpicIcon,
	Legendary: LegendaryIcon,
	Mythic: MythicIcon,
};

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

export function getRankImageUrl(rank: Rank): string {
	const filename = rankFilenames[rank];
	return new URL(
		`../../5-assets/images/tacticus/ranks/${filename}`,
		import.meta.url,
	).href;
}

export function getEnergyIconUrl(): string {
	return new URL(
		"../../5-assets/images/tacticus/icons/energy.png",
		import.meta.url,
	).href;
}

export function getCampaignImageUrl(campaign: string): string {
	return new URL(
		`../../5-assets/images/tacticus/campaigns/${campaign}.png`,
		import.meta.url,
	).href;
}

export function getStarIconUrl(
	type: "gold" | "red" | "blue" | "mythic-wings",
): string {
	return new URL(
		`../../5-assets/images/tacticus/icons/star-${type}.png`,
		import.meta.url,
	).href;
}
