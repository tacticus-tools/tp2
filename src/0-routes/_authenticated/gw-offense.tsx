import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { GwDeployDialog } from "@/1-components/gw-offense/GwDeployDialog.tsx";
import { GwZoneCard } from "@/1-components/gw-offense/GwZoneCard.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select.tsx";
import { useGwOffenseStore } from "@/3-hooks/useGwOffenseStore.ts";
import {
	computeWarScore,
	type GwDeployment,
	getSectionRarityCap,
	parsePlan,
} from "@/4-lib/general/gw-offense/gw-offense-service.ts";
import { GUILD_WAR } from "@/5-assets/guild-war/index.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export const Route = createFileRoute("/_authenticated/gw-offense")({
	component: GwOffensePage,
});

function GwOffensePage() {
	const docQuery = useQuery(convexQuery(api.gwOffense.get));
	const saveGw = useMutation({
		mutationFn: useConvexMutation(api.gwOffense.save),
	});
	const teamsQuery = useQuery(convexQuery(api.teams.list));

	const selectedBfLevel = useGwOffenseStore((s) => s.selectedBfLevel);
	const setSelectedBfLevel = useGwOffenseStore((s) => s.setSelectedBfLevel);
	const expandedSectionIndex = useGwOffenseStore((s) => s.expandedSectionIndex);
	const setExpandedSectionIndex = useGwOffenseStore(
		(s) => s.setExpandedSectionIndex,
	);

	// Sync BF level from persisted data on load
	useEffect(() => {
		if (docQuery.data?.bfLevel != null) {
			setSelectedBfLevel(docQuery.data.bfLevel);
		}
	}, [docQuery.data?.bfLevel, setSelectedBfLevel]);

	const [deployDialogSectionIndex, setDeployDialogSectionIndex] = useState<
		number | null
	>(null);

	const plan = parsePlan(
		docQuery.data?.bfLevel,
		docQuery.data?.deployments,
		docQuery.data?.notes,
	);

	const teamMap: Record<
		string,
		{ name: string; characterIds: string[]; mowIds: string[] }
	> = (() => {
		if (!teamsQuery.data) return {};
		return Object.fromEntries(
			teamsQuery.data.map((t) => [
				t._id,
				{
					name: t.name,
					characterIds: t.characterIds,
					mowIds: t.mowIds ?? [],
				},
			]),
		);
	})();

	const deployedTeamIds = new Set(plan.deployments.map((d) => d.teamId));

	const warScore = computeWarScore(GUILD_WAR, plan.deployments);

	const handleDeploy = async (sectionIndex: number, teamId: string) => {
		const newDeployments: GwDeployment[] = [
			...plan.deployments.filter((d) => d.sectionIndex !== sectionIndex),
			{ sectionIndex, teamId },
		];
		await saveGw.mutateAsync({
			bfLevel: selectedBfLevel,
			deployments: JSON.stringify(newDeployments),
			notes: plan.notes,
		});
	};

	const handleRemove = async (sectionIndex: number) => {
		const newDeployments = plan.deployments.filter(
			(d) => d.sectionIndex !== sectionIndex,
		);
		await saveGw.mutateAsync({
			bfLevel: selectedBfLevel,
			deployments: JSON.stringify(newDeployments),
			notes: plan.notes,
		});
	};

	const handleBfLevelChange = async (level: string) => {
		const bfLevel = Number(level);
		setSelectedBfLevel(bfLevel);
		await saveGw.mutateAsync({
			bfLevel,
			deployments: JSON.stringify(plan.deployments),
			notes: plan.notes,
		});
	};

	if (docQuery.isPending || teamsQuery.isPending) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const activeSections = GUILD_WAR.sections.filter((s) => !s.inactive);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold tracking-tight">GW Offense</h1>
					{plan.deployments.length > 0 && (
						<Badge variant="secondary">
							{plan.deployments.length} deployed
						</Badge>
					)}
				</div>
				<p className="text-muted-foreground">
					Plan your Guild War attack deployments.
				</p>
			</div>

			{/* BF Level + War Score */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<span className="text-sm font-medium">Battlefield Level</span>
					<Select
						value={String(selectedBfLevel)}
						onValueChange={handleBfLevelChange}
					>
						<SelectTrigger className="w-24">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{GUILD_WAR.bfLevels.map((level) => (
								<SelectItem key={level} value={String(level)}>
									BF {level}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="text-sm text-muted-foreground">
					War Score:{" "}
					<span className="font-medium text-foreground">
						{warScore.toLocaleString()}
					</span>
				</div>
			</div>

			{/* Zone cards */}
			<div className="space-y-2">
				{activeSections.map((section) => {
					const globalIndex = GUILD_WAR.sections.indexOf(section);
					const deployment = plan.deployments.find(
						(d) => d.sectionIndex === globalIndex,
					);
					const team = deployment ? teamMap[deployment.teamId] : undefined;

					return (
						<GwZoneCard
							key={section.id}
							section={section}
							rarityCap={getSectionRarityCap(
								GUILD_WAR,
								section,
								selectedBfLevel,
							)}
							deployment={deployment}
							teamName={team?.name}
							teamCharacterIds={team?.characterIds ?? []}
							teamMowIds={team?.mowIds ?? []}
							isExpanded={expandedSectionIndex === globalIndex}
							onToggleExpand={() =>
								setExpandedSectionIndex(
									expandedSectionIndex === globalIndex ? null : globalIndex,
								)
							}
							onDeploy={() => setDeployDialogSectionIndex(globalIndex)}
							onRemove={() => handleRemove(globalIndex)}
						/>
					);
				})}
			</div>

			{/* Empty state */}
			{activeSections.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16">
					<div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/50">
						<Shield className="size-8 text-muted-foreground" />
					</div>
					<h3 className="mb-1 text-lg font-medium text-foreground">
						No zones available
					</h3>
				</div>
			)}

			{/* Deploy dialog */}
			{deployDialogSectionIndex !== null && (
				<GwDeployDialog
					open={true}
					onOpenChange={(open) => {
						if (!open) setDeployDialogSectionIndex(null);
					}}
					sectionName={
						GUILD_WAR.sections[deployDialogSectionIndex]?.name ?? "Zone"
					}
					teams={
						teamsQuery.data?.map((t) => ({
							_id: t._id,
							name: t.name,
							characterIds: t.characterIds,
							mowIds: t.mowIds ?? [],
						})) ?? []
					}
					deployedTeamIds={deployedTeamIds}
					onSelect={(teamId) => {
						handleDeploy(deployDialogSectionIndex, teamId);
						setDeployDialogSectionIndex(null);
					}}
				/>
			)}
		</div>
	);
}
