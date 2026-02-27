import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";

export interface SnapshotUnit {
	rank: number;
	rarity: number;
	stars: number;
	abilities: [number, number];
	shards: number;
	mythicShards: number;
	level: number;
	xp: number;
}

export interface RosterSnapshot {
	name: string;
	createdAt: number;
	units: Record<string, SnapshotUnit>;
}

export interface RosterSnapshotsState {
	snapshots: RosterSnapshot[];
	deletedSnapshots: RosterSnapshot[];
}

export type UnitDiffType = "changed" | "added" | "removed";

export interface UnitDiff {
	unitId: string;
	diffType: UnitDiffType;
	impactScore: number;
	fields: {
		field: string;
		before: number | string;
		after: number | string;
	}[];
}

export const MAX_SNAPSHOTS = 20;
export const MAX_DELETED_SNAPSHOTS = 20;

export function rosterUnitToSnapshot(unit: RosterUnit): SnapshotUnit {
	return {
		rank: unit.rank,
		rarity: unit.rarity,
		stars: unit.stars,
		abilities: [unit.abilities[0], unit.abilities[1]],
		shards: unit.shards,
		mythicShards: unit.mythicShards,
		level: unit.level,
		xp: unit.xp,
	};
}
