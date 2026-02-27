import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
import {
	MAX_DELETED_SNAPSHOTS,
	MAX_SNAPSHOTS,
	type RosterSnapshot,
	type RosterSnapshotsState,
	rosterUnitToSnapshot,
	type SnapshotUnit,
	type UnitDiff,
	type UnitDiffType,
} from "./snapshot-types.ts";

const DIFF_FIELDS: (keyof SnapshotUnit)[] = [
	"rank",
	"rarity",
	"stars",
	"level",
	"xp",
	"shards",
	"mythicShards",
];

const IMPACT_SCORES: Record<string, number> = {
	rank: 3,
	rarity: 3,
	stars: 2,
	activeAbility: 1,
	passiveAbility: 1,
	level: 1,
	shards: 0,
	xp: 0,
	mythicShards: 0,
};

export function createEmptyState(): RosterSnapshotsState {
	return { snapshots: [], deletedSnapshots: [] };
}

export function createSnapshot(
	state: RosterSnapshotsState,
	roster: Map<string, RosterUnit>,
	name: string,
): RosterSnapshotsState {
	const units: Record<string, SnapshotUnit> = {};
	for (const [unitId, unit] of roster) {
		units[unitId] = rosterUnitToSnapshot(unit);
	}

	const snapshot: RosterSnapshot = {
		name,
		createdAt: Date.now(),
		units,
	};

	const snapshots = [snapshot, ...state.snapshots].slice(0, MAX_SNAPSHOTS);
	return { ...state, snapshots };
}

export function deleteSnapshot(
	state: RosterSnapshotsState,
	index: number,
): RosterSnapshotsState {
	if (index < 0 || index >= state.snapshots.length) return state;

	const snapshot = state.snapshots[index];
	const snapshots = state.snapshots.filter((_, i) => i !== index);
	const deletedSnapshots = [snapshot, ...state.deletedSnapshots].slice(
		0,
		MAX_DELETED_SNAPSHOTS,
	);

	return { snapshots, deletedSnapshots };
}

export function restoreSnapshot(
	state: RosterSnapshotsState,
	deletedIndex: number,
): RosterSnapshotsState {
	if (deletedIndex < 0 || deletedIndex >= state.deletedSnapshots.length)
		return state;

	const snapshot = state.deletedSnapshots[deletedIndex];
	const deletedSnapshots = state.deletedSnapshots.filter(
		(_, i) => i !== deletedIndex,
	);
	const snapshots = [snapshot, ...state.snapshots].slice(0, MAX_SNAPSHOTS);

	return { snapshots, deletedSnapshots };
}

export function rosterMapToSnapshot(
	roster: Map<string, RosterUnit>,
	name: string,
): RosterSnapshot {
	const units: Record<string, SnapshotUnit> = {};
	for (const [unitId, unit] of roster) {
		units[unitId] = rosterUnitToSnapshot(unit);
	}
	return { name, createdAt: Date.now(), units };
}

export function diffSnapshots(
	left: RosterSnapshot,
	right: RosterSnapshot,
	hiddenFields?: Set<string>,
): UnitDiff[] {
	const allUnitIds = new Set([
		...Object.keys(left.units),
		...Object.keys(right.units),
	]);
	const diffs: UnitDiff[] = [];

	for (const unitId of allUnitIds) {
		const leftUnit = left.units[unitId];
		const rightUnit = right.units[unitId];

		const diffType: UnitDiffType = !leftUnit
			? "added"
			: !rightUnit
				? "removed"
				: "changed";

		if (diffType === "added" || diffType === "removed") {
			diffs.push({ unitId, diffType, impactScore: 10, fields: [] });
			continue;
		}

		const fields: UnitDiff["fields"] = [];

		for (const field of DIFF_FIELDS) {
			if (hiddenFields?.has(field)) continue;
			const before = leftUnit[field] as number;
			const after = rightUnit[field] as number;
			if (before !== after) {
				fields.push({ field, before, after });
			}
		}

		// Compare abilities as separate fields
		if (!hiddenFields?.has("activeAbility")) {
			const before = leftUnit.abilities[0];
			const after = rightUnit.abilities[0];
			if (before !== after) {
				fields.push({ field: "activeAbility", before, after });
			}
		}
		if (!hiddenFields?.has("passiveAbility")) {
			const before = leftUnit.abilities[1];
			const after = rightUnit.abilities[1];
			if (before !== after) {
				fields.push({ field: "passiveAbility", before, after });
			}
		}

		if (fields.length > 0) {
			const impactScore = fields.reduce(
				(sum, f) => sum + (IMPACT_SCORES[f.field] ?? 0),
				0,
			);
			diffs.push({ unitId, diffType, impactScore, fields });
		}
	}

	return diffs.sort((a, b) => b.impactScore - a.impactScore);
}
