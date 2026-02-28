/**
 * @description Build-time pipeline: Unified game units (characters + MoWs).
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Reads characters/data.generated.ts and mows/data.generated.ts,
 * combines into a single list with unitType discriminator and numeric rarity.
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";

import { DATA as characters } from "../characters/data.generated.ts";
import { DATA as mows } from "../mows/data.generated.ts";

export const main = () => {
	const units = [];

	for (const c of characters) {
		units.push({
			id: c.id,
			name: c.name,
			alliance: c.alliance,
			faction: c.factionId,
			unitType: "character",
			roundIconFilename: c.roundIcon,
			initialRarity: c.initialRarity,
		});
	}

	for (const m of mows) {
		units.push({
			id: m.id,
			name: m.name,
			alliance: m.alliance,
			faction: m.factionId,
			unitType: "mow",
			roundIconFilename: m.roundIcon,
			initialRarity: m.initialRarity,
		});
	}

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.ts"),
		`export const DATA = ${JSON.stringify(units, null, 2)} as const;\n`,
	);
};
