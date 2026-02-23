/**
 * @description Build-time pipeline: Campaign-derived data (event groups, CE campaign list, battle enemy counts).
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Reads campaign-metadata, campaign-battles, and NPC data to build:
 * - event-groups.generated.ts: Maps CE type → campaign name arrays
 * - all-ce-campaigns.generated.ts: Flat array of all CE campaign names
 * - battle-enemy-counts.generated.json: Record<battleId, {tyranids, chaos, mechanical}>
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";

// Note: we bypass the `index.ts` here to avoid side effects that might require the Vite environment to be fully started up
import { DATA as CAMPAIGN_METADATA } from "../campaign-metadata/data.generated.ts";

const BASE_NAME_TO_EVENT_TYPE: Record<string, string> = {
	"Adeptus Mechanicus": "adMech",
	Tyranids: "tyranids",
	"T'au Empire": "tau",
	"Death Guard": "deathGuard",
};

interface BattleNode {
	id: string;
	detailedEnemyTypes: Array<{ id: string; count: number }>;
}

interface Npc {
	id: string;
	faction: string | null;
	alliance: string | null;
	traits: string[];
}

export const main = () => {
	// Read source data
	const campaignBattles: Record<string, BattleNode[]> = JSON.parse(
		fs.readFileSync(
			join(
				import.meta.dirname,
				"..",
				"campaign-battles",
				"data.generated.json",
			),
			"utf-8",
		),
	);

	const npcs: Npc[] = JSON.parse(
		fs.readFileSync(
			join(import.meta.dirname, "..", "npcs", "data.generated.json"),
			"utf-8",
		),
	);

	// --- Event groups: maps CE type → campaign name arrays ---
	const eventGroups: Record<string, string[]> = {
		adMech: [],
		tyranids: [],
		tau: [],
		deathGuard: [],
	};

	for (const [campaign, meta] of Object.entries(CAMPAIGN_METADATA)) {
		if (!meta.isEvent) continue;
		const eventType = BASE_NAME_TO_EVENT_TYPE[meta.baseName];
		if (eventType) eventGroups[eventType].push(campaign);
	}

	// --- All CE campaigns: flat array ---
	const allCeCampaigns = Object.values(eventGroups).flat().sort();

	// --- Battle enemy counts ---
	const npcLookup = new Map<
		string,
		{ faction: string | null; alliance: string | null; traits: string[] }
	>();
	for (const npc of npcs) {
		npcLookup.set(npc.id, {
			faction: npc.faction,
			alliance: npc.alliance,
			traits: npc.traits,
		});
	}

	const battleEnemyCounts: Record<
		string,
		{ tyranids: number; chaos: number; mechanical: number }
	> = {};

	for (const nodes of Object.values(campaignBattles)) {
		for (const node of nodes) {
			let tyranids = 0;
			let chaos = 0;
			let mechanical = 0;

			for (const enemy of node.detailedEnemyTypes) {
				const npc = npcLookup.get(enemy.id);
				if (!npc) continue;
				if (npc.traits.includes("Summon")) continue;

				if (npc.faction === "Tyranids") tyranids += enemy.count;
				if (npc.alliance === "Chaos") chaos += enemy.count;
				if (npc.traits.includes("Mechanical")) mechanical += enemy.count;
			}

			battleEnemyCounts[node.id] = { tyranids, chaos, mechanical };
		}
	}

	// Write outputs
	fs.writeFileSync(
		join(import.meta.dirname, "event-groups.generated.ts"),
		`export const DATA = ${JSON.stringify(eventGroups, null, 2)} as const;\n`,
	);

	fs.writeFileSync(
		join(import.meta.dirname, "all-ce-campaigns.generated.ts"),
		`export const DATA = ${JSON.stringify(allCeCampaigns, null, 2)} as const;\n`,
	);

	fs.writeFileSync(
		join(import.meta.dirname, "battle-enemy-counts.generated.json"),
		`${JSON.stringify(battleEnemyCounts, null, 2)}\n`,
	);
};
