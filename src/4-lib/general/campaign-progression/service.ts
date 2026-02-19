/**
 * Campaign progression planner — computes which campaign nodes to beat next
 * for the biggest farming benefit based on current goals and campaign progress.
 */

import { getAllUpgradeLocations } from "../campaign-data.ts";
import { filterLocationsByCampaignProgress } from "../campaign-progress.ts";
import { type Campaign, PersonalGoalType } from "../constants.ts";
import type {
	CharacterRaidGoalSelect,
	ICharacterUpgradeRankGoal,
} from "../goals/types.ts";
import { getAllMaterials } from "../upgrade-data.ts";
import type {
	IBattleSavings,
	ICampaignProgressionData,
	ICampaignProgressionResult,
	IUnfarmableMaterial,
} from "./types.ts";

/**
 * Compute campaign progression recommendations based on goals and campaign progress.
 *
 * For each UpgradeRank goal, determines which locked campaign nodes would provide
 * the most energy savings if beaten, and identifies unfarmable materials.
 */
export async function computeCampaignProgression(
	goals: CharacterRaidGoalSelect[],
	campaignProgress: Map<Campaign, number>,
	inventory?: Record<string, number>,
): Promise<ICampaignProgressionResult> {
	const upgradeRankGoals = goals.filter(
		(g): g is ICharacterUpgradeRankGoal =>
			g.type === PersonalGoalType.UpgradeRank && g.include,
	);

	if (upgradeRankGoals.length === 0) {
		return {
			campaigns: [],
			unfarmableMaterials: [],
			currentTotalEnergy: 0,
			goalsAnalyzed: 0,
		};
	}

	// Step 1: Accumulate base materials needed across all goals
	const { getBaseUpgradesForRankUp } = await import("../upgrade-data.ts");
	const materialNeeds = new Map<string, { count: number; unitIds: string[] }>();

	// Use a shared inventory copy so materials are subtracted across goals by priority
	const inventoryCopy = inventory ? { ...inventory } : {};

	for (const goal of upgradeRankGoals) {
		// biome-ignore lint/performance/noAwaitInLoops: Goals must be processed sequentially — each consumes shared inventory
		const baseMaterials = await getBaseUpgradesForRankUp(
			goal.unitId,
			goal.rankStart,
			goal.rankEnd,
			goal.appliedUpgrades,
			goal.upgradesRarity,
			inventoryCopy,
		);

		for (const [materialId, count] of Object.entries(baseMaterials)) {
			const existing = materialNeeds.get(materialId);
			if (existing) {
				existing.count += count;
				if (!existing.unitIds.includes(goal.unitId)) {
					existing.unitIds.push(goal.unitId);
				}
			} else {
				materialNeeds.set(materialId, {
					count,
					unitIds: [goal.unitId],
				});
			}
		}
	}

	if (materialNeeds.size === 0) {
		return {
			campaigns: [],
			unfarmableMaterials: [],
			currentTotalEnergy: 0,
			goalsAnalyzed: upgradeRankGoals.length,
		};
	}

	// Step 2: For each material, split locations into farmable vs locked
	const allLocations = await getAllUpgradeLocations();
	const allMaterials = await getAllMaterials();

	const unfarmableMaterials: IUnfarmableMaterial[] = [];
	let currentTotalEnergy = 0;

	// Track per-material farming state
	const materialFarmState = new Map<
		string,
		{
			count: number;
			unitIds: string[];
			bestFarmableEnergy: number | undefined;
			currentCost: number;
			canFarm: boolean;
		}
	>();

	for (const [materialId, { count, unitIds }] of materialNeeds) {
		const locations = allLocations.get(materialId) ?? [];
		const farmable = filterLocationsByCampaignProgress(
			locations,
			campaignProgress,
		);

		const canFarm = farmable.length > 0;
		const bestFarmableEnergy = canFarm ? farmable[0].energyPerItem : undefined;
		const currentCost = bestFarmableEnergy ? bestFarmableEnergy * count : 0;

		if (canFarm) {
			currentTotalEnergy += currentCost;
		}

		if (!canFarm) {
			const mat = allMaterials.get(materialId);
			unfarmableMaterials.push({
				materialId,
				materialLabel: mat?.label ?? materialId,
				materialIcon: mat?.icon,
				count,
				unitIds,
			});
		}

		materialFarmState.set(materialId, {
			count,
			unitIds,
			bestFarmableEnergy,
			currentCost,
			canFarm,
		});
	}

	// Step 3: For each campaign with locked nodes, compute savings
	const campaignSavingsMap = new Map<Campaign, IBattleSavings[]>();

	for (const [materialId, state] of materialFarmState) {
		const locations = allLocations.get(materialId) ?? [];
		const mat = allMaterials.get(materialId);
		const materialLabel = mat?.label ?? materialId;

		// Get locked locations (not yet beaten)
		const locked = locations.filter((loc) => {
			const maxNode = campaignProgress.get(loc.campaign);
			// If campaign not started, node is locked
			if (maxNode === undefined) return true;
			return loc.nodeNumber > maxNode;
		});

		for (const loc of locked) {
			let savings = 0;

			if (!state.canFarm) {
				// Material is unfarmable — any node that provides it is valuable
				// Savings = the energy cost at this node (it's the only option)
				savings = loc.energyPerItem * state.count;
			} else if (state.bestFarmableEnergy !== undefined) {
				// Material is farmable — savings is the difference
				const newCost = loc.energyPerItem * state.count;
				const currentCost = state.currentCost;
				// Only record if this node is actually cheaper (with a small margin)
				if (currentCost - state.count / 2 > newCost) {
					savings = currentCost - newCost;
				}
			}

			if (savings <= 0) continue;

			const entry: IBattleSavings = {
				battleId: loc.battleId,
				campaign: loc.campaign,
				nodeNumber: loc.nodeNumber,
				materialId,
				materialLabel,
				materialIcon: mat?.icon,
				materialCount: state.count,
				unitIds: state.unitIds,
				savings,
				cumulativeSavings: 0, // computed below
				canFarmPrior: state.canFarm,
				energyPerItem: loc.energyPerItem,
			};

			const existing = campaignSavingsMap.get(loc.campaign);
			if (existing) {
				existing.push(entry);
			} else {
				campaignSavingsMap.set(loc.campaign, [entry]);
			}
		}
	}

	// Sort each campaign's savings by nodeNumber and compute cumulative
	const campaigns: ICampaignProgressionData[] = [];

	for (const [campaign, savings] of campaignSavingsMap) {
		savings.sort((a, b) => a.nodeNumber - b.nodeNumber);

		let cumulative = 0;
		for (const entry of savings) {
			cumulative += entry.savings;
			entry.cumulativeSavings = cumulative;
		}

		campaigns.push({
			campaign,
			savings,
			totalSavings: cumulative,
		});
	}

	// Sort campaigns by total savings descending
	campaigns.sort((a, b) => b.totalSavings - a.totalSavings);

	return {
		campaigns,
		unfarmableMaterials,
		currentTotalEnergy,
		goalsAnalyzed: upgradeRankGoals.length,
	};
}
