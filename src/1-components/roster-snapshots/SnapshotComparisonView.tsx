import { ArrowRight, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { RankIcon } from "@/1-components/general/RankIcon.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import type { Rank, Rarity, RarityStars } from "@/4-lib/general/constants.ts";
import { getRarityFrameUrl } from "@/4-lib/general/image-utils.ts";
import { rankToString } from "@/4-lib/general/rank-data.ts";
import { starsColor, starsLabel } from "@/4-lib/general/roster-display.ts";
import { diffSnapshots } from "@/4-lib/general/roster-snapshots/snapshot-service.ts";
import type {
	RosterSnapshot,
	SnapshotUnit,
	UnitDiff,
} from "@/4-lib/general/roster-snapshots/snapshot-types.ts";
import { cn } from "@/4-lib/utils.ts";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import { MOWS } from "@/5-assets/mows/index.ts";

interface UnitMeta {
	name: string;
	portrait: string | undefined;
	roundIcon: string | undefined;
	activeAbilityIcon: string | undefined;
	passiveAbilityIcon: string | undefined;
	isMow: boolean;
}

const metaByUnitId = new Map<string, UnitMeta>();
for (const c of CHARACTERS)
	metaByUnitId.set(c.id, {
		name: c.name,
		portrait: c.portrait,
		roundIcon: c.roundIcon,
		activeAbilityIcon: c.activeAbilityIcon,
		passiveAbilityIcon: c.passiveAbilityIcon,
		isMow: false,
	});
for (const m of MOWS)
	metaByUnitId.set(m.id, {
		name: m.name,
		portrait: m.portrait,
		roundIcon: m.roundIcon,
		activeAbilityIcon: m.activeAbilityIcon,
		passiveAbilityIcon: m.passiveAbilityIcon,
		isMow: true,
	});

export function SnapshotComparisonView({
	left,
	right,
	hiddenFields,
}: {
	left: RosterSnapshot;
	right: RosterSnapshot;
	hiddenFields: Set<string>;
}) {
	const diffs = useMemo(
		() => diffSnapshots(left, right, hiddenFields),
		[left, right, hiddenFields],
	);

	const summary = useMemo(() => {
		let changed = 0;
		let added = 0;
		let removed = 0;
		for (const d of diffs) {
			if (d.diffType === "changed") changed++;
			else if (d.diffType === "added") added++;
			else removed++;
		}
		return { changed, added, removed, total: diffs.length };
	}, [diffs]);

	const unchangedCount = useMemo(() => {
		const allIds = new Set([
			...Object.keys(left.units),
			...Object.keys(right.units),
		]);
		return allIds.size - diffs.length;
	}, [left, right, diffs]);

	const [showUnchanged, setShowUnchanged] = useState(false);

	if (diffs.length === 0) {
		return (
			<div className="flex items-center justify-center rounded-xl border border-dashed border-border/60 py-12">
				<p className="text-sm text-muted-foreground">
					No differences found between these snapshots.
				</p>
			</div>
		);
	}

	const parts: string[] = [];
	if (summary.changed > 0) parts.push(`${summary.changed} upgraded`);
	if (summary.added > 0) parts.push(`${summary.added} new`);
	if (summary.removed > 0) parts.push(`${summary.removed} removed`);

	return (
		<div className="space-y-4">
			{/* Summary bar */}
			<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
				<span>
					Comparing <strong className="text-foreground">{left.name}</strong> vs{" "}
					<strong className="text-foreground">{right.name}</strong>
				</span>
				<Badge variant="secondary">
					{summary.total} changes: {parts.join(", ")}
				</Badge>
			</div>

			{/* Changed units */}
			<div className="flex flex-wrap gap-3">
				{diffs.map((diff) => (
					<UnitDiffCard
						key={diff.unitId}
						diff={diff}
						leftUnit={left.units[diff.unitId]}
						rightUnit={right.units[diff.unitId]}
					/>
				))}
			</div>

			{/* Unchanged units */}
			{unchangedCount > 0 && (
				<div>
					<button
						type="button"
						onClick={() => setShowUnchanged(!showUnchanged)}
						className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					>
						{showUnchanged ? (
							<ChevronDown className="size-4" />
						) : (
							<ChevronRight className="size-4" />
						)}
						{unchangedCount} unchanged units
					</button>
					{showUnchanged && (
						<UnchangedList left={left} right={right} diffs={diffs} />
					)}
				</div>
			)}
		</div>
	);
}

function UnchangedList({
	left,
	right,
	diffs,
}: {
	left: RosterSnapshot;
	right: RosterSnapshot;
	diffs: UnitDiff[];
}) {
	const changedIds = useMemo(
		() => new Set(diffs.map((d) => d.unitId)),
		[diffs],
	);
	const unchangedUnits = useMemo(() => {
		const allIds = new Set([
			...Object.keys(left.units),
			...Object.keys(right.units),
		]);
		return [...allIds]
			.filter((id) => !changedIds.has(id))
			.map((id) => ({ id, name: metaByUnitId.get(id)?.name ?? id }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [left, right, changedIds]);

	return (
		<div className="mt-2 flex flex-wrap gap-1.5">
			{unchangedUnits.map((unit) => (
				<span
					key={unit.id}
					className="rounded-md bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
				>
					{unit.name}
				</span>
			))}
		</div>
	);
}

function UnitDiffCard({
	diff,
	leftUnit,
	rightUnit,
}: {
	diff: UnitDiff;
	leftUnit: SnapshotUnit | undefined;
	rightUnit: SnapshotUnit | undefined;
}) {
	const meta = metaByUnitId.get(diff.unitId);
	const name = meta?.name ?? diff.unitId;
	const [imgFailed, setImgFailed] = useState(false);

	const isAdded = diff.diffType === "added";
	const isRemoved = diff.diffType === "removed";

	// For added/removed, use the unit that exists
	const displayUnit = isAdded ? rightUnit : leftUnit;
	const rarity = (displayUnit?.rarity ?? 0) as Rarity;
	const frameUrl = getRarityFrameUrl(rarity);

	return (
		<div
			className={cn(
				"w-full rounded-lg border bg-card p-3 sm:w-80",
				isAdded &&
					"border-l-4 border-t-border/50 border-r-border/50 border-b-border/50 border-l-emerald-500",
				isRemoved &&
					"border-l-4 border-t-border/50 border-r-border/50 border-b-border/50 border-l-red-500",
				!isAdded && !isRemoved && "border-border/50",
			)}
		>
			<div className="flex gap-3">
				{/* Portrait */}
				<div className="shrink-0">
					<div className="relative" style={{ width: 48, height: 64 }}>
						{meta?.portrait && !imgFailed ? (
							// biome-ignore lint/a11y/noNoninteractiveElementInteractions: fallback handler
							<img
								src={meta.portrait}
								alt={name}
								width={44}
								height={60}
								loading="lazy"
								className="absolute top-[2px] left-[2px] object-cover"
								onError={() => setImgFailed(true)}
							/>
						) : (
							<div
								className="absolute top-[2px] left-[2px] flex items-center justify-center bg-muted text-sm font-semibold text-muted-foreground"
								style={{ width: 44, height: 60 }}
							>
								{(name[0] ?? "?").toUpperCase()}
							</div>
						)}
						{frameUrl && (
							<img
								src={frameUrl}
								alt=""
								width={48}
								height={64}
								className="pointer-events-none absolute inset-0 z-1"
							/>
						)}
						{displayUnit && !meta?.isMow && (
							<div className="absolute -right-1 -bottom-1 z-2">
								<RankIcon rank={displayUnit.rank as Rank} size={16} />
							</div>
						)}
					</div>
				</div>

				{/* Details */}
				<div className="min-w-0 flex-1">
					<div className="mb-1.5 flex items-center gap-2">
						<p className="truncate text-sm font-medium">{name}</p>
						{isAdded && (
							<Badge
								variant="secondary"
								className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
							>
								<Plus className="mr-0.5 size-3" />
								NEW
							</Badge>
						)}
						{isRemoved && (
							<Badge
								variant="secondary"
								className="shrink-0 border-red-500/30 bg-red-500/10 text-red-400"
							>
								<X className="mr-0.5 size-3" />
								REMOVED
							</Badge>
						)}
					</div>

					{/* Field diffs */}
					{diff.diffType === "changed" && leftUnit && rightUnit && (
						<div className="space-y-1">
							{diff.fields.map((f) => (
								<FieldDiffRow
									key={f.field}
									field={f.field}
									before={f.before as number}
									after={f.after as number}
									meta={meta}
								/>
							))}
						</div>
					)}

					{/* Added: show current values */}
					{isAdded && rightUnit && <UnitSummary unit={rightUnit} meta={meta} />}

					{/* Removed: show old values */}
					{isRemoved && leftUnit && (
						<div className="opacity-50">
							<UnitSummary unit={leftUnit} meta={meta} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function UnitSummary({
	unit,
	meta,
}: {
	unit: SnapshotUnit;
	meta: UnitMeta | undefined;
}) {
	const stars = starsLabel(unit.stars as RarityStars);
	return (
		<div className="space-y-0.5 text-xs text-muted-foreground">
			<div className="flex items-center gap-1">
				<RankIcon rank={unit.rank as Rank} size={14} />
				<span>{rankToString[unit.rank as Rank]}</span>
			</div>
			{stars && (
				<div className={cn(starsColor(unit.stars as RarityStars))}>{stars}</div>
			)}
			<div className="flex items-center gap-2">
				<AbilityInline
					icon={meta?.activeAbilityIcon}
					level={unit.abilities[0]}
				/>
				<AbilityInline
					icon={meta?.passiveAbilityIcon}
					level={unit.abilities[1]}
				/>
			</div>
		</div>
	);
}

function AbilityInline({
	icon,
	level,
}: {
	icon: string | undefined;
	level: number;
}) {
	return (
		<span className="inline-flex items-center gap-0.5">
			{icon ? (
				<img
					src={icon}
					alt=""
					width={14}
					height={14}
					loading="lazy"
					className="shrink-0 rounded-sm"
				/>
			) : (
				<span className="inline-block size-3.5 shrink-0 rounded-sm bg-muted" />
			)}
			<span className="tabular-nums">{level}</span>
		</span>
	);
}

function FieldDiffRow({
	field,
	before,
	after,
	meta,
}: {
	field: string;
	before: number;
	after: number;
	meta: UnitMeta | undefined;
}) {
	const delta = after - before;
	const deltaColor = delta > 0 ? "text-emerald-400" : "text-red-400";

	if (field === "rank") {
		return (
			<div className="flex items-center gap-1.5 text-xs">
				<span className="w-16 shrink-0 text-muted-foreground">Rank</span>
				<RankIcon rank={before as Rank} size={14} />
				<span className="text-muted-foreground">
					{rankToString[before as Rank]}
				</span>
				<ArrowRight className="size-3 shrink-0 text-muted-foreground" />
				<RankIcon rank={after as Rank} size={14} />
				<span>{rankToString[after as Rank]}</span>
			</div>
		);
	}

	if (field === "stars") {
		const beforeStars = before as RarityStars;
		const afterStars = after as RarityStars;
		return (
			<div className="flex items-center gap-1.5 text-xs">
				<span className="w-16 shrink-0 text-muted-foreground">Stars</span>
				<span className={starsColor(beforeStars)}>
					{starsLabel(beforeStars)}
				</span>
				<ArrowRight className="size-3 shrink-0 text-muted-foreground" />
				<span className={starsColor(afterStars)}>{starsLabel(afterStars)}</span>
			</div>
		);
	}

	if (field === "rarity") {
		return (
			<div className="flex items-center gap-1.5 text-xs">
				<span className="w-16 shrink-0 text-muted-foreground">Rarity</span>
				<span>{rarityLabel(before)}</span>
				<ArrowRight className="size-3 shrink-0 text-muted-foreground" />
				<span className={deltaColor}>{rarityLabel(after)}</span>
			</div>
		);
	}

	if (field === "activeAbility") {
		return (
			<div className="flex items-center gap-1.5 text-xs">
				<span className="w-16 shrink-0 text-muted-foreground">Active</span>
				<AbilityInline icon={meta?.activeAbilityIcon} level={before} />
				<ArrowRight className="size-3 shrink-0 text-muted-foreground" />
				<AbilityInline icon={meta?.activeAbilityIcon} level={after} />
				<DeltaBadge delta={delta} />
			</div>
		);
	}

	if (field === "passiveAbility") {
		return (
			<div className="flex items-center gap-1.5 text-xs">
				<span className="w-16 shrink-0 text-muted-foreground">Passive</span>
				<AbilityInline icon={meta?.passiveAbilityIcon} level={before} />
				<ArrowRight className="size-3 shrink-0 text-muted-foreground" />
				<AbilityInline icon={meta?.passiveAbilityIcon} level={after} />
				<DeltaBadge delta={delta} />
			</div>
		);
	}

	// Numeric fields: level, shards, xp, mythicShards
	return (
		<div className="flex items-center gap-1.5 text-xs">
			<span className="w-16 shrink-0 text-muted-foreground">
				{fieldLabel(field)}
			</span>
			<span className="tabular-nums">{before}</span>
			<ArrowRight className="size-3 shrink-0 text-muted-foreground" />
			<span className="tabular-nums">{after}</span>
			<DeltaBadge delta={delta} />
		</div>
	);
}

function DeltaBadge({ delta }: { delta: number }) {
	if (delta === 0) return null;
	return (
		<span
			className={cn(
				"text-[10px] tabular-nums",
				delta > 0 ? "text-emerald-400" : "text-red-400",
			)}
		>
			({delta > 0 ? "+" : ""}
			{delta})
		</span>
	);
}

const RARITY_LABELS = [
	"Common",
	"Uncommon",
	"Rare",
	"Epic",
	"Legendary",
	"Mythic",
];
function rarityLabel(rarity: number): string {
	return RARITY_LABELS[rarity] ?? String(rarity);
}

const FIELD_LABELS: Record<string, string> = {
	level: "Level",
	shards: "Shards",
	xp: "XP",
	mythicShards: "Mythic",
};
function fieldLabel(field: string): string {
	return FIELD_LABELS[field] ?? field;
}
