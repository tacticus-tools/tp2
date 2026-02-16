import type {
	GenericActionCtx,
	GenericMutationCtx,
	GenericQueryCtx,
} from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

export type RateLimitConfig = {
	maxCalls: number;
	windowMs: number;
};

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
	// External API actions - stricter limits to prevent abuse
	"tacticus.actions.getPlayerData": { maxCalls: 10, windowMs: 60_000 }, // 10 calls per minute
	"tacticus.actions.getGuildData": { maxCalls: 10, windowMs: 60_000 },
	"tacticus.actions.getGuildRaidData": { maxCalls: 10, windowMs: 60_000 },
	"tacticus.actions.getGuildRaidBySeason": { maxCalls: 10, windowMs: 60_000 },

	// Batch mutations - moderate limits
	"goals.importBatch": { maxCalls: 5, windowMs: 60_000 }, // 5 calls per minute
	"goals.removeAll": { maxCalls: 10, windowMs: 60_000 },
	"goals.reorder": { maxCalls: 30, windowMs: 60_000 },

	// Regular mutations - more generous limits
	"goals.add": { maxCalls: 60, windowMs: 60_000 }, // 60 calls per minute
	"goals.update": { maxCalls: 60, windowMs: 60_000 },
	"goals.remove": { maxCalls: 60, windowMs: 60_000 },
};

type MutationContext =
	| GenericQueryCtx<DataModel>
	| GenericMutationCtx<DataModel>;

/**
 * Check if a user has exceeded the rate limit for a specific function.
 * Throws an error if the limit is exceeded.
 * Records the function call if within limits.
 * Use this for mutations and queries.
 */
export async function checkRateLimit(
	ctx: MutationContext,
	userId: Id<"users">,
	functionName: string,
): Promise<void> {
	const config = RATE_LIMITS[functionName];
	if (!config) {
		// No rate limit configured for this function
		return;
	}

	const now = Date.now();
	const windowStart = now - config.windowMs;

	// Query recent calls within the time window
	const recentCalls = await ctx.db
		.query("rateLimits")
		.withIndex("by_user_and_function", (q) =>
			q.eq("userId", userId).eq("functionName", functionName),
		)
		.filter((q) => q.gte(q.field("timestamp"), windowStart))
		.collect();

	if (recentCalls.length >= config.maxCalls) {
		const oldestCall = Math.min(...recentCalls.map((c) => c.timestamp));
		const timeUntilReset = Math.ceil(
			(oldestCall + config.windowMs - now) / 1000,
		);

		throw new Error(
			`Rate limit exceeded for ${functionName}. Please try again in ${timeUntilReset} seconds.`,
		);
	}

	// Record this call (only in mutation context)
	if ("scheduler" in ctx) {
		const mutationCtx = ctx as GenericMutationCtx<DataModel>;
		await mutationCtx.db.insert("rateLimits", {
			userId,
			functionName,
			timestamp: now,
		});
	}
}

/**
 * Check rate limit for actions. Use this for actions since they don't have direct db access.
 */
export async function checkRateLimitAction(
	ctx: GenericActionCtx<DataModel>,
	userId: Id<"users">,
	functionName: string,
): Promise<void> {
	// Type assertion needed until Convex regenerates API types
	// biome-ignore lint/suspicious/noExplicitAny: Type not yet in generated API
	await ctx.runMutation((internal as any).rateLimit.checkAndRecord, {
		userId,
		functionName,
	});
}

/**
 * Internal mutation for rate limiting actions.
 */
export const checkAndRecord = internalMutation({
	args: {
		userId: v.id("users"),
		functionName: v.string(),
	},
	handler: async (ctx, args) => {
		await checkRateLimit(ctx, args.userId, args.functionName);
	},
});

/**
 * Clean up old rate limit records to prevent table bloat.
 * Should be called periodically (e.g., in a cron job).
 */
async function cleanupOldRateLimits(
	ctx: GenericMutationCtx<DataModel>,
	olderThanMs = 3600_000, // 1 hour by default
): Promise<number> {
	const cutoff = Date.now() - olderThanMs;
	const oldRecords = await ctx.db
		.query("rateLimits")
		.withIndex("by_timestamp")
		.filter((q) => q.lt(q.field("timestamp"), cutoff))
		.collect();

	for (const record of oldRecords) {
		await ctx.db.delete(record._id);
	}

	return oldRecords.length;
}

/**
 * Internal mutation called by cron job to clean up old rate limit records.
 */
export const cleanupCron = internalMutation({
	args: {},
	handler: async (ctx) => {
		const deletedCount = await cleanupOldRateLimits(ctx);
		console.log(`Cleaned up ${deletedCount} old rate limit records`);
		return deletedCount;
	},
});
