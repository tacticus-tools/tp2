import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	const { isLoading, isAuthenticated } = useConvexAuth();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return "Landing page";
	}

	return "Dashboard";
}
