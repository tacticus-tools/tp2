/** biome-ignore-all lint/performance/noAwaitInLoops: Convex handles this https://docs.convex.dev/database/writing-data#bulk-inserts-or-updates */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// ----------- Progress -----------

export const getProgress = query({
	args: { eventId: v.number() },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		return await ctx.db
			.query("lreProgress")
			.withIndex("by_userId_eventId", (q) =>
				q.eq("userId", userId).eq("eventId", args.eventId),
			)
			.unique();
	},
});

export const saveProgress = mutation({
	args: {
		eventId: v.number(),
		data: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("lreProgress")
			.withIndex("by_userId_eventId", (q) =>
				q.eq("userId", userId).eq("eventId", args.eventId),
			)
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				data: args.data,
				updatedAt: Date.now(),
			});
		} else {
			await ctx.db.insert("lreProgress", {
				userId,
				eventId: args.eventId,
				data: args.data,
				updatedAt: Date.now(),
			});
		}
	},
});

// ----------- Teams -----------

export const listTeams = query({
	args: { eventId: v.number() },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];

		return await ctx.db
			.query("lreTeams")
			.withIndex("by_userId_eventId", (q) =>
				q.eq("userId", userId).eq("eventId", args.eventId),
			)
			.collect();
	},
});

export const addTeam = mutation({
	args: {
		eventId: v.number(),
		trackId: v.string(),
		name: v.string(),
		characterIds: v.array(v.string()),
		restrictionIds: v.optional(v.array(v.string())),
		expectedBattleClears: v.optional(v.number()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		return await ctx.db.insert("lreTeams", {
			userId,
			...args,
		});
	},
});

export const updateTeam = mutation({
	args: {
		teamId: v.id("lreTeams"),
		name: v.optional(v.string()),
		characterIds: v.optional(v.array(v.string())),
		restrictionIds: v.optional(v.array(v.string())),
		expectedBattleClears: v.optional(v.number()),
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

export const removeTeam = mutation({
	args: { teamId: v.id("lreTeams") },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const team = await ctx.db.get(args.teamId);
		if (!team || team.userId !== userId) throw new Error("Team not found");

		await ctx.db.delete(args.teamId);
	},
});
