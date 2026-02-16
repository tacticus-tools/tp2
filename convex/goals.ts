import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { rateLimiter } from "./rateLimiter";

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

		// Check rate limit
		const { ok, retryAfter } = await rateLimiter.limit(ctx, "goals.add", {
			key: userId,
		});
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}

		// Shift existing goals' priorities to make room
		const existing = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		const priority = Math.min(Math.max(args.priority, 1), existing.length + 1);

		for (const goal of existing) {
			if (goal.priority >= priority) {
				await ctx.db.patch(goal._id, { priority: goal.priority + 1 });
			}
		}

		return await ctx.db.insert("goals", {
			userId,
			...args,
			priority,
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

		// Check rate limit
		const { ok, retryAfter } = await rateLimiter.limit(ctx, "goals.update", {
			key: userId,
		});
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}

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

		// Check rate limit
		const { ok, retryAfter } = await rateLimiter.limit(ctx, "goals.remove", {
			key: userId,
		});
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}

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

		// Check rate limit
		const { ok, retryAfter } = await rateLimiter.limit(ctx, "goals.removeAll", {
			key: userId,
		});
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}

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

		// Check rate limit
		const { ok, retryAfter } = await rateLimiter.limit(
			ctx,
			"goals.importBatch",
			{ key: userId.toString() },
		);
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}

		// Delete all existing goals first
		const existing = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		for (const goal of existing) {
			await ctx.db.delete(goal._id);
		}

		// Insert all imported goals with normalized 1-based priorities
		const ordered = [...args.goals].sort((a, b) => a.priority - b.priority);
		for (let i = 0; i < ordered.length; i++) {
			const goal = ordered[i];
			await ctx.db.insert("goals", {
				userId,
				...goal,
				priority: i + 1,
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

		// Check rate limit
		const { ok, retryAfter } = await rateLimiter.limit(ctx, "goals.reorder", {
			key: userId,
		});
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}

		const existing = await ctx.db
			.query("goals")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect();

		// Validate completeness and uniqueness
		const goalById = new Map(existing.map((g) => [g.goalId, g]));
		if (args.goalIds.length !== existing.length) {
			throw new Error("Goal list mismatch");
		}
		const seen = new Set<string>();
		for (const goalId of args.goalIds) {
			if (seen.has(goalId) || !goalById.has(goalId)) {
				throw new Error("Goal list mismatch");
			}
			seen.add(goalId);
		}

		for (let i = 0; i < args.goalIds.length; i++) {
			const goal = goalById.get(args.goalIds[i]);
			if (goal && goal.priority !== i + 1) {
				await ctx.db.patch(goal._id, { priority: i + 1 });
			}
		}
	},
});
