import { Gem, Star } from "lucide-react";
import { RankIcon } from "@/1-components/general/RankIcon.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import {
	AD_TOKENS_PER_EVENT,
	computeAllTokenUsage,
	FREE_TOKENS_PER_EVENT,
	getTokenDisplays,
	PREMIUM_TOKENS_PER_EVENT,
	TOTAL_TOKENS_PER_EVENT,
} from "@/4-lib/general/lre/lre-token-estimation.ts";
import type {
	ApiLreSummary,
	LreEvent,
	LreProgressData,
	LreTeamData,
	TrackId,
} from "@/4-lib/general/lre/lre-types.ts";
import type { RosterUnit } from "@/4-lib/general/roster-utils.ts";
import { CHARACTERS } from "@/5-assets/characters/index.ts";
import type { Data as LeBattleData } from "@/5-assets/le-battles/generate-data.ts";
import { DATA as LE_BATTLES } from "@/5-assets/le-battles/index.ts";
import type { DeepReadonly } from "@/types.ts";
import { LreObjectiveIcon } from "./LreObjectiveIcon.tsx";

type LeBattle = DeepReadonly<LeBattleData[number]>;

const characterMap: Record<
	string,
	{ name: string; roundIcon: string | undefined }
> = Object.fromEntries(
	CHARACTERS.map((c) => [c.id, { name: c.name, roundIcon: c.roundIcon }]),
);

function findLeBattleData(eventId: number): LeBattle | undefined {
	return LE_BATTLES.find((e) => e.id === String(eventId));
}

interface ConvexTeam {
	trackId: string;
	name: string;
	characterIds: string[];
	restrictionIds?: string[];
	expectedBattleClears?: number;
	notes?: string;
}

const VALID_TRACK_IDS = new Set<string>(["alpha", "beta", "gamma"]);
function isTrackId(value: string): value is TrackId {
	return VALID_TRACK_IDS.has(value);
}

export function LreTokenomicsTab({
	event,
	teams,
	progressData,
	apiSummary,
	roster,
}: {
	event: LreEvent;
	teams: ConvexTeam[];
	progressData: LreProgressData;
	apiSummary: ApiLreSummary | null;
	roster?: Record<string, RosterUnit>;
}) {
	const leBattle = findLeBattleData(event.id);

	// Convert Convex teams to LreTeamData
	const teamData: LreTeamData[] = teams
		.filter((t) => isTrackId(t.trackId))
		.map((t) => ({
			name: t.name,
			trackId: t.trackId as TrackId,
			characterIds: t.characterIds,
			restrictionIds: t.restrictionIds ?? [],
			expectedBattleClears: t.expectedBattleClears,
			notes: t.notes,
		}));

	// Build baseline from API values (ground truth) or default to zero
	const baseline = apiSummary
		? {
				points: apiSummary.currentPoints,
				shards: apiSummary.currentShards,
				engrams: apiSummary.currentCurrency,
				chestsOpened:
					apiSummary.currentClaimedChestIndex != null
						? apiSummary.currentClaimedChestIndex + 1
						: 0,
			}
		: { points: 0, shards: 0, engrams: 0, chestsOpened: 0 };

	const tokens = computeAllTokenUsage(
		teamData,
		event,
		leBattle,
		progressData,
		baseline.points,
	);

	const displays = getTokenDisplays(tokens, event, baseline);

	const lastDisplay = displays[displays.length - 1];

	if (teamData.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12">
				<p className="text-sm text-muted-foreground">
					Add teams in the Teams tab first to see token estimations.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Token budget summary */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatCard label="Free Tokens" value={FREE_TOKENS_PER_EVENT} />
				<StatCard label="Ad Tokens" value={AD_TOKENS_PER_EVENT} />
				<StatCard label="Premium Tokens" value={PREMIUM_TOKENS_PER_EVENT} />
				<StatCard
					label="Total Budget"
					value={TOTAL_TOKENS_PER_EVENT}
					highlight
				/>
			</div>

			{/* Token usage cards */}
			<div>
				<h3 className="mb-2 text-sm font-medium text-muted-foreground">
					Optimal Token Usage ({displays.length} tokens)
				</h3>
				<div className="space-y-2">
					{displays.map((d) => (
						<div
							key={d.tokenIndex}
							className={`rounded-lg border p-3 ${
								d.achievedPointsMilestone || d.achievedShardMilestone
									? "border-amber-500/50 bg-amber-500/5"
									: "border-border/50 bg-muted/10"
							}`}
						>
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-sm font-medium">
									Token #{d.tokenIndex + 1}
								</span>
								<Badge variant="outline" className="text-xs capitalize">
									{d.trackId}
								</Badge>
								<span className="text-xs text-muted-foreground">
									Battle {d.battleIndex + 1}
								</span>
								<span className="text-xs text-muted-foreground">
									— {d.teamName}
								</span>
								{d.achievedPointsMilestone && (
									<Star className="size-3.5 text-amber-400" />
								)}
								{d.achievedShardMilestone && (
									<Gem className="size-3.5 text-emerald-400" />
								)}
							</div>

							<div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
								<span>+{d.incrementalPoints.toLocaleString()} pts</span>
								<span>Total: {d.totalPoints.toLocaleString()} pts</span>
								<span>{d.engrams} currency</span>
								<span>{d.chestsOpened} chests</span>
								<span className="text-emerald-400">{d.shards} shards</span>
								{d.shardsToNextGoal > 0 && (
									<span className="text-amber-400">
										({d.shardsToNextGoal} to next goal)
									</span>
								)}
							</div>

							{/* Characters */}
							<div className="mt-1.5 flex flex-wrap gap-1.5">
								{d.characterIds.map((id) => {
									const char = characterMap[id];
									const rosterUnit = roster?.[id];
									return (
										<div
											key={id}
											className="flex flex-col items-center gap-0.5"
											title={char?.name ?? id}
										>
											<div className="relative">
												{char?.roundIcon ? (
													<img
														src={char.roundIcon}
														alt={char.name}
														width={24}
														height={24}
														loading="lazy"
														className="rounded-full"
													/>
												) : (
													<div className="flex size-6 items-center justify-center rounded-full bg-muted text-[8px] font-semibold text-muted-foreground">
														{(char?.name ?? id)[0]}
													</div>
												)}
												{rosterUnit && (
													<div className="absolute -bottom-0.5 -left-0.5">
														<RankIcon rank={rosterUnit.rank} size={12} />
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>

							{/* Restrictions cleared (icon-only with tooltips) */}
							{d.restrictionIds.length > 0 && (
								<div className="mt-1 flex flex-wrap items-center gap-1">
									{d.restrictionIds.map((rid) => (
										<LreObjectiveIcon key={rid} requirementId={rid} size={20} />
									))}
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Final summary */}
			{lastDisplay && (
				<div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
					<h3 className="text-sm font-medium">Expected Final State</h3>
					<div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
						<div>
							<span className="text-xs text-muted-foreground">
								Total Points
							</span>
							<p className="font-bold">
								{lastDisplay.totalPoints.toLocaleString()}
							</p>
						</div>
						<div>
							<span className="text-xs text-muted-foreground">Currency</span>
							<p className="font-bold">{lastDisplay.engrams}</p>
						</div>
						<div>
							<span className="text-xs text-muted-foreground">Chests</span>
							<p className="font-bold">{lastDisplay.chestsOpened}</p>
						</div>
						<div>
							<span className="text-xs text-muted-foreground">Shards</span>
							<p className="font-bold text-emerald-400">{lastDisplay.shards}</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function StatCard({
	label,
	value,
	highlight,
}: {
	label: string;
	value: number | string;
	highlight?: boolean;
}) {
	return (
		<div
			className={`rounded-lg border p-3 text-center ${
				highlight
					? "border-emerald-500/30 bg-emerald-500/10"
					: "border-border/50 bg-muted/20"
			}`}
		>
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-xl font-bold">{value}</p>
		</div>
	);
}
