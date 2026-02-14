const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL;
if (!CONVEX_SITE_URL) {
	throw new Error(
		"Missing CONVEX_SITE_URL environment variable. Set it in your Convex dashboard.",
	);
}

export default {
	providers: [
		{
			domain: CONVEX_SITE_URL,
			applicationID: "convex",
		},
	],
};
