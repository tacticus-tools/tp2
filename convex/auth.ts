import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth,     } = convexAuth({
	providers: [
		Password({
			profile(params) {
				return {
					email: params.email as string,
					...(params.name ? { name: params.name as string } : {}),
				};
			},
		}),
		Anonymous,
	],
});
