import type { Campaign } from "../constants";

export interface IRaidLocation {
	battleId: string;
	campaign: Campaign;
	nodeNumber: number;
	energyCost: number;
	dailyBattleCount: number;
	dropRate: number;
	raidsCount: number;
	farmedItems: number;
	energySpent: number;
}

export interface IDailyRaid {
	materialId: string;
	materialLabel: string;
	materialIcon?: string;
	goalId: string;
	requiredCount: number;
	acquiredCount: number;
	remainingCount: number;
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
