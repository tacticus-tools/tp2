import { toJpeg } from "html-to-image";
import { Check, Copy, Download, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
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
	const [downloading, setDownloading] = useState(false);
	const [copying, setCopying] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleDownloadImage = async () => {
		const node = gridRef.current;
		if (!node) return;
		setDownloading(true);
		try {
			const dataUrl = await toJpeg(node, {
				backgroundColor: "#0a0a0a",
				quality: 0.85,
				pixelRatio: 1,
				cacheBust: false,
			});
			const link = document.createElement("a");
			link.download = "tacticus-roster.jpg";
			link.href = dataUrl;
			link.click();
		} finally {
			setDownloading(false);
		}
	};

	const handleCopyLink = async () => {
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
	};

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
						Download your roster as an image or share it via a public link.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="flex flex-col gap-2">
					<Button
						variant="outline"
						onClick={handleDownloadImage}
						disabled={downloading}
						className="justify-start"
					>
						{downloading ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Download className="size-4" />
						)}
						{downloading ? "Generating image..." : "Download Image"}
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
