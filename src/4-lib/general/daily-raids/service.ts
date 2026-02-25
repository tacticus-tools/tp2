/**
 * Daily raids planner — simulates day-by-day energy allocation across all
 * active upgrade goals, producing a concrete farming plan.
 *
 * Adapted from tacticusplanner's UpgradesService:
 * - populateLocationsData: filters locations by strategy (leastEnergy -> cheapest only)
 * - getEstimatesByPriority: per-goal material ordering with shared inventory
 * - getUpgradeEstimate: inner sim for energyTotal/energyLeft per material
 * - generateDailyRaidsList: outer day-by-day simulation
 * - _planRaidsForMaterial: per-material raid planning within a day
 */

import {
	getAllUpgradeLocations,
	type IUpgradeLocation,
} from "../campaign-data.ts";
import {
	type CampaignEventType,
	filterLocationsByCampaignEvent,
	type HomeScreenEventType,
	sortEstimatesForHse,
} from "../campaign-events.ts";
import { filterLocationsByCampaignProgress } from "../campaign-progress.ts";
import {
	type Campaign,
	type CampaignType,
	PersonalGoalType,
	type RarityString,
} from "../constants.ts";
import type {
	CharacterRaidGoalSelect,
	ICharacterUpgradeRankGoal,
} from "../goals/types.ts";
import { getAllMaterials, getBaseUpgradesForRankUp } from "../upgrade-data.ts";
import type {
	CustomFarmSelections,
	FarmStrategy,
	IBlockedMaterial,
	IDailyRaid,
	IDailyRaidsDay,
	IDailyRaidsPlan,
	IRaidLocation,
} from "./types.ts";

/**
 * Internal per-material estimate used during simulation.
 * In goal-priority mode, the same materialId may appear multiple times
 * (once per goal that needs it), each with its own energyLeft budget.
 */
interface IMaterialEstimate {
	materialId: string;
	materialLabel: string;
	materialIcon?: string;
	requiredCount: number;
	acquiredCount: number;
	unitIds: string[];
	goalId: string;
	locations: IUpgradeLocation[];
	energyTotal: number;
	energyLeft: number;
	daysTotal: number;
	raidsTotal: number;
	isBlocked: boolean;
	isFinished: boolean;
}

const RARITY_NUM_TO_STRING: Record<number, RarityString> = {
	0: "Common",
	1: "Uncommon",
	2: "Rare",
	3: "Epic",
	4: "Legendary",
	5: "Mythic",
};

/**
 * Filter locations by farm strategy.
 * - leastEnergy: only keep locations with the minimum energyPerItem
 * - allLocations: keep all locations (maximum daily throughput)
 * - custom: filter by per-rarity campaign type selections
 */
function filterLocationsByStrategy(
	locations: IUpgradeLocation[],
	farmStrategy: FarmStrategy,
	materialRarity?: number,
	customFarmSelections?: CustomFarmSelections,
): IUpgradeLocation[] {
	if (locations.length === 0) return locations;

	if (farmStrategy === "leastEnergy") {
		const minEnergy = Math.min(...locations.map((l) => l.energyPerItem));
		return locations.filter((l) => l.energyPerItem === minEnergy);
	}

	if (
		farmStrategy === "custom" &&
		customFarmSelections &&
		materialRarity !== undefined
	) {
		const rarityKey = RARITY_NUM_TO_STRING[materialRarity];
		const allowedTypes = rarityKey
			? customFarmSelections[rarityKey]
			: undefined;
		if (allowedTypes && allowedTypes.length > 0) {
			const filtered = locations.filter((l) =>
				allowedTypes.includes(l.campaignType as CampaignType),
			);
			// Fallback to all locations if no matches
			return filtered.length > 0 ? filtered : locations;
		}
	}

	// allLocations (or custom with no selections): use all locations
	return locations;
}

/**
 * Pre-compute per-material estimate via inner daily simulation.
 * Mirrors tacticusplanner's getUpgradeEstimate.
 */
function computeMaterialEstimate(
	materialId: string,
	materialLabel: string,
	materialIcon: string | undefined,
	requiredCount: number,
	acquiredCount: number,
	unitIds: string[],
	goalId: string,
	locations: IUpgradeLocation[],
): IMaterialEstimate {
	const leftCount = Math.max(requiredCount - acquiredCount, 0);

	const estimate: IMaterialEstimate = {
		materialId,
		materialLabel,
		materialIcon,
		requiredCount,
		acquiredCount,
		unitIds,
		goalId,
		locations,
		energyTotal: 0,
		energyLeft: 0,
		daysTotal: 0,
		raidsTotal: 0,
		isBlocked: locations.length === 0 && leftCount > 0,
		isFinished: leftCount === 0,
	};

	if (estimate.isFinished || estimate.isBlocked) {
		return estimate;
	}

	// Inner simulation: how many days/energy/raids to farm leftCount items.
	// On the last partial day, round up to the full daily allocation so the
	// outer day-by-day sim can use all available attempts instead of capping
	// at a tight fractional budget.
	let energyTotal = 0;
	let raidsTotal = 0;
	let farmedItems = 0;
	let daysTotal = 0;

	while (farmedItems < leftCount) {
		let leftToFarm = leftCount - farmedItems;
		for (const loc of locations) {
			const dailyEnergy = loc.dailyBattleCount * loc.energyCost;
			const dailyFarmedItems = dailyEnergy / loc.energyPerItem;
			if (leftToFarm >= dailyFarmedItems) {
				leftToFarm -= dailyFarmedItems;
				energyTotal += dailyEnergy;
				farmedItems += dailyFarmedItems;
				raidsTotal += loc.dailyBattleCount;
			} else {
				// Use full daily allocation so the outer sim can plan all daily attempts
				farmedItems += dailyFarmedItems;
				energyTotal += dailyEnergy;
				raidsTotal += loc.dailyBattleCount;
				break;
			}
		}
		daysTotal++;
		if (daysTotal > 1000) break;
	}

	estimate.daysTotal = daysTotal;
	estimate.raidsTotal = raidsTotal;
	estimate.energyTotal = energyTotal;
	estimate.energyLeft = energyTotal;

	return estimate;
}

/**
 * Plan raids for a single material within a day.
 * Mirrors tacticusplanner's _planRaidsForMaterial.
 *
 * On Day 1, `battleAttempts` supplies actual remaining attempts from sync data.
 * On subsequent days all locations get their full `dailyBattleCount`.
 */
function planRaidsForMaterial(
	material: IMaterialEstimate,
	energyLeft: number,
	plannedLocationIds: Set<string>,
	battleAttempts: Map<string, number> | null,
): { raidLocations: IRaidLocation[]; energySpent: number } {
	const raidLocations: IRaidLocation[] = [];
	let totalEnergySpent = 0;

	const availableLocations = material.locations.filter(
		(loc) => !plannedLocationIds.has(loc.battleId),
	);

	for (const loc of availableLocations) {
		// On Day 1, use actual remaining attempts from sync; otherwise full daily count
		const syncKey = `${loc.campaign}:${loc.nodeNumber}`;
		const syncAttempts = battleAttempts?.get(syncKey);
		const attemptsLeft = syncAttempts ?? loc.dailyBattleCount;

		// Fully farmed today → include as a zero-raid entry so the UI can show it
		if (attemptsLeft <= 0) {
			if (syncAttempts !== undefined) {
				raidLocations.push({
					battleId: loc.battleId,
					campaign: loc.campaign,
					nodeNumber: loc.nodeNumber,
					energyCost: loc.energyCost,
					dailyBattleCount: loc.dailyBattleCount,
					dropRate: loc.dropRate,
					raidsCount: 0,
					farmedItems: 0,
					energySpent: 0,
					attemptsLeftToday: 0,
				});
			}
			continue;
		}

		if (energyLeft <= 0) break;

		const energyForFullAttempts = attemptsLeft * loc.energyCost;
		const energyToFarmMaterial = Math.min(material.energyLeft, energyLeft);
		const energyToSpend = Math.min(energyToFarmMaterial, energyForFullAttempts);

		if (energyToSpend < loc.energyCost) continue;

		const battlesToRaid = Math.floor(energyToSpend / loc.energyCost);
		const energySpentOnLocation = battlesToRaid * loc.energyCost;

		energyLeft -= energySpentOnLocation;
		material.energyLeft -= energySpentOnLocation;
		totalEnergySpent += energySpentOnLocation;

		raidLocations.push({
			battleId: loc.battleId,
			campaign: loc.campaign,
			nodeNumber: loc.nodeNumber,
			energyCost: loc.energyCost,
			dailyBattleCount: loc.dailyBattleCount,
			dropRate: loc.dropRate,
			raidsCount: battlesToRaid,
			farmedItems: energySpentOnLocation / loc.energyPerItem,
			energySpent: energySpentOnLocation,
			attemptsLeftToday: syncAttempts !== undefined ? syncAttempts : undefined,
		});
	}

	return { raidLocations, energySpent: totalEnergySpent };
}

/**
 * Build estimates using goal-priority ordering.
 * Materials for goal #1 come first (sorted slowest-to-farm within the goal),
 * then goal #2's, etc. Each goal consumes shared inventory before the next.
 */
function buildEstimatesByPriority(
	upgradeRankGoals: ICharacterUpgradeRankGoal[],
	inventory: Record<string, number>,
	campaignProgress: Map<Campaign, number>,
	farmStrategy: FarmStrategy,
	campaignEvent: CampaignEventType = "none",
	customFarmSelections?: CustomFarmSelections,
): {
	allEstimates: IMaterialEstimate[];
	blockedMaterials: IBlockedMaterial[];
	materialUnitIds: Map<string, string[]>;
} {
	const allLocations = getAllUpgradeLocations();
	const allMaterialsData = getAllMaterials();
	const inventoryCopy = { ...inventory };

	const blockedMaterials: IBlockedMaterial[] = [];
	const blockedSet = new Set<string>();
	const materialUnitIds = new Map<string, string[]>();
	const allEstimates: IMaterialEstimate[] = [];

	for (const goal of upgradeRankGoals) {
		// Snapshot inventory before this goal to compute consumed amounts
		const invBefore = { ...inventoryCopy };

		const baseMaterials = getBaseUpgradesForRankUp(
			goal.unitId,
			goal.rankStart,
			goal.rankEnd,
			goal.appliedUpgrades,
			goal.upgradesRarity,
			inventoryCopy,
			true, // mutate inventory in place so lower-priority goals see reduced inventory
		);

		const goalEstimates: IMaterialEstimate[] = [];

		for (const [materialId, count] of Object.entries(baseMaterials)) {
			if (count <= 0) continue;

			// Compute how much inventory was consumed for this material
			const consumed =
				(invBefore[materialId] ?? 0) - (inventoryCopy[materialId] ?? 0);
			const ownedCount = Math.max(consumed, 0);

			const locations = allLocations[materialId] ?? [];
			const progressFiltered = filterLocationsByCampaignProgress(
				locations,
				campaignProgress,
			);
			const farmable = filterLocationsByCampaignEvent(
				progressFiltered,
				campaignEvent,
			);
			const mat = allMaterialsData[materialId];
			const suggested = filterLocationsByStrategy(
				farmable,
				farmStrategy,
				mat?.rarity,
				customFarmSelections,
			);

			const label = mat?.label ?? materialId;
			const icon = mat?.icon;

			// Track unitIds per material for display
			const existing = materialUnitIds.get(materialId);
			if (existing) {
				if (!existing.includes(goal.unitId)) {
					existing.push(goal.unitId);
				}
			} else {
				materialUnitIds.set(materialId, [goal.unitId]);
			}

			const estimate = computeMaterialEstimate(
				materialId,
				label,
				icon,
				count + ownedCount,
				ownedCount,
				[goal.unitId],
				goal.goalId,
				suggested,
			);

			if (estimate.isBlocked) {
				if (!blockedSet.has(materialId)) {
					blockedSet.add(materialId);
					blockedMaterials.push({
						materialId,
						materialLabel: label,
						materialIcon: icon,
						count,
						unitIds: materialUnitIds.get(materialId) ?? [goal.unitId],
					});
				} else {
					const blocked = blockedMaterials.find(
						(b) => b.materialId === materialId,
					);
					if (blocked) {
						blocked.count += count;
						if (!blocked.unitIds.includes(goal.unitId)) {
							blocked.unitIds.push(goal.unitId);
						}
					}
				}
				continue;
			}

			if (!estimate.isFinished) {
				goalEstimates.push(estimate);
			}
		}

		// Within each goal, sort by daysTotal DESC, energyTotal DESC (slowest first)
		goalEstimates.sort(
			(a, b) => b.daysTotal - a.daysTotal || b.energyTotal - a.energyTotal,
		);

		allEstimates.push(...goalEstimates);
	}

	return { allEstimates, blockedMaterials, materialUnitIds };
}

/**
 * Build estimates using total-materials ordering.
 * All materials are pooled across goals and sorted by daysTotal DESC.
 */
function buildEstimatesByTotalMaterials(
	upgradeRankGoals: ICharacterUpgradeRankGoal[],
	inventory: Record<string, number>,
	campaignProgress: Map<Campaign, number>,
	farmStrategy: FarmStrategy,
	campaignEvent: CampaignEventType = "none",
	customFarmSelections?: CustomFarmSelections,
): {
	allEstimates: IMaterialEstimate[];
	blockedMaterials: IBlockedMaterial[];
	materialUnitIds: Map<string, string[]>;
} {
	const allLocations = getAllUpgradeLocations();
	const allMaterialsData = getAllMaterials();
	const inventoryCopy = { ...inventory };

	// Accumulate materials across all goals
	const materialNeeds = new Map<string, { count: number; unitIds: string[] }>();

	// Snapshot inventory before all goals to compute consumed amounts
	const invBefore = { ...inventoryCopy };

	for (const goal of upgradeRankGoals) {
		const baseMaterials = getBaseUpgradesForRankUp(
			goal.unitId,
			goal.rankStart,
			goal.rankEnd,
			goal.appliedUpgrades,
			goal.upgradesRarity,
			inventoryCopy,
			true, // mutate inventory in place so lower-priority goals see reduced inventory
		);

		for (const [materialId, count] of Object.entries(baseMaterials)) {
			if (count <= 0) continue;
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

	const blockedMaterials: IBlockedMaterial[] = [];
	const materialUnitIds = new Map<string, string[]>();
	const allEstimates: IMaterialEstimate[] = [];

	for (const [materialId, { count, unitIds }] of materialNeeds) {
		// Compute how much inventory was consumed for this material across all goals
		const consumed =
			(invBefore[materialId] ?? 0) - (inventoryCopy[materialId] ?? 0);
		const ownedCount = Math.max(consumed, 0);

		const locations = allLocations[materialId] ?? [];
		const progressFiltered = filterLocationsByCampaignProgress(
			locations,
			campaignProgress,
		);
		const farmable = filterLocationsByCampaignEvent(
			progressFiltered,
			campaignEvent,
		);
		const mat = allMaterialsData[materialId];
		const suggested = filterLocationsByStrategy(
			farmable,
			farmStrategy,
			mat?.rarity,
			customFarmSelections,
		);

		const label = mat?.label ?? materialId;
		const icon = mat?.icon;

		materialUnitIds.set(materialId, unitIds);

		const estimate = computeMaterialEstimate(
			materialId,
			label,
			icon,
			count + ownedCount,
			ownedCount,
			unitIds,
			"combined",
			suggested,
		);

		if (estimate.isBlocked) {
			blockedMaterials.push({
				materialId,
				materialLabel: label,
				materialIcon: icon,
				count,
				unitIds,
			});
			continue;
		}

		if (!estimate.isFinished) {
			allEstimates.push(estimate);
		}
	}

	// Sort by daysTotal DESC, energyTotal DESC (slowest materials first)
	allEstimates.sort(
		(a, b) => b.daysTotal - a.daysTotal || b.energyTotal - a.energyTotal,
	);

	return { allEstimates, blockedMaterials, materialUnitIds };
}

/**
 * Generate a day-by-day farming plan for all active UpgradeRank goals.
 *
 * @param goals - All character goals (only UpgradeRank + included are used)
 * @param dailyEnergy - Energy budget per day
 * @param campaignProgress - Player's campaign progress for location filtering
 * @param inventory - Player's material inventory
 * @param farmStrategy - "leastEnergy" (cheapest node only), "allLocations" (all nodes), or "custom" (per-rarity selections)
 * @param farmOrder - "goalPriority" (per-goal ordering) or "totalMaterials" (pooled)
 * @param battleAttempts - Per-node remaining daily attempts from sync ("campaign:node" → attemptsLeft)
 * @param customFarmSelections - Per-rarity campaign type selections (used when farmStrategy is "custom")
 */
export function generateDailyRaidsPlan(
	goals: CharacterRaidGoalSelect[],
	dailyEnergy: number,
	campaignProgress: Map<Campaign, number>,
	inventory: Record<string, number> = {},
	farmStrategy: FarmStrategy = "leastEnergy",
	farmOrder: "goalPriority" | "totalMaterials" = "goalPriority",
	campaignEvent: CampaignEventType = "none",
	homeScreenEvent: HomeScreenEventType = "none",
	hseMinEnemyCount = 5,
	battleAttempts: Map<string, number> = new Map(),
	customFarmSelections?: CustomFarmSelections,
): IDailyRaidsPlan {
	if (dailyEnergy <= 0) {
		return {
			days: [],
			totalDays: 0,
			totalEnergy: 0,
			totalRaids: 0,
			blockedMaterials: [],
		};
	}

	const upgradeRankGoals = goals.filter(
		(g): g is ICharacterUpgradeRankGoal =>
			g.type === PersonalGoalType.UpgradeRank && g.include,
	);

	if (upgradeRankGoals.length === 0) {
		return {
			days: [],
			totalDays: 0,
			totalEnergy: 0,
			totalRaids: 0,
			blockedMaterials: [],
		};
	}

	// Build estimates based on farm order
	const { allEstimates: rawEstimates, blockedMaterials } =
		farmOrder === "goalPriority"
			? buildEstimatesByPriority(
					upgradeRankGoals,
					inventory,
					campaignProgress,
					farmStrategy,
					campaignEvent,
					customFarmSelections,
				)
			: buildEstimatesByTotalMaterials(
					upgradeRankGoals,
					inventory,
					campaignProgress,
					farmStrategy,
					campaignEvent,
					customFarmSelections,
				);

	// Reorder estimates so HSE-eligible materials come first
	const allEstimates = sortEstimatesForHse(
		rawEstimates,
		homeScreenEvent,
		hseMinEnemyCount,
	);

	// Day-by-day simulation (generateDailyRaidsList)
	// Each estimate is a separate entry keyed by (goalId, materialId).
	// This keeps materials per-goal so the UI shows which goal each raid serves.
	const days: IDailyRaidsDay[] = [];
	let upgradesToFarm = allEstimates.filter(
		(x) => !x.isBlocked && !x.isFinished && x.energyLeft > 0,
	);

	// Track cumulative farmed items per estimate for acquired/remaining display
	const farmedPerEstimate = new Map<IMaterialEstimate, number>();
	for (const est of upgradesToFarm) {
		farmedPerEstimate.set(est, 0);
	}

	let iteration = 0;
	while (upgradesToFarm.length > 0) {
		let energyLeft = dailyEnergy;
		const dayRaids: IDailyRaid[] = [];

		// Track which locations have been planned this day for each materialId
		// (same material from different goals shouldn't double-use the same node)
		const plannedLocationsPerMaterial = new Map<string, Set<string>>();

		for (const material of upgradesToFarm) {
			if (energyLeft < 5) break;

			// Get or create the set of already-planned location IDs for this material
			let plannedIds = plannedLocationsPerMaterial.get(material.materialId);
			if (!plannedIds) {
				plannedIds = new Set();
				plannedLocationsPerMaterial.set(material.materialId, plannedIds);
			}

			// On Day 1 (iteration 0), use actual sync attempts; later days get full count
			const isFirstDay = iteration === 0;
			const { raidLocations, energySpent } = planRaidsForMaterial(
				material,
				energyLeft,
				plannedIds,
				isFirstDay && battleAttempts.size > 0 ? battleAttempts : null,
			);

			if (raidLocations.length > 0) {
				// Mark these locations as planned for this material today
				let dayFarmed = 0;
				for (const loc of raidLocations) {
					plannedIds.add(loc.battleId);
					dayFarmed += loc.farmedItems;
				}

				const totalFarmed = (farmedPerEstimate.get(material) ?? 0) + dayFarmed;
				farmedPerEstimate.set(material, totalFarmed);

				const owned = material.acquiredCount;
				const grossRequired = material.requiredCount;

				dayRaids.push({
					materialId: material.materialId,
					materialLabel: material.materialLabel,
					materialIcon: material.materialIcon,
					goalId: material.goalId,
					requiredCount: grossRequired,
					acquiredCount: Math.round(
						Math.min(owned + totalFarmed, grossRequired),
					),
					remainingCount: Math.round(
						Math.max(grossRequired - owned - totalFarmed, 0),
					),
					ownedCount: owned,
					unitIds: material.unitIds,
					raidLocations,
				});

				energyLeft -= energySpent;
			}
		}

		if (dayRaids.length > 0) {
			const raidsTotal = dayRaids.reduce(
				(sum, r) => sum + r.raidLocations.reduce((s, l) => s + l.raidsCount, 0),
				0,
			);
			const energyTotal = dayRaids.reduce(
				(sum, r) =>
					sum + r.raidLocations.reduce((s, l) => s + l.energySpent, 0),
				0,
			);
			days.push({
				dayNumber: days.length + 1,
				raids: dayRaids,
				raidsTotal,
				energyTotal,
			});
		}

		iteration++;
		// Remove materials whose energyLeft is less than their cheapest location
		upgradesToFarm = upgradesToFarm.filter(
			(x) => x.energyLeft >= Math.min(...x.locations.map((l) => l.energyCost)),
		);
		if (iteration > 1000) break;
	}

	const totalEnergy = days.reduce((sum, d) => sum + d.energyTotal, 0);
	const totalRaids = days.reduce((sum, d) => sum + d.raidsTotal, 0);

	return {
		days,
		totalDays: days.length,
		totalEnergy,
		totalRaids,
		blockedMaterials,
	};
}
