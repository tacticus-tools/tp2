/**
 * @description This script takes the datamined JSON of Legendary Event data and transforms it.
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

// Note: we bypass the `index.ts` here to avoid side effects that might require the Vite environment to be fully started up
import { DATA as DAMAGE_TYPES } from "../characters/damage-types.generated.ts";
import { DATA as FACTION_IDS } from "../characters/faction-ids.generated.ts";
import { DATA as CHARACTER_TRAITS } from "../characters/traits.generated.ts";
import { DATA as NPC_IDS } from "../npcs/ids.generated.ts";

// ----------- Helper Functions -----------
const arraysEqual = <T>(a: T[], b: T[]) => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};

// ----------- Objective Schemas -----------
// To get the list of objective types, run this command in the terminal:
// jq -r '.legendaryEvents[].alpha.battles[].objectives[].type' data.raw.json | sort -u
const AcingObjective = z.strictObject({
	type: z.literal("Acing"),
	target: z.literal("").transform(() => null),
	points: z.int().positive(),
});
const DamageTypeObjective = z.strictObject({
	type: z.literal("DamageType"),
	target: z.enum(DAMAGE_TYPES),
	points: z.int().positive(),
});
const FactionObjective = z.strictObject({
	type: z.literal("Faction"),
	target: z.enum(FACTION_IDS),
	points: z.int().positive(),
});
const HasNoRangedAttackObjective = z.strictObject({
	type: z.literal("HasNoRangedAttack"),
	target: z.literal("").transform(() => null),
	points: z.int().positive(),
});
const HasRangedAttackObjective = z.strictObject({
	type: z.literal("HasRangedAttack"),
	target: z.literal("").transform(() => null),
	points: z.int().positive(),
});
const MaxHitsObjective = z.strictObject({
	type: z.literal("MaxHits"),
	target: z.coerce.number().int().positive(),
	points: z.int().positive(),
});
const MinHitsObjective = z.strictObject({
	type: z.literal("MinHits"),
	target: z.coerce.number().int().positive(),
	points: z.int().positive(),
});
const NotDamageTypeObjective = z.strictObject({
	type: z.literal("NotDamageType"),
	target: z.enum(DAMAGE_TYPES),
	points: z.int().positive(),
});
const NotTraitObjective = z.strictObject({
	type: z.literal("NotTrait"),
	target: z.enum(CHARACTER_TRAITS),
	points: z.int().positive(),
});
const TraitObjective = z.strictObject({
	type: z.literal("Trait"),
	target: z.enum(CHARACTER_TRAITS),
	points: z.int().positive(),
});
const UseNoSummonsObjective = z.strictObject({
	type: z.literal("UseNoSummons"),
	target: z.literal("").transform(() => null),
	points: z.int().positive(),
});

const ObjectiveSchema = z.discriminatedUnion("type", [
	DamageTypeObjective,
	FactionObjective,
	HasNoRangedAttackObjective,
	HasRangedAttackObjective,
	MaxHitsObjective,
	MinHitsObjective,
	NotDamageTypeObjective,
	NotTraitObjective,
	TraitObjective,
	UseNoSummonsObjective,
]);

// ----------- Wave Schema -----------
const WaveSchema = z
	.strictObject({
		enemies: z
			.array(z.templateLiteral([z.enum(NPC_IDS), ":", z.int().positive()]))
			.min(1)
			.transform((enemies) => {
				// Rather than repeating each enemy + level N times, revise to counts
				const uniqueEnemies = Array.from(new Set(enemies));
				const enemyCounts = Object.fromEntries(
					uniqueEnemies.map((enemy) => [enemy, 0]),
				);
				for (const enemy of enemies) ++enemyCounts[enemy];
				return enemyCounts;
			}),
		power: z.int().positive(),
		round: z.int().positive(),
	})
	// We don't usually care about the power of individual waves
	.transform(({ power, ...rest }) => rest);

// ----------- Battle Schema -----------
const BattleSchema = z
	.strictObject({
		mapId: z.string(),
		number: z.int().positive(),
		power: z.int().positive(),
		tier: z.literal(1), // Always 1 in current data but let's validate in case it changes in the future
		disallowedFactions: z.array(z.enum(FACTION_IDS)).min(1),
		waves: z.array(WaveSchema).min(1),
		objectives: z.tuple([
			AcingObjective,
			ObjectiveSchema,
			ObjectiveSchema,
			ObjectiveSchema,
			ObjectiveSchema,
			ObjectiveSchema,
		]),
	})
	.superRefine((data, ctx) => {
		// Ensure that the objectives are unique;
		const seen = new Set();
		for (const obj of data.objectives) {
			const objectiveKey = `${obj.type}:${obj.target}`;
			if (seen.has(objectiveKey))
				ctx.addIssue({
					code: "custom",
					message: `Duplicate objective type: ${objectiveKey}`,
				});
			else seen.add(objectiveKey);
		}

		// Wave numbers can be non-consecutive, but they should always start at 0 and be in ascending order.
		const roundNumbers = data.waves.map((wave) => wave.round);
		const sortedRoundNumbers = [...roundNumbers].sort((a, b) => a - b);
		if (!arraysEqual(roundNumbers, sortedRoundNumbers))
			ctx.addIssue({
				code: "custom",
				message: `Wave rounds are out of order. Expected [${sortedRoundNumbers.join(",")}] but got [${roundNumbers.join(",")}]`,
			});
	})
	.transform((data) => ({
		...data,
		// Drop tier since we don't use it. Keep mapId for battle map images.
		tier: undefined,
	}));

// ----------- Track Schema -----------
type LooseObjective = {
	type: string;
	target: string | number | null;
	points: number;
};
const areObjectivesEqual = (a: LooseObjective[], b: LooseObjective[]) => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		const objA = a[i];
		const objB = b[i];
		if (
			objA.type !== objB.type ||
			objA.target !== objB.target ||
			objA.points !== objB.points
		) {
			return false;
		}
	}
	return true;
};

const TrackSchema = z
	.strictObject({
		battles: z.array(BattleSchema),
	})
	.superRefine((data, ctx) => {
		// Validate that battle numbers are in order from 1 to n with no duplicates or gaps
		for (let i = 0; i < data.battles.length; i++) {
			if (data.battles[i].number !== i + 1) {
				ctx.addIssue({
					code: "custom",
					message: `Battle numbers must be in order from 1 to n with no duplicates or gaps. Expected battle number ${i + 1} but got ${data.battles[i].number}`,
				});
				break;
			}
		}
		// Validate that disallowedFactions is the same for all battles in the track
		const expectedDisallowedFactions = data.battles[0].disallowedFactions;
		for (const battle of data.battles) {
			const battleDisallowedFactions = battle.disallowedFactions;
			if (!arraysEqual(battleDisallowedFactions, expectedDisallowedFactions)) {
				ctx.addIssue({
					code: "custom",
					message: `disallowedFactions must be the same for all battles in the track. Expected [${expectedDisallowedFactions.join(",")}] but got [${battleDisallowedFactions.join(",")}] in battle ${battle.number}`,
				});
				break;
			}
		}
		// Validate that the non-acing objectives are the same for all battles in the track
		// The acing objective increases in points value each value so we ignore it in this comparison
		const expectedObjectives = data.battles[0].objectives.slice(1);
		for (const battle of data.battles) {
			if (!areObjectivesEqual(battle.objectives.slice(1), expectedObjectives)) {
				ctx.addIssue({
					code: "custom",
					message: `
          Objectives must be the same for all battles in the track.
          Expected ${JSON.stringify(expectedObjectives)}
          Received ${JSON.stringify(battle.objectives)}`,
				});
				break;
			}
		}
	})
	.transform((data) => {
		// 1. Since the disallowed factions don't change across battles, drop them down to the track level to avoid repetition.
		// 2. Since the acing objective is always the first objective, we can pull out the points value and put it directly on the battle.
		// 3. Since the objectives (other than acing) don't change across battles, drop them down to the track level to avoid repetition.
		// 4. Since the battles are in order, drop the battle number and we'll just rely on the array index
		// 5. Drop tier since we don't use it. Keep mapId for battle map images.
		const { disallowedFactions, objectives } = data.battles[0];
		const transformedBattles = data.battles.map(
			({ disallowedFactions, objectives, tier, number, ...rest }) => ({
				...rest,
				acingPoints: objectives[0].points,
			}),
		);
		return {
			disallowedFactions,
			objectives: objectives.slice(1),
			battles: transformedBattles,
		};
	});

// ----------- Event Schema -----------
const EventSchema = z.strictObject({
	id: z.string(),
	alpha: TrackSchema,
	beta: TrackSchema,
	gamma: TrackSchema,
});

// ----------- Data Schema -----------
const DataSchema = z
	.strictObject({
		legendaryEvents: z.array(EventSchema),
	})
	.superRefine((data, ctx) => {
		// Validate that event IDs are unique
		const seenEventIds = new Set();
		for (const event of data.legendaryEvents) {
			if (seenEventIds.has(event.id))
				ctx.addIssue({
					code: "custom",
					message: `Duplicate event ID: ${event.id}`,
				});
			else seenEventIds.add(event.id);
		}
	})
	.transform((data) => data.legendaryEvents);
export type Data = z.infer<typeof DataSchema>;

// ----------- Main Function -----------
export const main = () => {
	const rawData = JSON.parse(
		fs.readFileSync(join(import.meta.dirname, "data.raw.json"), "utf-8"),
	);

	const parsedData = DataSchema.parse(rawData);
	fs.writeFileSync(
		join(import.meta.dirname, "data.generated.json"),
		`${JSON.stringify(parsedData, null, 2)}\n`,
	);
};
