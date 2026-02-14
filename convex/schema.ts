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
});
