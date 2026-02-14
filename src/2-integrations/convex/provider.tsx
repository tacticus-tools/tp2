import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { env } from "@/env";

const convexQueryClient = new ConvexQueryClient(env.VITE_CONVEX_URL);

export default function AppConvexProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ConvexAuthProvider client={convexQueryClient.convexClient}>
			{children}
		</ConvexAuthProvider>
	);
}
