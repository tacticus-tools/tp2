import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { CharacterIcon } from "@/1-components/general/CharacterIcon.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import type { GwDeployment } from "@/4-lib/general/gw-offense/gw-offense-service.ts";
import type { GuildWarSection } from "@/5-assets/guild-war/index.ts";
import type { DeepReadonly } from "@/types.ts";

interface GwZoneCardProps {
	section: DeepReadonly<GuildWarSection>;
	sectionIndex: number;
	rarityCap: string;
	deployment: GwDeployment | undefined;
	teamName: string | undefined;
	teamCharacterIds: string[];
	teamMowIds: string[];
	isExpanded: boolean;
	onToggleExpand: () => void;
	onDeploy: () => void;
	onRemove: () => void;
}

export function GwZoneCard({
	section,
	rarityCap,
	deployment,
	teamName,
	teamCharacterIds,
	teamMowIds,
	isExpanded,
	onToggleExpand,
	onDeploy,
	onRemove,
}: GwZoneCardProps) {
	const isDeployed = deployment !== undefined;

	return (
		<div className="rounded-lg border border-border/50 bg-card">
			<button
				type="button"
				onClick={onToggleExpand}
				className="flex w-full items-center justify-between p-3 text-left"
			>
				<div className="flex items-center gap-2">
					<span className="font-medium">{section.name}</span>
					<Badge variant="outline" className="text-[10px]">
						{rarityCap}
					</Badge>
					{section.inactive && (
						<Badge variant="secondary" className="text-[10px]">
							Inactive
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">
						{section.warScore.toLocaleString()} pts
					</span>
					{isExpanded ? (
						<ChevronUp className="size-4 text-muted-foreground" />
					) : (
						<ChevronDown className="size-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{isExpanded && (
				<div className="border-t border-border/30 p-3">
					{section.buff && (
						<p className="mb-2 text-xs text-muted-foreground">{section.buff}</p>
					)}

					{isDeployed ? (
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">{teamName ?? "Unknown"}</p>
								{(teamCharacterIds.length > 0 || teamMowIds.length > 0) && (
									<div className="mt-1 flex items-center gap-1">
										{teamCharacterIds.map((id) => (
											<CharacterIcon key={id} unitId={id} size={28} />
										))}
										{teamMowIds.length > 0 && (
											<>
												{teamCharacterIds.length > 0 && (
													<div className="mx-0.5 h-6 w-px bg-border/50" />
												)}
												{teamMowIds.map((id) => (
													<CharacterIcon key={id} unitId={id} size={28} />
												))}
											</>
										)}
									</div>
								)}
							</div>
							<Button variant="ghost" size="icon-sm" onClick={onRemove}>
								<X className="size-4" />
							</Button>
						</div>
					) : (
						<Button
							variant="outline"
							size="sm"
							className="w-full"
							onClick={onDeploy}
						>
							<Plus className="size-4" />
							Deploy Team
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
