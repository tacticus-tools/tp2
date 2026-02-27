import { CharacterIcon } from "@/1-components/general/CharacterIcon.tsx";
import { Badge } from "@/1-components/ui/badge.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/1-components/ui/dialog.tsx";

interface Team {
	_id: string;
	name: string;
	characterIds: string[];
	mowIds: string[];
}

interface GwDeployDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sectionName: string;
	teams: Team[];
	deployedTeamIds: Set<string>;
	onSelect: (teamId: string) => void;
}

export function GwDeployDialog({
	open,
	onOpenChange,
	sectionName,
	teams,
	deployedTeamIds,
	onSelect,
}: GwDeployDialogProps) {
	const available = teams.filter((t) => !deployedTeamIds.has(t._id));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Deploy to {sectionName}</DialogTitle>
				</DialogHeader>

				{available.length > 0 ? (
					<div className="space-y-2">
						{available.map((team) => (
							<button
								key={team._id}
								type="button"
								onClick={() => {
									onSelect(team._id);
									onOpenChange(false);
								}}
								className="flex w-full items-center gap-3 rounded-lg border border-border/50 p-3 text-left transition-colors hover:bg-muted/50"
							>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">{team.name}</p>
									{(team.characterIds.length > 0 || team.mowIds.length > 0) && (
										<div className="mt-1 flex items-center gap-1">
											{team.characterIds.map((id) => (
												<CharacterIcon key={id} unitId={id} size={24} />
											))}
											{team.mowIds.length > 0 && (
												<>
													{team.characterIds.length > 0 && (
														<div className="mx-0.5 h-5 w-px bg-border/50" />
													)}
													{team.mowIds.map((id) => (
														<CharacterIcon key={id} unitId={id} size={24} />
													))}
												</>
											)}
										</div>
									)}
								</div>
								<Badge variant="secondary" className="text-[10px]">
									{team.characterIds.length + team.mowIds.length}
								</Badge>
							</button>
						))}
					</div>
				) : (
					<p className="py-4 text-center text-sm text-muted-foreground">
						No available teams. Create teams first in the Teams page.
					</p>
				)}

				<Button
					variant="outline"
					className="w-full"
					onClick={() => onOpenChange(false)}
				>
					Cancel
				</Button>
			</DialogContent>
		</Dialog>
	);
}
