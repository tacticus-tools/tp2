import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		return await ctx.db
			.query("gwOffense")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
	},
});

export const save = mutation({
	args: {
		bfLevel: v.number(),
		deployments: v.string(),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("gwOffense")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				bfLevel: args.bfLevel,
				deployments: args.deployments,
				notes: args.notes,
				updatedAt: Date.now(),
			});
		} else {
			await ctx.db.insert("gwOffense", {
				userId,
				bfLevel: args.bfLevel,
				deployments: args.deployments,
				notes: args.notes,
				updatedAt: Date.now(),
			});
		}
	},
});
