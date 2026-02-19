import { createFileRoute } from "@tanstack/react-router";

import { CHARACTERS } from "@/5-assets/characters/index.ts";

export const Route = createFileRoute("/data/characters")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			<h1 className="w-full text-center text-5xl font-bold">CHARACTERS</h1>
			<div className="grid w-full grid-cols-6 gap-4">
				{CHARACTERS.map((character) => (
					<div
						key={character.id}
						className="flex flex-col items-center gap-2 border"
					>
						<span>Id: {character.id}</span>
						<span>Name: {character.name}</span>
						<span>FactionId: {character.factionId}</span>
						<img
							src={character.roundIcon}
							alt={character.name}
							width={100}
							height={100}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
