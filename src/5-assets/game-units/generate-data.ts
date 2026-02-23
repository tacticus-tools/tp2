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

const DATA_ARRAY_RE =
	/export\s+const\s+DATA\s*=\s*(\[[\s\S]*\])\s*as\s+const;?\s*$/;

const RARITY_TO_NUMBER: Record<string, number> = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
	Mythic: 5,
};

interface CharacterEntry {
	id: string;
	name: string;
	factionId: string;
	alliance: string;
	initialRarity: string;
	roundIcon: string;
}

interface MowEntry {
	id: string;
	name: string;
	factionId: string;
	alliance: string;
	initialRarity: string;
	roundIcon: string;
}

export const main = () => {
	// Read the generated TS files as text and extract the DATA array
	const charactersTsPath = join(
		import.meta.dirname,
		"..",
		"characters",
		"data.generated.ts",
	);
	const mowsTsPath = join(
		import.meta.dirname,
		"..",
		"mows",
		"data.generated.ts",
	);

	// Parse the TS export: "export const DATA = [...]  as const;"
	const charactersTs = fs.readFileSync(charactersTsPath, "utf-8");
	const mowsTs = fs.readFileSync(mowsTsPath, "utf-8");

	const parseDataArray = (tsContent: string): unknown[] => {
		const match = tsContent.match(DATA_ARRAY_RE);
		if (!match?.[1]) {
			throw new Error("Could not parse DATA array from generated TS file");
		}
		return JSON.parse(match[1]) as unknown[];
	};

	const characters = parseDataArray(charactersTs) as CharacterEntry[];
	const mows = parseDataArray(mowsTs) as MowEntry[];

	const units: Array<{
		id: string;
		name: string;
		alliance: string;
		faction: string;
		unitType: "character" | "mow";
		roundIconFilename: string;
		initialRarity: number;
	}> = [];

	for (const c of characters) {
		units.push({
			id: c.id,
			name: c.name,
			alliance: c.alliance,
			faction: c.factionId,
			unitType: "character",
			roundIconFilename: c.roundIcon,
			initialRarity: RARITY_TO_NUMBER[c.initialRarity] ?? 0,
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
			initialRarity: RARITY_TO_NUMBER[m.initialRarity] ?? 0,
		});
	}

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.ts"),
		`export const DATA = ${JSON.stringify(units, null, 2)} as const;\n`,
	);
};
