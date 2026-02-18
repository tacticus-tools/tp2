interface MaterialIconProps {
	icon?: string;
	label?: string;
	size?: number;
}

export function MaterialIcon({ icon, label, size = 24 }: MaterialIconProps) {
	if (!icon) return null;
	return (
		<img
			src={icon}
			alt={label ?? "Material"}
			width={size}
			height={size}
			loading="lazy"
			className="shrink-0"
		/>
	);
}
