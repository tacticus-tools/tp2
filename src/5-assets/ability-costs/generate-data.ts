/**
 * @description This script validates and transforms character ability upgrade cost data.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Goals:
 * 1) Validate the structure of the ability cost data to ensure it matches our expectations and catch any changes early.
 * 2) Ensure levels are sequential starting from 1.
 * 3) Extract the AbilityCost type for type safety in the rest of the app.
 *
 * Note:
 * This script is intended to be run as a Vite build plugin. Importing any app code into this file
 * is sketchy since Vite has not fully started up yet.
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const AbilityCostSchema = z.strictObject({
	level: z.int().min(1),
	gold: z.int().nonnegative(),
	badges: z.int().min(1),
});

export type AbilityCost = z.infer<typeof AbilityCostSchema>;

const DataSchema = z
	.array(AbilityCostSchema)
	.min(1)
	.superRefine((entries, ctx) => {
		for (let i = 0; i < entries.length; i++) {
			if (entries[i].level !== i + 1) {
				ctx.addIssue({
					code: "custom",
					message: `Expected level ${i + 1} at index ${i}, got ${entries[i].level}`,
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
