import z from "zod";
import {
	CAMPAIGNS_LOCATIONS_USAGES,
	CampaignsLocationsUsageSchema,
} from "#common/campaigns-locations-usage.ts";
import { GOAL_TYPES, GoalTypeSchema } from "#common/goal-type.ts";
import { RARITIES, RaritySchema } from "#common/rarity.ts";
import { Rank, RarityStars } from "./constants.ts";

/**
 * Coerce a single numeric rarity value to its string equivalent.
 * Old format: 4 → new format: "Legendary"
 */
const coerceRarity = z.preprocess((val) => {
	if (val === undefined || val === null) return undefined;
	if (typeof val === "number" && val >= 0 && val < RARITIES.length)
		return RARITIES[val];
	return val;
}, RaritySchema.optional());

/**
 * Coerce numeric rarity values (from old tacticusplanner data) to string values.
 * Old format: [4, 5] → new format: ["Legendary", "Mythic"]
 */
const coerceRarityArray = z.preprocess((val) => {
	if (val === undefined || val === null) return undefined;
	if (!Array.isArray(val)) return val;
	return val.map((item) =>
		typeof item === "number" && item >= 0 && item < RARITIES.length
			? RARITIES[item]
			: item,
	);
}, z.array(RaritySchema).optional());

/**
 * Coerce numeric goal type values (from old DB/planner data) to string values.
 * Old format: 1 → new format: "UpgradeRank"
 */
const coerceGoalType = z.preprocess((val) => {
	if (val === undefined || val === null) return undefined;
	if (typeof val === "number" && val >= 1 && val <= GOAL_TYPES.length)
		return GOAL_TYPES[val - 1];
	return val;
}, GoalTypeSchema.optional());

/**
 * Coerce numeric campaignsUsage values to string values.
 * Old format: 2 → new format: "LeastEnergy"
 */
const coerceCampaignsUsage = z.preprocess((val) => {
	if (val === undefined || val === null) return undefined;
	if (
		typeof val === "number" &&
		val >= 0 &&
		val < CAMPAIGNS_LOCATIONS_USAGES.length
	)
		return CAMPAIGNS_LOCATIONS_USAGES[val];
	return val;
}, CampaignsLocationsUsageSchema.optional());

// ─── Goal Schemas ───────────────────────────────────────────────────

/**
 * Loose schema for goal `data` JSON at parse boundaries.
 * Uses .passthrough() because goal data is a "bag" — different goal types
 * use different subsets of fields, and roster sync adds extra fields at runtime.
 */
export const GoalDataSchema = z
	.object({
		type: coerceGoalType,
		rankStart: z.number().optional(),
		rankEnd: z.number().optional(),
		rarityStart: coerceRarity,
		rarityEnd: coerceRarity,
		starsStart: z.number().optional(),
		starsEnd: z.number().optional(),
		shards: z.number().optional(),
		mythicShards: z.number().optional(),
		onslaughtShards: z.number().optional(),
		onslaughtMythicShards: z.number().optional(),
		campaignsUsage: coerceCampaignsUsage,
		activeStart: z.number().optional(),
		activeEnd: z.number().optional(),
		passiveStart: z.number().optional(),
		passiveEnd: z.number().optional(),
		primaryStart: z.number().optional(),
		primaryEnd: z.number().optional(),
		secondaryStart: z.number().optional(),
		secondaryEnd: z.number().optional(),
		level: z.number().optional(),
		xp: z.number().optional(),
		rarity: coerceRarity,
		upgradesRarity: coerceRarityArray,
	})
	.passthrough();

/**
 * Strict schema with defaults for the goal edit form.
 * Applies sensible defaults so the form always has values to display.
 */
export const GoalFormSchema = z.object({
	rankStart: z.int().optional().default(1),
	rankEnd: z.int().optional().default(13),
	primaryEnd: z.int().optional().default(1),
	secondaryEnd: z.int().optional().default(1),
	activeEnd: z.number().optional().default(1),
	passiveEnd: z.number().optional().default(1),
	upgradesRarity: coerceRarityArray.default([]),
	onslaughtShards: z.number().optional().default(0),
	rarityEnd: coerceRarity.default("Legendary"),
	starsEnd: z.nativeEnum(RarityStars).optional().default(RarityStars.None),
});

// ─── Roster Schemas ─────────────────────────────────────────────────

const RosterEquipmentSchema = z.object({
	id: z.string(),
	level: z.number(),
	rarity: RaritySchema,
	slotId: z.string(),
});

export const RosterUnitSchema = z.object({
	rank: z.nativeEnum(Rank),
	rarity: RaritySchema,
	stars: z.nativeEnum(RarityStars),
	abilities: z.tuple([z.number(), z.number()]),
	shards: z.number(),
	mythicShards: z.number(),
	level: z.number(),
	xp: z.number(),
	upgradeCount: z.number(),
	appliedUpgrades: z.array(z.string()).default([]),
	equipment: z.array(RosterEquipmentSchema),
});

// ─── Snapshot Schemas ───────────────────────────────────────────────

const SnapshotUnitSchema = z.object({
	rank: z.number(),
	rarity: RaritySchema,
	stars: z.number(),
	abilities: z.tuple([z.number(), z.number()]),
	shards: z.number(),
	mythicShards: z.number(),
	level: z.number(),
	xp: z.number(),
});

const RosterSnapshotSchema = z.object({
	name: z.string(),
	createdAt: z.number(),
	units: z.record(z.string(), SnapshotUnitSchema),
});

export const RosterSnapshotsStateSchema = z.object({
	snapshots: z.array(RosterSnapshotSchema),
	deletedSnapshots: z.array(RosterSnapshotSchema),
});

// ─── Planner Import Schemas ─────────────────────────────────────────

export const PlannerGoalSchema = z.object({
	id: z.string(),
	type: z.number(),
	priority: z.number(),
	dailyRaids: z.boolean(),
	character: z.string(),
	notes: z.string().optional(),
	startingRank: z.number().optional(),
	targetRank: z.number().optional(),
	currentRank: z.number().optional(),
	targetRarity: z.number().optional(),
	targetStars: z.number().optional(),
	shardsPerToken: z.number().optional(),
	mythicShardsPerToken: z.number().optional(),
	campaignsUsage: z.number().optional(),
	firstAbilityLevel: z.number().optional(),
	secondAbilityLevel: z.number().optional(),
	primaryStart: z.number().optional(),
	primaryEnd: z.number().optional(),
	secondaryStart: z.number().optional(),
	secondaryEnd: z.number().optional(),
	upgradesRarity: z.array(z.number()).optional(),
});

// ─── Planner Export: Roster Snapshot (old format) ──────────────────

const PlannerSnapshotCharSchema = z.object({
	id: z.string(),
	rank: z.number(),
	rarity: z.number(),
	stars: z.number(),
	activeAbilityLevel: z.number(),
	passiveAbilityLevel: z.number(),
	shards: z.number(),
	mythicShards: z.number(),
	xpLevel: z.number(),
});

const PlannerSnapshotSchema = z.object({
	name: z.string(),
	dateMillisUtc: z.number(),
	chars: z.array(PlannerSnapshotCharSchema),
});

// ─── Planner Export: LRE Progress (old format) ─────────────────────

const PlannerLreBattleSchema = z.object({
	trackId: z.string(),
	battleIndex: z.number(),
	requirements: z.array(
		z.object({
			id: z.string(),
			state: z.number().optional(),
			status: z.number().optional(),
		}),
	),
});

const PlannerLreProgressSchema = z.object({
	id: z.number(),
	name: z.string(),
	notes: z.string().optional(),
	battlesProgress: z.array(PlannerLreBattleSchema),
});

// ─── Planner Export: LRE Teams (old format) ────────────────────────

const PlannerLreTeamSchema = z.object({
	id: z.string(),
	name: z.string(),
	section: z.string(),
	charSnowprintIds: z.array(z.string()),
	expectedBattleClears: z.number().optional(),
	restrictionsIds: z.array(z.string()).optional(),
	notes: z.string().optional(),
});

const PlannerLreTeamsEntrySchema = z.object({
	id: z.number(),
	name: z.string(),
	teams: z.array(PlannerLreTeamSchema).optional(),
});

// ─── Full Planner Export Schema ────────────────────────────────────

export const PlannerExportSchema = z.object({
	schemaVersion: z.number().optional(),
	goals: z.array(PlannerGoalSchema).optional(),
	campaignsProgress: z.record(z.string(), z.number()).optional(),
	rosterSnapshots: z
		.object({
			base: PlannerSnapshotSchema.optional(),
			diffs: z.array(z.unknown()).optional(),
		})
		.optional(),
	leProgress: z.record(z.string(), PlannerLreProgressSchema).optional(),
	leTeams: z.record(z.string(), PlannerLreTeamsEntrySchema).optional(),
	teams: z.array(z.unknown()).optional(),
	teams2: z.array(z.unknown()).optional(),
});
