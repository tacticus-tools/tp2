import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const share = mutation({
	args: {
		roster: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("sharedRosters")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first();

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				roster: args.roster,
				updatedAt: now,
			});
			return { token: existing.token };
		}

		const token = crypto.randomUUID();
		await ctx.db.insert("sharedRosters", {
			userId,
			token,
			roster: args.roster,
			createdAt: now,
			updatedAt: now,
		});
		return { token };
	},
});

export const getShared = query({
	args: {
		token: v.string(),
	},
	handler: async (ctx, args) => {
		const row = await ctx.db
			.query("sharedRosters")
			.withIndex("by_token", (q) => q.eq("token", args.token))
			.first();

		if (!row) return null;
		return { roster: row.roster, updatedAt: row.updatedAt };
	},
});
