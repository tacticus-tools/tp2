import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Authenticated,
	Unauthenticated,
	useMutation,
	useQuery,
} from "convex/react";
import {
	AlertTriangle,
	Check,
	ExternalLink,
	Key,
	Loader2,
	ShieldCheck,
} from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/1-components/ui/badge";
import { Button } from "@/1-components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/1-components/ui/card";
import { Input } from "@/1-components/ui/input";
import { Label } from "@/1-components/ui/label";
import { api } from "~/_generated/api";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<>
			<Unauthenticated>
				<UnauthenticatedSettings />
			</Unauthenticated>
			<Authenticated>
				<AuthenticatedSettings />
			</Authenticated>
		</>
	);
}

function UnauthenticatedSettings() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-20">
			<Key className="size-12 text-muted-foreground" />
			<h2 className="text-xl font-semibold">Sign in required</h2>
			<p className="text-muted-foreground">
				You need to sign in to manage your settings.
			</p>
			<Button onClick={() => navigate({ to: "/signin" })}>Sign in</Button>
		</div>
	);
}

function AuthenticatedSettings() {
	const uid = useId();
	const credentials = useQuery(api.tacticus.credentials.get);
	const saveMutation = useMutation(api.tacticus.credentials.save);

	const [tacticusUserId, setTacticusUserId] = useState("");
	const [playerApiKey, setPlayerApiKey] = useState("");
	const [guildApiKey, setGuildApiKey] = useState("");
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isLoading = credentials === undefined;
	const isFirstSetup = credentials === null;

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSaved(false);

		// For first setup, player API key is required
		if (isFirstSetup && !playerApiKey.trim()) {
			setError("Player API key is required.");
			return;
		}

		setSaving(true);
		try {
			await saveMutation({
				tacticusUserId: tacticusUserId.trim() || undefined,
				playerApiKey: playerApiKey.trim() || undefined,
				guildApiKey: guildApiKey.trim() || undefined,
			});
			setSaved(true);
			setPlayerApiKey("");
			setGuildApiKey("");
			setTimeout(() => setSaved(false), 3000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to save credentials.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground">
					Manage your Tacticus API credentials.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Key className="size-5" />
						API Credentials
					</CardTitle>
					<CardDescription>
						Connect your Tacticus account by adding your API keys. Acquire your
						keys from{" "}
						<a
							href="https://api.tacticusgame.com"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
						>
							api.tacticusgame.com
							<ExternalLink className="size-3" />
						</a>
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-6 animate-spin text-muted-foreground" />
						</div>
					) : (
						<form onSubmit={handleSave} className="space-y-4">
							<div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
								<AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
								<p className="text-sm text-amber-200">
									<strong>DO NOT SHARE PUBLICLY:</strong> Only share your API
									keys with trusted parties. Do not post your keys on forums or
									in open chats.
								</p>
							</div>

							{!isFirstSetup && (
								<div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
									<ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" />
									<p className="text-sm text-emerald-200">
										Your API keys are encrypted at rest. To update a key, enter
										a new value below. Leave fields empty to keep existing keys.
									</p>
								</div>
							)}

							<div className="space-y-2">
								<Label htmlFor={`${uid}-tacticusUserId`}>
									Tacticus User ID{" "}
									<span className="text-muted-foreground">(optional)</span>
								</Label>
								<Input
									id={`${uid}-tacticusUserId`}
									type="text"
									autoComplete="one-time-code"
									value={tacticusUserId}
									onChange={(e) => setTacticusUserId(e.target.value)}
									placeholder={
										credentials?.tacticusUserId ?? "Enter your Tacticus User ID"
									}
								/>
								<p className="text-xs text-muted-foreground">
									Used to identify your account in the Guild Raid data.
								</p>
							</div>

							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Label htmlFor={`${uid}-playerApiKey`}>
										Personal API Key{" "}
										{isFirstSetup && (
											<span className="text-destructive">*</span>
										)}
									</Label>
									{credentials?.playerApiKeyMask && (
										<Badge
											variant="outline"
											className="font-mono text-xs text-emerald-400"
										>
											{credentials.playerApiKeyMask}
										</Badge>
									)}
								</div>
								<Input
									id={`${uid}-playerApiKey`}
									type="password"
									autoComplete="one-time-code"
									value={playerApiKey}
									onChange={(e) => setPlayerApiKey(e.target.value)}
									placeholder={
										isFirstSetup
											? "Enter your Player API key"
											: "Enter new key to replace existing"
									}
								/>
								<p className="text-xs text-muted-foreground">
									Used to fetch Player data. Player scope is required for this
									key.
								</p>
							</div>

							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Label htmlFor={`${uid}-guildApiKey`}>
										Guild API Key{" "}
										<span className="text-muted-foreground">(optional)</span>
									</Label>
									{credentials?.guildApiKeyMask && (
										<Badge
											variant="outline"
											className="font-mono text-xs text-emerald-400"
										>
											{credentials.guildApiKeyMask}
										</Badge>
									)}
								</div>
								<Input
									id={`${uid}-guildApiKey`}
									type="password"
									autoComplete="one-time-code"
									value={guildApiKey}
									onChange={(e) => setGuildApiKey(e.target.value)}
									placeholder={
										credentials?.hasGuildApiKey
											? "Enter new key to replace existing"
											: "Enter your Guild API key"
									}
								/>
								<p className="text-xs text-muted-foreground">
									Used to fetch Guild Raid data. Ask your guild leader or
									co-leader to generate an API key with "Guild Raid" and "Guild"
									scopes.
								</p>
							</div>

							{error && <p className="text-sm text-destructive">{error}</p>}

							<Button type="submit" disabled={saving}>
								{saving ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Saving...
									</>
								) : saved ? (
									<>
										<Check className="size-4" />
										Saved
									</>
								) : isFirstSetup ? (
									"Save credentials"
								) : (
									"Update credentials"
								)}
							</Button>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
