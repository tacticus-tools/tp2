import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		return await ctx.db
			.query("rosterSnapshots")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
	},
});

export const save = mutation({
	args: {
		data: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("rosterSnapshots")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				data: args.data,
				updatedAt: Date.now(),
			});
		} else {
			await ctx.db.insert("rosterSnapshots", {
				userId,
				data: args.data,
				updatedAt: Date.now(),
			});
		}
	},
});
