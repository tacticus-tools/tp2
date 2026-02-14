import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { env } from "@/env";

const convexQueryClient = new ConvexQueryClient(env.VITE_CONVEX_URL);
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryFn: convexQueryClient.queryFn(),
			staleTime: Infinity,
		},
	},
});
convexQueryClient.connect(queryClient);

export default function AppConvexProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<QueryClientProvider client={queryClient}>
			<ConvexAuthProvider client={convexQueryClient.convexClient}>
				{children}
			</ConvexAuthProvider>
		</QueryClientProvider>
	);
}
