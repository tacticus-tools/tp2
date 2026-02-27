import { getAbilityIconUrl } from "@/5-assets/abilities/index.ts";
import { DATA as DAMAGE_TYPES } from "./damage-types.generated.ts";
import { DATA } from "./data.generated.ts";
import { DATA as FACTION_IDS } from "./faction-ids.generated.ts";
import { DATA as CHARACTER_IDS } from "./ids.generated.ts";
import { DATA as CHARACTER_TRAITS } from "./traits.generated.ts";

// `import.meta.glob` is a Vite feature that allows us to import multiple files matching a pattern.
// It is not available in the `generate-data.ts` Vite plugin, so we have to do it here.
// We use `eager: true` to import the files immediately, and `import: "default"` to get the default export (the URL of the image).
// We do this instead of referencing the images using a template string because Vite needs to know about the files at build time in order to include them in the bundle and optimize them.
const characterRoundIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/characters/ui_image_RoundPortrait_*.png`,
	{ eager: true, import: "default" },
);

const characterPortraits = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/characters/ui_image_portrait_*.png`,
	{ eager: true, import: "default" },
);

export type Character = (typeof DATA)[number];
export type CharacterId = (typeof CHARACTER_IDS)[number];
export type FactionId = (typeof FACTION_IDS)[number];
export type CharacterTrait = (typeof CHARACTER_TRAITS)[number];
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const CHARACTERS = Object.freeze(
	DATA.map((character) => ({
		...character,
		roundIcon:
			characterRoundIcons[
				`/src/5-assets/snowprint_assets/characters/${character.roundIcon}`
			],
		portrait:
			characterPortraits[
				`/src/5-assets/snowprint_assets/characters/${character.icon}`
			],
		activeAbilityIcon: character.activeAbilityName
			? getAbilityIconUrl(character.activeAbilityName)
			: undefined,
		passiveAbilityIcon: character.passiveAbilityName
			? getAbilityIconUrl(character.passiveAbilityName)
			: undefined,
		equipmentSlots: [
			character.equipment1,
			character.equipment2,
			character.equipment3,
		] as const,
	})),
);

export { CHARACTER_IDS, FACTION_IDS, CHARACTER_TRAITS, DAMAGE_TYPES };
