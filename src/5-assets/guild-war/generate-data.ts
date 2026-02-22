/**
 * @description This script validates and transforms guild war configuration data.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Goals:
 * 1) Validate the structure of the guild war data to ensure it matches our expectations and catch any changes early.
 * 2) Ensure rarityCaps keys match sectionDifficulty and array lengths match bfLevels length.
 * 3) Extract types for type safety in the rest of the app.
 *
 * Note:
 * This script is intended to be run as a Vite build plugin. Importing any app code into this file
 * is sketchy since Vite has not fully started up yet.
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const SectionSchema = z.strictObject({
	id: z.string().nonempty(),
	name: z.string().nonempty(),
	warScore: z.int().positive(),
	count: z.int().positive(),
	difficulty: z.record(z.string(), z.string()),
	inactive: z.boolean().optional(),
	iconId: z.string().nonempty().optional(),
	buff: z.string().nonempty().optional(),
});

export type GuildWarSection = z.infer<typeof SectionSchema>;

const DataSchema = z
	.strictObject({
		bfLevels: z.array(z.int().positive()).min(1),
		sectionDifficulty: z.array(z.string().nonempty()).min(1),
		rarityCaps: z.record(z.string(), z.array(z.string())),
		sections: z.array(SectionSchema).min(1),
	})
	.superRefine((data, ctx) => {
		const difficultySet = new Set(data.sectionDifficulty);

		// rarityCaps keys must be a subset of sectionDifficulty
		for (const key of Object.keys(data.rarityCaps)) {
			if (!difficultySet.has(key)) {
				ctx.addIssue({
					code: "custom",
					message: `rarityCaps key "${key}" is not in sectionDifficulty`,
				});
			}
		}

		// rarityCap arrays must match bfLevels length
		for (const [key, caps] of Object.entries(data.rarityCaps)) {
			if (caps.length !== data.bfLevels.length) {
				ctx.addIssue({
					code: "custom",
					message: `rarityCaps["${key}"] has ${caps.length} entries but bfLevels has ${data.bfLevels.length}`,
				});
			}
		}

		// Section difficulty values must reference valid difficulties
		for (const section of data.sections) {
			for (const [level, diff] of Object.entries(section.difficulty)) {
				if (!difficultySet.has(diff)) {
					ctx.addIssue({
						code: "custom",
						message: `Section "${section.name}" difficulty for level ${level} is "${diff}", not in sectionDifficulty`,
					});
				}
			}
		}
	});

export type GuildWarData = z.infer<typeof DataSchema>;

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
