import { getMaterialIconUrl } from "@/4-lib/tacticus/image-utils";

interface MaterialIconProps {
	icon?: string;
	label?: string;
	size?: number;
}

export function MaterialIcon({ icon, label, size = 24 }: MaterialIconProps) {
	if (!icon) return null;
	return (
		<img
			src={getMaterialIconUrl(icon)}
			alt={label ?? "Material"}
			width={size}
			height={size}
			loading="lazy"
			className="shrink-0"
		/>
	);
}
