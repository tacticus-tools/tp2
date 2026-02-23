import type { DeepReadonly } from "@/types.ts";
import shardData from "./shard-locations.generated.json" with { type: "json" };
import upgradeData from "./upgrade-locations.generated.json" with {
	type: "json",
};

/** Farming locations for upgrade materials, keyed by materialId, sorted by energyPerItem */
export const UPGRADE_LOCATIONS = Object.freeze(upgradeData) as DeepReadonly<
	typeof upgradeData
>;

/** Farming locations for character shards, keyed by unitId, sorted by energyPerShard */
export const SHARD_LOCATIONS = Object.freeze(shardData) as DeepReadonly<
	typeof shardData
>;

export type UpgradeLocation =
	(typeof UPGRADE_LOCATIONS)[keyof typeof UPGRADE_LOCATIONS][number];
export type ShardLocation =
	(typeof SHARD_LOCATIONS)[keyof typeof SHARD_LOCATIONS][number];
