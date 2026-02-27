import type {
	TacticusLegendaryEventBattlesProgress,
	TacticusLegendaryEventLane,
	TacticusLegendaryEventProgress,
} from "~/tacticus/types.ts";
import { objectiveKey } from "./lre-character-filter.ts";
import {
	type ApiLreSummary,
	type BattleProgress,
	type BattleRequirementProgress,
	type LreProgressData,
	REQUIREMENT_STATUS,
	type TrackId,
	type TrackProgress,
} from "./lre-types.ts";

const TRACK_IDS: TrackId[] = ["alpha", "beta", "gamma"];

/**
 * Map a lane index to our track ID (0=alpha, 1=beta, 2=gamma).
 */
function laneIndexToTrackId(index: number): TrackId {
	return TRACK_IDS[index] ?? "alpha";
}

/**
 * Convert a single API battle progress into our BattleProgress model.
 * Uses battleConfigs to resolve objective keys.
 */
function mapBattleProgress(
	battleIndex: number,
	progress: TacticusLegendaryEventBattlesProgress,
	lane: TacticusLegendaryEventLane,
): BattleProgress {
	const config = lane.battleConfigs[battleIndex];
	const clearedSet = new Set(progress.objectivesCleared);
	const requirements: BattleRequirementProgress[] = [];

	// Acing / High score: the Acing objective is at index 0 in the API
	const acingCleared = clearedSet.has(0);
	// Kill points: Cleared when acing cleared (battle fully won = all enemies killed).
	// PartiallyCleared when some encounter points but battle not aced.
	const killStatus = acingCleared
		? REQUIREMENT_STATUS.Cleared
		: progress.encounterPoints > 0
			? REQUIREMENT_STATUS.PartiallyCleared
			: REQUIREMENT_STATUS.NotCleared;
	requirements.push({
		id: "_killPoints",
		status: killStatus,
		killScore:
			killStatus === REQUIREMENT_STATUS.PartiallyCleared
				? progress.encounterPoints
				: undefined,
	});

	// High score: Cleared when acing objective cleared, partial when some score exists.
	const highScoreStatus = acingCleared
		? REQUIREMENT_STATUS.Cleared
		: progress.highScore > 0
			? REQUIREMENT_STATUS.PartiallyCleared
			: REQUIREMENT_STATUS.NotCleared;
	requirements.push({
		id: "_highScore",
		status: highScoreStatus,
		highScore:
			highScoreStatus === REQUIREMENT_STATUS.PartiallyCleared
				? progress.highScore
				: undefined,
	});

	// Defeat all: Cleared when acing cleared (acing requires defeating all enemies).
	requirements.push({
		id: "_defeatAll",
		status: acingCleared
			? REQUIREMENT_STATUS.Cleared
			: progress.encounterPoints > 0
				? REQUIREMENT_STATUS.PartiallyCleared
				: REQUIREMENT_STATUS.NotCleared,
	});

	// Restriction objectives (indices 1+ in battleConfigs.objectives)
	if (config) {
		for (let objIdx = 1; objIdx < config.objectives.length; objIdx++) {
			const obj = config.objectives[objIdx];
			const target = obj.objectiveTarget === "" ? null : obj.objectiveTarget;
			const key = objectiveKey({
				type: obj.objectiveType,
				target,
				points: obj.score,
			});
			requirements.push({
				id: key,
				status: clearedSet.has(objIdx)
					? REQUIREMENT_STATUS.Cleared
					: REQUIREMENT_STATUS.NotCleared,
			});
		}
	}

	return { battleIndex, requirements };
}

/**
 * Convert a TacticusLegendaryEventProgress to our LreProgressData format.
 * Per-battle progress comes from the API lanes; occurrence data is initialized empty
 * since the API doesn't expose free/premium mission counts.
 */
export function apiProgressToLreProgress(
	apiProgress: TacticusLegendaryEventProgress,
): LreProgressData {
	const tracksProgress: TrackProgress[] = apiProgress.lanes.map(
		(lane, laneIndex) => {
			const trackId = laneIndexToTrackId(laneIndex);
			const battles: BattleProgress[] = lane.progress.map((bp, battleIndex) =>
				mapBattleProgress(battleIndex, bp, lane),
			);
			return { trackId, battles };
		},
	);

	// Occurrence data: API gives us the current run but not mission details
	const occurrenceProgress = [1, 2, 3].map((n) => ({
		occurrence: n as 1 | 2 | 3,
		freeMissions: 0,
		premiumMissions: 0,
		bundlePurchased: false,
		ohSoCloseShards: 0,
	}));

	return {
		tracksProgress,
		occurrenceProgress,
		notes: "",
	};
}

/**
 * Extract the API summary (authoritative game totals) from API progress data.
 */
export function extractApiSummary(
	apiProgress: TacticusLegendaryEventProgress,
): ApiLreSummary {
	return {
		currentPoints: apiProgress.currentPoints,
		currentCurrency: apiProgress.currentCurrency,
		currentShards: apiProgress.currentShards,
		currentClaimedChestIndex: apiProgress.currentClaimedChestIndex,
		currentRun: apiProgress.currentEvent?.run,
		tokensRemaining: apiProgress.currentEvent?.tokens.current,
		tokensMax: apiProgress.currentEvent?.tokens.max,
	};
}
