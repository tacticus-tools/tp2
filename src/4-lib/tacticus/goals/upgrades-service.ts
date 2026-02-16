import type { IUpgradeLocation } from "../campaign-data";
import { getAllUpgradeLocations } from "../campaign-data";
import { filterLocationsByCampaignProgress } from "../campaign-progress";
import type { Campaign, Rank, Rarity } from "../enums";
import { rankToLevel } from "../rank-data";
import { getBaseUpgradesForRankUp } from "../upgrade-data";

export interface IUpgradeEstimate {
	daysTotal: number;
	energyTotal: number;
	raidsTotal: number;
}

/**
 * Estimate the upgrade material farming time for a rank-up goal.
 *
 * Uses real recipe data to determine exact base materials needed,
 * then looks up the cheapest farming locations for each material
 * to compute accurate energy and raid estimates.
 */
export async function estimateUpgradeDays(
	unitId: string,
	rankStart: Rank,
	rankEnd: Rank,
	dailyEnergy: number,
	appliedUpgrades: string[] = [],
	upgradesRarity: Rarity[] = [],
	inventory: Record<string, number> = {},
	campaignProgress: Map<Campaign, number> = new Map(),
): Promise<IUpgradeEstimate> {
	if (rankEnd <= rankStart || dailyEnergy <= 0) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	const startLevel = rankToLevel[rankStart];
	const endLevel = rankToLevel[rankEnd];
	if (startLevel === undefined || endLevel === undefined) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	// Get actual base materials needed for this rank-up (subtracting inventory)
	const baseUpgrades = await getBaseUpgradesForRankUp(
		unitId,
		rankStart,
		rankEnd,
		appliedUpgrades,
		upgradesRarity,
		inventory,
	);

	const materialIds = Object.keys(baseUpgrades);
	if (materialIds.length === 0) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	// Get all upgrade locations indexed by material
	const allLocations = await getAllUpgradeLocations();

	// For each material, compute energy needed using the cheapest location
	let totalEnergy = 0;
	let totalRaids = 0;
	let totalDailyRaids = 0; // sum of dailyBattleCount across unique nodes

	// Track unique nodes we need to farm (for daily raid limit calculation)
	const nodeRaids: Array<{
		dailyBattleCount: number;
		energyCost: number;
		raidsNeeded: number;
	}> = [];

	for (const [materialId, count] of Object.entries(baseUpgrades)) {
		const rawLocations = allLocations.get(materialId);
		const locations = rawLocations
			? filterLocationsByCampaignProgress<IUpgradeLocation>(
					rawLocations,
					campaignProgress,
				)
			: undefined;
		if (!locations || locations.length === 0) {
			// No known farming location — use fallback estimate
			totalEnergy += count * 18; // ~18 energy per item fallback
			totalRaids += count * 3; // ~3 raids per item fallback
			continue;
		}

		// Use the best (cheapest energy-per-item) location
		const best = locations[0];
		const raidsNeeded = Math.ceil(count / best.dropRate);
		const energy = raidsNeeded * best.energyCost;

		totalEnergy += energy;
		totalRaids += raidsNeeded;
		nodeRaids.push({
			dailyBattleCount: best.dailyBattleCount,
			energyCost: best.energyCost,
			raidsNeeded,
		});
		totalDailyRaids += best.dailyBattleCount;
	}

	if (totalRaids <= 0) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	// Calculate days: limited by either energy per day or daily raid limits per node
	// Each node has a dailyBattleCount limit, and we're limited by total dailyEnergy
	const energyLimitedRaidsPerDay =
		totalDailyRaids > 0
			? // Scale raids by energy constraint: if we need more energy than available,
				// reduce proportionally
				Math.min(totalDailyRaids, dailyEnergy / (totalEnergy / totalRaids))
			: 0;

	if (energyLimitedRaidsPerDay <= 0) {
		return {
			daysTotal: Number.POSITIVE_INFINITY,
			energyTotal: totalEnergy,
			raidsTotal: totalRaids,
		};
	}

	const daysTotal = Math.ceil(totalRaids / energyLimitedRaidsPerDay);

	return { daysTotal, energyTotal: totalEnergy, raidsTotal: totalRaids };
}
