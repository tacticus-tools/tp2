import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/1-components/ui/alert-dialog.tsx";
import { Button } from "@/1-components/ui/button.tsx";
import { useCampaignProgressStore } from "@/3-hooks/useCampaignProgressStore.ts";
import { parsePlannerExport } from "@/4-lib/general/import-planner.ts";
// biome-ignore lint/correctness/useImportExtensions: Convex generated .js file
import { api } from "~/_generated/api";

export function ImportButton() {
	const importAll = useMutation({
		mutationFn: useConvexMutation(api.import.importAll),
	});
	const [importing, setImporting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setImporting(true);
		try {
			const text = await file.text();
			const result = parsePlannerExport(text);

			const hasAnyData =
				result.goals.length > 0 ||
				result.campaignProgress !== null ||
				result.rosterSnapshots !== null ||
				(result.lreProgress !== null && result.lreProgress.length > 0) ||
				(result.lreTeams !== null && result.lreTeams.length > 0);

			if (!hasAnyData) {
				toast.error("No data was imported.", {
					description:
						result.skipped.length > 0
							? `Skipped: ${result.skipped.join(", ")}`
							: undefined,
				});
				return;
			}

			await importAll.mutateAsync({
				goals: result.goals.length > 0 ? result.goals : undefined,
				campaignProgress: result.campaignProgress
					? JSON.stringify(result.campaignProgress)
					: undefined,
				rosterSnapshots: result.rosterSnapshots ?? undefined,
				lreProgress:
					result.lreProgress && result.lreProgress.length > 0
						? result.lreProgress
						: undefined,
				lreTeams:
					result.lreTeams && result.lreTeams.length > 0
						? result.lreTeams
						: undefined,
			});

			// Update the Zustand campaign progress store so the campaigns page
			// reflects imported data immediately (without needing an API sync)
			if (result.campaignProgress) {
				useCampaignProgressStore.setState({
					progress: result.campaignProgress,
				});
			}

			const summary = [
				result.goals.length > 0 && `${result.goals.length} goals`,
				result.campaignProgress &&
					`${Object.keys(result.campaignProgress).length} campaigns`,
				result.rosterSnapshots && "1 roster snapshot",
				result.lreProgress &&
					result.lreProgress.length > 0 &&
					`${result.lreProgress.length} LRE events`,
				result.lreTeams &&
					result.lreTeams.length > 0 &&
					`${result.lreTeams.length} LRE teams`,
			]
				.filter(Boolean)
				.join(", ");

			toast.success(`Imported: ${summary}`, {
				description:
					result.skipped.length > 0
						? `Skipped: ${result.skipped.join(", ")}`
						: undefined,
			});
		} catch {
			toast.error(
				"Failed to parse file. Make sure it's a valid Tacticus Planner export.",
			);
		} finally {
			setImporting(false);
			// Reset file input so the same file can be re-selected
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".json"
				onChange={handleImport}
				className="hidden"
			/>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						disabled={importing}
						title={importing ? "Importing..." : "Import from Tacticus Planner"}
						aria-label={
							importing ? "Importing..." : "Import from Tacticus Planner"
						}
					>
						<Upload className="size-4" />
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Import from Tacticus Planner</AlertDialogTitle>
						<AlertDialogDescription>
							Import your data from a Tacticus Planner export file (.json). This
							will import goals, campaign progress, roster snapshots, LRE
							progress, and LRE teams. Existing data in imported sections will
							be replaced.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => fileInputRef.current?.click()}>
							Choose File
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
