import {
	Circle,
	CircleCheck,
	CircleDot,
	CircleHelp,
	CircleMinus,
} from "lucide-react";
import type { RequirementStatus } from "@/4-lib/general/lre/lre-types.ts";
import { REQUIREMENT_STATUS } from "@/4-lib/general/lre/lre-types.ts";
import { cn } from "@/4-lib/utils.ts";

const STATUS_CONFIG = {
	[REQUIREMENT_STATUS.NotCleared]: {
		icon: Circle,
		border: "border-muted-foreground/30",
		bg: "",
		label: "Not cleared",
	},
	[REQUIREMENT_STATUS.Cleared]: {
		icon: CircleCheck,
		border: "border-emerald-500",
		bg: "bg-emerald-500/10",
		label: "Cleared",
	},
	[REQUIREMENT_STATUS.MaybeClear]: {
		icon: CircleHelp,
		border: "border-amber-500",
		bg: "bg-amber-500/10",
		label: "Maybe",
	},
	[REQUIREMENT_STATUS.StopHere]: {
		icon: CircleMinus,
		border: "border-red-500",
		bg: "bg-red-500/10",
		label: "Stop here",
	},
	[REQUIREMENT_STATUS.PartiallyCleared]: {
		icon: CircleDot,
		border: "border-blue-500",
		bg: "bg-blue-500/10",
		label: "Partial",
	},
} as const;

const CYCLE_ORDER: RequirementStatus[] = [
	REQUIREMENT_STATUS.NotCleared,
	REQUIREMENT_STATUS.Cleared,
	REQUIREMENT_STATUS.MaybeClear,
	REQUIREMENT_STATUS.StopHere,
];

/** For non-cleared requirements in API-synced battles: only flag annotations */
const CYCLE_FLAGS_ONLY: RequirementStatus[] = [
	REQUIREMENT_STATUS.NotCleared,
	REQUIREMENT_STATUS.MaybeClear,
	REQUIREMENT_STATUS.StopHere,
];

export function LreRequirementButton({
	status,
	onChange,
	flagsOnly = false,
	partialScore,
	compact = false,
}: {
	status: RequirementStatus;
	onChange?: (next: RequirementStatus) => void;
	/** Only cycle NotCleared/MaybeClear/StopHere (no Cleared/Partial) */
	flagsOnly?: boolean;
	/** Show a numeric score inside the button instead of the icon */
	partialScore?: number;
	compact?: boolean;
}) {
	const config = STATUS_CONFIG[status];
	const Icon = config.icon;
	const cycle = flagsOnly ? CYCLE_FLAGS_ONLY : CYCLE_ORDER;

	const handleClick = () => {
		if (!onChange) return;
		const currentIndex = cycle.indexOf(status);
		// If current status isn't in this cycle (e.g. PartiallyCleared in flags-only),
		// start from the beginning
		const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % cycle.length : 0;
		onChange(cycle[nextIndex]);
	};

	const showScore = partialScore != null && partialScore > 0;

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={!onChange}
			title={
				showScore ? `${config.label} (${String(partialScore)})` : config.label
			}
			className={cn(
				"flex items-center justify-center rounded-md border transition-colors",
				config.border,
				config.bg,
				compact ? "size-7" : "size-9",
				!onChange && "cursor-default opacity-80",
			)}
		>
			{showScore ? (
				<span
					className={cn(
						"leading-none font-bold text-blue-400",
						compact ? "text-[9px]" : "text-xs",
					)}
				>
					{partialScore}
				</span>
			) : (
				<Icon className={cn(compact ? "size-3.5" : "size-5")} />
			)}
		</button>
	);
}
