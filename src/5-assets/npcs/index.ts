import type { DeepReadonly } from "@/types.ts";
import DATA from "./data.generated.json" with { type: "json" };
import type { NpcData } from "./generate-data.ts";
import { DATA as RAW_IDS } from "./ids.generated.ts";
import { DATA as RAW_TRAITS } from "./traits.generated.ts";

const npcPortraits = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/characters/ui_image_portrait_*.png`,
	{ eager: true, import: "default" },
);

export const NPCS = Object.freeze(
	DATA.map((npc) => ({
		...npc,
		portrait: npc.icon
			? (npcPortraits[
					`/src/5-assets/snowprint_assets/characters/${npc.icon}`
				] ?? undefined)
			: undefined,
	})),
) as unknown as DeepReadonly<
	Array<NpcData[number] & { portrait: string | undefined }>
>;
export const NPC_IDS = Object.freeze(RAW_IDS);
export const NPC_TRAITS = Object.freeze(RAW_TRAITS);
