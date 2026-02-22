import {
	XP_LEVEL_THRESHOLDS,
	type XpLevelThreshold,
} from "@/5-assets/xp-levels/index.ts";
import { Rarity } from "./constants.ts";

export type IXpLevelThreshold = XpLevelThreshold;

export const xpLevelThresholds = XP_LEVEL_THRESHOLDS;

/** XP value per book rarity */
export const xpBookValues: Record<Rarity, number> = {
	[Rarity.Common]: 20,
	[Rarity.Uncommon]: 100,
	[Rarity.Rare]: 500,
	[Rarity.Epic]: 2500,
	[Rarity.Legendary]: 12500,
	[Rarity.Mythic]: 62500,
};
