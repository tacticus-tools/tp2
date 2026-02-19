/**
 * @description Validates and transforms the raw material + rank-up JSON data.
 * @private Run automatically as a Vite build plugin. Do not import into the app.
 *
 * Goals:
 * 1) Validate all 503 materials against a strict Zod schema
 * 2) Verify every icon filename exists on disk
 * 3) Cross-validate recipe ingredients and rank-up material references
 * 4) Output lean generated JSON consumed by the rest of the app
 */

// biome-ignore lint/correctness/noNodejsModules: build-time script
import fs from "node:fs";
// biome-ignore lint/correctness/noNodejsModules: build-time script
import { join } from "node:path";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Icon filesystem check
// ---------------------------------------------------------------------------

const materialsImagesFolder = join(
	import.meta.dirname,
	"..",
	"snowprint_assets",
	"materials",
);
const materialImageNames = new Set(fs.readdirSync(materialsImagesFolder));

function extractIconFilename(iconPath: string): string {
	const lastSlash = iconPath.lastIndexOf("/");
	return lastSlash >= 0 ? iconPath.slice(lastSlash + 1) : iconPath;
}

// ---------------------------------------------------------------------------
// Material schema
// ---------------------------------------------------------------------------

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
			.nonempty()
			.transform(extractIconFilename)
			.refine((filename) => materialImageNames.has(filename), {
				message: "Icon file not found on disk",
			}),
		craftable: z.boolean(),
		recipe: z.array(RecipeIngredientSchema).optional(),
	})
	.transform((raw) => ({
		id: raw.snowprintId,
		name: raw.material,
		rarity: raw.rarity,
		stat: raw.stat,
		iconFilename: raw.icon,
		craftable: raw.craftable,
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

			// craftable === true → must have recipe
			if (mat.craftable && (!mat.recipe || mat.recipe.length === 0)) {
				ctx.addIssue({
					code: "custom",
					message: `Material "${mat.id}" is craftable but has no recipe`,
				});
			}

			// All recipe ingredient IDs must reference existing entries
			if (mat.recipe) {
				for (const ingredient of mat.recipe) {
					if (!(ingredient.id in materials)) {
						ctx.addIssue({
							code: "custom",
							message: `Material "${mat.id}" recipe references unknown material "${ingredient.id}"`,
						});
					}
				}
			}
		}
	});

// ---------------------------------------------------------------------------
// Rank-up schema
// ---------------------------------------------------------------------------

const RANK_STRINGS = [
	"Stone I",
	"Stone II",
	"Stone III",
	"Iron I",
	"Iron II",
	"Iron III",
	"Bronze I",
	"Bronze II",
	"Bronze III",
	"Silver I",
	"Silver II",
	"Silver III",
	"Gold I",
	"Gold II",
	"Gold III",
	"Diamond I",
	"Diamond II",
	"Diamond III",
	"Adamantine I",
] as const;

const RankUpSchema = z.record(
	z.string(),
	z.record(z.enum(RANK_STRINGS), z.array(z.string()).length(6)),
);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export const main = () => {
	// --- Materials ---
	const rawMaterials = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);
	const parsedMaterials = MaterialsDataSchema.parse(rawMaterials);

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedMaterials, null, 2)}\n`,
	);

	// --- Rank-up data ---
	const rawRankUp = JSON.parse(
		fs.readFileSync(
			join(import.meta.dirname, "rank-up-data.raw.json"),
			"utf-8",
		),
	);
	const parsedRankUp = RankUpSchema.parse(rawRankUp);

	// Cross-validate: all material IDs in rank-up data must exist in materials
	for (const [charId, ranks] of Object.entries(parsedRankUp)) {
		for (const [rank, materialIds] of Object.entries(ranks)) {
			for (const matId of materialIds) {
				if (!(matId in parsedMaterials)) {
					throw new Error(
						`Rank-up data: character "${charId}" rank "${rank}" references unknown material "${matId}"`,
					);
				}
			}
		}
	}

	fs.writeFileSync(
		join(import.meta.dirname, "rank-up-data.generated.json"),
		`${JSON.stringify(parsedRankUp, null, 2)}\n`,
	);
};
