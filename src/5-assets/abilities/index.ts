const abilityIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/abilities/ui_icon_ability2_*.png`,
	{ eager: true, import: "default" },
);

// Build a case-insensitive lookup map (icon filenames may use lowercase "of"/"the"
// while datamined ability names use PascalCase "Of"/"The")
const abilityIconByLowerName: Record<string, string> = {};
const PREFIX = "/src/5-assets/snowprint_assets/abilities/ui_icon_ability2_";
const SUFFIX = ".png";
for (const [key, url] of Object.entries(abilityIcons)) {
	const name = key.slice(PREFIX.length, -SUFFIX.length);
	abilityIconByLowerName[name.toLowerCase()] = url;
}

/**
 * Get the Vite-resolved URL for an ability icon by its CamelCase ability name.
 * Lookup is case-insensitive to handle casing mismatches between datamine names
 * and icon filenames. Returns `undefined` if no matching icon exists.
 */
export function getAbilityIconUrl(abilityName: string): string | undefined {
	return abilityIconByLowerName[abilityName.toLowerCase()];
}
