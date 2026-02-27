import { getFactionIconUrl } from "@/5-assets/factions/index.ts";
import { getLreIconUrl } from "@/5-assets/lre/index.ts";

const TRAIT_ICON_MAP: Record<string, string> = {
	TerminatorArmour: "terminator",
	BigTarget: "big_target",
	HeavyWeapon: "heavy_weapon",
	GetStuckIn: "get stuck in",
	RapidAssault: "rapid assault",
	RangedSpecialist: "ranged_specialist",
	DeepStrike: "deep strike",
	CloseCombatWeakness: "close_combat_weakness",
};

const TYPE_LABELS: Record<string, string> = {
	DamageType: "Damage Type",
	NotDamageType: "Not Damage Type",
	Trait: "Trait",
	NotTrait: "Not Trait",
	HasRangedAttack: "Has Ranged Attack",
	HasNoRangedAttack: "Has No Ranged Attack",
	MaxHits: "Max Hits",
	MinHits: "Min Hits",
	UseNoSummons: "Use No Summons",
	Faction: "Faction",
};

function requirementTooltip(requirementId: string): string {
	if (requirementId === "_killPoints") return "Kill Points";
	if (requirementId === "_highScore") return "High Score";
	if (requirementId === "_defeatAll") return "Defeat All";

	const colonIdx = requirementId.indexOf(":");
	if (colonIdx >= 0) {
		const type = requirementId.slice(0, colonIdx);
		const target = requirementId.slice(colonIdx + 1);
		const typeLabel = TYPE_LABELS[type] ?? type;
		return `${typeLabel}: ${target}`;
	}
	return TYPE_LABELS[requirementId] ?? requirementId;
}

function getIconUrl(requirementId: string): string | undefined {
	if (requirementId === "_killPoints" || requirementId === "_highScore")
		return getLreIconUrl("score");
	if (requirementId === "_defeatAll") return getLreIconUrl("_defeatall");

	const colonIdx = requirementId.indexOf(":");
	const type = colonIdx >= 0 ? requirementId.slice(0, colonIdx) : requirementId;
	const target = colonIdx >= 0 ? requirementId.slice(colonIdx + 1) : null;

	if (type === "Faction" && target) return getFactionIconUrl(target);

	const t = target != null ? String(target) : "";
	switch (type) {
		case "DamageType":
			return getLreIconUrl(t.toLowerCase());
		case "NotDamageType":
			return getLreIconUrl(`no_${t.toLowerCase()}`);
		case "Trait":
			return getLreIconUrl(TRAIT_ICON_MAP[t] ?? t.toLowerCase());
		case "NotTrait":
			return getLreIconUrl(`no_${TRAIT_ICON_MAP[t] ?? t.toLowerCase()}`);
		case "HasRangedAttack":
			return getLreIconUrl("ranged");
		case "HasNoRangedAttack":
			return getLreIconUrl("melee");
		case "MaxHits":
		case "MinHits":
			return getLreIconUrl("hits");
		case "UseNoSummons":
			return getLreIconUrl("no_summons");
		default:
			return undefined;
	}
}

export function LreObjectiveIcon({
	requirementId,
	size = 20,
}: {
	requirementId: string;
	size?: number;
}) {
	const tooltip = requirementTooltip(requirementId);
	const url = getIconUrl(requirementId);

	if (url) {
		return (
			<img
				src={url}
				alt={tooltip}
				width={size}
				height={size}
				loading="lazy"
				className="shrink-0 rounded-full"
				style={{ width: size, height: size }}
				title={tooltip}
			/>
		);
	}

	// Fallback: text abbreviation
	const colonIdx = requirementId.indexOf(":");
	const type = colonIdx >= 0 ? requirementId.slice(0, colonIdx) : requirementId;
	const target = colonIdx >= 0 ? requirementId.slice(colonIdx + 1) : null;
	const label =
		target != null
			? `${type.slice(0, 1)}:${String(target).slice(0, 3)}`
			: type.slice(0, 4);
	return (
		<span
			className="flex shrink-0 items-center justify-center rounded-sm bg-muted/40 text-[8px] font-medium text-muted-foreground"
			style={{ width: size, height: size }}
			title={tooltip}
		>
			{label}
		</span>
	);
}
