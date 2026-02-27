import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];

		return await ctx.db
			.query("teams")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();
	},
});

export const add = mutation({
	args: {
		name: v.string(),
		characterIds: v.array(v.string()),
		mowIds: v.optional(v.array(v.string())),
		gwOffense: v.optional(v.boolean()),
		gwDefense: v.optional(v.boolean()),
		raid: v.optional(v.boolean()),
		ta: v.optional(v.boolean()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		return await ctx.db.insert("teams", {
			userId,
			...args,
		});
	},
});

export const update = mutation({
	args: {
		teamId: v.id("teams"),
		name: v.optional(v.string()),
		characterIds: v.optional(v.array(v.string())),
		mowIds: v.optional(v.array(v.string())),
		gwOffense: v.optional(v.boolean()),
		gwDefense: v.optional(v.boolean()),
		raid: v.optional(v.boolean()),
		ta: v.optional(v.boolean()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const team = await ctx.db.get(args.teamId);
		if (!team || team.userId !== userId) throw new Error("Team not found");

		const { teamId: _, ...updates } = args;
		const patch: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				patch[key] = value;
			}
		}
		await ctx.db.patch(args.teamId, patch);
	},
});

export const remove = mutation({
	args: { teamId: v.id("teams") },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const team = await ctx.db.get(args.teamId);
		if (!team || team.userId !== userId) throw new Error("Team not found");

		await ctx.db.delete(args.teamId);
	},
});
