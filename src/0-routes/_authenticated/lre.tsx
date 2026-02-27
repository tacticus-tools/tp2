import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { LreBattlesTab } from "@/1-components/lre/LreBattlesTab.tsx";
import { LreEventSelector } from "@/1-components/lre/LreEventSelector.tsx";
import { LreProgressTab } from "@/1-components/lre/LreProgressTab.tsx";
import { LreTeamsTab } from "@/1-components/lre/LreTeamsTab.tsx";
import { LreTokenomicsTab } from "@/1-components/lre/LreTokenomicsTab.tsx";
import { LreTrackSelector } from "@/1-components/lre/LreTrackSelector.tsx";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/1-components/ui/tabs.tsx";
import { useLreStore } from "@/3-hooks/useLreStore.ts";
import { usePlayerDataStore } from "@/3-hooks/usePlayerDataStore.ts";
import {
	apiProgressToLreProgress,
	extractApiSummary,
} from "@/4-lib/general/lre/lre-api-sync.ts";
import { initializeProgressData } from "@/4-lib/general/lre/lre-progress.ts";
import {
	type ApiLreSummary,
	type LreProgressData,
	REQUIREMENT_STATUS,
} from "@/4-lib/general/lre/lre-types.ts";
import type { Data as LeBattleData } from "@/5-assets/le-battles/generate-data.ts";
import { DATA as LE_BATTLES } from "@/5-assets/le-battles/index.ts";
import { LRE_EVENTS } from "@/5-assets/lre/index.ts";
import type { DeepReadonly } from "@/types.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";
import type { Id } from "~/_generated/dataModel.ts";

type LeBattle = DeepReadonly<LeBattleData[number]>;

export const Route = createFileRoute("/_authenticated/lre")({
	component: LrePage,
});

function findLeBattleData(eventId: number): LeBattle | undefined {
	return LE_BATTLES.find((e) => e.id === String(eventId));
}

/**
 * Overlay source progress onto base progress.
 * For each matching track/battle/requirement, source values replace base.
 * Battles or requirements not in source are kept from base.
 */
function overlayProgress(
	base: LreProgressData,
	source: LreProgressData | null,
): LreProgressData {
	if (!source) return { ...base };
	return {
		tracksProgress: base.tracksProgress.map((baseTrack) => {
			const srcTrack = source.tracksProgress.find(
				(t) => t.trackId === baseTrack.trackId,
			);
			if (!srcTrack) return baseTrack;
			return {
				trackId: baseTrack.trackId,
				battles: baseTrack.battles.map((baseBattle) => {
					const srcBattle = srcTrack.battles.find(
						(b) => b.battleIndex === baseBattle.battleIndex,
					);
					if (!srcBattle) return baseBattle;
					return {
						battleIndex: baseBattle.battleIndex,
						requirements: baseBattle.requirements.map((baseReq) => {
							const srcReq = srcBattle.requirements.find(
								(r) => r.id === baseReq.id,
							);
							return srcReq ?? baseReq;
						}),
					};
				}),
			};
		}),
		occurrenceProgress: source.occurrenceProgress ?? base.occurrenceProgress,
		notes: source.notes ?? base.notes,
	};
}

/**
 * Overlay API progress onto merged progress, but only for authoritative statuses.
 * Cleared and PartiallyCleared from API replace the base value.
 * NotCleared from API does NOT overwrite — the user may have flagged it MaybeClear/StopHere.
 */
function overlayApiProgress(
	base: LreProgressData,
	apiData: LreProgressData | null,
): LreProgressData {
	if (!apiData) return base;
	return {
		tracksProgress: base.tracksProgress.map((baseTrack) => {
			const apiTrack = apiData.tracksProgress.find(
				(t) => t.trackId === baseTrack.trackId,
			);
			if (!apiTrack) return baseTrack;
			return {
				trackId: baseTrack.trackId,
				battles: baseTrack.battles.map((baseBattle) => {
					const apiBattle = apiTrack.battles.find(
						(b) => b.battleIndex === baseBattle.battleIndex,
					);
					if (!apiBattle) return baseBattle;
					return {
						battleIndex: baseBattle.battleIndex,
						requirements: baseBattle.requirements.map((baseReq) => {
							const apiReq = apiBattle.requirements.find(
								(r) => r.id === baseReq.id,
							);
							if (!apiReq) return baseReq;
							// Only overwrite if API says Cleared or PartiallyCleared
							if (
								apiReq.status === REQUIREMENT_STATUS.Cleared ||
								apiReq.status === REQUIREMENT_STATUS.PartiallyCleared
							) {
								return apiReq;
							}
							// API says NotCleared — keep user's value (may be MaybeClear/StopHere)
							return baseReq;
						}),
					};
				}),
			};
		}),
		occurrenceProgress: base.occurrenceProgress,
		notes: base.notes,
	};
}

function LrePage() {
	const selectedEventId = useLreStore((s) => s.selectedEventId);
	const selectedTrackId = useLreStore((s) => s.selectedTrackId);
	const activeTab = useLreStore((s) => s.activeTab);
	const setSelectedEventId = useLreStore((s) => s.setSelectedEventId);
	const setSelectedTrackId = useLreStore((s) => s.setSelectedTrackId);
	const setActiveTab = useLreStore((s) => s.setActiveTab);

	const event = LRE_EVENTS.find((e) => e.id === selectedEventId);
	const teams = useQuery(api.lre.listTeams, { eventId: selectedEventId });
	const savedProgress = useQuery(api.lre.getProgress, {
		eventId: selectedEventId,
	});
	const saveProgressMutation = useMutation(api.lre.saveProgress);
	const addTeamMutation = useMutation(api.lre.addTeam);
	const updateTeamMutation = useMutation(api.lre.updateTeam);
	const removeTeamMutation = useMutation(api.lre.removeTeam);

	// API-synced legendary event progress
	// The API uses Snowprint character IDs (e.g. "bloodDante"), not our numeric event IDs.
	// Match via the event's characterId field.
	const legendaryEvents = usePlayerDataStore((s) => s.legendaryEvents);
	const roster = usePlayerDataStore((s) => s.roster);
	const apiEventProgress = useMemo(
		() =>
			event
				? legendaryEvents.find((le) => le.id === event.characterId)
				: undefined,
		[legendaryEvents, event],
	);
	const apiSummary: ApiLreSummary | null = useMemo(
		() => (apiEventProgress ? extractApiSummary(apiEventProgress) : null),
		[apiEventProgress],
	);
	const apiProgressData: LreProgressData | null = useMemo(
		() =>
			apiEventProgress ? apiProgressToLreProgress(apiEventProgress) : null,
		[apiEventProgress],
	);

	// Merge: full initialized grid + Convex user edits + API battle progress
	const leBattle = useMemo(
		() => (event ? findLeBattleData(event.id) : undefined),
		[event],
	);

	const progressData: LreProgressData = useMemo(() => {
		if (!event) {
			return { tracksProgress: [], occurrenceProgress: [], notes: "" };
		}

		// 1. Start with full initialized grid (all battlesCount battles)
		const base = initializeProgressData(event, leBattle);

		// 2. Parse Convex-saved progress (user's manual edits)
		let savedParsed: LreProgressData | null = null;
		if (savedProgress?.data) {
			try {
				const parsed: unknown = JSON.parse(savedProgress.data);
				if (
					parsed != null &&
					typeof parsed === "object" &&
					"tracksProgress" in parsed &&
					Array.isArray((parsed as LreProgressData).tracksProgress)
				) {
					savedParsed = parsed as LreProgressData;
				}
			} catch {
				// ignore
			}
		}

		// 3. Overlay user edits onto base
		const merged = overlayProgress(base, savedParsed);

		// 4. Overlay API data on top — only Cleared/PartiallyCleared requirements
		// are authoritative. NotCleared from API should not overwrite user flags.
		return overlayApiProgress(merged, apiProgressData);
	}, [event, leBattle, savedProgress, apiProgressData]);

	// Debounced auto-save (only for occurrence data when API is source of truth)
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleProgressChange = useCallback(
		(data: LreProgressData) => {
			if (saveTimerRef.current) {
				clearTimeout(saveTimerRef.current);
			}
			saveTimerRef.current = setTimeout(() => {
				void saveProgressMutation({
					eventId: selectedEventId,
					data: JSON.stringify(data),
				});
			}, 500);
		},
		[selectedEventId, saveProgressMutation],
	);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => {
			if (saveTimerRef.current) {
				clearTimeout(saveTimerRef.current);
			}
		};
	}, []);

	const handleAddTeam = useCallback(
		(data: {
			trackId: string;
			name: string;
			characterIds: string[];
			restrictionIds?: string[];
			expectedBattleClears?: number;
			notes?: string;
		}) => {
			void addTeamMutation({
				eventId: selectedEventId,
				...data,
			});
		},
		[selectedEventId, addTeamMutation],
	);

	const handleUpdateTeam = useCallback(
		(
			teamId: Id<"lreTeams">,
			data: {
				trackId?: string;
				name?: string;
				characterIds?: string[];
				restrictionIds?: string[];
				expectedBattleClears?: number;
				notes?: string;
			},
		) => {
			void updateTeamMutation({ teamId, ...data });
		},
		[updateTeamMutation],
	);

	const handleRemoveTeam = useCallback(
		(teamId: Id<"lreTeams">) => {
			void removeTeamMutation({ teamId });
		},
		[removeTeamMutation],
	);

	if (!event) {
		return (
			<div className="py-20 text-center text-muted-foreground">
				Event not found. Select an event.
			</div>
		);
	}

	const trackNames = {
		alpha: event.alpha.name,
		beta: event.beta.name,
		gamma: event.gamma.name,
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight">
					Legendary Release Events
				</h1>
				<p className="text-muted-foreground">
					Plan and track your LRE event progression.
				</p>
			</div>

			{/* Event + Track selectors */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<LreEventSelector
					selectedEventId={selectedEventId}
					onSelect={setSelectedEventId}
				/>
				<LreTrackSelector
					selectedTrack={selectedTrackId}
					trackNames={trackNames}
					onSelect={setSelectedTrackId}
				/>
			</div>

			{/* Event info */}
			<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
				<span>
					Character: <strong className="text-foreground">{event.name}</strong>
				</span>
				{event.nextEventDate && (
					<span>
						| Next:{" "}
						<strong className="text-foreground">{event.nextEventDate}</strong>
					</span>
				)}
				{event.finished && <span className="text-amber-400">(Finished)</span>}
			</div>

			{/* Tabs */}
			<Tabs
				value={activeTab}
				onValueChange={(val) =>
					setActiveTab(val as "progress" | "battles" | "teams" | "tokenomics")
				}
			>
				<TabsList className="h-10 w-full gap-0.5 rounded-xl p-1 sm:w-auto sm:gap-1">
					<TabsTrigger
						value="progress"
						className="flex-1 rounded-lg px-2 py-1.5 text-xs sm:flex-none sm:px-4 sm:text-sm data-active:text-emerald-400 dark:data-active:text-emerald-400"
					>
						Progress
					</TabsTrigger>
					<TabsTrigger
						value="battles"
						className="flex-1 rounded-lg px-2 py-1.5 text-xs sm:flex-none sm:px-4 sm:text-sm data-active:text-emerald-400 dark:data-active:text-emerald-400"
					>
						Battles
					</TabsTrigger>
					<TabsTrigger
						value="teams"
						className="flex-1 rounded-lg px-2 py-1.5 text-xs sm:flex-none sm:px-4 sm:text-sm data-active:text-emerald-400 dark:data-active:text-emerald-400"
					>
						Teams
					</TabsTrigger>
					<TabsTrigger
						value="tokenomics"
						className="flex-1 rounded-lg px-2 py-1.5 text-xs sm:flex-none sm:px-4 sm:text-sm data-active:text-emerald-400 dark:data-active:text-emerald-400"
					>
						Tokenomics
					</TabsTrigger>
				</TabsList>

				<TabsContent value="progress">
					<LreProgressTab
						event={event}
						trackId={selectedTrackId}
						progressData={progressData}
						onProgressChange={handleProgressChange}
						apiSummary={apiSummary}
						apiProgressData={apiProgressData}
					/>
				</TabsContent>

				<TabsContent value="battles">
					<LreBattlesTab event={event} trackId={selectedTrackId} />
				</TabsContent>

				<TabsContent value="teams">
					<LreTeamsTab
						teams={teams ?? []}
						event={event}
						trackId={selectedTrackId}
						onAddTeam={handleAddTeam}
						onUpdateTeam={handleUpdateTeam}
						onRemoveTeam={handleRemoveTeam}
						roster={roster}
					/>
				</TabsContent>

				<TabsContent value="tokenomics">
					<LreTokenomicsTab
						event={event}
						teams={teams ?? []}
						progressData={progressData}
						apiSummary={apiSummary}
						roster={roster}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
