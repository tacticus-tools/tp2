import { createFileRoute } from "@tanstack/react-router";
import { NPCS } from "@/5-assets/npcs/index.ts";

export const Route = createFileRoute("/data/npcs")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<h1 className="w-full text-center text-5xl font-bold">EQUIPMENT</h1>
			<div className="grid w-full grid-cols-6 gap-4">
				{NPCS.map((npc) => (
					<div key={npc.id} className="flex flex-col items-center gap-2 border">
						<span>Id: {npc.id}</span>
						<span>Name: {npc.name}</span>
						<span>Faction: {npc.faction}</span>
					</div>
				))}
			</div>
		</div>
	);
}
