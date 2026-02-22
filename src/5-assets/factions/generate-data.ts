/**
 * @description This script validates and transforms faction data.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Goals:
 * 1) Validate the structure of the faction data to ensure it matches our expectations and catch any changes early.
 * 2) Cross-validate snowprintIds against the character pipeline's faction IDs.
 * 3) Transform the array into a record keyed by snowprintId for efficient lookup.
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
import { DATA as FACTION_IDS } from "../characters/faction-ids.generated.ts";

const FactionSchema = z.strictObject({
	alliance: z.enum(["Imperial", "Chaos", "Xenos"]),
	name: z.string().nonempty(),
	snowprintId: z.string().nonempty(),
	icon: z.string().endsWith(".png"),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
});

export type FactionEntry = z.infer<typeof FactionSchema>;

const DataSchema = z
	.array(FactionSchema)
	.min(1)
	.superRefine((factions, ctx) => {
		// Validate unique snowprintIds
		const seen = new Set<string>();
		for (const faction of factions) {
			if (seen.has(faction.snowprintId)) {
				ctx.addIssue({
					code: "custom",
					message: `Duplicate snowprintId "${faction.snowprintId}"`,
				});
			}
			seen.add(faction.snowprintId);
		}

		// Cross-validate against character pipeline faction IDs
		const rawSnowprintIds = new Set(factions.map((f) => f.snowprintId));
		for (const characterFactionId of FACTION_IDS) {
			if (!rawSnowprintIds.has(characterFactionId)) {
				ctx.addIssue({
					code: "custom",
					message: `Character faction ID "${characterFactionId}" not found in factions data`,
				});
			}
		}
	});

export type FactionData = Record<string, FactionEntry>;

export const main = () => {
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);

	const parsedData = DataSchema.parse(rawData);

	// Transform array into record keyed by snowprintId
	const record: Record<string, FactionEntry> = {};
	for (const faction of parsedData) {
		record[faction.snowprintId] = faction;
	}

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(record, null, 2)}\n`,
	);
};
