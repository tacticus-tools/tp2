import { RefreshCw } from "lucide-react";
import { Fragment, useCallback, useMemo } from "react";
import { objectiveKey } from "@/4-lib/general/lre/lre-character-filter.ts";
import {
	computeFullProgress,
	computeShardGoal,
	computeTrackPoints,
} from "@/4-lib/general/lre/lre-progress.ts";
import {
	type ApiLreSummary,
	type BattleProgress,
	type LreEvent,
	type LreProgressData,
	REQUIREMENT_STATUS,
	type RequirementStatus,
	type TrackId,
} from "@/4-lib/general/lre/lre-types.ts";
import type { Data as LeBattleData } from "@/5-assets/le-battles/generate-data.ts";
import { DATA as LE_BATTLES } from "@/5-assets/le-battles/index.ts";
import type { DeepReadonly } from "@/types.ts";
import { LreObjectiveIcon } from "./LreObjectiveIcon.tsx";
import { LreRequirementButton } from "./LreRequirementButton.tsx";

type LeBattle = DeepReadonly<LeBattleData[number]>;

const SHARD_TARGETS = [
	{ key: "unlock", label: "Unlock" },
	{ key: "fourStars", label: "4\u2605" },
	{ key: "fiveStars", label: "5\u2605" },
	{ key: "blueStar", label: "Blue" },
	{ key: "mythic", label: "Mythic" },
] as const;

function findLeBattleData(eventId: number): LeBattle | undefined {
	return LE_BATTLES.find((e) => e.id === String(eventId));
}

export function LreProgressTab({
	event,
	trackId,
	progressData,
	onProgressChange,
	apiSummary,
	apiProgressData,
}: {
	event: LreEvent;
	trackId: TrackId;
	progressData: LreProgressData;
	onProgressChange: (data: LreProgressData) => void;
	apiSummary: ApiLreSummary | null;
	apiProgressData: LreProgressData | null;
}) {
	const synced = apiSummary !== null;
	const leBattle = useMemo(() => findLeBattleData(event.id), [event.id]);
	const leTrack = leBattle?.[trackId];

	// Battles that have any API data (for row-level visual hints)
	const apiSyncedBattles = useMemo(() => {
		if (!apiProgressData) return new Set<number>();
		const apiTrack = apiProgressData.tracksProgress.find(
			(t) => t.trackId === trackId,
		);
		if (!apiTrack) return new Set<number>();
		const s = new Set<number>();
		for (const battle of apiTrack.battles) {
			if (
				battle.requirements.some(
					(r) => r.status !== REQUIREMENT_STATUS.NotCleared,
				)
			) {
				s.add(battle.battleIndex);
			}
		}
		return s;
	}, [apiProgressData, trackId]);

	const trackProgress = progressData.tracksProgress.find(
		(tp) => tp.trackId === trackId,
	);

	const fullProgress = useMemo(
		() => computeFullProgress(progressData, event, leBattle),
		[progressData, event, leBattle],
	);

	const trackPoints = useMemo(
		() =>
			trackProgress ? computeTrackPoints(trackProgress, event, leTrack) : 0,
		[trackProgress, event, leTrack],
	);

	// Use API totals when synced, fall back to computed
	const displayPoints = apiSummary?.currentPoints ?? fullProgress.totalPoints;
	const displayEngrams = apiSummary?.currentCurrency ?? fullProgress.engrams;
	const displayChests =
		apiSummary?.currentClaimedChestIndex != null
			? apiSummary.currentClaimedChestIndex + 1
			: fullProgress.chestsOpened;
	const displayShards = apiSummary?.currentShards ?? fullProgress.totalShards;

	// Infer bonus shards from API: total shards minus chest-earned shards
	const inferredBonusShards = useMemo(() => {
		if (!apiSummary || apiSummary.currentClaimedChestIndex == null) return 0;
		const chestShards =
			(apiSummary.currentClaimedChestIndex + 1) * event.shardsPerChest;
		return Math.max(0, apiSummary.currentShards - chestShards);
	}, [apiSummary, event.shardsPerChest]);

	const updateTrackBattle = useCallback(
		(battleIndex: number, updater: (bp: BattleProgress) => BattleProgress) => {
			const newTracksProgress = progressData.tracksProgress.map((tp) => {
				if (tp.trackId !== trackId) return tp;
				return {
					...tp,
					battles: tp.battles.map((bp) =>
						bp.battleIndex === battleIndex ? updater(bp) : bp,
					),
				};
			});
			onProgressChange({ ...progressData, tracksProgress: newTracksProgress });
		},
		[progressData, trackId, onProgressChange],
	);

	const updateRequirement = useCallback(
		(battleIndex: number, reqId: string, status: RequirementStatus) => {
			updateTrackBattle(battleIndex, (bp) => ({
				...bp,
				requirements: bp.requirements.map((r) =>
					r.id === reqId ? { ...r, status } : r,
				),
			}));
		},
		[updateTrackBattle],
	);

	// Build a set of requirement keys that are API-locked (synced + Cleared or PartiallyCleared from API)
	const apiLockedReqs = useMemo(() => {
		const locked = new Set<string>(); // keys: "battleIndex:reqId"
		if (!apiProgressData) return locked;
		const apiTrack = apiProgressData.tracksProgress.find(
			(t) => t.trackId === trackId,
		);
		if (!apiTrack) return locked;
		for (const battle of apiTrack.battles) {
			for (const req of battle.requirements) {
				if (
					req.status === REQUIREMENT_STATUS.Cleared ||
					req.status === REQUIREMENT_STATUS.PartiallyCleared
				) {
					locked.add(`${String(battle.battleIndex)}:${req.id}`);
				}
			}
		}
		return locked;
	}, [apiProgressData, trackId]);

	const isReqLocked = useCallback(
		(battleIndex: number, reqId: string) =>
			apiLockedReqs.has(`${String(battleIndex)}:${reqId}`),
		[apiLockedReqs],
	);

	// Build objective label map
	const objectiveLabels = useMemo(() => {
		const map = new Map<string, string>();
		if (leTrack) {
			for (const obj of leTrack.objectives) {
				const key = objectiveKey(obj);
				const label = obj.target
					? `${obj.type}: ${String(obj.target)}`
					: obj.type;
				map.set(key, `${label} (+${obj.points})`);
			}
		}
		return map;
	}, [leTrack]);

	const reqLabel = (id: string): string => {
		if (id === "_killPoints") return "Killscore";
		if (id === "_highScore") return "Highscore";
		if (id === "_defeatAll") return "Defeat All";
		return objectiveLabels.get(id) ?? id;
	};

	// Reversed battles: show highest battle number at top
	const reversedBattles = useMemo(
		() => [...(trackProgress?.battles ?? [])].reverse(),
		[trackProgress],
	);

	return (
		<div className="space-y-6">
			{/* Sync indicator */}
			{synced && (
				<div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
					<RefreshCw className="size-4 text-emerald-400" />
					<span className="text-sm text-emerald-400">
						Synced from Tacticus API
					</span>
					{apiSummary?.currentRun != null && (
						<span className="text-xs text-muted-foreground">
							— Run #{apiSummary.currentRun}
						</span>
					)}
					{apiSummary?.tokensRemaining != null &&
						apiSummary.tokensMax != null && (
							<span className="text-xs text-muted-foreground">
								— Tokens: {apiSummary.tokensRemaining}/{apiSummary.tokensMax}
							</span>
						)}
					{inferredBonusShards > 0 && (
						<span className="text-xs text-amber-400">
							— {inferredBonusShards} bonus shards detected
						</span>
					)}
				</div>
			)}

			{/* Summary cards */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatCard label="Total Points" value={displayPoints.toLocaleString()} />
				<StatCard label="Currency" value={displayEngrams.toLocaleString()} />
				<StatCard label="Chests" value={displayChests} />
				<StatCard
					label="Total Shards"
					value={displayShards}
					sub={
						inferredBonusShards > 0
							? `(${displayShards - inferredBonusShards} chest + ${inferredBonusShards} bonus)`
							: undefined
					}
				/>
			</div>

			{/* Shard progression bar */}
			<ShardProgressionBar
				currentShards={displayShards}
				progression={event.progression}
			/>

			{/* Battle progress grid */}
			<div>
				<div className="mb-2 flex items-center justify-between">
					<h3 className="text-sm font-medium text-muted-foreground">
						Battle Progress — {event[trackId].name}
						{apiSyncedBattles.size > 0 && (
							<span className="ml-2 text-[10px] text-emerald-400">
								({apiSyncedBattles.size} synced)
							</span>
						)}
					</h3>
					<span className="text-xs text-muted-foreground">
						Track pts: {trackPoints.toLocaleString()}
					</span>
				</div>

				<div className="overflow-x-auto rounded-lg border border-border/50">
					<table className="w-full text-sm">
						<thead className="bg-muted/80">
							<tr className="border-b border-border/50">
								<th className="w-0 py-2 text-center text-sm font-medium">#</th>
								{trackProgress?.battles[0]?.requirements.map((req, i) => {
									const reqs = trackProgress.battles[0].requirements;
									const isFirstRestriction =
										!req.id.startsWith("_") &&
										(i === 0 || reqs[i - 1].id.startsWith("_"));
									return (
										<Fragment key={req.id}>
											{isFirstRestriction && <th className="w-2 sm:w-6" />}
											<th className="w-0 py-2" title={reqLabel(req.id)}>
												<div className="flex items-center justify-center">
													<LreObjectiveIcon requirementId={req.id} size={28} />
												</div>
											</th>
										</Fragment>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{reversedBattles.map((battle) => {
								const isBattleSynced = apiSyncedBattles.has(battle.battleIndex);
								return (
									<tr
										key={battle.battleIndex}
										className={`border-b border-border/30 last:border-0 ${isBattleSynced ? "bg-emerald-500/5" : ""}`}
									>
										<td className="w-0 py-1 text-center">
											<span
												className={`px-1.5 py-1 text-sm font-medium ${isBattleSynced ? "text-emerald-400" : ""}`}
											>
												{battle.battleIndex + 1}
											</span>
										</td>
										{battle.requirements.map((req, i) => {
											const locked = isReqLocked(battle.battleIndex, req.id);
											const isSyncedBattle = isBattleSynced;
											const partialScore =
												req.id === "_killPoints"
													? req.killScore
													: req.id === "_highScore"
														? req.highScore
														: undefined;
											const isFirstRestriction =
												!req.id.startsWith("_") &&
												(i === 0 ||
													battle.requirements[i - 1].id.startsWith("_"));
											return (
												<Fragment key={req.id}>
													{isFirstRestriction && <td className="w-2 sm:w-6" />}
													<td className="w-0 py-1 text-center">
														<div className="flex items-center justify-center">
															<LreRequirementButton
																status={req.status}
																onChange={
																	locked
																		? undefined
																		: (next) =>
																				updateRequirement(
																					battle.battleIndex,
																					req.id,
																					next,
																				)
																}
																flagsOnly={isSyncedBattle && !locked}
																partialScore={partialScore}
															/>
														</div>
													</td>
												</Fragment>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Point Milestones table (collapsible) */}
			<details>
				<summary className="cursor-pointer text-sm font-medium text-muted-foreground">
					Point Milestones ({event.pointsMilestones.length})
				</summary>
				<div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-border/50">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
							<tr className="border-b border-border/50">
								<th className="px-3 py-2 text-left font-medium">#</th>
								<th className="px-3 py-2 text-right font-medium">Points</th>
								<th className="px-3 py-2 text-right font-medium">Currency</th>
							</tr>
						</thead>
						<tbody>
							{event.pointsMilestones.map((m) => {
								const reached = displayPoints >= m.cumulativePoints;
								return (
									<tr
										key={m.milestone}
										className={`border-b border-border/30 last:border-0 ${reached ? "text-emerald-400" : ""}`}
									>
										<td className="px-3 py-1.5 text-muted-foreground">
											{m.milestone}
										</td>
										<td className="px-3 py-1.5 text-right">
											{m.cumulativePoints.toLocaleString()}
										</td>
										<td className="px-3 py-1.5 text-right">
											+{m.engramPayout}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</details>

			{/* Chest Milestones table (collapsible) */}
			<details>
				<summary className="cursor-pointer text-sm font-medium text-muted-foreground">
					Chest Milestones ({event.chestsMilestones.length}) —{" "}
					{event.shardsPerChest} shards/chest
				</summary>
				<div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-border/50">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
							<tr className="border-b border-border/50">
								<th className="px-3 py-2 text-left font-medium">Chest</th>
								<th className="px-3 py-2 text-right font-medium">Cost</th>
								<th className="px-3 py-2 text-right font-medium">
									Cumulative Shards
								</th>
							</tr>
						</thead>
						<tbody>
							{event.chestsMilestones.map((cm) => {
								const reached = displayChests >= cm.chestLevel;
								return (
									<tr
										key={cm.chestLevel}
										className={`border-b border-border/30 last:border-0 ${reached ? "text-emerald-400" : ""}`}
									>
										<td className="px-3 py-1.5 text-muted-foreground">
											{cm.chestLevel}
										</td>
										<td className="px-3 py-1.5 text-right">
											{cm.engramCost.toLocaleString()}
										</td>
										<td className="px-3 py-1.5 text-right">
											{(cm.chestLevel * event.shardsPerChest).toLocaleString()}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</details>

			{/* Missions (collapsible) */}
			<details>
				<summary className="cursor-pointer text-sm font-medium text-muted-foreground">
					Missions
				</summary>
				<div className="mt-2 grid gap-4 md:grid-cols-2">
					<MissionsList
						title="Regular Missions"
						missions={event.regularMissions}
					/>
					<MissionsList
						title="Premium Missions"
						missions={event.premiumMissions}
					/>
				</div>
			</details>
		</div>
	);
}

function StatCard({
	label,
	value,
	sub,
}: {
	label: string;
	value: number | string;
	sub?: string;
}) {
	return (
		<div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-center">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-xl font-bold">{value}</p>
			{sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
		</div>
	);
}

function ShardProgressionBar({
	currentShards,
	progression,
}: {
	currentShards: number;
	progression: LreEvent["progression"];
}) {
	const targets = SHARD_TARGETS.map(({ key, label }) => {
		const goal = computeShardGoal(
			progression,
			key as "unlock" | "fourStars" | "fiveStars" | "blueStar" | "mythic",
		);
		return { key, label, goal };
	}).filter((t) => t.goal > 0);

	const maxShards = targets[targets.length - 1]?.goal ?? 1;
	const pct = Math.min(100, (currentShards / maxShards) * 100);

	return (
		<div>
			<div className="mb-1 flex justify-between text-xs text-muted-foreground">
				<span>
					{currentShards} / {maxShards} shards
				</span>
				<span>
					{targets.find((t) => currentShards >= t.goal)
						? targets.filter((t) => currentShards >= t.goal).pop()?.label
						: "Not unlocked"}
				</span>
			</div>
			<div className="relative h-3 overflow-hidden rounded-full bg-muted/30">
				<div
					className="h-full rounded-full bg-emerald-500 transition-all"
					style={{ width: `${String(pct)}%` }}
				/>
				{targets.map((t) => (
					<div
						key={t.key}
						className="absolute top-0 h-full w-px bg-foreground/20"
						style={{ left: `${String((t.goal / maxShards) * 100)}%` }}
						title={`${t.label}: ${t.goal}`}
					/>
				))}
			</div>
			{/* Mobile: simple wrapped list */}
			<div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground sm:hidden">
				{targets.map((t) => (
					<span
						key={t.key}
						className={currentShards >= t.goal ? "text-emerald-400" : ""}
					>
						{t.label}: {t.goal}
					</span>
				))}
			</div>
			{/* Desktop: labels positioned under their tick marks */}
			<div className="relative mt-1.5 hidden h-4 text-[10px] text-muted-foreground sm:block">
				{targets.map((t) => (
					<span
						key={t.key}
						className={`absolute -translate-x-1/2 ${currentShards >= t.goal ? "text-emerald-400" : ""}`}
						style={{ left: `${String((t.goal / maxShards) * 100)}%` }}
					>
						{t.label}: {t.goal}
					</span>
				))}
			</div>
		</div>
	);
}

function MissionsList({
	title,
	missions,
}: {
	title: string;
	missions: ReadonlyArray<string>;
}) {
	return (
		<div>
			<h3 className="mb-2 text-sm font-medium text-muted-foreground">
				{title}
			</h3>
			<ol className="space-y-1 rounded-lg border border-border/50 p-3">
				{missions.map((mission) => (
					<li key={mission} className="flex gap-2 text-sm">
						<span>{mission}</span>
					</li>
				))}
			</ol>
		</div>
	);
}
