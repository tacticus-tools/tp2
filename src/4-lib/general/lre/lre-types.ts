import type { Data } from "@/5-assets/lre/generate-data.ts";
import type { DeepReadonly } from "@/types.ts";

export type LreEvent = DeepReadonly<Data[number]>;
export type TrackId = "alpha" | "beta" | "gamma";

export const REQUIREMENT_STATUS = {
	NotCleared: 0,
	Cleared: 1,
	MaybeClear: 2,
	StopHere: 3,
	PartiallyCleared: 4,
} as const;
export type RequirementStatus =
	(typeof REQUIREMENT_STATUS)[keyof typeof REQUIREMENT_STATUS];

export interface BattleRequirementProgress {
	id: string;
	status: RequirementStatus;
	killScore?: number;
	highScore?: number;
}

export interface BattleProgress {
	battleIndex: number;
	requirements: BattleRequirementProgress[];
}

export interface TrackProgress {
	trackId: TrackId;
	battles: BattleProgress[];
}

export type Occurrence = 1 | 2 | 3;

export interface OccurrenceProgress {
	occurrence: Occurrence;
	freeMissions: number;
	premiumMissions: number;
	bundlePurchased: boolean;
	ohSoCloseShards: number;
}

export interface LreProgressData {
	tracksProgress: TrackProgress[];
	occurrenceProgress: OccurrenceProgress[];
	notes: string;
}

export interface LreTeamData {
	name: string;
	trackId: TrackId;
	characterIds: string[];
	restrictionIds: string[];
	expectedBattleClears?: number;
	notes?: string;
}

export interface TokenUse {
	teamName: string;
	characterIds: string[];
	battleIndex: number;
	trackId: TrackId;
	trackName: string;
	restrictionIds: string[];
	incrementalPoints: number;
	totalPoints: number;
}

export interface TokenDisplay extends TokenUse {
	tokenIndex: number;
	engrams: number;
	chestsOpened: number;
	shards: number;
	achievedPointsMilestone: boolean;
	achievedShardMilestone: boolean;
	shardsToNextGoal: number;
}

/**
 * Summary data synced directly from the Tacticus game API.
 * These are authoritative values from the game server.
 */
export interface ApiLreSummary {
	currentPoints: number;
	currentCurrency: number;
	currentShards: number;
	currentClaimedChestIndex: number | undefined;
	currentRun: number | undefined;
	tokensRemaining: number | undefined;
	tokensMax: number | undefined;
}
