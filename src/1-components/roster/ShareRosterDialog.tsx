import { toPng } from "html-to-image";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/1-components/ui/alert-dialog.tsx";
import { Button } from "@/1-components/ui/button.tsx";

interface ShareRosterDialogProps {
	gridRef: React.RefObject<HTMLDivElement | null>;
	onShare: () => Promise<string | null>;
}

export function ShareRosterDialog({
	gridRef,
	onShare,
}: ShareRosterDialogProps) {
	const [copying, setCopying] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleDownloadPng = useCallback(async () => {
		const node = gridRef.current;
		if (!node) return;
		const dataUrl = await toPng(node, { backgroundColor: "#0a0a0a" });
		const link = document.createElement("a");
		link.download = "tacticus-roster.png";
		link.href = dataUrl;
		link.click();
	}, [gridRef]);

	const handleCopyLink = useCallback(async () => {
		setCopying(true);
		try {
			const token = await onShare();
			if (!token) return;
			const url = `${window.location.origin}/shared/roster?token=${token}`;
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} finally {
			setCopying(false);
		}
	}, [onShare]);

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Share2 className="size-4" />
					<span className="hidden sm:inline">Share</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Share Roster</AlertDialogTitle>
					<AlertDialogDescription>
						Download your roster as a PNG image or share it via a public link.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="flex flex-col gap-2">
					<Button
						variant="outline"
						onClick={handleDownloadPng}
						className="justify-start"
					>
						<Download className="size-4" />
						Download PNG
					</Button>
					<Button
						variant="outline"
						onClick={handleCopyLink}
						disabled={copying}
						className="justify-start"
					>
						{copied ? (
							<Check className="size-4" />
						) : (
							<Copy className="size-4" />
						)}
						{copied ? "Link Copied!" : "Copy Share Link"}
					</Button>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel>Close</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
