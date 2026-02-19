/** biome-ignore-all lint/correctness/noNodejsModules: This is a server-side script */
/** biome-ignore-all lint/correctness/noProcessGlobal: This is a server-side script */
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server-side environment variables for Convex backend.
 * These variables are only accessible in Convex functions (queries, mutations, actions).
 */
export const env = createEnv({
	server: {
		/**
		 * The site URL for Convex auth configuration.
		 * Set this in your Convex dashboard under "Environment Variables".
		 */
		CONVEX_SITE_URL: z.url(),

		/**
		 * Base64-encoded 32-byte encryption key for sensitive data.
		 * Generate with: openssl rand -base64 32
		 */
		ENCRYPTION_KEY: z
			.string()
			.min(1, "ENCRYPTION_KEY is required")
			.refine((key) => {
				try {
					const decoded = atob(key);
					return decoded.length === 32;
				} catch {
					return false;
				}
			}, "ENCRYPTION_KEY must be a base64-encoded 32-byte key"),

		/**
		 * Base URL for the Tacticus API.
		 */
		TACTICUS_API_BASE: z.url(),
	},
	/**
	 * What object holds the environment variables at runtime.
	 * In Convex, this is process.env.
	 */
	runtimeEnv: process.env,
	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file"), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});
