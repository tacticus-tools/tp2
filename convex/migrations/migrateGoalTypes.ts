/** biome-ignore-all lint/performance/noAwaitInLoops: Convex handles this */
import { v } from "convex/values";
import { mutation } from "../_generated/server.js";

/** Maps old numeric goal type values to new string values */
const NUMERIC_TO_GOAL_TYPE: Record<number, string> = {
	1: "UpgradeRank",
	2: "Ascend",
	3: "Unlock",
	4: "MowAbilities",
	5: "CharacterAbilities",
};

/** Maps old numeric campaignsUsage values to new string values */
const NUMERIC_TO_CAMPAIGNS_USAGE: Record<number, string> = {
	0: "None",
	1: "BestTime",
	2: "LeastEnergy",
};

/** Maps old numeric rarity index to string values */
const RARITIES = [
	"Common",
	"Uncommon",
	"Rare",
	"Epic",
	"Legendary",
	"Mythic",
] as const;

/**
 * One-shot migration: converts all existing numeric `type` values to strings
 * and normalizes `campaignsUsage` inside `data` JSON.
 *
 * Run manually via Convex dashboard after deploy.
 */
export const migrateGoalTypes = mutation({
	args: { dryRun: v.optional(v.boolean()) },
	handler: async (ctx, args) => {
		const allGoals = await ctx.db.query("goals").collect();
		let migratedCount = 0;

		for (const goal of allGoals) {
			let needsPatch = false;
			const patch: Record<string, unknown> = {};

			// Migrate top-level type field
			if (typeof goal.type === "number") {
				const stringType = NUMERIC_TO_GOAL_TYPE[goal.type];
				if (stringType) {
					patch.type = stringType;
					needsPatch = true;
				}
			}

			// Migrate campaignsUsage inside data JSON
			try {
				const data = JSON.parse(goal.data);
				let dataChanged = false;

				if (typeof data.campaignsUsage === "number") {
					const stringUsage = NUMERIC_TO_CAMPAIGNS_USAGE[data.campaignsUsage];
					if (stringUsage) {
						data.campaignsUsage = stringUsage;
						dataChanged = true;
					}
				}

				if (typeof data.type === "number") {
					const stringType = NUMERIC_TO_GOAL_TYPE[data.type];
					if (stringType) {
						data.type = stringType;
						dataChanged = true;
					}
				}

				// Migrate rarity fields (numeric index → string)
				for (const field of ["rarityStart", "rarityEnd", "rarity"]) {
					if (typeof data[field] === "number") {
						const str = RARITIES[data[field] as number];
						if (str) {
							data[field] = str;
							dataChanged = true;
						}
					}
				}

				// Migrate upgradesRarity array (numeric[] → string[])
				if (Array.isArray(data.upgradesRarity)) {
					const converted = data.upgradesRarity.map((v: unknown) =>
						typeof v === "number" ? (RARITIES[v] ?? v) : v,
					);
					if (
						converted.some(
							(v: unknown, i: number) => v !== data.upgradesRarity[i],
						)
					) {
						data.upgradesRarity = converted;
						dataChanged = true;
					}
				}

				if (dataChanged) {
					patch.data = JSON.stringify(data);
					needsPatch = true;
				}
			} catch {
				// Skip goals with invalid JSON data
			}

			if (needsPatch && !args.dryRun) {
				await ctx.db.patch(goal._id, patch);
				migratedCount++;
			} else if (needsPatch) {
				migratedCount++;
			}
		}

		return {
			totalGoals: allGoals.length,
			migratedCount,
			dryRun: args.dryRun ?? false,
		};
	},
});
