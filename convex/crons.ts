import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Type assertion needed until Convex regenerates API types
crons.interval(
	"cleanup old rate limits",
	{ hours: 1 }, // Run every hour
	// biome-ignore lint/suspicious/noExplicitAny: Type not yet in generated API
	(internal as any).rateLimit.cleanupCron,
);

export default crons;
