import { useState } from "react";
import { CHARACTERS } from "@/5-assets/characters";
import { MOWS } from "@/5-assets/mows";

/** Lookup map: unitId → Vite-resolved round icon URL */
const iconByUnitId = new Map<string, string | undefined>();
for (const c of CHARACTERS) iconByUnitId.set(c.id, c.roundIcon);
for (const m of MOWS) iconByUnitId.set(m.id, m.roundIcon);

/** Lookup map: unitId → display name */
const nameByUnitId = new Map<string, string>();
for (const c of CHARACTERS) nameByUnitId.set(c.id, c.name);
for (const m of MOWS) nameByUnitId.set(m.id, m.name);

interface CharacterIconProps {
	unitId: string;
	size?: number;
}

export function CharacterIcon({ unitId, size = 30 }: CharacterIconProps) {
	const [failed, setFailed] = useState(false);
	const iconUrl = iconByUnitId.get(unitId);
	const name = nameByUnitId.get(unitId);

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
