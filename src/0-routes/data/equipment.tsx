import { createFileRoute } from "@tanstack/react-router";
import { EQUIPMENT } from "@/5-assets/equipment";

export const Route = createFileRoute("/data/equipment")({
	component: RouteComponent,
});

const ItemStats = ({ item }: { item: (typeof EQUIPMENT)[string] }) => {
	switch (item.type) {
		case "I_Block":
			return (
				<div>
					<div>Block Chance: {item.levels[0].stats.blockChance}</div>
					<div>Block Damage: {item.levels[0].stats.blockDamage}</div>
				</div>
			);
		case "I_Booster_Block":
			return (
				<div>
					<div>Block Chance: {item.levels[0].stats.blockChanceBonus}</div>
					<div>Block Damage: {item.levels[0].stats.blockDamageBonus}</div>
				</div>
			);
		case "I_Crit":
			return (
				<div>
					<div>Crit Chance: {item.levels[0].stats.critChance}</div>
					<div>Crit Damage: {item.levels[0].stats.critDamage}</div>
				</div>
			);
		case "I_Booster_Crit":
			return (
				<div>
					<div>Crit Chance Bonus: {item.levels[0].stats.critChanceBonus}</div>
					<div>Crit Damage Bonus: {item.levels[0].stats.critDamageBonus}</div>
				</div>
			);
		case "I_Defensive":
			return (
				<div>
					<div>Armor: {item.levels[0].stats.armor}</div>
					<div>Health: {item.levels[0].stats.hp}</div>
				</div>
			);
	}
};

function RouteComponent() {
	return (
		<div>
			<h1 className="w-full text-center text-5xl font-bold">EQUIPMENT</h1>
			<div className="grid w-full grid-cols-6 gap-4">
				{Object.entries(EQUIPMENT).map(([id, item]) => (
					<div key={id} className="flex flex-col items-start gap-2 border">
						<span>Id: {id}</span>
						<span>Name: {item.name}</span>
						<span>Type: {item.type}</span>
						<ItemStats item={item} />
					</div>
				))}
			</div>
		</div>
	);
}
