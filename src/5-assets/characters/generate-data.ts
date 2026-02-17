/**
 * @description This script takes the datamined JSON of character data and transforms it.
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

const characterImagesFolder = join(
	import.meta.dirname,
	"..",
	"snowprint_assets",
	"characters",
);
const characterImageNames = fs.readdirSync(characterImagesFolder);

const RawCharacterSchema = z
	.strictObject({
		id: z.string().nonempty(),
		Name: z.string().nonempty(),
		Title: z.string().nonempty(),
		"Full Name": z.string().nonempty(),
		"Short Name": z.string().nonempty(),
		"Extra Short Name": z.string().nonempty(),
		Faction: z.string().nonempty(),
		Alliance: z.string().nonempty(),
		Health: z.int().positive(),
		Damage: z.int().positive(),
		Armour: z.int().positive(),
		"Initial rarity": z.string().nonempty(),
		"Melee Damage": z.string().nonempty(),
		"Melee Hits": z.int().positive(),
		"Ranged Damage": z.string().nonempty().optional(),
		"Ranged Hits": z.int().positive().optional(),
		Distance: z.int().positive().optional(),
		Movement: z.int().positive(),
		Equipment1: z.string().nonempty(),
		Equipment2: z.string().nonempty(),
		Equipment3: z.string().nonempty(),
		Traits: z.array(z.string().nonempty()),
		"Active Ability": z.array(z.string().nonempty()).min(1).optional(),
		"Passive Ability": z.array(z.string().nonempty()).min(1).optional(),
		Number: z.int().nonnegative(),
		Icon: z.templateLiteral([
			"snowprint_assets/characters/ui_image_portrait_",
			z.string().lowercase().nonempty(),
			"_",
			z.string().lowercase().nonempty(),
			"_01.png",
		]),
		// ToDo: validate that the icon path corresponds to an actual file in the snowprint_assets/characters folder
		RoundIcon: z
			.templateLiteral([
				"snowprint_assets/characters/ui_image_RoundPortrait_",
				z.string().lowercase().nonempty(),
				"_",
				z.string().lowercase().nonempty(),
				"_01.png",
			])
			.refine(
				(iconPath) =>
					characterImageNames.includes(iconPath.split("/").slice(-1)[0]),
				{
					message:
						"RoundIcon must correspond to an existing image file in the snowprint_assets/characters folder",
				},
			)
			.transform((roundIconPath) => roundIconPath.split("/").slice(-1)[0]),
	})
	.transform((raw) => ({
		id: raw.id,
		name: raw.Name,
		title: raw.Title,
		fullName: raw["Full Name"],
		shortName: raw["Short Name"],
		extraShortName: raw["Extra Short Name"],
		factionId: raw.Faction,
		alliance: raw.Alliance,
		health: raw.Health,
		damage: raw.Damage,
		armour: raw.Armour,
		initialRarity: raw["Initial rarity"],
		meleeDamage: raw["Melee Damage"],
		meleeHits: raw["Melee Hits"],
		rangedDamage: raw["Ranged Damage"] ?? [],
		rangedHits: raw["Ranged Hits"] ?? 0,
		distance: raw.Distance ?? 0,
		movement: raw.Movement,
		equipment1: raw.Equipment1,
		equipment2: raw.Equipment2,
		equipment3: raw.Equipment3,
		traits: raw.Traits,
		activeAbility: raw["Active Ability"] ?? [],
		passiveAbility: raw["Passive Ability"] ?? [],
		number: raw.Number,
		icon: raw.Icon,
		roundIcon: raw.RoundIcon,
	}));

const EXPECTED_UNIQUE_FIELDS = [
	"id",
	"name",
	"fullName",
	"shortName",
	"extraShortName",
	"number",
	"icon",
	"roundIcon",
] as const;

const DataSchema = z
	.array(RawCharacterSchema)
	.superRefine((characters, ctx) => {
		const seenValues = Object.fromEntries(
			EXPECTED_UNIQUE_FIELDS.map((field) => [field, new Set()]),
		);
		for (const character of characters) {
			for (const field of EXPECTED_UNIQUE_FIELDS) {
				const value = character[field];
				if (seenValues[field].has(value))
					ctx.addIssue({
						code: "custom",
						message: `Duplicate value "${value}" found for unique field "${field}" in character with id "${character.id}"`,
					});
				else seenValues[field].add(value);
			}
		}
	});

export const main = () => {
	// Note: reading here instead of importing so that importing from this file doesn't cause Vite to try to load the entire raw JSON into memory during startup
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);
	const parsedData = DataSchema.parse(rawData);
	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.ts"),
		`export const DATA = ${JSON.stringify(parsedData, null, 2)} as const;\n`,
	);
};
