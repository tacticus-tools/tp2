import { Pencil, Trash2 } from "lucide-react";
import { CharacterIcon } from "@/1-components/general/CharacterIcon.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { GAME_MODE_LABELS, GameMode } from "@/3-hooks/useTeamsStore.ts";

interface TeamCardProps {
	name: string;
	characterIds: string[];
	mowIds?: string[];
	gwOffense?: boolean;
	gwDefense?: boolean;
	raid?: boolean;
	ta?: boolean;
	notes?: string;
	onEdit: () => void;
	onDelete: () => void;
}

type BooleanPropKey = "gwOffense" | "gwDefense" | "raid" | "ta";

const MODE_FLAGS: { key: GameMode; prop: BooleanPropKey }[] = [
	{ key: GameMode.GwOffense, prop: "gwOffense" },
	{ key: GameMode.GwDefense, prop: "gwDefense" },
	{ key: GameMode.Raid, prop: "raid" },
	{ key: GameMode.Ta, prop: "ta" },
];

export function TeamCard({
	name,
	characterIds,
	mowIds,
	gwOffense,
	gwDefense,
	raid,
	ta,
	notes,
	onEdit,
	onDelete,
}: TeamCardProps) {
	const flags = { gwOffense, gwDefense, raid, ta };
	const activeModes = MODE_FLAGS.filter((m) => flags[m.prop] === true);

	return (
		<div className="rounded-lg border border-border/50 bg-card p-4">
			<div className="mb-3 flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<h4 className="truncate font-medium">{name}</h4>
					{activeModes.length > 0 && (
						<div className="mt-1 flex flex-wrap gap-1">
							{activeModes.map((m) => (
								<Badge key={m.key} variant="secondary" className="text-[10px]">
									{GAME_MODE_LABELS[m.key]}
								</Badge>
							))}
						</div>
					)}
				</div>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onEdit}
						aria-label={`Edit team ${name}`}
						title="Edit team"
					>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onDelete}
						aria-label={`Delete team ${name}`}
						title="Delete team"
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>

			{characterIds.length > 0 || (mowIds && mowIds.length > 0) ? (
				<div className="flex flex-wrap items-center gap-1.5">
					{characterIds.map((id) => (
						<CharacterIcon key={id} unitId={id} size={36} />
					))}
					{mowIds && mowIds.length > 0 && (
						<>
							{characterIds.length > 0 && (
								<div className="mx-1 h-8 w-px bg-border/50" />
							)}
							{mowIds.map((id) => (
								<CharacterIcon key={id} unitId={id} size={36} />
							))}
						</>
					)}
				</div>
			) : (
				<p className="text-sm text-muted-foreground">No characters assigned</p>
			)}

			{notes && <p className="mt-2 text-xs text-muted-foreground">{notes}</p>}
		</div>
	);
}
