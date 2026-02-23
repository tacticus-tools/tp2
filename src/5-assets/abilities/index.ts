const abilityIcons = import.meta.glob<string>(
	`/src/5-assets/snowprint_assets/abilities/ui_icon_ability2_*.png`,
	{ eager: true, import: "default" },
);

/**
 * Get the Vite-resolved URL for an ability icon by its CamelCase ability name.
 * Returns `undefined` if no matching icon exists.
 */
export function getAbilityIconUrl(abilityName: string): string | undefined {
	return abilityIcons[
		`/src/5-assets/snowprint_assets/abilities/ui_icon_ability2_${abilityName}.png`
	];
}
