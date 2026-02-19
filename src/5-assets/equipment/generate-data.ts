/**
 * @description This script takes the datamined JSON of equipment data and transforms it.
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

/*#
------------ HANDLING DIFFERENT EQUIPMENT TYPES ------------
There are currently 5 different equipment types.
Each type has different stats, but they all share the same base fields (name, rarity, etc).
In order to tell TS about that connection, we have to use a "discriminated union".
It's a bit of a pain to set up but it buys us much better DX when working with the data.
e.g.
```ts
switch (item.type) {
  case "I_Block":
    return <span>Block Chance: {item.levels[0].stats.blockChance}%</span>;
  case "I_Booster_Block":
    return <span>Crit Chance Bonus: {item.levels[0].stats.critChanceBonus}%</span>;
    // ^ TYPE ERROR since TS knows that critChanceBonus only exists on I_Booster_Crit items
````
*/

// -------- Phase 1: Define the stats for each equipment type
const BlockStatsSchema = z.strictObject({
	blockChance: z.int().positive(),
	blockDamage: z.int().positive(),
});

const DefenseStatsSchema = z.strictObject({
	armor: z.int().positive(),
	hp: z
		.int()
		.positive()
		.optional()
		.transform((val) => val ?? null), // Make value optional instead of key optional for consistency
});

const CritStatsSchema = z.strictObject({
	critChance: z.int().positive(),
	critDamage: z.int().positive(),
});

const CritBonusStatsSchema = z.strictObject({
	critChanceBonus: z.int().positive(),
	critDamageBonus: z.int().positive(),
});

const BlockBonusStatsSchema = z.strictObject({
	blockChanceBonus: z.int().positive(),
	blockDamageBonus: z.int().positive(),
});

// -------- Phase 2: Define the remaining shared structure of the equipment levels
const BaseLevelSchema = z.strictObject({
	goldCost: z.int().nonnegative(),
	salvageCost: z.int().nonnegative(),
	mythicSalvageCost: z.int().nonnegative(),
});

// -------- Phase 3: Define the shared structure of the equipment
const BaseEquipmentSchema = z.strictObject({
	name: z.string().trim().nonempty(),
	rarity: z.string().trim().nonempty(),
	abilityId: z
		.string()
		.trim()
		.transform((val) => val || null), // Replace "" with null for simplicity
	isRelic: z.boolean(),
	allowedFactions: z.array(z.string().trim().nonempty()),
	isUniqueRelic: z
		.boolean()
		.optional()
		.transform((val) => val ?? false), // Make value optional instead of key optional for consistency
	allowedUnits: z
		.array(z.string().trim().nonempty())
		.optional()
		.transform((val) => val ?? null), // Make value optional instead of key optional for consistency, and null instead of [] for simplicity
});

// -------- Phase 4: Define the full structure of the equipment by combining the base structure with the stats for each type
const RawEquipmentSchema = z.discriminatedUnion("type", [
	BaseEquipmentSchema.safeExtend({
		type: z.literal("I_Block"),
		levels: z
			.array(BaseLevelSchema.safeExtend({ stats: BlockStatsSchema }))
			.min(1),
	}),
	BaseEquipmentSchema.safeExtend({
		type: z.literal("I_Booster_Block"),
		levels: z
			.array(BaseLevelSchema.safeExtend({ stats: BlockBonusStatsSchema }))
			.min(1),
	}),
	BaseEquipmentSchema.safeExtend({
		type: z.literal("I_Booster_Crit"),
		levels: z
			.array(BaseLevelSchema.safeExtend({ stats: CritBonusStatsSchema }))
			.min(1),
	}),
	BaseEquipmentSchema.safeExtend({
		type: z.literal("I_Crit"),
		levels: z
			.array(BaseLevelSchema.safeExtend({ stats: CritStatsSchema }))
			.min(1),
	}),
	BaseEquipmentSchema.safeExtend({
		type: z.literal("I_Defensive"),
		levels: z
			.array(BaseLevelSchema.safeExtend({ stats: DefenseStatsSchema }))
			.min(1),
	}),
]);

const EXPECTED_UNIQUE_FIELDS = ["name"] as const;

const DataSchema = z
	.record(z.string(), RawEquipmentSchema) // Keys are equipment IDs
	.superRefine((items, ctx) => {
		const seenValues = Object.fromEntries(
			EXPECTED_UNIQUE_FIELDS.map((field) => [field, new Set()]),
		);
		for (const itemKey in items) {
			const item = items[itemKey];
			for (const field of EXPECTED_UNIQUE_FIELDS) {
				const value = item[field];
				if (seenValues[field].has(value))
					ctx.addIssue({
						code: "custom",
						message: `Duplicate value "${value}" found for unique field "${field}" in Item with id "${itemKey}"`,
					});
				else seenValues[field].add(value);
			}
		}
	});
export type EquipmentData = z.infer<typeof DataSchema>;

export const main = () => {
	// Note: reading here instead of importing so that importing from this file doesn't cause Vite to try to load the entire raw JSON into memory during startup
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);

	// Item data is very large so it'll bog down TS as a `const`
	// Export as JSON and extract key types `as const` instead to get both safety and performance.
	const parsedData = DataSchema.parse(rawData);
	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);

	const itemIds = Object.keys(parsedData).sort();
	fs.writeFileSync(
		join(import.meta.dirname, "ids.generated.ts"),
		`export const DATA = ${JSON.stringify(itemIds, null, 2)} as const;\n`,
	);
};
