/**
 * @description This script takes the datamined JSON of character rank-up data and transforms it.
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
import { DATA as CHARACTER_IDS } from "../characters/ids.generated.ts";
import { DATA as MATERIAL_IDS } from "../materials/ids.generated.ts";

const RankUpSchema = z.record(
	z.enum(CHARACTER_IDS),
	z.record(z.string(), z.array(z.enum(MATERIAL_IDS)).length(6)),
);
export type RankUpData = z.infer<typeof RankUpSchema>;

export const main = () => {
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);
	const parsedData = RankUpSchema.parse(rawData);

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);
};
