import { getEnergyIconUrl } from "@/4-lib/general/image-utils.ts";

interface EnergyIconProps {
	size?: number;
}

export function EnergyIcon({ size = 16 }: EnergyIconProps) {
	return (
		<img
			src={getEnergyIconUrl()}
			alt="Energy"
			width={size}
			height={size}
			loading="lazy"
			className="inline-block shrink-0"
		/>
	);
}
