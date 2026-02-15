import { getEnergyIconUrl } from "@/4-lib/tacticus/image-utils";

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
			className="shrink-0 inline-block"
		/>
	);
}
