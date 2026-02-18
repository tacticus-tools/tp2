/**
 * Daily raids planner — simulates day-by-day energy allocation across all
 * active upgrade goals, producing a concrete farming plan.
 *
 * Adapted from tacticusplanner's UpgradesService:
 * - populateLocationsData: filters locations by strategy (leastEnergy → cheapest only)
 * - getEstimatesByPriority: per-goal material ordering with shared inventory
 * - getUpgradeEstimate: inner sim for energyTotal/energyLeft per material
 * - generateDailyRaidsList: outer day-by-day simulation
 * - _planRaidsForMaterial: per-material raid planning within a day
 */

import type { IUpgradeLocation } from "../campaign-data";
import { getAllUpgradeLocations } from "../campaign-data";
import { filterLocationsByCampaignProgress } from "../campaign-progress";
import { type Campaign, PersonalGoalType } from "../constants";
import type {
	CharacterRaidGoalSelect,
	ICharacterUpgradeRankGoal,
} from "../goals/types";
import { getAllMaterials } from "../upgrade-data";
import type {
	IBlockedMaterial,
	IDailyRaid,
	IDailyRaidsDay,
	IDailyRaidsPlan,
	IRaidLocation,
} from "./types";

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

/**
 * Filter locations by farm strategy.
 * - leastEnergy: only keep locations with the minimum energyPerItem
 * - leastTime: keep all locations (maximum daily throughput)
 */
function filterLocationsByStrategy(
	locations: IUpgradeLocation[],
	farmStrategy: "leastEnergy" | "leastTime",
): IUpgradeLocation[] {
	if (locations.length === 0) return locations;

	if (farmStrategy === "leastEnergy") {
		const minEnergy = Math.min(...locations.map((l) => l.energyPerItem));
		return locations.filter((l) => l.energyPerItem === minEnergy);
	}

	// leastTime: use all locations for maximum daily throughput
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

	// Inner simulation: how many days/energy/raids to farm leftCount items
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
				const energyLeftToFarm = leftToFarm * loc.energyPerItem;
				const battlesLeftToFarm = Math.ceil(energyLeftToFarm / loc.energyCost);
				farmedItems += leftToFarm;
				energyTotal += battlesLeftToFarm * loc.energyCost;
				raidsTotal += battlesLeftToFarm;
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
 */
function planRaidsForMaterial(
	material: IMaterialEstimate,
	energyLeft: number,
	plannedLocationIds: Set<string>,
): { raidLocations: IRaidLocation[]; energySpent: number } {
	const raidLocations: IRaidLocation[] = [];
	let totalEnergySpent = 0;

	const availableLocations = material.locations.filter(
		(loc) => !plannedLocationIds.has(loc.battleId),
	);

	for (const loc of availableLocations) {
		if (energyLeft <= 0) break;

		const attemptsLeft = loc.dailyBattleCount;
		if (attemptsLeft <= 0) continue;

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
		});
	}

	return { raidLocations, energySpent: totalEnergySpent };
}

/**
 * Build estimates using goal-priority ordering.
 * Materials for goal #1 come first (sorted slowest-to-farm within the goal),
 * then goal #2's, etc. Each goal consumes shared inventory before the next.
 */
async function buildEstimatesByPriority(
	upgradeRankGoals: ICharacterUpgradeRankGoal[],
	inventory: Record<string, number>,
	campaignProgress: Map<Campaign, number>,
	farmStrategy: "leastEnergy" | "leastTime",
): Promise<{
	allEstimates: IMaterialEstimate[];
	blockedMaterials: IBlockedMaterial[];
	materialUnitIds: Map<string, string[]>;
}> {
	const { getBaseUpgradesForRankUp } = await import("../upgrade-data");
	const allLocations = await getAllUpgradeLocations();
	const allMaterialsData = await getAllMaterials();
	const inventoryCopy = { ...inventory };

	const blockedMaterials: IBlockedMaterial[] = [];
	const blockedSet = new Set<string>();
	const materialUnitIds = new Map<string, string[]>();
	const allEstimates: IMaterialEstimate[] = [];

	for (const goal of upgradeRankGoals) {
		// biome-ignore lint/performance/noAwaitInLoops: Goals must be processed sequentially — each consumes shared inventory
		const baseMaterials = await getBaseUpgradesForRankUp(
			goal.unitId,
			goal.rankStart,
			goal.rankEnd,
			goal.appliedUpgrades,
			goal.upgradesRarity,
			inventoryCopy, // mutated: higher-priority goals consume inventory first
		);

		const goalEstimates: IMaterialEstimate[] = [];

		for (const [materialId, count] of Object.entries(baseMaterials)) {
			if (count <= 0) continue;

			const locations = allLocations.get(materialId) ?? [];
			const farmable = filterLocationsByCampaignProgress(
				locations,
				campaignProgress,
			);
			const suggested = filterLocationsByStrategy(farmable, farmStrategy);

			const mat = allMaterialsData.get(materialId);
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
				count,
				0, // inventory already subtracted by getBaseUpgradesForRankUp
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
async function buildEstimatesByTotalMaterials(
	upgradeRankGoals: ICharacterUpgradeRankGoal[],
	inventory: Record<string, number>,
	campaignProgress: Map<Campaign, number>,
	farmStrategy: "leastEnergy" | "leastTime",
): Promise<{
	allEstimates: IMaterialEstimate[];
	blockedMaterials: IBlockedMaterial[];
	materialUnitIds: Map<string, string[]>;
}> {
	const { getBaseUpgradesForRankUp } = await import("../upgrade-data");
	const allLocations = await getAllUpgradeLocations();
	const allMaterialsData = await getAllMaterials();
	const inventoryCopy = { ...inventory };

	// Accumulate materials across all goals
	const materialNeeds = new Map<string, { count: number; unitIds: string[] }>();

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
		const locations = allLocations.get(materialId) ?? [];
		const farmable = filterLocationsByCampaignProgress(
			locations,
			campaignProgress,
		);
		const suggested = filterLocationsByStrategy(farmable, farmStrategy);

		const mat = allMaterialsData.get(materialId);
		const label = mat?.label ?? materialId;
		const icon = mat?.icon;

		materialUnitIds.set(materialId, unitIds);

		const estimate = computeMaterialEstimate(
			materialId,
			label,
			icon,
			count,
			0,
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
 * @param farmStrategy - "leastEnergy" (cheapest node only) or "leastTime" (all nodes)
 * @param farmOrder - "goalPriority" (per-goal ordering) or "totalMaterials" (pooled)
 */
export async function generateDailyRaidsPlan(
	goals: CharacterRaidGoalSelect[],
	dailyEnergy: number,
	campaignProgress: Map<Campaign, number>,
	inventory: Record<string, number> = {},
	farmStrategy: "leastEnergy" | "leastTime" = "leastEnergy",
	farmOrder: "goalPriority" | "totalMaterials" = "goalPriority",
): Promise<IDailyRaidsPlan> {
	if (dailyEnergy <= 10) {
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
	const { allEstimates, blockedMaterials } =
		farmOrder === "goalPriority"
			? await buildEstimatesByPriority(
					upgradeRankGoals,
					inventory,
					campaignProgress,
					farmStrategy,
				)
			: await buildEstimatesByTotalMaterials(
					upgradeRankGoals,
					inventory,
					campaignProgress,
					farmStrategy,
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

			const { raidLocations, energySpent } = planRaidsForMaterial(
				material,
				energyLeft,
				plannedIds,
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

				const needed = material.requiredCount - material.acquiredCount;

				dayRaids.push({
					materialId: material.materialId,
					materialLabel: material.materialLabel,
					materialIcon: material.materialIcon,
					goalId: material.goalId,
					requiredCount: needed,
					acquiredCount: Math.round(Math.min(totalFarmed, needed)),
					remainingCount: Math.round(Math.max(needed - totalFarmed, 0)),
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
			(x) => x.energyLeft > Math.min(...x.locations.map((l) => l.energyCost)),
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
