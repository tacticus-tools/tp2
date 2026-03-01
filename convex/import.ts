/** biome-ignore-all lint/performance/noAwaitInLoops: Convex handles this https://docs.convex.dev/database/writing-data#bulk-inserts-or-updates */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server.js";

/**
 * Import all sections from a tacticusplanner export in a single mutation.
 * Each section is optional — only provided sections are imported.
 * This avoids multiple round-trips and ensures atomicity.
 */
export const importAll = mutation({
	args: {
		goals: v.optional(
			v.array(
				v.object({
					goalId: v.string(),
					type: v.string(),
					unitId: v.string(),
					unitName: v.string(),
					priority: v.number(),
					include: v.boolean(),
					notes: v.optional(v.string()),
					data: v.string(),
				}),
			),
		),
		campaignProgress: v.optional(v.string()),
		rosterSnapshots: v.optional(v.string()),
		lreProgress: v.optional(
			v.array(
				v.object({
					eventId: v.number(),
					data: v.string(),
				}),
			),
		),
		lreTeams: v.optional(
			v.array(
				v.object({
					eventId: v.number(),
					trackId: v.string(),
					name: v.string(),
					characterIds: v.array(v.string()),
					restrictionIds: v.optional(v.array(v.string())),
					expectedBattleClears: v.optional(v.number()),
					notes: v.optional(v.string()),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		// ─── Goals ──────────────────────────────────────────────────
		if (args.goals && args.goals.length > 0) {
			// Delete all existing goals
			const existingGoals = await ctx.db
				.query("goals")
				.withIndex("by_userId", (q) => q.eq("userId", userId))
				.collect();
			for (const goal of existingGoals) {
				await ctx.db.delete(goal._id);
			}

			// Insert imported goals with normalized priorities
			const ordered = [...args.goals].sort((a, b) => a.priority - b.priority);
			for (let i = 0; i < ordered.length; i++) {
				await ctx.db.insert("goals", {
					userId,
					...ordered[i],
					priority: i + 1,
				});
			}
		}

		// ─── Campaign Progress ──────────────────────────────────────
		if (args.campaignProgress) {
			const existing = await ctx.db
				.query("campaignProgress")
				.withIndex("by_userId", (q) => q.eq("userId", userId))
				.unique();

			if (existing) {
				await ctx.db.patch(existing._id, {
					data: args.campaignProgress,
					updatedAt: Date.now(),
				});
			} else {
				await ctx.db.insert("campaignProgress", {
					userId,
					data: args.campaignProgress,
					updatedAt: Date.now(),
				});
			}
		}

		// ─── Roster Snapshots ───────────────────────────────────────
		if (args.rosterSnapshots) {
			const existing = await ctx.db
				.query("rosterSnapshots")
				.withIndex("by_userId", (q) => q.eq("userId", userId))
				.unique();

			if (existing) {
				await ctx.db.patch(existing._id, {
					data: args.rosterSnapshots,
					updatedAt: Date.now(),
				});
			} else {
				await ctx.db.insert("rosterSnapshots", {
					userId,
					data: args.rosterSnapshots,
					updatedAt: Date.now(),
				});
			}
		}

		// ─── LRE Progress ───────────────────────────────────────────
		if (args.lreProgress && args.lreProgress.length > 0) {
			for (const entry of args.lreProgress) {
				const existing = await ctx.db
					.query("lreProgress")
					.withIndex("by_userId_eventId", (q) =>
						q.eq("userId", userId).eq("eventId", entry.eventId),
					)
					.unique();

				if (existing) {
					await ctx.db.patch(existing._id, {
						data: entry.data,
						updatedAt: Date.now(),
					});
				} else {
					await ctx.db.insert("lreProgress", {
						userId,
						eventId: entry.eventId,
						data: entry.data,
						updatedAt: Date.now(),
					});
				}
			}
		}

		// ─── LRE Teams ─────────────────────────────────────────────
		if (args.lreTeams && args.lreTeams.length > 0) {
			// Group by eventId to delete existing teams per event
			const eventIds = [...new Set(args.lreTeams.map((t) => t.eventId))];

			for (const eventId of eventIds) {
				const existingTeams = await ctx.db
					.query("lreTeams")
					.withIndex("by_userId_eventId", (q) =>
						q.eq("userId", userId).eq("eventId", eventId),
					)
					.collect();
				for (const team of existingTeams) {
					await ctx.db.delete(team._id);
				}
			}

			// Insert all imported teams
			for (const team of args.lreTeams) {
				await ctx.db.insert("lreTeams", {
					userId,
					eventId: team.eventId,
					trackId: team.trackId,
					name: team.name,
					characterIds: team.characterIds,
					restrictionIds: team.restrictionIds,
					expectedBattleClears: team.expectedBattleClears,
					notes: team.notes,
				});
			}
		}
	},
});
