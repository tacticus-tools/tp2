import type { Alliance } from "#common/alliance.ts";
import { type Rarity, rarityComparator } from "#common/rarity.ts";
import type { FactionData } from "@/5-assets/factions/index.ts";
import type { RarityStars } from "./constants.ts";
import { Rank, RarityStars as RS } from "./constants.ts";
import { calculateCharacterPower, calculateMowPower } from "./power.ts";
import type { RosterEquipment, RosterUnit } from "./roster-utils.ts";

interface UnitMetadata {
	id: string;
	name: string;
	factionId: string;
	alliance: string;
	initialRarity: Rarity;
	roundIcon: string | undefined;
	portrait: string | undefined;
	activeAbilityIcon: string | undefined;
	passiveAbilityIcon: string | undefined;
	/** Equipment slot type prefixes, e.g. ["I_Crit", "I_Block", "I_Booster_Block"] */
	equipmentSlots?: readonly [string, string, string];
}

export interface EnrichedRosterUnit {
	id: string;
	name: string;
	factionId: string;
	alliance: Alliance;
	roundIcon: string | undefined;
	portrait: string | undefined;
	activeAbilityIcon: string | undefined;
	passiveAbilityIcon: string | undefined;
	rank: Rank;
	rarity: Rarity;
	stars: RarityStars;
	abilities: [number, number];
	level: number;
	shards: number;
	mythicShards: number;
	power: number;
	/** Equipment slot type prefixes for this character (undefined for MoWs) */
	equipmentSlots: readonly [string, string, string] | undefined;
	equipment: RosterEquipment[];
	isMow: boolean;
	isLocked: boolean;
}

export interface EnrichRosterOptions {
	/** Include unowned characters as locked entries (default: false) */
	includeUnowned?: boolean;
	/** Shard counts from inventory, keyed by character ID */
	inventoryShards?: Record<string, number>;
	/** Mythic shard counts from inventory, keyed by character ID */
	inventoryMythicShards?: Record<string, number>;
}

export function enrichRoster(
	roster: Record<string, RosterUnit>,
	characters: readonly UnitMetadata[],
	mows: readonly UnitMetadata[],
	options?: EnrichRosterOptions,
): EnrichedRosterUnit[] {
	const units: EnrichedRosterUnit[] = [];

	for (const char of characters) {
		const ru = roster[char.id];
		if (!ru) {
			if (options?.includeUnowned) {
				units.push({
					id: char.id,
					name: char.name,
					factionId: char.factionId,
					alliance: char.alliance as Alliance,
					roundIcon: char.roundIcon,
					portrait: char.portrait,
					activeAbilityIcon: char.activeAbilityIcon,
					passiveAbilityIcon: char.passiveAbilityIcon,
					rank: Rank.Locked,
					rarity: char.initialRarity,
					stars: RS.None,
					abilities: [0, 0],
					level: 0,
					shards: options?.inventoryShards?.[char.id] ?? 0,
					mythicShards: options?.inventoryMythicShards?.[char.id] ?? 0,
					power: 0,
					equipmentSlots: char.equipmentSlots,
					equipment: [],
					isMow: false,
					isLocked: true,
				});
			}
			continue;
		}
		units.push({
			id: char.id,
			name: char.name,
			factionId: char.factionId,
			alliance: char.alliance as Alliance,
			roundIcon: char.roundIcon,
			portrait: char.portrait,
			activeAbilityIcon: char.activeAbilityIcon,
			passiveAbilityIcon: char.passiveAbilityIcon,
			rank: ru.rank,
			rarity: ru.rarity,
			stars: ru.stars,
			abilities: ru.abilities,
			level: ru.level,
			shards: options?.inventoryShards?.[char.id] ?? ru.shards,
			mythicShards:
				options?.inventoryMythicShards?.[char.id] ?? ru.mythicShards,
			power: calculateCharacterPower(
				ru.rank,
				ru.rarity,
				ru.stars,
				ru.abilities[0],
				ru.abilities[1],
				ru.upgradeCount ?? 0,
			),
			equipmentSlots: char.equipmentSlots,
			equipment: ru.equipment,
			isMow: false,
			isLocked: false,
		});
	}

	for (const mow of mows) {
		const ru = roster[mow.id];
		if (!ru) continue;
		units.push({
			id: mow.id,
			name: mow.name,
			factionId: mow.factionId,
			alliance: mow.alliance as Alliance,
			roundIcon: mow.roundIcon,
			portrait: mow.portrait,
			activeAbilityIcon: mow.activeAbilityIcon,
			passiveAbilityIcon: mow.passiveAbilityIcon,
			rank: ru.rank,
			rarity: ru.rarity,
			stars: ru.stars,
			abilities: ru.abilities,
			level: ru.level,
			shards: options?.inventoryShards?.[mow.id] ?? ru.shards,
			mythicShards: options?.inventoryMythicShards?.[mow.id] ?? ru.mythicShards,
			power: calculateMowPower(
				ru.rarity,
				ru.stars,
				ru.abilities[0],
				ru.abilities[1],
			),
			equipmentSlots: undefined,
			equipment: ru.equipment,
			isMow: true,
			isLocked: false,
		});
	}

	return units;
}

export type RosterSortKey =
	| "rank"
	| "rarity"
	| "name"
	| "faction"
	| "level"
	| "power";

function compareUnits(
	a: EnrichedRosterUnit,
	b: EnrichedRosterUnit,
	sortBy: RosterSortKey,
): number {
	// MoWs always sort after all characters (including locked ones)
	const mowDiff = Number(a.isMow) - Number(b.isMow);
	if (mowDiff !== 0) return mowDiff;

	// Locked units sort after owned (within characters)
	const lockedDiff = Number(a.isLocked) - Number(b.isLocked);
	if (lockedDiff !== 0) return lockedDiff;

	switch (sortBy) {
		case "rank":
			return b.rank - a.rank || a.name.localeCompare(b.name);
		case "rarity":
			return (
				rarityComparator(b.rarity, a.rarity) ||
				b.stars - a.stars ||
				a.name.localeCompare(b.name)
			);
		case "name":
			return a.name.localeCompare(b.name);
		case "faction":
			return (
				a.factionId.localeCompare(b.factionId) || a.name.localeCompare(b.name)
			);
		case "level":
			return b.level - a.level || a.name.localeCompare(b.name);
		case "power":
			return b.power - a.power || a.name.localeCompare(b.name);
	}
}

export function sortRoster(
	units: EnrichedRosterUnit[],
	sortBy: RosterSortKey,
): EnrichedRosterUnit[] {
	return [...units].sort((a, b) => compareUnits(a, b, sortBy));
}

export function filterRoster(
	units: EnrichedRosterUnit[],
	search: string,
	allianceFilter: Alliance | "all",
): EnrichedRosterUnit[] {
	let result = units;
	if (allianceFilter !== "all") {
		result = result.filter((u) => u.alliance === allianceFilter);
	}
	if (search.trim()) {
		const q = search.trim().toLowerCase();
		result = result.filter((u) => u.name.toLowerCase().includes(q));
	}
	return result;
}

const ALLIANCE_ORDER: Record<string, number> = {
	Imperial: 0,
	Chaos: 1,
	Xenos: 2,
};

export interface FactionGroup {
	factionId: string;
	factionName: string;
	factionColor: string;
	alliance: string;
	units: EnrichedRosterUnit[];
}

export function groupByFaction(
	units: EnrichedRosterUnit[],
	factions: FactionData,
): FactionGroup[] {
	const groups: Record<string, FactionGroup> = {};

	for (const unit of units) {
		let group = groups[unit.factionId];
		if (!group) {
			const faction = factions[unit.factionId];
			group = {
				factionId: unit.factionId,
				factionName: faction?.name ?? unit.factionId,
				factionColor: faction?.color ?? "#888888",
				alliance: faction?.alliance ?? unit.alliance,
				units: [],
			};
			groups[unit.factionId] = group;
		}
		group.units.push(unit);
	}

	return Object.values(groups).sort((a, b) => {
		const allianceDiff =
			(ALLIANCE_ORDER[a.alliance] ?? 3) - (ALLIANCE_ORDER[b.alliance] ?? 3);
		if (allianceDiff !== 0) return allianceDiff;
		return a.factionName.localeCompare(b.factionName);
	});
}

export function starsLabel(stars: RarityStars): string {
	if (stars >= RS.OneBlueStar) {
		if (stars === RS.MythicWings) return "Wings";
		return "\u2605".repeat(stars - RS.OneBlueStar + 1);
	}
	if (stars >= RS.RedOneStar) {
		return "\u2605".repeat(stars - RS.RedOneStar + 1);
	}
	if (stars >= RS.OneStar) {
		return "\u2605".repeat(stars);
	}
	return "";
}

export function starsColor(stars: RarityStars): string {
	if (stars >= RS.OneBlueStar) return "text-blue-400";
	if (stars >= RS.RedOneStar) return "text-red-400";
	return "text-yellow-400";
}
