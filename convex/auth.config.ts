import type { AuthConfig } from "convex/server";

// See https://docs.convex.dev/auth/clerk for setup and examples

export default {
	providers: [
		{
			// Replace with your own Clerk Issuer URL from your "convex" JWT template
			// or with `process.env.CLERK_JWT_ISSUER_DOMAIN`
			// and configure CLERK_JWT_ISSUER_DOMAIN on the Convex Dashboard
			// See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
			// biome-ignore lint/style/noNonNullAssertion: Code provided by Convex documentation
			domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
			applicationID: "convex",
		},
	],
} satisfies AuthConfig;
