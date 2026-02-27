import type { Data as LeBattleData } from "@/5-assets/le-battles/generate-data.ts";
import type { Data } from "@/5-assets/lre/generate-data.ts";
import type { DeepReadonly } from "@/types.ts";
import { objectiveKey } from "./lre-character-filter.ts";
import { computeProgress, computeShardGoal } from "./lre-progress.ts";
import {
	type BattleRequirementProgress,
	type LreProgressData,
	type LreTeamData,
	REQUIREMENT_STATUS,
	type TokenDisplay,
	type TokenUse,
	type TrackId,
} from "./lre-types.ts";

type LreEvent = DeepReadonly<Data[number]>;
type LeBattle = DeepReadonly<LeBattleData[number]>;

export const FREE_TOKENS_PER_EVENT = 61;
export const AD_TOKENS_PER_EVENT = 7;
export const PREMIUM_TOKENS_PER_EVENT = 6;
export const TOTAL_TOKENS_PER_EVENT =
	FREE_TOKENS_PER_EVENT + AD_TOKENS_PER_EVENT + PREMIUM_TOKENS_PER_EVENT;

const TRACK_IDS: TrackId[] = ["alpha", "beta", "gamma"];
const AUTO_CLEAR_IDS = new Set(["_killPoints", "_highScore", "_defeatAll"]);
const KILL_POINTS_ID = "_killPoints";

// ---------------------------------------------------------------------------
// Internal simulation types
// ---------------------------------------------------------------------------

interface SimRequirement {
	id: string;
	completed: boolean;
	/** Incremental points this requirement contributes when cleared. */
	points: number;
}

interface SimBattle {
	battleIndex: number;
	requirements: SimRequirement[];
}

interface SimTrack {
	trackId: TrackId;
	battles: SimBattle[];
}

interface InternalToken {
	team: LreTeamData;
	battleIndex: number;
	trackId: TrackId;
	restrictionsCleared: SimRequirement[];
	incrementalPoints: number;
}

// ---------------------------------------------------------------------------
// Build simulation state from progress + event data
// ---------------------------------------------------------------------------

/**
 * A requirement is "settled" if the optimizer should not plan tokens for it.
 * Cleared: definitively done. StopHere: user explicitly won't clear.
 */
function isSettled(status: number): boolean {
	return (
		status === REQUIREMENT_STATUS.Cleared ||
		status === REQUIREMENT_STATUS.StopHere
	);
}

/**
 * Compute incremental points a requirement gives if the optimizer clears it.
 * For PartiallyCleared, subtracts already-earned partial points from the total.
 */
function remainingPoints(
	req: BattleRequirementProgress | undefined,
	reqId: string,
	fullPoints: number,
): number {
	if (!req) return fullPoints;
	if (isSettled(req.status)) return 0;
	if (req.status === REQUIREMENT_STATUS.PartiallyCleared) {
		if (reqId === KILL_POINTS_ID) {
			return Math.max(0, fullPoints - (req.killScore ?? 0));
		}
		if (reqId === "_highScore") {
			return Math.max(0, fullPoints - (req.highScore ?? 0));
		}
	}
	return fullPoints;
}

/**
 * Convert progress data + event into mutable simulation state.
 * Each requirement gets its point value and completed flag.
 */
function buildSimTracks(
	event: LreEvent,
	leBattle: LeBattle | undefined,
	progressData?: LreProgressData,
): SimTrack[] {
	return TRACK_IDS.map((trackId) => {
		const track = event[trackId];
		const leTrack = leBattle?.[trackId];
		const tp = progressData?.tracksProgress.find((t) => t.trackId === trackId);

		const battles: SimBattle[] = [];
		for (let i = 0; i < event.battlesCount; i++) {
			const bp = tp?.battles.find((b) => b.battleIndex === i);
			const reqs: SimRequirement[] = [];

			// _killPoints
			const killReq = bp?.requirements.find((r) => r.id === KILL_POINTS_ID);
			const killPts = track.battlesPoints[i] ?? 0;
			reqs.push({
				id: KILL_POINTS_ID,
				completed: killReq ? isSettled(killReq.status) : false,
				points: remainingPoints(killReq, KILL_POINTS_ID, killPts),
			});

			// _highScore (acing bonus)
			const highReq = bp?.requirements.find((r) => r.id === "_highScore");
			const acingPts = leTrack?.battles[i]?.acingPoints ?? 0;
			reqs.push({
				id: "_highScore",
				completed: highReq ? isSettled(highReq.status) : false,
				points: remainingPoints(highReq, "_highScore", acingPts),
			});

			// _defeatAll
			const defeatPts = track.defeatAll?.[i];
			if (defeatPts != null) {
				const defeatReq = bp?.requirements.find((r) => r.id === "_defeatAll");
				reqs.push({
					id: "_defeatAll",
					completed: defeatReq ? isSettled(defeatReq.status) : false,
					points: remainingPoints(defeatReq, "_defeatAll", defeatPts),
				});
			}

			// Objectives from le-battles
			if (leTrack) {
				for (const obj of leTrack.objectives) {
					const key = objectiveKey(obj);
					const objReq = bp?.requirements.find((r) => r.id === key);
					reqs.push({
						id: key,
						completed: objReq ? isSettled(objReq.status) : false,
						points: remainingPoints(objReq, key, obj.points),
					});
				}
			}

			battles.push({ battleIndex: i, requirements: reqs });
		}

		return { trackId, battles };
	});
}

// ---------------------------------------------------------------------------
// Greedy optimizer
// ---------------------------------------------------------------------------

function isBattleComplete(battle: SimBattle): boolean {
	return battle.requirements.every((r) => r.completed);
}

/**
 * First battle with uncompleted requirements. Returns -1 if all done.
 */
function lowestAvailableBattle(track: SimTrack): number {
	for (let i = 0; i < track.battles.length; i++) {
		if (!isBattleComplete(track.battles[i])) return i;
	}
	return -1;
}

/**
 * Highest battle the player can reach, determined by _killPoints frontier.
 * You can play up to and including the first battle where _killPoints is not completed.
 * Returns -1 if the track is complete.
 */
function highestAvailableBattle(track: SimTrack): number {
	if (track.battles.every(isBattleComplete)) return -1;

	// First battle where _killPoints is NOT completed = the frontier
	for (let i = 0; i < track.battles.length; i++) {
		const killReq = track.battles[i].requirements.find(
			(r) => r.id === KILL_POINTS_ID,
		);
		if (killReq && !killReq.completed) return i;
	}

	// All killPoints completed; find last incomplete battle
	for (let i = track.battles.length - 1; i >= 0; i--) {
		if (!isBattleComplete(track.battles[i])) return i;
	}

	return -1;
}

/**
 * Which requirements a team clears incrementally on a battle.
 * Auto-clears (_killPoints, _highScore, _defeatAll) are cleared by any team.
 * Other restrictions only if the team covers them.
 */
function incrementalClears(
	battle: SimBattle,
	team: LreTeamData,
): SimRequirement[] {
	if (isBattleComplete(battle)) return [];

	// Team ceiling: can't clear battles beyond expectedBattleClears
	if (
		team.expectedBattleClears != null &&
		team.expectedBattleClears <= battle.battleIndex
	) {
		return [];
	}

	const teamRestrictions = new Set(team.restrictionIds);
	const cleared: SimRequirement[] = [];

	for (const req of battle.requirements) {
		if (req.completed) continue;
		if (AUTO_CLEAR_IDS.has(req.id) || teamRestrictions.has(req.id)) {
			cleared.push(req);
		}
	}

	return cleared;
}

function sumPoints(reqs: SimRequirement[]): number {
	let total = 0;
	for (const r of reqs) total += r.points;
	return total;
}

/**
 * Best token on a single track across all available battles.
 */
function bestTokenInTrack(
	track: SimTrack,
	teams: LreTeamData[],
	lo: number,
	hi: number,
): InternalToken | null {
	let best: InternalToken | null = null;

	for (let bi = lo; bi <= hi; bi++) {
		const battle = track.battles[bi];
		if (isBattleComplete(battle)) continue;

		for (const team of teams) {
			const cleared = incrementalClears(battle, team);
			const pts = sumPoints(cleared);
			if (pts > 0 && (best === null || pts > best.incrementalPoints)) {
				best = {
					team,
					battleIndex: bi,
					trackId: track.trackId,
					restrictionsCleared: cleared,
					incrementalPoints: pts,
				};
			}
		}
	}

	return best;
}

function isContinuation(
	token: InternalToken,
	last: InternalToken | undefined,
): boolean {
	if (!last) return false;
	return (
		token.trackId === last.trackId &&
		token.battleIndex === last.battleIndex + 1 &&
		token.team.name === last.team.name
	);
}

/**
 * Find the single best next token across all tracks.
 * Tiebreaking: points > team continuity > track order > higher battle.
 */
function nextBestToken(
	simTracks: SimTrack[],
	teams: LreTeamData[],
	last: InternalToken | undefined,
): InternalToken | null {
	const candidates: InternalToken[] = [];

	for (const st of simTracks) {
		const trackTeams = teams.filter((t) => t.trackId === st.trackId);
		if (trackTeams.length === 0) continue;

		const lo = lowestAvailableBattle(st);
		const hi = highestAvailableBattle(st);
		if (lo === -1 || hi === -1) continue;

		const best = bestTokenInTrack(st, trackTeams, lo, hi);
		if (best) candidates.push(best);
	}

	if (candidates.length === 0) return null;

	return candidates.reduce((a, b) => {
		if (b.incrementalPoints > a.incrementalPoints) return b;
		if (b.incrementalPoints < a.incrementalPoints) return a;
		// Tiebreak: team continuity
		if (isContinuation(b, last) && !isContinuation(a, last)) return b;
		if (!isContinuation(b, last) && isContinuation(a, last)) return a;
		// Tiebreak: track order
		if (b.trackId < a.trackId) return b;
		if (b.trackId > a.trackId) return a;
		// Tiebreak: higher battle (push further)
		if (b.battleIndex > a.battleIndex) return b;
		return a;
	});
}

function markCleared(token: InternalToken, simTracks: SimTrack[]): void {
	const track = simTracks.find((t) => t.trackId === token.trackId);
	if (!track) return;
	const battle = track.battles[token.battleIndex];
	if (!battle) return;

	for (const cr of token.restrictionsCleared) {
		const req = battle.requirements.find((r) => r.id === cr.id);
		if (req) req.completed = true;
	}
}

/**
 * Greedy token optimizer with per-requirement tracking.
 * Repeatedly finds the highest-point token until no more points can be gained.
 * Supports multi-token per battle, respects expectedBattleClears ceiling,
 * and uses team continuity tiebreaking.
 */
export function computeAllTokenUsage(
	teams: LreTeamData[],
	event: LreEvent,
	leBattle: LeBattle | undefined,
	progressData?: LreProgressData,
	startingPoints?: number,
): TokenUse[] {
	if (teams.length === 0) return [];

	const simTracks = buildSimTracks(event, leBattle, progressData);
	let totalPoints = startingPoints ?? 0;
	const tokens: TokenUse[] = [];
	let last: InternalToken | undefined;

	// Safety cap — 3× token budget should be more than enough
	const maxIterations = TOTAL_TOKENS_PER_EVENT * 3;

	for (let i = 0; i < maxIterations; i++) {
		const next = nextBestToken(simTracks, teams, last);
		if (!next) break;

		markCleared(next, simTracks);
		totalPoints += next.incrementalPoints;

		tokens.push({
			teamName: next.team.name,
			characterIds: next.team.characterIds,
			battleIndex: next.battleIndex,
			trackId: next.trackId,
			trackName: event[next.trackId].name,
			restrictionIds: next.restrictionsCleared.map((r) => r.id),
			incrementalPoints: next.incrementalPoints,
			totalPoints,
		});

		last = next;
	}

	return tokens;
}

// ---------------------------------------------------------------------------
// Display projection
// ---------------------------------------------------------------------------

const SHARD_GOALS = [
	"unlock",
	"fourStars",
	"fiveStars",
	"blueStar",
	"mythic",
] as const;

/**
 * Baseline state to project forward from (from API or defaults).
 */
export interface TokenBaseline {
	points: number;
	shards: number;
	engrams: number;
	chestsOpened: number;
}

/**
 * Convert token uses to display objects with cumulative progress.
 * Uses the API baseline as the starting state and computes deltas forward.
 */
export function getTokenDisplays(
	tokens: TokenUse[],
	event: LreEvent,
	baseline: TokenBaseline,
): TokenDisplay[] {
	// Compute what the pure points→engrams→chests→shards pipeline gives for the baseline points.
	// The delta between this and the actual API values represents bonus shards/engrams.
	const baselineComputed = computeProgress(baseline.points, event);
	const engramOffset = baseline.engrams - baselineComputed.engrams;
	const shardOffset = baseline.shards - baselineComputed.shards;
	const chestOffset = baseline.chestsOpened - baselineComputed.chestsOpened;

	let prevShards = baseline.shards;
	let prevMilestoneIdx = -1;

	// Pre-compute shard goals
	const goals = SHARD_GOALS.map((g) =>
		computeShardGoal(event.progression, g),
	).filter((g) => g > 0);

	return tokens.map((token, i) => {
		const computed = computeProgress(token.totalPoints, event);
		const engrams = computed.engrams + engramOffset;
		const chestsOpened = computed.chestsOpened + chestOffset;
		const shards = computed.shards + shardOffset;

		// Check if a new point milestone was achieved
		let achievedPointsMilestone = false;
		const currentMilestoneIdx = event.pointsMilestones.findIndex(
			(m) => m.cumulativePoints > token.totalPoints,
		);
		if (currentMilestoneIdx !== prevMilestoneIdx) {
			achievedPointsMilestone = true;
			prevMilestoneIdx = currentMilestoneIdx;
		}

		// Check if a new shard tier was achieved
		let achievedShardMilestone = false;
		if (shards > prevShards) {
			for (const goal of goals) {
				if (prevShards < goal && shards >= goal) {
					achievedShardMilestone = true;
					break;
				}
			}
		}

		// Shards to next goal
		const nextGoal = goals.find((g) => g > shards);
		const shardsToNextGoal = nextGoal ? nextGoal - shards : 0;

		prevShards = shards;

		return {
			...token,
			tokenIndex: i,
			engrams,
			chestsOpened,
			shards,
			achievedPointsMilestone,
			achievedShardMilestone,
			shardsToNextGoal,
		};
	});
}
