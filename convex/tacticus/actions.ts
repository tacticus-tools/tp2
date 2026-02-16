import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalMutation } from "../_generated/server";
import { env } from "../env";
import { rateLimiter } from "../rateLimiter";
import type {
	TacticusGuildRaidResponse,
	TacticusGuildResponse,
	TacticusPlayerResponse,
} from "./types";

const FETCH_TIMEOUT_MS = 10_000;

async function tacticusFetch<T>(path: string, apiKey: string): Promise<T> {
	const baseUrl = env.TACTICUS_API_BASE;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	let response: Response;
	try {
		response = await fetch(`${baseUrl}/${path}`, {
			method: "GET",
			headers: { "X-API-KEY": apiKey },
			signal: controller.signal,
		});
	} catch (err) {
		clearTimeout(timer);
		if (err instanceof DOMException && err.name === "AbortError") {
			throw new Error(
				`Tacticus API request timed out after ${FETCH_TIMEOUT_MS}ms`,
			);
		}
		throw err;
	}
	clearTimeout(timer);

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Tacticus API error (${response.status}): ${text || response.statusText}`,
		);
	}

	return response.json() as Promise<T>;
}

async function getCredentials(
	ctx: { runQuery: typeof Function.prototype },
	userId: string,
) {
	const creds = await ctx.runQuery(internal.tacticus.credentials.getDecrypted, {
		userId,
	});
	if (!creds) {
		throw new Error("No credentials found. Add your API keys in Settings.");
	}
	return creds;
}

export const getPlayerData = action({
	args: {},
	handler: async (ctx): Promise<TacticusPlayerResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		// Check rate limit
		await ctx.runMutation(
			internal.tacticus.actions.checkRateLimitGetPlayerData,
			{ userId },
		);

		const creds = await getCredentials(ctx, userId);
		return tacticusFetch<TacticusPlayerResponse>("player", creds.playerApiKey);
	},
});

export const getGuildData = action({
	args: {},
	handler: async (ctx): Promise<TacticusGuildResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		// Check rate limit
		await ctx.runMutation(
			internal.tacticus.actions.checkRateLimitGetGuildData,
			{
				userId,
			},
		);

		const creds = await getCredentials(ctx, userId);
		if (!creds.guildApiKey) {
			throw new Error("No Guild API key configured. Add one in Settings.");
		}
		return tacticusFetch<TacticusGuildResponse>("guild", creds.guildApiKey);
	},
});

export const getGuildRaidData = action({
	args: {},
	handler: async (ctx): Promise<TacticusGuildRaidResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		// Check rate limit
		await ctx.runMutation(
			internal.tacticus.actions.checkRateLimitGetGuildRaidData,
			{ userId },
		);

		const creds = await getCredentials(ctx, userId);
		if (!creds.guildApiKey) {
			throw new Error("No Guild API key configured. Add one in Settings.");
		}
		return tacticusFetch<TacticusGuildRaidResponse>(
			"guildRaid",
			creds.guildApiKey,
		);
	},
});

export const getGuildRaidBySeason = action({
	args: { season: v.number() },
	handler: async (ctx, args): Promise<TacticusGuildRaidResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		// Check rate limit
		await ctx.runMutation(
			internal.tacticus.actions.checkRateLimitGetGuildRaidBySeason,
			{ userId },
		);

		const creds = await getCredentials(ctx, userId);
		if (!creds.guildApiKey) {
			throw new Error("No Guild API key configured. Add one in Settings.");
		}
		return tacticusFetch<TacticusGuildRaidResponse>(
			`guildRaid/${args.season}`,
			creds.guildApiKey,
		);
	},
});

/**
 * Internal mutations to check rate limits from actions
 */
export const checkRateLimitGetPlayerData = internalMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const { ok, retryAfter } = await rateLimiter.limit(
			ctx,
			"tacticus.actions.getPlayerData",
			{
				key: args.userId.toString(),
			},
		);
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}
	},
});

export const checkRateLimitGetGuildData = internalMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const { ok, retryAfter } = await rateLimiter.limit(
			ctx,
			"tacticus.actions.getGuildData",
			{
				key: args.userId.toString(),
			},
		);
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}
	},
});

export const checkRateLimitGetGuildRaidData = internalMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const { ok, retryAfter } = await rateLimiter.limit(
			ctx,
			"tacticus.actions.getGuildRaidData",
			{
				key: args.userId.toString(),
			},
		);
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}
	},
});

export const checkRateLimitGetGuildRaidBySeason = internalMutation({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const { ok, retryAfter } = await rateLimiter.limit(
			ctx,
			"tacticus.actions.getGuildRaidBySeason",
			{
				key: args.userId.toString(),
			},
		);
		if (!ok) {
			throw new Error(
				`Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
			);
		}
	},
});
