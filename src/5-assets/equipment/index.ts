import type { DeepReadonly } from "@/types.ts";
import data from "./data.generated.json" with { type: "json" };
import type { EquipmentData } from "./generate-data.ts";
import { DATA as IDS } from "./ids.generated.ts";

type EquipmentEntry = EquipmentData[string];
export const EQUIPMENT_IDS = IDS;
export type EquipmentId = (typeof IDS)[number];
export const EQUIPMENT = Object.freeze(data) as DeepReadonly<
	Record<EquipmentId, EquipmentEntry>
>; // Safe to cast since it's generated from the same zod schema

// Equipment item icons — keyed by equipment id (e.g. "I_Crit_M007")
const equipmentIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/equipment/ui_icon_item_*.png`,
	{ eager: true, import: "default" },
);

const equipmentIconMap: Record<string, string> = {};
for (const [path, url] of Object.entries(equipmentIcons)) {
	const match = path.match(/ui_icon_item_(.+)\.png$/);
	if (match) equipmentIconMap[match[1]] = url;
}

export function getEquipmentIconUrl(equipmentId: string): string | undefined {
	return equipmentIconMap[equipmentId];
}

// Equipment rarity frames — keyed by lowercase rarity name (e.g. "common", "legendary")
const equipmentFrames = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/misc/ui_frame_items_*.png`,
	{ eager: true, import: "default" },
);

const equipmentFrameMap: Record<string, string> = {};
for (const [path, url] of Object.entries(equipmentFrames)) {
	const match = path.match(/ui_frame_items_(\w+)\.png$/);
	if (match) equipmentFrameMap[match[1].toLowerCase()] = url;
}

export function getEquipmentFrameUrl(rarity: string): string | undefined {
	return equipmentFrameMap[rarity.toLowerCase()];
}

// Equipment type placeholder icons — blue silhouettes for empty slots (e.g. "crit", "block")
const equipmentTypeIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/equipment/ui_icon_itemtype_*.png`,
	{ eager: true, import: "default" },
);

const equipmentTypeIconMap: Record<string, string> = {};
for (const [path, url] of Object.entries(equipmentTypeIcons)) {
	const match = path.match(/ui_icon_itemtype_(.+)\.png$/);
	if (match) equipmentTypeIconMap[match[1]] = url;
}

/**
 * Get placeholder icon for an equipment slot type (e.g. "I_Crit" → blue weapon icon).
 * Strips the "I_"/"R_" prefix and lowercases to match the filename.
 */
export function getEquipmentTypeIconUrl(slotType: string): string | undefined {
	const key = slotType.substring(2).toLowerCase();
	return equipmentTypeIconMap[key];
}
