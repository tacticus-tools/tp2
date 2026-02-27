import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	...authTables,
	tacticusCredentials: defineTable({
		userId: v.id("users"),
		tacticusUserId: v.optional(v.string()),
		playerApiKey: v.string(),
		guildApiKey: v.optional(v.string()),
	}).index("by_userId", ["userId"]),
	goals: defineTable({
		userId: v.id("users"),
		goalId: v.string(),
		type: v.number(),
		unitId: v.string(),
		unitName: v.string(),
		priority: v.number(),
		include: v.boolean(),
		notes: v.optional(v.string()),
		data: v.string(),
	}).index("by_userId", ["userId"]),
	lreProgress: defineTable({
		userId: v.id("users"),
		eventId: v.number(),
		data: v.string(), // JSON: track scores, milestone progress, notes
		updatedAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_userId_eventId", ["userId", "eventId"]),
	lreTeams: defineTable({
		userId: v.id("users"),
		eventId: v.number(),
		trackId: v.string(), // "alpha" | "beta" | "gamma"
		name: v.string(),
		characterIds: v.array(v.string()),
		restrictionIds: v.optional(v.array(v.string())),
		expectedBattleClears: v.optional(v.number()),
		notes: v.optional(v.string()),
	})
		.index("by_userId", ["userId"])
		.index("by_userId_eventId", ["userId", "eventId"]),
	rosterSnapshots: defineTable({
		userId: v.id("users"),
		data: v.string(), // JSON: { snapshots: RosterSnapshot[], deletedSnapshots: RosterSnapshot[] }
		updatedAt: v.number(),
	}).index("by_userId", ["userId"]),
	gwOffense: defineTable({
		userId: v.id("users"),
		bfLevel: v.number(),
		deployments: v.string(), // JSON: Array<{ sectionIndex: number, teamId: Id<"teams"> }>
		notes: v.optional(v.string()),
		updatedAt: v.number(),
	}).index("by_userId", ["userId"]),
	teams: defineTable({
		userId: v.id("users"),
		name: v.string(),
		characterIds: v.array(v.string()),
		mowIds: v.optional(v.array(v.string())),
		gwOffense: v.optional(v.boolean()),
		gwDefense: v.optional(v.boolean()),
		raid: v.optional(v.boolean()),
		ta: v.optional(v.boolean()),
		notes: v.optional(v.string()),
	}).index("by_userId", ["userId"]),
	sharedRosters: defineTable({
		userId: v.id("users"),
		token: v.string(),
		roster: v.string(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_token", ["token"])
		.index("by_userId", ["userId"]),
});
