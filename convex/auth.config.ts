import { env } from "./env.ts";

export default {
	providers: [
		{
			domain: env.CONVEX_SITE_URL,
			applicationID: "convex",
		},
	],
};
