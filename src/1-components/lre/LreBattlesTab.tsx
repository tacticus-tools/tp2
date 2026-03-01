import { ChevronLeft, ChevronRight, Map as MapIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/1-components/ui/badge.tsx";
import { objectiveKey } from "@/4-lib/general/lre/lre-character-filter.ts";
import type { Data as LeBattleData } from "@/5-assets/le-battles/generate-data.ts";
import {
	getLeMapUrl,
	DATA as LE_BATTLES,
} from "@/5-assets/le-battles/index.ts";
import type { Data } from "@/5-assets/lre/generate-data.ts";
import { NPCS } from "@/5-assets/npcs/index.ts";
import type { DeepReadonly } from "@/types.ts";
import { LreObjectiveIcon } from "./LreObjectiveIcon.tsx";

const npcMap: Record<string, { name: string; portrait: string | undefined }> =
	Object.fromEntries(
		NPCS.map((n) => [n.id, { name: n.name, portrait: n.portrait }]),
	);

type LreEvent = DeepReadonly<Data[number]>;
type TrackId = "alpha" | "beta" | "gamma";
type LeBattle = DeepReadonly<LeBattleData[number]>;

function findLeBattleData(eventId: number): LeBattle | undefined {
	return LE_BATTLES.find((e) => e.id === String(eventId));
}

export function LreBattlesTab({
	event,
	trackId,
}: {
	event: LreEvent;
	trackId: TrackId;
}) {
	const track = event[trackId];
	const leBattle = findLeBattleData(event.id);
	const leTrack = leBattle?.[trackId];
	const [battleIndex, setBattleIndex] = useState(0);
	const [showMap, setShowMap] = useState(false);

	const maxIndex = event.battlesCount - 1;
	const clampedIndex = Math.min(battleIndex, maxIndex);

	const leBattleInfo = leTrack?.battles[clampedIndex];
	const points = track.battlesPoints[clampedIndex] ?? 0;
	const defeatAllBonus = track.defeatAll?.[clampedIndex] ?? null;

	const mapUrl = leBattleInfo?.mapId
		? getLeMapUrl(leBattleInfo.mapId)
		: undefined;

	const totalEnemies = leBattleInfo?.waves
		? leBattleInfo.waves.reduce(
				(sum, w) =>
					sum +
					Object.values(w.enemies).reduce((s: number, c: number) => s + c, 0),
				0,
			)
		: null;

	return (
		<div className="space-y-4">
			{/* Track info */}
			<div className="flex flex-wrap items-center gap-3">
				<Badge variant="outline">{track.name}</Badge>
				<span className="text-sm text-muted-foreground">
					Enemies: {track.enemies.label}
				</span>
				<span className="text-sm text-muted-foreground">
					Kill Points: {track.killPoints}
				</span>
			</div>

			{/* Objectives from le-battles */}
			{leTrack && (
				<div>
					<h3 className="mb-2 text-sm font-medium text-muted-foreground">
						Objectives
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{leTrack.objectives.map((obj) => {
							const key = objectiveKey(obj);
							return (
								<LreObjectiveIcon key={key} requirementId={key} size={24} />
							);
						})}
					</div>
				</div>
			)}

			{/* Disallowed factions from le-battles */}
			{leTrack && (
				<div>
					<h3 className="mb-2 text-sm font-medium text-muted-foreground">
						Disallowed Factions
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{leTrack.disallowedFactions.map((f) => (
							<Badge key={f} variant="destructive" className="text-xs">
								{f}
							</Badge>
						))}
					</div>
				</div>
			)}

			{/* Battle slider */}
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<h3 className="text-sm font-medium text-muted-foreground">
						Battle {clampedIndex + 1} of {event.battlesCount}
					</h3>
					{mapUrl && (
						<button
							type="button"
							onClick={() => setShowMap((v) => !v)}
							className="flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
						>
							<MapIcon className="size-3.5" />
							{showMap ? "Hide Map" : "Show Map"}
						</button>
					)}
				</div>

				{/* Slider with prev/next buttons */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={clampedIndex === 0}
						onClick={() => setBattleIndex((i) => Math.max(0, i - 1))}
						className="rounded-md border border-border/50 p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-30"
					>
						<ChevronLeft className="size-4" />
					</button>

					<div className="relative flex-1">
						<input
							type="range"
							min={0}
							max={maxIndex}
							value={clampedIndex}
							onChange={(e) => setBattleIndex(Number(e.target.value))}
							step={1}
							className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted/40 accent-emerald-500 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
						/>
						{/* Tick marks */}
						<div className="mt-1 flex justify-between px-[2px]">
							{track.battlesPoints.map((_, i) => (
								<button
									key={`tick-${String(i)}`}
									type="button"
									onClick={() => setBattleIndex(i)}
									className={`size-1.5 rounded-full transition-colors ${
										i === clampedIndex
											? "bg-emerald-500"
											: "bg-muted-foreground/30 hover:bg-muted-foreground/60"
									}`}
									title={`Battle ${String(i + 1)}`}
								/>
							))}
						</div>
					</div>

					<button
						type="button"
						disabled={clampedIndex === maxIndex}
						onClick={() => setBattleIndex((i) => Math.min(maxIndex, i + 1))}
						className="rounded-md border border-border/50 p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-30"
					>
						<ChevronRight className="size-4" />
					</button>
				</div>
			</div>

			{/* Map image (collapsible) */}
			{showMap && mapUrl && (
				<div className="overflow-hidden rounded-lg border border-border/50">
					<img
						src={mapUrl}
						alt={`Battle ${clampedIndex + 1} map`}
						width={512}
						height={512}
						className="h-auto w-full max-w-lg"
						loading="lazy"
					/>
				</div>
			)}

			{/* Current battle detail */}
			<div className="rounded-lg border border-border/50 bg-muted/10 p-4">
				<div className="flex flex-wrap items-center gap-3">
					<span className="text-lg font-bold">Battle {clampedIndex + 1}</span>
					{leBattleInfo?.power != null && (
						<Badge variant="outline" className="text-xs">
							Power: {leBattleInfo.power.toLocaleString()}
						</Badge>
					)}
					<span className="text-xs text-muted-foreground">
						Battle pts: {points}
					</span>
					{defeatAllBonus != null && (
						<span className="text-xs text-emerald-400">
							+{defeatAllBonus} defeat all
						</span>
					)}
					{leBattleInfo?.acingPoints != null && (
						<span className="text-xs text-amber-400">
							+{leBattleInfo.acingPoints} acing
						</span>
					)}
					<span className="text-xs text-muted-foreground">
						Kill pts: {track.killPoints}/kill
					</span>
					{totalEnemies !== null && (
						<span className="text-xs text-muted-foreground">
							({totalEnemies} enemies)
						</span>
					)}
				</div>

				{/* Wave details */}
				{leBattleInfo?.waves && leBattleInfo.waves.length > 0 && (
					<div className="mt-3 space-y-2">
						{leBattleInfo.waves.map((wave) => {
							const waveEnemyCount = Object.values(wave.enemies).reduce(
								(s: number, c: number) => s + c,
								0,
							);
							return (
								<div
									key={wave.round}
									className="rounded-md border border-border/30 bg-background/50 p-2.5"
								>
									<div className="mb-1.5 flex items-center gap-2 text-xs">
										<span className="font-medium">Wave {wave.round}</span>
										<span className="text-muted-foreground">
											({waveEnemyCount} enemies)
										</span>
									</div>
									<div className="flex flex-wrap gap-2">
										{Object.entries(wave.enemies).map(([enemyKey, count]) => {
											const [npcId, level] = enemyKey.split(":");
											const npc = npcMap[npcId ?? ""];
											return (
												<div
													key={enemyKey}
													className="flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/20 px-2 py-1"
													title={`${npc?.name ?? npcId} (L${level})`}
												>
													{npc?.portrait ? (
														<img
															src={npc.portrait}
															alt={npc.name}
															width={24}
															height={24}
															loading="lazy"
															className="rounded-sm"
														/>
													) : (
														<span className="flex size-6 items-center justify-center rounded-sm bg-muted text-[8px] font-semibold">
															{(npc?.name ?? npcId ?? "?")[0]}
														</span>
													)}
													<div className="text-xs">
														<span className="font-medium">
															{count}x {npc?.name ?? npcId}
														</span>
														<span className="ml-1 text-muted-foreground">
															L{level}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
