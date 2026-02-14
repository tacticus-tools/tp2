import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "~/_generated/server";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		return await ctx.db
			.query("tacticusCredentials")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();
	},
});

export const save = mutation({
	args: {
		tacticusUserId: v.optional(v.string()),
		playerApiKey: v.string(),
		guildApiKey: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("tacticusCredentials")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (existing) {
			return await ctx.db.patch(existing._id, {
				tacticusUserId: args.tacticusUserId,
				playerApiKey: args.playerApiKey,
				guildApiKey: args.guildApiKey,
			});
		}

		return await ctx.db.insert("tacticusCredentials", {
			userId,
			tacticusUserId: args.tacticusUserId,
			playerApiKey: args.playerApiKey,
			guildApiKey: args.guildApiKey,
		});
	},
});
