import type { CampaignType, RarityString } from "../constants.ts";

export type FarmStrategy = "leastEnergy" | "allLocations" | "custom";

export type CustomFarmSelections = Partial<
	Record<RarityString, CampaignType[]>
>;

export const DEFAULT_CUSTOM_FARM_SELECTIONS: CustomFarmSelections = {
	Mythic: ["Extremis"],
	Legendary: ["Elite", "Extremis", "Mirror", "Standard"],
	Epic: ["Elite", "Extremis", "Mirror", "Standard"],
	Rare: ["Elite", "Extremis", "Mirror", "Standard"],
	Uncommon: ["Elite", "Extremis", "Early", "Mirror", "Standard"],
	Common: ["Elite", "Extremis", "Mirror", "Standard"],
};

export interface ITodayActivity {
	/** Total energy spent today across ALL nodes (plan + non-plan) */
	energySpent: number;
	/** Total battles done today across ALL nodes (plan + non-plan) */
	battlesDone: number;
}

export interface IRaidLocation {
	battleId: string;
	campaign: string;
	nodeNumber: number;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: number;
	raidsCount: number;
	farmedItems: number;
	energySpent: number;
	/** Remaining daily attempts from sync data (only set on Day 1) */
	attemptsLeftToday?: number;
}

export interface IDailyRaid {
	materialId: string;
	materialLabel: string;
	materialIcon?: string;
	goalId: string;
	requiredCount: number;
	acquiredCount: number;
	remainingCount: number;
	/** Current inventory count (from sync) before any simulated farming */
	ownedCount: number;
	unitIds: string[];
	raidLocations: IRaidLocation[];
}

export interface IDailyRaidsDay {
	dayNumber: number;
	raids: IDailyRaid[];
	energyTotal: number;
	raidsTotal: number;
}

export interface IBlockedMaterial {
	materialId: string;
	materialLabel: string;
	materialIcon?: string;
	count: number;
	unitIds: string[];
}

export interface IDailyRaidsPlan {
	days: IDailyRaidsDay[];
	totalDays: number;
	totalEnergy: number;
	totalRaids: number;
	blockedMaterials: IBlockedMaterial[];
}
