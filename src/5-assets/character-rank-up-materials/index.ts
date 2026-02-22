import type { CharacterId } from "../characters/index.ts";
import data from "./data.generated.json" with { type: "json" };
import type { RankUpData } from "./generate-data.ts";

export const CHARACTER_RANK_UP_MATERIALS = data as RankUpData;
export type Rank = keyof (typeof CHARACTER_RANK_UP_MATERIALS)[CharacterId];
