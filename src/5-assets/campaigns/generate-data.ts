/**
 * @description This script takes the datamined JSON of Campaign data and transforms it.
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
 *  */

import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Battle node schemas
// ---------------------------------------------------------------------------

const GuaranteedRewardSchema = z.strictObject({
	id: z.string(),
	min: z.int().positive(),
	max: z.number(),
});

const PotentialRewardSchema = z.union([
	z
		.strictObject({
			id: z.literal(""),
			chance_numerator: z.literal(0),
			chance_denominator: z.literal(0),
			effective_rate: z.literal(0.0),
		})
		.transform((_) => null),
	z.strictObject({
		id: z.string().nonempty(),
		chance_numerator: z.int().positive(),
		chance_denominator: z.int().positive(),
		effective_rate: z.number().min(0).max(1), // The average rate including the pity system
	}),
]);

const RawEnemyTypeSchema = z.strictObject({
	id: z.templateLiteral([z.string(), ":", z.number()]),
	count: z.number(),
});

const DetailedEnemyTypeSchema = z.strictObject({
	id: z.string().nonempty(),
	name: z.string().nonempty(),
	count: z.int().positive(),
	stars: z.int().nonnegative(),
	rank: z.string(),
});

const BaseNodeType = z.strictObject({
	campaign: z.string().nonempty(),
	nodeNumber: z.int().positive(),
	slots: z.int().min(1).max(5),
	requiredCharacterSnowprintIds: z.array(z.string()),
	enemyPower: z.int().positive(),
	enemiesAlliances: z.array(z.string()).nonempty(),
	enemiesFactions: z.array(z.string()).nonempty(),
	enemiesTotal: z.int().positive(),
	enemiesTypes: z.array(z.string()).nonempty(),
	rawEnemyTypes: z.array(RawEnemyTypeSchema).nonempty(),
	detailedEnemyTypes: z.array(DetailedEnemyTypeSchema).nonempty(),
	rewards: z.strictObject({
		guaranteed: z
			.array(GuaranteedRewardSchema)
			.nonempty()
			.transform((arr) => {
				const filtered = arr.filter((x) => x !== null);
				return filtered.length === 0 ? null : filtered;
			}),
		potential: z
			.array(PotentialRewardSchema)
			.nonempty()
			.transform((arr) => {
				const filtered = arr.filter((x) => x !== null);
				return filtered.length === 0 ? null : filtered;
			}),
	}),
});

const CAMPAIGN_TYPES = [
	"SuperEarly",
	"Early",
	"Normal",
	"Mirror",
	"Elite",
	"Standard",
	"Extremis",
] as const;

const NodeSchema = z.discriminatedUnion("campaignType", [
	BaseNodeType.extend({
		campaignType: z.literal("SuperEarly"),
		energyCost: z.union([z.literal(0), z.literal(3)]),
	}),
	BaseNodeType.extend({
		campaignType: z.literal("Early"),
		energyCost: z.literal(5),
	}),
	BaseNodeType.extend({
		campaignType: z.literal("Normal"),
		energyCost: z.literal(6),
	}),
	BaseNodeType.extend({
		campaignType: z.literal("Mirror"),
		energyCost: z.literal(6),
	}),
	BaseNodeType.extend({
		campaignType: z.literal("Elite"),
		energyCost: z.literal(10),
	}),
	BaseNodeType.extend({
		campaignType: z.literal("Standard"),
		energyCost: z.literal(6),
	}),
	BaseNodeType.extend({
		campaignType: z.literal("Extremis"),
		energyCost: z.literal(6),
	}),
]);

const BattleDataSchema = z
	.record(z.string(), NodeSchema)
	.transform((nodesById) => {
		const campaignNodes = Object.entries(nodesById).map(([id, node]) => ({
			id,
			...node,
		}));
		return campaignNodes.reduce(
			(acc, node) => {
				const { campaign, ...rest } = node;
				if (!acc[campaign]) acc[campaign] = [];
				acc[campaign].push(rest);
				return acc;
			},
			{} as Record<
				string,
				Array<Omit<(typeof campaignNodes)[number], "campaign">>
			>,
		);
	});

export type CampaignBattleData = z.infer<typeof BattleDataSchema>;

// ---------------------------------------------------------------------------
// Campaign config schemas
// ---------------------------------------------------------------------------

const DropRateSchema = z.strictObject({
	common: z.number().nonnegative(),
	uncommon: z.number().nonnegative(),
	rare: z.number().nonnegative(),
	epic: z.number().nonnegative(),
	legendary: z.number().nonnegative(),
	shard: z.number().nonnegative(),
	mythic: z.number().nonnegative().optional(),
	mythicShard: z.number().nonnegative().optional(),
});

const CONFIG_TYPES = [
	...CAMPAIGN_TYPES,
	"EarlyChars",
	"EarlyMirrorChars",
	"Onslaught",
] as const;

const CampaignConfigSchema = z.strictObject({
	type: z.enum(CONFIG_TYPES),
	energyCost: z.int().nonnegative(),
	dailyBattleCount: z.int().positive(),
	dropRate: DropRateSchema,
});

const ConfigsDataSchema = z
	.record(z.string(), CampaignConfigSchema)
	.superRefine((configs, ctx) => {
		// Validate that every key matches the `type` field inside the config
		for (const [key, config] of Object.entries(configs)) {
			if (key !== config.type) {
				ctx.addIssue({
					code: "custom",
					message: `Config key "${key}" does not match type "${config.type}"`,
				});
			}
		}
	});

export type CampaignConfigData = z.infer<typeof ConfigsDataSchema>;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export const main = () => {
	// --- Battle data ---
	const rawBattleData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);

	const parsedBattleData = BattleDataSchema.parse(rawBattleData);
	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedBattleData, null, 2)}\n`,
	);

	// --- Config data ---
	const rawConfigData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "configs.raw.json"), "utf-8"),
	);

	const parsedConfigData = ConfigsDataSchema.parse(rawConfigData);

	// Cross-validate: every campaignType in battle nodes must exist in configs
	// Note: we need to check against the raw (pre-transform) data for campaignType values
	const rawNodes = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	) as Record<string, { campaignType: string }>;

	const configKeys = new Set(Object.keys(parsedConfigData));
	const missingTypes = new Set<string>();

	for (const [, node] of Object.entries(rawNodes)) {
		if (!configKeys.has(node.campaignType)) {
			missingTypes.add(node.campaignType);
		}
	}

	if (missingTypes.size > 0) {
		throw new Error(
			`Campaign types found in battle data but missing from configs: ${[...missingTypes].join(", ")}`,
		);
	}

	fs.writeFileSync(
		join(import.meta.dirname, "configs.generated.json"),
		`${JSON.stringify(parsedConfigData, null, 2)}\n`,
	);
};
