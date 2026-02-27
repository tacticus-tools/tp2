import type { Character } from "@/5-assets/characters/index.ts";

interface Objective {
	readonly type: string;
	readonly target: string | number | null;
	readonly points: number;
}

/**
 * Returns true if the character satisfies the given objective.
 */
export function characterMatchesObjective(
	char: Character,
	objective: Objective,
): boolean {
	switch (objective.type) {
		case "Faction":
			return char.factionId === objective.target;
		case "DamageType":
			return (
				char.meleeDamage === objective.target ||
				char.rangedDamage === objective.target
			);
		case "NotDamageType":
			return (
				char.meleeDamage !== objective.target &&
				(char.rangedDamage === null || char.rangedDamage !== objective.target)
			);
		case "Trait":
			return (char.traits as readonly string[]).includes(
				objective.target as string,
			);
		case "NotTrait":
			return !(char.traits as readonly string[]).includes(
				objective.target as string,
			);
		case "HasRangedAttack":
			return char.rangedDamage !== null;
		case "HasNoRangedAttack":
			return char.rangedDamage === null;
		case "MaxHits":
			return (
				char.meleeHits <= (objective.target as number) &&
				(char.rangedHits === null ||
					char.rangedHits <= (objective.target as number))
			);
		case "MinHits":
			return (
				char.meleeHits >= (objective.target as number) ||
				(char.rangedHits !== null &&
					char.rangedHits >= (objective.target as number))
			);
		case "UseNoSummons":
			// All characters can satisfy this — it's a gameplay constraint, not a roster filter
			return true;
		default:
			return false;
	}
}

/**
 * Get character IDs that satisfy a given objective.
 */
export function getCharactersForObjective(
	objective: Objective,
	characters: readonly Character[],
): string[] {
	return characters
		.filter((c) => characterMatchesObjective(c, objective))
		.map((c) => c.id);
}

/**
 * Filter characters to only those allowed on a track (not in disallowed factions).
 */
export function filterAllowedCharacters(
	disallowedFactions: readonly string[],
	characters: readonly Character[],
): Character[] {
	const disallowed = new Set(disallowedFactions);
	return characters.filter((c) => !disallowed.has(c.factionId));
}

/**
 * Build a unique objective key from type and target.
 */
export function objectiveKey(objective: Objective): string {
	if (objective.target !== null) {
		return `${objective.type}:${String(objective.target)}`;
	}
	return objective.type;
}
