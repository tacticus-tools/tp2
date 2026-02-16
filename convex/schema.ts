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
	rateLimits: defineTable({
		userId: v.id("users"),
		functionName: v.string(),
		timestamp: v.number(),
	})
		.index("by_user_and_function", ["userId", "functionName"])
		.index("by_timestamp", ["timestamp"]),
});
