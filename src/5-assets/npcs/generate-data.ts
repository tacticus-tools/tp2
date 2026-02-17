/**
 * @description This script takes the datamined JSON of NPC data and transforms it.
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

const StatsSchema = z.strictObject({
	AbilityLevel: z.int().nonnegative(),
	Damage: z.int().nonnegative(),
	Armor: z.int().nonnegative(),
	Health: z.int().nonnegative(),
	ProgressionIndex: z.int().nonnegative(),
	Rank: z.int().nonnegative(),
	Stars: z.int().nonnegative(),
});

const RawNpcSchema = z
	.strictObject({
		id: z.string().trim().nonempty(),
		Name: z.string().trim().nonempty(),
		Faction: z
			.string()
			.trim()
			.transform((val) => val || null), // replace "" with null for simplicity,
		Alliance: z
			.string()
			.trim()
			.transform((val) => val || null), // replace "" with null for simplicity,
		"Melee Damage": z.string().transform((val) => val || null), // "" == can't hit, so just make it null for simplicity
		"Melee Hits": z
			.int()
			.nonnegative()
			.transform((val) => val || null), // 0 hits == can't hit, so just make it null for simplicity
		"Ranged Damage": z
			.string()
			.trim()
			.optional()
			.transform((val) => val || null), // Make it value optional instead of key optional for consistency
		"Ranged Hits": z
			.int()
			.positive()
			.optional()
			.transform((val) => val || null), // Make it value optional instead of key optional for consistency
		Distance: z
			.int()
			.nonnegative()
			.optional()
			.transform((val) => val || null), // 0 movement == can't move, so just make it null for simplicity
		Movement: z
			.int()
			.nonnegative()
			.transform((val) => val || null), // 0 movement == can't move, so just make it null for simplicity
		Traits: z.array(z.string().trim().nonempty()),
		Stats: z.array(StatsSchema).min(1),
		"Active Ability Damage": z
			.array(z.string().trim().nonempty())
			.min(1)
			.optional()
			.transform((arr) => arr || null), // Make it value optional instead of key optional for consistency
		"Active Abilities": z
			.array(z.string().trim().nonempty())
			.min(1)
			.optional()
			.transform((arr) => arr || null), // Make it value optional instead of key optional for consistency
		"Passive Ability Damage": z
			.array(z.string().trim().nonempty())
			.min(1)
			.optional()
			.transform((arr) => arr || null), // Make it value optional instead of key optional for consistency
		"Passive Abilities": z
			.array(z.string().trim().nonempty())
			.min(1)
			.optional()
			.transform((arr) => arr || null), // Make it value optional instead of key optional for consistency
		Icon: z.union([
			z
				.string()
				.startsWith("snowprint_assets/characters/ui_image_portrait_")
				.endsWith(".png")
				.transform((iconPath) => iconPath.split("/").slice(-1)[0]),
			z.literal("").transform(() => null),
		]),
	})
	.transform((rawNpc) => ({
		id: rawNpc.id,
		name: rawNpc.Name,
		faction: rawNpc.Faction,
		alliance: rawNpc.Alliance,
		meleeDamage: rawNpc["Melee Damage"],
		meleeHits: rawNpc["Melee Hits"],
		rangedDamage: rawNpc["Ranged Damage"],
		rangedHits: rawNpc["Ranged Hits"],
		distance: rawNpc.Distance,
		movement: rawNpc.Movement,
		traits: rawNpc.Traits,
		passiveAbilityDamage: rawNpc["Passive Ability Damage"],
		passiveAbilities: rawNpc["Passive Abilities"],
		activeAbilityDamage: rawNpc["Active Ability Damage"],
		activeAbilities: rawNpc["Active Abilities"],
		icon: rawNpc.Icon,
		stats: rawNpc.Stats,
	}));

const EXPECTED_UNIQUE_FIELDS = ["id"] as const;

const DataSchema = z.array(RawNpcSchema).superRefine((npcs, ctx) => {
	const seenValues = Object.fromEntries(
		EXPECTED_UNIQUE_FIELDS.map((field) => [field, new Set()]),
	);
	for (const npc of npcs) {
		for (const field of EXPECTED_UNIQUE_FIELDS) {
			const value = npc[field];
			if (seenValues[field].has(value))
				ctx.addIssue({
					code: "custom",
					message: `Duplicate value "${value}" found for unique field "${field}" in NPC with id "${npc.id}"`,
				});
			else seenValues[field].add(value);
		}
		if ((npc.rangedDamage === null) !== (npc.rangedHits === null))
			ctx.addIssue({
				code: "custom",
				message: `NPC with id "${npc.id}" has inconsistent ranged damage/hits. Both should be either null or non-null.`,
			});
		if ((npc.rangedDamage === null) !== (npc.distance === null))
			ctx.addIssue({
				code: "custom",
				message: `NPC with id "${npc.id}" has inconsistent ranged damage/distance. Both should be either null or non-null.`,
			});
		if ((npc.meleeDamage === null) !== (npc.meleeHits === null))
			ctx.addIssue({
				code: "custom",
				message: `NPC with id "${npc.id}" has inconsistent melee damage/hits. Both should be either null or non-null.`,
			});
		if (npc.passiveAbilityDamage !== null && npc.passiveAbilities === null)
			ctx.addIssue({
				code: "custom",
				message: `NPC with id "${npc.id}" has passive ability damage but no passive abilities.`,
			});
		if (npc.activeAbilityDamage !== null && npc.activeAbilities === null)
			ctx.addIssue({
				code: "custom",
				message: `NPC with id "${npc.id}" has active ability damage but no active abilities.`,
			});
	}
});
export type NpcData = z.infer<typeof RawNpcSchema>;

export const main = () => {
	// Note: reading here instead of importing so that importing from this file doesn't cause Vite to try to load the entire raw JSON into memory during startup
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);

	// NPC data is very large so it'll bog down TS as a `const`
	// Export as JSON and extract key types `as const` instead to get both safety and performance.
	const parsedData = DataSchema.parse(rawData);
	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);

	const npcIds = parsedData.map((npc) => npc.id).sort();
	fs.writeFileSync(
		join(import.meta.dirname, "ids.generated.ts"),
		`export const DATA = ${JSON.stringify(npcIds, null, 2)} as const;\n`,
	);

	const npcTraits = Array.from(
		new Set(parsedData.flatMap((npc) => npc.traits)),
	).sort();
	fs.writeFileSync(
		join(import.meta.dirname, "traits.generated.ts"),
		`export const DATA = ${JSON.stringify(npcTraits, null, 2)} as const;\n`,
	);
};
