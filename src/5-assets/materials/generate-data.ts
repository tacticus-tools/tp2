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
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const materialsImagesFolder = join(
	import.meta.dirname,
	"..",
	"snowprint_assets",
	"materials",
);
const materialImageNames = fs.readdirSync(materialsImagesFolder);

const RecipeIngredientSchema = z.strictObject({
	material: z.string().nonempty(),
	count: z.number().int().positive(),
});

const RawMaterialSchema = z
	.strictObject({
		material: z.string().trim().nonempty(),
		snowprintId: z.string().nonempty(),
		rarity: z.enum([
			"Common",
			"Uncommon",
			"Rare",
			"Epic",
			"Legendary",
			"Mythic",
		]),
		stat: z.enum(["Armour", "Damage", "Health"]),
		icon: z
			.string()
			.startsWith("snowprint_assets/upgrade_materials/ui_icon_upgrade_")
			.endsWith(".png")
			.transform((iconPath) => iconPath.split("/").slice(-1)[0])
			.refine((filename) => materialImageNames.includes(filename), {
				message: "Icon file not found on disk",
			}),
		craftable: z.boolean(),
		recipe: z.array(RecipeIngredientSchema).optional(),
	})
	.refine((mat) => mat.craftable === !!mat.recipe?.length, {
		message:
			"Craftable materials must have a non-empty recipe, and non-craftable materials must not have a recipe",
	})
	.transform((raw) => ({
		id: raw.snowprintId,
		name: raw.material,
		rarity: raw.rarity,
		stat: raw.stat,
		iconFilename: raw.icon,
		recipe:
			raw.recipe?.map((r) => ({ id: r.material, count: r.count })) ?? null,
	}));

const MaterialsDataSchema = z
	.record(z.string(), RawMaterialSchema)
	.superRefine((materials, ctx) => {
		for (const [key, mat] of Object.entries(materials)) {
			// Key must match snowprintId
			if (key !== mat.id) {
				ctx.addIssue({
					code: "custom",
					message: `Key "${key}" does not match snowprintId "${mat.id}"`,
				});
			}
		}
	});
export type MaterialData = z.infer<typeof MaterialsDataSchema>;

export const main = () => {
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);
	const parsedData = MaterialsDataSchema.parse(rawData);

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);

	fs.writeFileSync(
		join(import.meta.dirname, "ids.generated.ts"),
		`export const DATA = ${JSON.stringify(
			Object.keys(parsedData),
			null,
			2,
		)} as const;\n`,
	);
};
