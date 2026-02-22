/**
 * @description This script takes the datamined JSON of Campaign data and transforms it.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Goals:
 * 1) Validate the structure of the datamined JSON to ensure it matches our expectations and catch any changes early.
 * 2) Make the structure much more convenient to work with in the app by pre-computing the values we care about.
 * 3) Cut down on the amount of data so that the page doesn't bog down when parsing and rendering.
 * 4) Extract key types directly from the generated JSON so that we can have type safety in the rest of the app.
 *
 * Note:
 * This script is intended to be run as a Vite build plugin. Importing any app code into this file
 * is sketchy since Vite has not fully started up yet.
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Note: we bypass the `index.ts` here to avoid side effects that might require the Vite environment to be fully started up
import { DATA as CAMPAIGN_TYPES } from "../campaign-battles/types.generated.ts";

const RarityDropRatesSchema = z.strictObject({
	common: z.number().nonnegative(),
	uncommon: z.number().nonnegative(),
	rare: z.number().nonnegative(),
	epic: z.number().nonnegative(),
	legendary: z.number().nonnegative(),
	shard: z.number().nonnegative(),
	// Mythic drops aren't present in some of the raw data. Older campaigns use zero for "N/A" so we're applying that here for consistency
	mythic: z.number().nonnegative().optional().default(0),
	mythicShard: z.number().nonnegative().optional().default(0),
});

const DROP_RATE_TYPES = [
	...CAMPAIGN_TYPES,
	"EarlyChars",
	"EarlyMirrorChars",
	"Onslaught",
] as const;

const BattleDropRateSchema = z.strictObject({
	type: z.enum(DROP_RATE_TYPES),
	energyCost: z.int().nonnegative(),
	dailyBattleCount: z.int().positive(),
	dropRate: RarityDropRatesSchema,
});

const DropRateSchema = z
	.record(z.enum(DROP_RATE_TYPES), BattleDropRateSchema)
	.superRefine((configs, ctx) => {
		// Validate that every key matches the `type` field inside the config
		for (const [key, config] of Object.entries(configs)) {
			if (key !== config.type) {
				ctx.addIssue({
					code: "custom",
					message: `Config key "${key}" does not match type "${config.type}"`,
				});
			}
		}
	});

export type DropRateData = z.infer<typeof DropRateSchema>;

export const main = () => {
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);

	const parsedData = DropRateSchema.parse(rawData);

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);
};
