/**
 * @description This script takes the raw MoW JSON data and transforms it.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Goals:
 * 1) Validate the structure of the MoW JSON to ensure it matches our expectations and catch any changes early.
 * 2) Make the structure much more convenient to work with in the app by pre-computing the values we care about.
 * 3) Extract key types directly from the generated JSON so that we can have type safety in the rest of the app.
 *
 * Note:
 * This script is intended to be run as a Vite build plugin. Importing any app code into this file
 * is sketchy since Vite has not fully started up yet.
 */

// biome-ignore lint/correctness/noNodejsModules: build-time script
import fs from "node:fs";
// biome-ignore lint/correctness/noNodejsModules: build-time script
import { join } from "node:path";
import { z } from "zod";

const characterImagesFolder = join(
	import.meta.dirname,
	"..",
	"snowprint_assets",
	"characters",
);
const characterImageNames = fs.readdirSync(characterImagesFolder);

const RawMowSchema = z
	.strictObject({
		id: z.string().nonempty(),
		Name: z.string().trim().nonempty(),
		Faction: z.string().nonempty(),
		Alliance: z.string().nonempty(),
		"Initial rarity": z.string().nonempty(),
		Icon: z.templateLiteral([
			"snowprint_assets/characters/ui_image_portrait_",
			z.string().lowercase().nonempty(),
			"_",
			z.string().lowercase().nonempty(),
			"_01.png",
		]),
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
		PrimaryAbility: z.string().nonempty(),
		SecondaryAbility: z.string().nonempty(),
	})
	.transform((raw) => ({
		id: raw.id,
		name: raw.Name,
		factionId: raw.Faction,
		alliance: raw.Alliance,
		initialRarity: raw["Initial rarity"],
		icon: raw.Icon,
		roundIcon: raw.RoundIcon,
		primaryAbility: raw.PrimaryAbility,
		secondaryAbility: raw.SecondaryAbility,
	}));

const EXPECTED_UNIQUE_FIELDS = ["id", "name", "roundIcon"] as const;

const DataSchema = z.array(RawMowSchema).superRefine((mows, ctx) => {
	const seenValues = Object.fromEntries(
		EXPECTED_UNIQUE_FIELDS.map((field) => [field, new Set()]),
	);
	for (const mow of mows) {
		for (const field of EXPECTED_UNIQUE_FIELDS) {
			const value = mow[field];
			if (seenValues[field].has(value))
				ctx.addIssue({
					code: "custom",
					message: `Duplicate value "${value}" found for unique field "${field}" in MoW with id "${mow.id}"`,
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
