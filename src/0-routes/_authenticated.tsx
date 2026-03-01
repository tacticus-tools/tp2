import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { CampaignProgressSync } from "@/1-components/CampaignProgressSync.tsx";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			navigate({ to: "/signin" });
		}
	}, [isLoading, isAuthenticated, navigate]);

	if (isLoading || !isAuthenticated) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<>
			<CampaignProgressSync />
			<Outlet />
		</>
	);
}
