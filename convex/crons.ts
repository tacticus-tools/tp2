import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
	"cleanup old rate limits",
	{ hours: 1 }, // Run every hour
	internal.rateLimit.cleanupCron,
);

export default crons;
