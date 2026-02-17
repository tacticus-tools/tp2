import { DATA } from "./data.generated";

// `import.meta.glob` is a Vite feature that allows us to import multiple files matching a pattern.
// It is not available in the `generate-data.ts` Vite plugin, so we have to do it here.
// We use `eager: true` to import the files immediately, and `import: "default"` to get the default export (the URL of the image).
// We do this instead of referencing the images using a template string because Vite needs to know about the files at build time in order to include them in the bundle and optimize them.
const characterRoundIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/characters/ui_image_RoundPortrait_*.png`,
	{ eager: true, import: "default" },
);

export type Character = (typeof DATA)[number];
export type CharacterId = Character["id"];
export type Factionid = Character["factionId"];
export type CharacterTrait = Character["traits"][number];

export const CHARACTERS = DATA.map((character) => ({
	...character,
	roundIcon:
		characterRoundIcons[
			`/src/5-assets/snowprint_assets/characters/${character.roundIcon}`
		],
}));
