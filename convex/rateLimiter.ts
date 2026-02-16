import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// Type assertion needed until Convex regenerates API types
// biome-ignore lint/suspicious/noExplicitAny: Component types not yet generated
export const rateLimiter = new RateLimiter((components as any).rateLimiter, {
	// External API actions - stricter limits to prevent abuse of external APIs
	"tacticus.actions.getPlayerData": {
		kind: "token bucket",
		rate: 10,
		period: MINUTE,
		capacity: 10,
	},
	"tacticus.actions.getGuildData": {
		kind: "token bucket",
		rate: 10,
		period: MINUTE,
		capacity: 10,
	},
	"tacticus.actions.getGuildRaidData": {
		kind: "token bucket",
		rate: 10,
		period: MINUTE,
		capacity: 10,
	},
	"tacticus.actions.getGuildRaidBySeason": {
		kind: "token bucket",
		rate: 10,
		period: MINUTE,
		capacity: 10,
	},

	// Batch mutations - moderate limits
	"goals.importBatch": {
		kind: "token bucket",
		rate: 5,
		period: MINUTE,
		capacity: 5,
	},
	"goals.removeAll": {
		kind: "token bucket",
		rate: 10,
		period: MINUTE,
		capacity: 10,
	},
	"goals.reorder": {
		kind: "token bucket",
		rate: 30,
		period: MINUTE,
		capacity: 30,
	},

	// Regular mutations - more generous limits
	"goals.add": {
		kind: "token bucket",
		rate: 60,
		period: MINUTE,
		capacity: 60,
	},
	"goals.update": {
		kind: "token bucket",
		rate: 60,
		period: MINUTE,
		capacity: 60,
	},
	"goals.remove": {
		kind: "token bucket",
		rate: 60,
		period: MINUTE,
		capacity: 60,
	},
});
