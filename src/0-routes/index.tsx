import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	const { isLoading } = useConvexAuth();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-3xl font-bold">DATA PAGES</h1>
			<div className="flex flex-col gap-2">
				<Link
					to="/data/characters"
					className="text-2xl text-blue-500 underline"
				>
					Characters
				</Link>
				<Link to="/data/equipment" className="text-2xl text-blue-500 underline">
					Equipment
				</Link>
				<Link to="/data/npcs" className="text-2xl text-blue-500 underline">
					NPCs
				</Link>
				<Link to="/data/onslaught" className="text-2xl text-blue-500 underline">
					Onslaught
				</Link>
			</div>
		</div>
	);
}
