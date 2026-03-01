import { useState } from "react";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import { MOWS } from "@/5-assets/mows/index.ts";

/** Lookup map: unitId → Vite-resolved round icon URL */
const iconByUnitId: Record<string, string | undefined> = {};
for (const c of CHARACTERS) iconByUnitId[c.id] = c.roundIcon;
for (const m of MOWS) iconByUnitId[m.id] = m.roundIcon;

/** Lookup map: unitId → display name */
const nameByUnitId: Record<string, string | undefined> = {};
for (const c of CHARACTERS) nameByUnitId[c.id] = c.name;
for (const m of MOWS) nameByUnitId[m.id] = m.name;

interface CharacterIconProps {
	unitId: string;
	size?: number;
}

export function CharacterIcon({ unitId, size = 30 }: CharacterIconProps) {
	const [failed, setFailed] = useState(false);
	const iconUrl = iconByUnitId[unitId];
	const name = nameByUnitId[unitId];

	if (!iconUrl || failed) {
		const initial = (name ?? "?")[0].toUpperCase();
		return (
			<span
				className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
				style={{ width: size, height: size }}
			>
				{initial}
			</span>
		);
	}

	return (
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: fallback handler, not interactive
		<img
			src={iconUrl}
			alt={name ?? unitId}
			width={size}
			height={size}
			loading="lazy"
			className="shrink-0 rounded-full object-cover"
			onError={() => setFailed(true)}
		/>
	);
}
