import type { Data as LeBattleData } from "@/5-assets/le-battles/generate-data.ts";
import type { Data } from "@/5-assets/lre/generate-data.ts";
import type { DeepReadonly } from "@/types.ts";
import { objectiveKey } from "./lre-character-filter.ts";
import {
	type BattleProgress,
	type BattleRequirementProgress,
	type LreProgressData,
	type OccurrenceProgress,
	REQUIREMENT_STATUS,
	type TrackId,
	type TrackProgress,
} from "./lre-types.ts";

type LreEventRaw = DeepReadonly<Data[number]>;
type Milestone = LreEventRaw["pointsMilestones"][number];
type ChestMilestone = LreEventRaw["chestsMilestones"][number];
type LeBattle = DeepReadonly<LeBattleData[number]>;
type LeTrack = LeBattle["alpha"];

/**
 * Given total points earned, compute how many engrams the player has earned
 * from point milestones.
 */
export function computeEngramsFromPoints(
	points: number,
	milestones: ReadonlyArray<Milestone>,
): number {
	let total = 0;
	for (const m of milestones) {
		if (points >= m.cumulativePoints) {
			total += m.engramPayout;
		} else {
			break;
		}
	}
	return total;
}

/**
 * Given total engrams available, compute how many chests the player can open.
 */
export function computeChestsFromEngrams(
	engrams: number,
	chestMilestones: ReadonlyArray<ChestMilestone>,
): { chestsOpened: number; engramsSpent: number } {
	let remaining = engrams;
	let chestsOpened = 0;
	let engramsSpent = 0;

	for (const cm of chestMilestones) {
		if (remaining >= cm.engramCost) {
			remaining -= cm.engramCost;
			engramsSpent += cm.engramCost;
			chestsOpened++;
		} else {
			break;
		}
	}

	return { chestsOpened, engramsSpent };
}

/**
 * Full progress pipeline: points → engrams → chests → shards.
 */
export function computeProgress(
	points: number,
	event: LreEventRaw,
): {
	points: number;
	engrams: number;
	chestsOpened: number;
	engramsSpent: number;
	engramsRemaining: number;
	shards: number;
	nextMilestonePoints: number | null;
	nextChestCost: number | null;
} {
	const engrams = computeEngramsFromPoints(points, event.pointsMilestones);
	const { chestsOpened, engramsSpent } = computeChestsFromEngrams(
		engrams,
		event.chestsMilestones,
	);
	const shards = chestsOpened * event.shardsPerChest;

	// Find next milestone
	const nextMilestone = event.pointsMilestones.find(
		(m) => m.cumulativePoints > points,
	);
	const nextMilestonePoints = nextMilestone?.cumulativePoints ?? null;

	// Find next chest cost
	const nextChest = event.chestsMilestones[chestsOpened];
	const nextChestCost = nextChest?.engramCost ?? null;

	return {
		points,
		engrams,
		chestsOpened,
		engramsSpent,
		engramsRemaining: engrams - engramsSpent,
		shards,
		nextMilestonePoints,
		nextChestCost,
	};
}

/**
 * Compute max possible points for a single battle clear on a track,
 * assuming all enemies killed + acing bonus + defeat-all bonus (if applicable).
 */
export function computeMaxBattlePoints(
	track: LreEventRaw["alpha"],
	battleIndex: number,
): number {
	const battlesPoints = track.battlesPoints[battleIndex] ?? 0;
	const defeatAllBonus = track.defeatAll?.[battleIndex] ?? 0;
	return battlesPoints + defeatAllBonus;
}

/**
 * Compute the shard goal threshold for a given progression target.
 */
export function computeShardGoal(
	progression: LreEventRaw["progression"],
	target: "unlock" | "fourStars" | "fiveStars" | "blueStar" | "mythic",
): number {
	let total = progression.unlock;
	if (target === "unlock") return total;

	total += progression.fourStars;
	if (target === "fourStars") return total;

	total += progression.fiveStars;
	if (target === "fiveStars") return total;

	total += progression.blueStar;
	if (target === "blueStar") return total;

	total += progression.mythic ?? 0;
	return total;
}

// ----------- Requirement IDs -----------

const KILL_POINTS_ID = "_killPoints";
const HIGH_SCORE_ID = "_highScore";
const DEFEAT_ALL_ID = "_defeatAll";

/**
 * Build the list of requirement IDs for a battle on a track.
 * Includes kill points, high score, defeat all, plus each le-battles objective.
 */
export function buildRequirementIds(
	track: LreEventRaw["alpha"],
	battleIndex: number,
	leTrack: LeTrack | undefined,
): string[] {
	const ids: string[] = [KILL_POINTS_ID, HIGH_SCORE_ID];
	if (track.defeatAll?.[battleIndex] != null) {
		ids.push(DEFEAT_ALL_ID);
	}
	if (leTrack) {
		for (const obj of leTrack.objectives) {
			ids.push(objectiveKey(obj));
		}
	}
	return ids;
}

/**
 * Initialize empty progress for a single track.
 */
export function initializeTrackProgress(
	event: LreEventRaw,
	trackId: TrackId,
	leTrack: LeTrack | undefined,
): TrackProgress {
	const track = event[trackId];
	const battles: BattleProgress[] = [];
	for (let i = 0; i < event.battlesCount; i++) {
		const reqIds = buildRequirementIds(track, i, leTrack);
		battles.push({
			battleIndex: i,
			requirements: reqIds.map((id) => ({
				id,
				status: REQUIREMENT_STATUS.NotCleared,
			})),
		});
	}
	return { trackId, battles };
}

/**
 * Initialize empty progress for all 3 occurrences.
 */
export function initializeOccurrences(): OccurrenceProgress[] {
	return [1, 2, 3].map((n) => ({
		occurrence: n as 1 | 2 | 3,
		freeMissions: 0,
		premiumMissions: 0,
		bundlePurchased: false,
		ohSoCloseShards: 0,
	}));
}

/**
 * Initialize a complete empty LreProgressData.
 */
export function initializeProgressData(
	event: LreEventRaw,
	leBattle: LeBattle | undefined,
): LreProgressData {
	const tracksProgress = (["alpha", "beta", "gamma"] as const).map((trackId) =>
		initializeTrackProgress(event, trackId, leBattle?.[trackId]),
	);
	return {
		tracksProgress,
		occurrenceProgress: initializeOccurrences(),
		notes: "",
	};
}

/**
 * Compute points earned for a single requirement in a battle.
 */
function requirementPoints(
	req: BattleRequirementProgress,
	track: LreEventRaw["alpha"],
	battleIndex: number,
	leTrack: LeTrack | undefined,
): number {
	if (
		req.status === REQUIREMENT_STATUS.NotCleared ||
		req.status === REQUIREMENT_STATUS.StopHere
	) {
		return 0;
	}

	if (req.id === KILL_POINTS_ID) {
		if (req.status === REQUIREMENT_STATUS.PartiallyCleared) {
			return req.killScore ?? 0;
		}
		// Cleared or MaybeClear: assume full kill points for the battle
		return track.battlesPoints[battleIndex] ?? 0;
	}

	if (req.id === HIGH_SCORE_ID) {
		if (req.status === REQUIREMENT_STATUS.PartiallyCleared) {
			return req.highScore ?? 0;
		}
		// Acing bonus
		const battle = leTrack?.battles[battleIndex];
		return battle?.acingPoints ?? 0;
	}

	if (req.id === DEFEAT_ALL_ID) {
		return track.defeatAll?.[battleIndex] ?? 0;
	}

	// Objective bonus
	if (leTrack) {
		const obj = leTrack.objectives.find((o) => objectiveKey(o) === req.id);
		if (obj) return obj.points;
	}

	return 0;
}

/**
 * Compute total points earned for a single track from battle progress.
 */
export function computeTrackPoints(
	trackProgress: TrackProgress,
	event: LreEventRaw,
	leTrack: LeTrack | undefined,
): number {
	const track = event[trackProgress.trackId];
	let total = 0;
	for (const battle of trackProgress.battles) {
		for (const req of battle.requirements) {
			if (
				req.status === REQUIREMENT_STATUS.Cleared ||
				req.status === REQUIREMENT_STATUS.MaybeClear ||
				req.status === REQUIREMENT_STATUS.PartiallyCleared
			) {
				total += requirementPoints(req, track, battle.battleIndex, leTrack);
			}
		}
	}
	return total;
}

/**
 * Compute total points across all 3 tracks.
 */
export function computeTotalPoints(
	tracksProgress: TrackProgress[],
	event: LreEventRaw,
	leBattle: LeBattle | undefined,
): number {
	let total = 0;
	for (const tp of tracksProgress) {
		total += computeTrackPoints(tp, event, leBattle?.[tp.trackId]);
	}
	return total;
}

/**
 * Compute shards earned from occurrence missions + bundle + oh-so-close.
 */
export function computeOccurrenceShards(
	occurrences: OccurrenceProgress[],
): number {
	let total = 0;
	for (const occ of occurrences) {
		// Each mission gives engrams, but for simplicity, oh-so-close gives shards directly
		total += occ.ohSoCloseShards;
	}
	return total;
}

/**
 * Compute the full progress: battle points + occurrence bonuses.
 */
export function computeFullProgress(
	progressData: LreProgressData,
	event: LreEventRaw,
	leBattle: LeBattle | undefined,
): {
	totalPoints: number;
	engrams: number;
	chestsOpened: number;
	shards: number;
	occurrenceShards: number;
	totalShards: number;
} {
	const totalPoints = computeTotalPoints(
		progressData.tracksProgress,
		event,
		leBattle,
	);
	const base = computeProgress(totalPoints, event);
	const occurrenceShards = computeOccurrenceShards(
		progressData.occurrenceProgress,
	);
	return {
		totalPoints,
		engrams: base.engrams,
		chestsOpened: base.chestsOpened,
		shards: base.shards,
		occurrenceShards,
		totalShards: base.shards + occurrenceShards,
	};
}
