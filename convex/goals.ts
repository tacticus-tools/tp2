import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];

		const goals = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		return goals.sort((a, b) => a.priority - b.priority);
	},
});

export const add = mutation({
	args: {
		goalId: v.string(),
		type: v.number(),
		unitId: v.string(),
		unitName: v.string(),
		priority: v.number(),
		include: v.boolean(),
		notes: v.optional(v.string()),
		data: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		// Shift existing goals' priorities to make room
		const existing = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		for (const goal of existing) {
			if (goal.priority >= args.priority) {
				await ctx.db.patch(goal._id, { priority: goal.priority + 1 });
			}
		}

		return await ctx.db.insert("goals", {
			userId,
			...args,
		});
	},
});

export const update = mutation({
	args: {
		goalId: v.string(),
		type: v.optional(v.number()),
		unitId: v.optional(v.string()),
		unitName: v.optional(v.string()),
		priority: v.optional(v.number()),
		include: v.optional(v.boolean()),
		notes: v.optional(v.string()),
		data: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		const goal = existing.find((g) => g.goalId === args.goalId);
		if (!goal) throw new Error("Goal not found");

		const { goalId: _, ...updates } = args;
		// Remove undefined values
		const patch: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				patch[key] = value;
			}
		}

		await ctx.db.patch(goal._id, patch);
	},
});

export const remove = mutation({
	args: { goalId: v.string() },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		const goal = existing.find((g) => g.goalId === args.goalId);
		if (!goal) throw new Error("Goal not found");

		await ctx.db.delete(goal._id);

		// Re-index priorities
		const remaining = existing
			.filter((g) => g.goalId !== args.goalId)
			.sort((a, b) => a.priority - b.priority);

		for (let i = 0; i < remaining.length; i++) {
			if (remaining[i].priority !== i + 1) {
				await ctx.db.patch(remaining[i]._id, { priority: i + 1 });
			}
		}
	},
});

export const removeAll = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const goals = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		for (const goal of goals) {
			await ctx.db.delete(goal._id);
		}
	},
});

export const importBatch = mutation({
	args: {
		goals: v.array(
			v.object({
				goalId: v.string(),
				type: v.number(),
				unitId: v.string(),
				unitName: v.string(),
				priority: v.number(),
				include: v.boolean(),
				notes: v.optional(v.string()),
				data: v.string(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		// Delete all existing goals first
		const existing = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		for (const goal of existing) {
			await ctx.db.delete(goal._id);
		}

		// Insert all imported goals
		for (const goal of args.goals) {
			await ctx.db.insert("goals", {
				userId,
				...goal,
			});
		}
	},
});

export const reorder = mutation({
	args: {
		goalIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		const existing = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		for (let i = 0; i < args.goalIds.length; i++) {
			const goal = existing.find((g) => g.goalId === args.goalIds[i]);
			if (goal && goal.priority !== i + 1) {
				await ctx.db.patch(goal._id, { priority: i + 1 });
			}
		}
	},
});
