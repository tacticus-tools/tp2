import type { DeepReadonly } from "@/types.ts";
import { DATA as ALL_CE_DATA } from "./all-ce-campaigns.generated.ts";
import ENEMY_COUNTS_DATA from "./battle-enemy-counts.generated.json" with {
	type: "json",
};
import { DATA as EVENT_GROUPS_DATA } from "./event-groups.generated.ts";

/** Maps each CE type to the campaign names it activates */
export const EVENT_GROUPS = Object.freeze(EVENT_GROUPS_DATA) as DeepReadonly<
	typeof EVENT_GROUPS_DATA
>;

/** Flat sorted array of every campaign that belongs to any campaign event */
export const ALL_CE_CAMPAIGNS = Object.freeze(ALL_CE_DATA) as DeepReadonly<
	typeof ALL_CE_DATA
>;

/** Battle enemy counts: Record<battleId, {tyranids, chaos, mechanical}> */
export const BATTLE_ENEMY_COUNTS = Object.freeze(
	ENEMY_COUNTS_DATA,
) as DeepReadonly<typeof ENEMY_COUNTS_DATA>;

export type BattleEnemyCounts =
	(typeof BATTLE_ENEMY_COUNTS)[keyof typeof BATTLE_ENEMY_COUNTS];
