import type { Rarity } from "#common/rarity.ts";
import type { CharacterId } from "@/5-assets/characters/index.ts";
import {
	getAllUpgradeLocations,
	type IUpgradeLocation,
} from "../campaign-data.ts";
import {
	type CampaignEventType,
	filterLocationsByCampaignEvent,
} from "../campaign-events.ts";
import { filterLocationsByCampaignProgress } from "../campaign-progress.ts";
import type { Rank } from "../constants.ts";
import { rankToLevel } from "../rank-data.ts";
import { getBaseUpgradesForRankUp } from "../upgrade-data.ts";

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
export function estimateUpgradeDays(
	unitId: CharacterId,
	rankStart: Rank,
	rankEnd: Rank,
	dailyEnergy: number,
	appliedUpgrades: string[] = [],
	upgradesRarity: Rarity[] = [],
	inventory: Record<string, number> = {},
	campaignProgress: Record<string, number> = {},
	campaignEvent: CampaignEventType = "none",
	mutateInventory = false,
): IUpgradeEstimate {
	if (rankEnd <= rankStart || dailyEnergy <= 0) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	const startLevel = rankToLevel[rankStart];
	const endLevel = rankToLevel[rankEnd];
	if (startLevel === undefined || endLevel === undefined) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	// Get actual base materials needed for this rank-up (subtracting inventory)
	const baseUpgrades = getBaseUpgradesForRankUp(
		unitId,
		rankStart,
		rankEnd,
		appliedUpgrades,
		upgradesRarity,
		inventory,
		mutateInventory,
	);

	const materialIds = Object.keys(baseUpgrades);
	if (materialIds.length === 0) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	// Get all upgrade locations indexed by material
	const allLocations = getAllUpgradeLocations();

	// Per-material estimation: each material has its own daily raid cap,
	// so we compute days per material and take the bottleneck (max).
	let totalEnergy = 0;
	let totalRaids = 0;
	let maxDaysFromRaidLimits = 0;

	for (const [materialId, count] of Object.entries(baseUpgrades)) {
		const rawLocations = allLocations[materialId];
		const progressFiltered = rawLocations
			? filterLocationsByCampaignProgress<IUpgradeLocation>(
					rawLocations,
					campaignProgress,
				)
			: undefined;
		const locations = progressFiltered
			? filterLocationsByCampaignEvent(progressFiltered, campaignEvent)
			: undefined;
		if (!locations || locations.length === 0) {
			// No known farming location — use fallback estimate
			totalEnergy += count * 18; // ~18 energy per item fallback
			totalRaids += count * 3; // ~3 raids per item fallback
			continue;
		}

		// Use the best (cheapest energy-per-item) location for energy calculation
		const best = locations[0];
		const raidsNeeded = Math.ceil(count / best.dropRate);
		const energy = raidsNeeded * best.energyCost;

		totalEnergy += energy;
		totalRaids += raidsNeeded;

		// Sum daily raid capacity across locations with the same efficiency tier.
		// Locations are sorted by energy-per-item (cheapest first). We only
		// count nodes matching the best ratio — e.g. two elite nodes for the
		// same legendary material both count, but cheaper normal nodes don't.
		const bestCostPerItem = best.energyCost / best.dropRate;
		const seenBattleIds = new Set<string>();
		let materialDailyRaids = 0;
		for (const loc of locations) {
			if (loc.energyCost / loc.dropRate > bestCostPerItem * 1.01) break;
			if (!seenBattleIds.has(loc.battleId)) {
				seenBattleIds.add(loc.battleId);
				materialDailyRaids += loc.dailyBattleCount;
			}
		}

		// Days to farm this material, limited by its daily raid cap
		if (materialDailyRaids > 0) {
			const daysForMaterial = Math.ceil(raidsNeeded / materialDailyRaids);
			maxDaysFromRaidLimits = Math.max(maxDaysFromRaidLimits, daysForMaterial);
		}
	}

	if (totalRaids <= 0) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	// Days limited by total energy budget
	const daysFromEnergy = Math.ceil(totalEnergy / dailyEnergy);

	// The bottleneck is whichever takes longer
	const daysTotal = Math.max(maxDaysFromRaidLimits, daysFromEnergy);

	return { daysTotal, energyTotal: totalEnergy, raidsTotal: totalRaids };
}
