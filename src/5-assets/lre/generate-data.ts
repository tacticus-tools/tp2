/**
 * @description This script takes the consolidated LRE (Legendary Release Event) JSON and transforms it.
 * @private This script is run automatically as part of the build process. Do not import it into the app.
 *
 * Goals:
 * 1) Validate the structure of the LRE JSON to ensure it matches our expectations and catch any changes early.
 * 2) Make the structure convenient to work with by normalizing field names and shapes.
 * 3) Extract key types (event IDs, track names) directly from generated data for type safety.
 *
 * Note:
 * This script is intended to be run as a Vite build plugin. Importing any app code into this file
 * is sketchy since Vite has not fully started up yet.
 */

/** biome-ignore-all lint/correctness/noNodejsModules: server-side build script */
import fs from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Note: we bypass the `index.ts` here to avoid side effects that might require the Vite environment to be fully started up
import { DATA as CHARACTER_IDS } from "../characters/ids.generated.ts";

// ----------- Sub-schemas -----------

const EnemyInfoSchema = z.strictObject({
	label: z.string().nonempty(),
	link: z.string().url(),
});

const BaseTrackSchema = z.strictObject({
	name: z.string().nonempty(),
	enemies: EnemyInfoSchema,
	killPoints: z.number().int().positive(),
	battlesPoints: z.array(z.number().int().positive()).min(12),
	defeatAll: z.array(z.number().int().positive()).min(12).optional(),
});

const TrackSchema = BaseTrackSchema.superRefine((data, ctx) => {
	if (data.defeatAll && data.defeatAll.length !== data.battlesPoints.length) {
		ctx.addIssue({
			code: "custom",
			message: `defeatAll length (${data.defeatAll.length}) must match battlesPoints length (${data.battlesPoints.length})`,
		});
	}
}).transform((data) => ({
	name: data.name,
	enemies: data.enemies,
	killPoints: data.killPoints,
	battlesPoints: data.battlesPoints,
	defeatAll: data.defeatAll ?? null,
}));

const MilestoneSchema = z.strictObject({
	milestone: z.number().int().positive(),
	cumulativePoints: z.number().int().positive(),
	engramPayout: z.number().int().positive(),
});

const ChestMilestoneSchema = z.strictObject({
	chestLevel: z.number().int().positive(),
	engramCost: z.number().int().positive(),
});

const ProgressionSchema = z
	.strictObject({
		unlock: z.number().int().positive(),
		fourStars: z.number().int().positive(),
		fiveStars: z.number().int().positive(),
		blueStar: z.number().int().positive(),
		mythic: z.number().int().positive().optional(),
		twoBlueStars: z.number().int().positive().optional(),
	})
	.transform((data) => ({
		unlock: data.unlock,
		fourStars: data.fourStars,
		fiveStars: data.fiveStars,
		blueStar: data.blueStar,
		mythic: data.mythic ?? null,
		twoBlueStars: data.twoBlueStars ?? null,
	}));

// ----------- Event Schema -----------

const EventSchema = z
	.strictObject({
		id: z.number().int().positive(),
		unitSnowprintId: z.enum(CHARACTER_IDS),
		name: z.string().nonempty(),
		wikiLink: z.string().url(),
		eventStage: z.number().int().min(1).max(3),
		nextEventDate: z.string().optional(),
		nextEventDateUtc: z.string().optional(),
		finished: z.boolean(),
		battlesCount: z.number().int().min(12).max(18),
		constraintsCount: z.literal(7),
		regularMissions: z.array(z.string().nonempty()).length(10),
		premiumMissions: z.array(z.string().nonempty()).length(10),
		alpha: TrackSchema,
		beta: TrackSchema,
		gamma: TrackSchema,
		pointsMilestones: z.array(MilestoneSchema).min(36),
		chestsMilestones: z.array(ChestMilestoneSchema).min(36),
		shardsPerChest: z.number().int().positive(),
		progression: ProgressionSchema,
	})
	.superRefine((data, ctx) => {
		// Validate battlesCount matches track data
		for (const trackName of ["alpha", "beta", "gamma"] as const) {
			const track = data[trackName];
			if (track.battlesPoints.length !== data.battlesCount) {
				ctx.addIssue({
					code: "custom",
					message: `${trackName}.battlesPoints length (${track.battlesPoints.length}) must match battlesCount (${data.battlesCount})`,
				});
			}
		}

		// Validate milestones are in ascending order
		for (let i = 1; i < data.pointsMilestones.length; i++) {
			if (
				data.pointsMilestones[i].cumulativePoints <=
				data.pointsMilestones[i - 1].cumulativePoints
			) {
				ctx.addIssue({
					code: "custom",
					message: `pointsMilestones must have ascending cumulativePoints at index ${i}`,
				});
				break;
			}
		}

		// Validate chest milestones are in ascending order
		for (let i = 1; i < data.chestsMilestones.length; i++) {
			if (
				data.chestsMilestones[i].chestLevel <=
				data.chestsMilestones[i - 1].chestLevel
			) {
				ctx.addIssue({
					code: "custom",
					message: `chestsMilestones must have ascending chestLevel at index ${i}`,
				});
				break;
			}
		}
	})
	.transform((data) => ({
		id: data.id,
		characterId: data.unitSnowprintId,
		name: data.name,
		wikiLink: data.wikiLink,
		eventStage: data.eventStage,
		nextEventDate: data.nextEventDate || null,
		finished: data.finished,
		battlesCount: data.battlesCount,
		regularMissions: data.regularMissions,
		premiumMissions: data.premiumMissions,
		alpha: data.alpha,
		beta: data.beta,
		gamma: data.gamma,
		pointsMilestones: data.pointsMilestones,
		chestsMilestones: data.chestsMilestones,
		shardsPerChest: data.shardsPerChest,
		progression: data.progression,
	}));

// ----------- Data Schema -----------

const DataSchema = z
	.array(EventSchema)
	.min(12)
	.superRefine((events, ctx) => {
		const seenIds = new Set<number>();
		for (const event of events) {
			if (seenIds.has(event.id)) {
				ctx.addIssue({
					code: "custom",
					message: `Duplicate event ID: ${event.id}`,
				});
			}
			seenIds.add(event.id);
		}
	});
export type Data = z.infer<typeof DataSchema>;

// ----------- Main Function -----------

export const main = () => {
	let rawText = fs.readFileSync(
		join(import.meta.dirname, "data.raw.json"),
		"utf-8",
	);
	// Strip BOM if present (legacy files had UTF-8 BOM)
	if (rawText.charCodeAt(0) === 0xfeff) rawText = rawText.slice(1);
	const rawData = JSON.parse(rawText);

	const parsedData = DataSchema.parse(rawData);

	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);

	// Generate event ID constants for type-safe references
	const eventIds = parsedData.map((e) => e.id);
	fs.writeFileSync(
		join(import.meta.dirname, "ids.generated.ts"),
		`export const DATA = ${JSON.stringify(eventIds)} as const;\n`,
	);
};
