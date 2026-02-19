import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "../_generated/api.ts";
import { action } from "../_generated/server.ts";
import { env } from "../env.ts";
import type {
	TacticusGuildRaidResponse,
	TacticusGuildResponse,
	TacticusPlayerResponse,
} from "./types.ts";

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

		const creds = await getCredentials(ctx, userId);
		return tacticusFetch<TacticusPlayerResponse>("player", creds.playerApiKey);
	},
});

export const getGuildData = action({
	args: {},
	handler: async (ctx): Promise<TacticusGuildResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

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
