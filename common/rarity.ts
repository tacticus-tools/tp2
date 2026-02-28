import { z } from "zod";

export const RARITIES = [
	"Common",
	"Uncommon",
	"Rare",
	"Epic",
	"Legendary",
	"Mythic",
] as const;
export type Rarity = (typeof RARITIES)[number];
export const RaritySchema = z.enum(RARITIES);
export const rarityComparator = (a: Rarity, b: Rarity) =>
	RARITIES.indexOf(a) - RARITIES.indexOf(b);
