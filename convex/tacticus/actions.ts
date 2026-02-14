import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action } from "../_generated/server";
import type {
	TacticusGuildRaidResponse,
	TacticusGuildResponse,
	TacticusPlayerResponse,
} from "./types";

async function tacticusFetch<T>(path: string, apiKey: string): Promise<T> {
	const baseUrl = process.env.TACTICUS_API_BASE;
	if (!baseUrl) {
		throw new Error("Missing TACTICUS_API_BASE environment variable");
	}

	const response = await fetch(`${baseUrl}/${path}`, {
		method: "GET",
		headers: {
			"X-API-KEY": apiKey,
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Tacticus API error (${response.status}): ${text || response.statusText}`,
		);
	}

	return response.json() as Promise<T>;
}

export const getPlayerData = action({
	args: { playerApiKey: v.string() },
	handler: async (ctx, args): Promise<TacticusPlayerResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		return tacticusFetch<TacticusPlayerResponse>("player", args.playerApiKey);
	},
});

export const getGuildData = action({
	args: { guildApiKey: v.string() },
	handler: async (ctx, args): Promise<TacticusGuildResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		return tacticusFetch<TacticusGuildResponse>("guild", args.guildApiKey);
	},
});

export const getGuildRaidData = action({
	args: { guildApiKey: v.string() },
	handler: async (ctx, args): Promise<TacticusGuildRaidResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		return tacticusFetch<TacticusGuildRaidResponse>(
			"guildRaid",
			args.guildApiKey,
		);
	},
});

export const getGuildRaidBySeason = action({
	args: { guildApiKey: v.string(), season: v.number() },
	handler: async (ctx, args): Promise<TacticusGuildRaidResponse> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");

		return tacticusFetch<TacticusGuildRaidResponse>(
			`guildRaid/${args.season}`,
			args.guildApiKey,
		);
	},
});
