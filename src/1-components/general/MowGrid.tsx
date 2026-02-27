import { useMemo, useState } from "react";
import { Input } from "@/1-components/ui/input.tsx";
import { cn } from "@/4-lib/utils.ts";
import { getFactionIconUrl } from "@/5-assets/factions/index.ts";
import { MOWS } from "@/5-assets/mows/index.ts";

interface MowGridProps {
	selected: string[];
	onToggle: (mowId: string) => void;
	maxSelections?: number;
	disabledIds?: Set<string>;
}

export function MowGrid({
	selected,
	onToggle,
	maxSelections,
	disabledIds,
}: MowGridProps) {
	const [search, setSearch] = useState("");

	const selectedSet = useMemo(() => new Set(selected), [selected]);

	const filtered = useMemo(() => {
		let mows = [...MOWS];
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			mows = mows.filter((m) => m.name.toLowerCase().includes(q));
		}
		return mows.sort((a, b) => a.name.localeCompare(b.name));
	}, [search]);

	const atMax = maxSelections !== undefined && selected.length >= maxSelections;

	return (
		<div className="space-y-3">
			<Input
				placeholder="Search MoWs..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			<div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-5 md:grid-cols-6">
				{filtered.map((mow) => {
					const isSelected = selectedSet.has(mow.id);
					const isDisabled =
						(!isSelected && atMax) ||
						(!isSelected &&
							disabledIds !== undefined &&
							disabledIds.has(mow.id));
					const iconUrl = getFactionIconUrl(mow.factionId);

					return (
						<button
							key={mow.id}
							type="button"
							disabled={isDisabled}
							onClick={() => onToggle(mow.id)}
							className={cn(
								"relative flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-center transition-colors",
								isSelected
									? "border-emerald-500 bg-emerald-500/10"
									: "border-border/50 hover:border-border",
								isDisabled && "cursor-not-allowed opacity-40",
							)}
						>
							{mow.roundIcon ? (
								<img
									src={mow.roundIcon}
									alt={mow.name}
									width={36}
									height={36}
									loading="lazy"
									className="rounded-full object-cover"
								/>
							) : (
								<div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
									{mow.name[0]}
								</div>
							)}
							<span className="w-full truncate text-[10px] leading-tight">
								{mow.name}
							</span>
							{iconUrl && (
								<img
									src={iconUrl}
									alt=""
									width={12}
									height={12}
									className="absolute top-0.5 right-0.5"
								/>
							)}
						</button>
					);
				})}
			</div>

			{maxSelections !== undefined && (
				<p className="text-xs text-muted-foreground">
					{selected.length}/{maxSelections} selected
				</p>
			)}
		</div>
	);
}
