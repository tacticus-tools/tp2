/**
 * @description Build-time pipeline: Campaign metadata derived from campaign-battles data.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Reads campaign-battles/data.generated.json and produces:
 * - data.generated.ts: Metadata per campaign (baseName, displayType, typeOrder, isEvent, totalNodes)
 * - base-names.generated.ts: Main and event campaign base name arrays
 * - event-battle-maps.generated.ts: Flat battle orderings per event base campaign
 * - challenge-nodes.generated.ts: Sorted challenge node numbers per challenge campaign
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";

// Canonical campaign progression order (must match Campaign const in constants.ts)
const CAMPAIGN_ORDER = [
	"Indomitus",
	"Indomitus Elite",
	"Indomitus Mirror",
	"Indomitus Mirror Elite",
	"Fall of Cadia",
	"Fall of Cadia Elite",
	"Fall of Cadia Mirror",
	"Fall of Cadia Mirror Elite",
	"Octarius",
	"Octarius Elite",
	"Octarius Mirror",
	"Octarius Mirror Elite",
	"Saim-Hann",
	"Saim-Hann Elite",
	"Saim-Hann Mirror",
	"Saim-Hann Mirror Elite",
	"Adeptus Mechanicus Standard",
	"Adeptus Mechanicus Standard Challenge",
	"Adeptus Mechanicus Extremis",
	"Adeptus Mechanicus Extremis Challenge",
	"Tyranids Standard",
	"Tyranids Standard Challenge",
	"Tyranids Extremis",
	"Tyranids Extremis Challenge",
	"T'au Empire Standard",
	"T'au Empire Standard Challenge",
	"T'au Empire Extremis",
	"T'au Empire Extremis Challenge",
	"Death Guard Standard",
	"Death Guard Standard Challenge",
	"Death Guard Extremis",
	"Death Guard Extremis Challenge",
];

const TYPE_ORDER: Record<string, number> = {
	Normal: 0,
	Elite: 1,
	Mirror: 2,
	"Elite Mirror": 3,
	Standard: 0,
	"Standard Challenge": 1,
	Extremis: 2,
	"Extremis Challenge": 3,
};

const EVENT_TYPES = new Set([
	"Standard",
	"Standard Challenge",
	"Extremis",
	"Extremis Challenge",
]);

function categorizeCampaignType(campaignValue: string): string {
	if (campaignValue.includes("Extremis") && campaignValue.includes("Challenge"))
		return "Extremis Challenge";
	if (campaignValue.includes("Extremis")) return "Extremis";
	if (campaignValue.includes("Standard") && campaignValue.includes("Challenge"))
		return "Standard Challenge";
	if (campaignValue.includes("Standard")) return "Standard";
	if (campaignValue.includes("Mirror") && campaignValue.includes("Elite"))
		return "Elite Mirror";
	if (campaignValue.includes("Elite")) return "Elite";
	if (campaignValue.includes("Mirror")) return "Mirror";
	return "Normal";
}

const BASE_NAME_SUFFIXES_RE =
	/ Mirror Elite$| Elite$| Mirror$| Extremis Challenge$| Standard Challenge$| Extremis$| Standard$/;

function getBaseName(campaignValue: string): string {
	return campaignValue.replace(BASE_NAME_SUFFIXES_RE, "");
}

export const main = () => {
	const campaignBattles: Record<
		string,
		Array<{ nodeNumber: number; id: string }>
	> = JSON.parse(
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

	// Build metadata for each campaign
	const metadata: Record<
		string,
		{
			campaign: string;
			baseName: string;
			displayType: string;
			typeOrder: number;
			isEvent: boolean;
			totalNodes: number;
		}
	> = {};

	for (const campaign of CAMPAIGN_ORDER) {
		const nodes = campaignBattles[campaign];
		if (!nodes) continue;

		const displayType = categorizeCampaignType(campaign);
		metadata[campaign] = {
			campaign,
			baseName: getBaseName(campaign),
			displayType,
			typeOrder: TYPE_ORDER[displayType] ?? 99,
			isEvent: EVENT_TYPES.has(displayType),
			totalNodes: nodes.length,
		};
	}

	// Build base name lists (preserving progression order)
	const mainNames: string[] = [];
	const eventNames: string[] = [];
	const mainSeen = new Set<string>();
	const eventSeen = new Set<string>();

	for (const campaign of CAMPAIGN_ORDER) {
		const m = metadata[campaign];
		if (!m) continue;

		if (m.isEvent) {
			if (!eventSeen.has(m.baseName)) {
				eventSeen.add(m.baseName);
				eventNames.push(m.baseName);
			}
		} else {
			if (!mainSeen.has(m.baseName)) {
				mainSeen.add(m.baseName);
				mainNames.push(m.baseName);
			}
		}
	}

	// Build event battle maps (flat ordering with challenge interleaving)
	const eventBattleMaps: Record<
		string,
		Array<{ nodeNumber: number; isChallenge: boolean }>
	> = {};

	for (const [campaign, m] of Object.entries(metadata)) {
		if (m.displayType !== "Standard" && m.displayType !== "Extremis") continue;

		const challengeType =
			m.displayType === "Standard"
				? "Standard Challenge"
				: "Extremis Challenge";

		// Find challenge campaign with same baseName
		let challengeNodeNumbers: number[] = [];
		for (const [c, cm] of Object.entries(metadata)) {
			if (cm.baseName === m.baseName && cm.displayType === challengeType) {
				const challengeNodes = campaignBattles[c];
				if (challengeNodes) {
					challengeNodeNumbers = challengeNodes.map((n) => n.nodeNumber);
				}
				break;
			}
		}

		const challengeSet = new Set(challengeNodeNumbers);
		const baseNodes = campaignBattles[campaign];
		if (!baseNodes) continue;

		const flatMap: Array<{ nodeNumber: number; isChallenge: boolean }> = [];
		for (const node of baseNodes) {
			flatMap.push({ nodeNumber: node.nodeNumber, isChallenge: false });
			if (challengeSet.has(node.nodeNumber)) {
				flatMap.push({ nodeNumber: node.nodeNumber, isChallenge: true });
			}
		}

		eventBattleMaps[campaign] = flatMap;
	}

	// Build challenge node numbers (sorted)
	const challengeNodes: Record<string, number[]> = {};

	for (const [campaign, m] of Object.entries(metadata)) {
		if (
			m.displayType !== "Standard Challenge" &&
			m.displayType !== "Extremis Challenge"
		)
			continue;

		const nodes = campaignBattles[campaign];
		if (!nodes) continue;

		challengeNodes[campaign] = nodes
			.map((n) => n.nodeNumber)
			.sort((a, b) => a - b);
	}

	// Write outputs
	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.ts"),
		`export const DATA = ${JSON.stringify(metadata, null, 2)} as const;\n`,
	);

	fs.writeFileSync(
		join(import.meta.dirname, "base-names.generated.ts"),
		`export const DATA = ${JSON.stringify({ main: mainNames, event: eventNames }, null, 2)} as const;\n`,
	);

	fs.writeFileSync(
		join(import.meta.dirname, "event-battle-maps.generated.ts"),
		`export const DATA = ${JSON.stringify(eventBattleMaps, null, 2)} as const;\n`,
	);

	fs.writeFileSync(
		join(import.meta.dirname, "challenge-nodes.generated.ts"),
		`export const DATA = ${JSON.stringify(challengeNodes, null, 2)} as const;\n`,
	);
};
