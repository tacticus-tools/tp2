import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import { decrypt, encrypt, maskValue } from "./crypto";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		const creds = await ctx.db
			.query("tacticusCredentials")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.unique();

		if (!creds) return null;

		const playerKey = await decrypt(creds.playerApiKey);
		const guildKey = creds.guildApiKey
			? await decrypt(creds.guildApiKey)
			: null;

		return {
			tacticusUserId: creds.tacticusUserId,
			playerApiKeyMask: maskValue(playerKey),
			hasGuildApiKey: !!creds.guildApiKey,
			guildApiKeyMask: guildKey ? maskValue(guildKey) : null,
		};
	},
});

export const getDecrypted = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, args) => {
		const creds = await ctx.db
			.query("tacticusCredentials")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.unique();

		if (!creds) return null;

		return {
			tacticusUserId: creds.tacticusUserId,
			playerApiKey: await decrypt(creds.playerApiKey),
			guildApiKey: creds.guildApiKey ? await decrypt(creds.guildApiKey) : null,
		};
	},
});

export const save = mutation({
	args: {
		tacticusUserId: v.optional(v.string()),
		playerApiKey: v.optional(v.string()),
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
			const updates: Record<string, string | undefined> = {};
			if (args.tacticusUserId !== undefined) {
				updates.tacticusUserId = args.tacticusUserId || undefined;
			}
			if (args.playerApiKey) {
				updates.playerApiKey = await encrypt(args.playerApiKey);
			}
			if (args.guildApiKey) {
				updates.guildApiKey = await encrypt(args.guildApiKey);
			}
			return await ctx.db.patch(existing._id, updates);
		}

		// New entry — playerApiKey is required
		if (!args.playerApiKey) {
			throw new Error("Player API key is required for initial setup");
		}

		return await ctx.db.insert("tacticusCredentials", {
			userId,
			tacticusUserId: args.tacticusUserId || undefined,
			playerApiKey: await encrypt(args.playerApiKey),
			guildApiKey: args.guildApiKey
				? await encrypt(args.guildApiKey)
				: undefined,
		});
	},
});
