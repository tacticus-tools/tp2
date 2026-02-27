import type {
	GuildWarData,
	GuildWarSection,
} from "@/5-assets/guild-war/index.ts";
import type { DeepReadonly } from "@/types.ts";

export interface GwDeployment {
	sectionIndex: number;
	teamId: string;
}

export interface GwOffensePlan {
	bfLevel: number;
	deployments: GwDeployment[];
	notes?: string;
}

const RARITY_SHORT_TO_LABEL: Record<string, string> = {
	U: "Uncommon",
	R: "Rare",
	E: "Epic",
	L: "Legendary",
};

/**
 * Get the rarity cap label for a section at a given BF level.
 */
export function getSectionRarityCap(
	gwData: DeepReadonly<GuildWarData>,
	section: DeepReadonly<GuildWarSection>,
	bfLevel: number,
): string {
	const bfIndex = gwData.bfLevels.indexOf(bfLevel);
	if (bfIndex === -1) return "?";
	const difficulty = section.difficulty[String(bfLevel)];
	if (!difficulty) return "?";
	const caps = gwData.rarityCaps[difficulty];
	if (!caps) return "?";
	const cap = caps[bfIndex];
	return RARITY_SHORT_TO_LABEL[cap ?? ""] ?? cap ?? "?";
}

/**
 * Compute the total war score for a plan based on deployed sections.
 */
export function computeWarScore(
	gwData: DeepReadonly<GuildWarData>,
	deployments: GwDeployment[],
): number {
	let score = 0;
	for (const d of deployments) {
		const section = gwData.sections[d.sectionIndex];
		if (section) score += section.warScore;
	}
	return score;
}

/**
 * Create an empty offense plan.
 */
export function createEmptyPlan(bfLevel: number): GwOffensePlan {
	return { bfLevel, deployments: [] };
}

/**
 * Parse a saved plan from Convex data.
 */
export function parsePlan(
	bfLevel: number | undefined,
	deploymentsJson: string | undefined,
	notes: string | undefined,
): GwOffensePlan {
	const level = bfLevel ?? 1;
	if (!deploymentsJson) return createEmptyPlan(level);
	try {
		const deployments = JSON.parse(deploymentsJson) as GwDeployment[];
		return { bfLevel: level, deployments, notes };
	} catch {
		return createEmptyPlan(level);
	}
}
