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

const DataSchema = z.record(z.string(), NodeSchema).transform((nodesById) => {
	const campaignNodes = Object.entries(nodesById).map(([id, node]) => ({
		id,
		...node,
	}));
	return campaignNodes.reduce((acc, node) => {
		const { campaign, ...rest } = node;
		// @ts-expect-error - this is fine, we're just grouping by campaign here
		if (!acc[campaign]) acc[campaign] = [];
		// @ts-expect-error - this is fine, we're just grouping by campaign here
		acc[campaign].push(rest);
		return acc;
	}, {});
});

export type CampaignData = z.infer<typeof DataSchema>;

export const main = () => {
	// Note: reading here instead of importing so that importing from this file doesn't cause Vite to try to load the entire raw JSON into memory during startup
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);

	// Campaign data is very large so it'll bog down TS as a `const`
	// Export as JSON and extract key types `as const` instead to get both safety and performance.
	const parsedData = DataSchema.parse(rawData);
	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);
};
