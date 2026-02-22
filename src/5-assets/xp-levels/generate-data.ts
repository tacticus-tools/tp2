/**
 * @description This script validates and transforms XP level threshold data.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Goals:
 * 1) Validate the structure of the XP level data to ensure it matches our expectations and catch any changes early.
 * 2) Ensure levels are sequential and totalXp values are cumulative.
 * 3) Extract the XpLevelThreshold type for type safety in the rest of the app.
 *
 * Note:
 * This script is intended to be run as a Vite build plugin. Importing any app code into this file
 * is sketchy since Vite has not fully started up yet.
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const XpLevelThresholdSchema = z.strictObject({
	level: z.int().nonnegative(),
	xpToNextLevel: z.int().nonnegative(),
	totalXp: z.int().nonnegative(),
});

export type XpLevelThreshold = z.infer<typeof XpLevelThresholdSchema>;

const DataSchema = z
	.array(XpLevelThresholdSchema)
	.min(1)
	.superRefine((entries, ctx) => {
		// Levels must be sequential starting from 0
		for (let i = 0; i < entries.length; i++) {
			if (entries[i].level !== i) {
				ctx.addIssue({
					code: "custom",
					message: `Expected level ${i} at index ${i}, got ${entries[i].level}`,
				});
			}
		}
		// Level 0 should have zero XP
		if (entries[0].totalXp !== 0) {
			ctx.addIssue({
				code: "custom",
				message: `Level 0 totalXp must be 0, got ${entries[0].totalXp}`,
			});
		}
		// totalXp must be monotonically increasing
		for (let i = 1; i < entries.length; i++) {
			if (entries[i].totalXp <= entries[i - 1].totalXp) {
				ctx.addIssue({
					code: "custom",
					message: `Level ${i} totalXp (${entries[i].totalXp}) must be greater than level ${i - 1} totalXp (${entries[i - 1].totalXp})`,
				});
			}
		}
	});

export const main = () => {
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);

	const parsedData = DataSchema.parse(rawData);

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);
};
