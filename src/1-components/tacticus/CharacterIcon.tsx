import { useState } from "react";
import { getCharacterImageUrl } from "@/4-lib/tacticus/image-utils";
import { unitById } from "@/4-lib/tacticus/unit-data";

interface CharacterIconProps {
	unitId: string;
	size?: number;
}

export function CharacterIcon({ unitId, size = 30 }: CharacterIconProps) {
	const [failed, setFailed] = useState(false);
	const unit = unitById.get(unitId);
	const roundIcon = unit?.roundIcon;

	if (!roundIcon || failed) {
		const initial = (unit?.name ?? "?")[0].toUpperCase();
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
			src={getCharacterImageUrl(roundIcon)}
			alt={unit?.name ?? unitId}
			width={size}
			height={size}
			loading="lazy"
			className="shrink-0 rounded-full object-cover"
			onError={() => setFailed(true)}
		/>
	);
}
