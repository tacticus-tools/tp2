import type { Rarity } from "#common/rarity.ts";
import {
	XP_LEVEL_THRESHOLDS,
	type XpLevelThreshold,
} from "@/5-assets/xp-levels/index.ts";

export type IXpLevelThreshold = XpLevelThreshold;

export const xpLevelThresholds = XP_LEVEL_THRESHOLDS;

/** XP value per book rarity */
export const xpBookValues: Record<Rarity, number> = {
	Common: 20,
	Uncommon: 100,
	Rare: 500,
	Epic: 2500,
	Legendary: 12500,
	Mythic: 62500,
};
