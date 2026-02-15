import {
	type Alliance,
	type CampaignsLocationsUsage,
	PersonalGoalType,
	type Rank,
	type Rarity,
	type RarityStars,
} from "../enums";

/**
 * Stored goal shape — what we persist in Convex.
 * The `data` field holds type-specific JSON.
 */
export interface IStoredGoal {
	goalId: string;
	type: PersonalGoalType;
	unitId: string;
	unitName: string;
	priority: number;
	include: boolean;
	notes?: string;
	data: string;
}

/**
 * Generic personal goal interface (matches tacticusplanner's IPersonalGoal).
 * Used for serialization/deserialization between Convex and typed goals.
 */
export interface IPersonalGoal {
	id: string;
	type: PersonalGoalType;
	priority: number;
	dailyRaids: boolean;
	character: string;
	notes?: string;

	// UpgradeRank
	startingRank?: Rank;
	startingRankPoint5?: boolean;
	targetRank?: Rank;
	rankPoint5?: boolean;
	upgradesRarity?: Rarity[];

	// Ascend
	targetRarity?: Rarity;
	targetStars?: RarityStars;
	campaignsUsage?: CampaignsLocationsUsage;
	mythicCampaignsUsage?: CampaignsLocationsUsage;
	shardsPerToken?: number;
	mythicShardsPerToken?: number;

	// Abilities
	firstAbilityLevel?: number;
	secondAbilityLevel?: number;
}

// --- Typed goal shapes (runtime, not stored) ---

export interface ICharacterRaidGoalSelectBase {
	priority: number;
	include: boolean;
	goalId: string;
	unitId: string;
	unitName: string;
	unitAlliance: Alliance;
	notes: string;
}

export interface ICharacterUpgradeRankGoal
	extends ICharacterRaidGoalSelectBase {
	type: PersonalGoalType.UpgradeRank;
	rankStart: Rank;
	rankEnd: Rank;
	rankStartPoint5: boolean;
	rankPoint5: boolean;
	appliedUpgrades: string[];
	upgradesRarity: Rarity[];
	rarity: Rarity;
	level: number;
	xp: number;
}

export interface ICharacterAscendGoal extends ICharacterRaidGoalSelectBase {
	type: PersonalGoalType.Ascend;
	rarityStart: Rarity;
	rarityEnd: Rarity;
	starsStart: RarityStars;
	starsEnd: RarityStars;
	shards: number;
	mythicShards: number;
	onslaughtShards: number;
	onslaughtMythicShards: number;
	campaignsUsage: CampaignsLocationsUsage;
	mythicCampaignsUsage: CampaignsLocationsUsage;
}

export interface ICharacterUnlockGoal extends ICharacterRaidGoalSelectBase {
	type: PersonalGoalType.Unlock;
	shards: number;
	mythicShards: 0;
	rank: Rank;
	rarity: Rarity;
	faction: string;
	campaignsUsage: CampaignsLocationsUsage;
}

export interface ICharacterUpgradeMow extends ICharacterRaidGoalSelectBase {
	type: PersonalGoalType.MowAbilities;
	primaryStart: number;
	primaryEnd: number;
	secondaryStart: number;
	secondaryEnd: number;
	upgradesRarity: Rarity[];
	shards: number;
	stars: RarityStars;
	rarity: Rarity;
}

export interface ICharacterUpgradeAbilities
	extends ICharacterRaidGoalSelectBase {
	type: PersonalGoalType.CharacterAbilities;
	level: number;
	xp: number;
	activeStart: number;
	activeEnd: number;
	passiveStart: number;
	passiveEnd: number;
}

export type CharacterRaidGoalSelect =
	| ICharacterUpgradeRankGoal
	| ICharacterAscendGoal
	| ICharacterUnlockGoal
	| ICharacterUpgradeMow
	| ICharacterUpgradeAbilities;

export interface IGoalEstimate {
	goalId: string;
	daysTotal: number;
	daysLeft: number;
	xpDaysLeft?: number;
	energyTotal: number;
	oTokensTotal: number;
	xpBooksTotal: number;
	xpBooksApplied?: number;
	xpBooksRequired?: number;
}

/** Goal type labels for display */
export const goalTypeLabels: Record<PersonalGoalType, string> = {
	[PersonalGoalType.UpgradeRank]: "Rank Up",
	[PersonalGoalType.Ascend]: "Ascend",
	[PersonalGoalType.Unlock]: "Unlock",
	[PersonalGoalType.MowAbilities]: "MoW Abilities",
	[PersonalGoalType.CharacterAbilities]: "Abilities",
};
