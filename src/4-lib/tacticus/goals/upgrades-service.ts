import type { Rank } from "../enums";
import { rankToLevel } from "../rank-data";

export interface IUpgradeEstimate {
	daysTotal: number;
	energyTotal: number;
	raidsTotal: number;
}

/** Default energy per upgrade raid */
const ENERGY_PER_RAID = 12;
/** Average drops per raid for upgrade materials */
const DROPS_PER_RAID = 1.5;
/** Max daily raids per campaign node */
const MAX_DAILY_RAIDS = 5;
/** Number of unique upgrade materials per rank */
const UPGRADES_PER_RANK = 6;
/** Average total material count needed per rank */
const AVG_MATERIALS_PER_RANK = 15;

/**
 * Estimate the upgrade material farming time for a rank-up goal.
 *
 * This is a simplified model that estimates based on the number of rank
 * transitions. The full tacticusplanner model tracks individual materials
 * against inventory, which requires the complete upgrade recipe database.
 */
export function estimateUpgradeDays(
	rankStart: Rank,
	rankEnd: Rank,
	dailyEnergy: number,
): IUpgradeEstimate {
	if (rankEnd <= rankStart || dailyEnergy <= 0) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	const startLevel = rankToLevel[rankStart];
	const endLevel = rankToLevel[rankEnd];
	if (startLevel === undefined || endLevel === undefined) {
		return { daysTotal: 0, energyTotal: 0, raidsTotal: 0 };
	}

	// Number of rank transitions
	const rankTransitions = rankEnd - rankStart;

	// Each rank requires farming ~6 unique materials, ~15 total items
	const totalMaterialsNeeded = rankTransitions * AVG_MATERIALS_PER_RANK;
	const totalRaids = Math.ceil(totalMaterialsNeeded / DROPS_PER_RAID);
	const energyTotal = totalRaids * ENERGY_PER_RAID;

	// How many unique nodes we need to raid per day
	// Each node allows MAX_DAILY_RAIDS, but we may need multiple nodes
	const uniqueNodesPerRank = UPGRADES_PER_RANK;
	const raidsPerDay = Math.min(
		uniqueNodesPerRank * MAX_DAILY_RAIDS,
		Math.floor(dailyEnergy / ENERGY_PER_RAID),
	);

	if (raidsPerDay <= 0) {
		return {
			daysTotal: Number.POSITIVE_INFINITY,
			energyTotal,
			raidsTotal: totalRaids,
		};
	}

	const daysTotal = Math.ceil(totalRaids / raidsPerDay);

	return { daysTotal, energyTotal, raidsTotal: totalRaids };
}
