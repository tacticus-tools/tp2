import type { Campaign } from "../constants";

export interface IMaterialFarmData {
	materialId: string;
	materialLabel: string;
	count: number;
	canFarm: boolean;
	totalEnergy: number;
	bestEnergyPerItem?: number;
}

export interface IBattleSavings {
	battleId: string;
	campaign: Campaign;
	nodeNumber: number;
	materialId: string;
	materialLabel: string;
	materialIcon?: string;
	materialCount: number;
	unitIds: string[];
	savings: number;
	cumulativeSavings: number;
	canFarmPrior: boolean;
	energyPerItem: number;
}

export interface ICampaignProgressionData {
	campaign: Campaign;
	savings: IBattleSavings[];
	totalSavings: number;
}

export interface IUnfarmableMaterial {
	materialId: string;
	materialLabel: string;
	materialIcon?: string;
	count: number;
	unitIds: string[];
}

export interface ICampaignProgressionResult {
	campaigns: ICampaignProgressionData[];
	unfarmableMaterials: IUnfarmableMaterial[];
	currentTotalEnergy: number;
	goalsAnalyzed: number;
}
