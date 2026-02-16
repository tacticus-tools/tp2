import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	Check,
	ExternalLink,
	Key,
	Loader2,
	ShieldCheck,
	Swords,
	Zap,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/1-components/ui/select";
import { useGoalPreferencesStore } from "@/3-hooks/useGoalPreferencesStore";
import { api } from "~/_generated/api";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
});

const ENERGY_PRESETS = [
	{ value: 288, label: "288 (Base)" },
	{ value: 378, label: "378 (Ads)" },
	{ value: 438, label: "438 (25 BP)" },
	{ value: 538, label: "538 (50 BP)" },
	{ value: 638, label: "638 (110 BP)" },
	{ value: 738, label: "738 (250 BP)" },
	{ value: 838, label: "838 (500 BP)" },
	{ value: 938, label: "938 (1000 BP)" },
] as const;

function SettingsPage() {
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

	const {
		dailyEnergy,
		shardsEnergy,
		farmStrategy,
		farmOrder,
		setDailyEnergy,
		setShardsEnergy,
		setFarmStrategy,
		setFarmOrder,
	} = useGoalPreferencesStore();

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

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Swords className="size-5" />
						Goals & Daily Raids
					</CardTitle>
					<CardDescription>
						Configure energy budget and farming preferences for goal
						estimations.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor={`${uid}-dailyEnergy`}>Daily Energy</Label>
						<div className="flex items-center gap-3">
							<Select
								value={
									ENERGY_PRESETS.some((p) => p.value === dailyEnergy)
										? String(dailyEnergy)
										: "custom"
								}
								onValueChange={(val) => {
									if (val !== "custom") {
										setDailyEnergy(Number(val));
									}
								}}
							>
								<SelectTrigger className="w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ENERGY_PRESETS.map((preset) => (
										<SelectItem key={preset.value} value={String(preset.value)}>
											{preset.label}
										</SelectItem>
									))}
									<SelectItem value="custom">Custom</SelectItem>
								</SelectContent>
							</Select>
							<Input
								id={`${uid}-dailyEnergy`}
								type="number"
								min={0}
								max={9999}
								className="w-24"
								value={dailyEnergy}
								onChange={(e) =>
									setDailyEnergy(
										Math.max(0, Number.parseInt(e.target.value, 10) || 0),
									)
								}
							/>
							<Zap className="size-4 text-yellow-400" />
						</div>
						<p className="text-xs text-muted-foreground">
							Total energy available per day (288 base + ads + Battle Pass).
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor={`${uid}-shardsEnergy`}>Shards Energy Budget</Label>
						<div className="flex items-center gap-3">
							<Input
								id={`${uid}-shardsEnergy`}
								type="number"
								min={0}
								max={dailyEnergy}
								className="w-24"
								value={shardsEnergy}
								onChange={(e) =>
									setShardsEnergy(
										Math.max(
											0,
											Math.min(
												dailyEnergy,
												Number.parseInt(e.target.value, 10) || 0,
											),
										),
									)
								}
							/>
							<span className="text-sm text-muted-foreground">
								of {dailyEnergy} daily energy
							</span>
						</div>
						<p className="text-xs text-muted-foreground">
							Energy reserved for shard farming. Remaining energy goes to
							upgrade materials.
						</p>
					</div>

					<div className="space-y-2">
						<Label>Farm Strategy</Label>
						<Select
							value={farmStrategy}
							onValueChange={(val) =>
								setFarmStrategy(val as "leastEnergy" | "leastTime")
							}
						>
							<SelectTrigger className="w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="leastEnergy">Least Energy</SelectItem>
								<SelectItem value="leastTime">Least Time</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Least Energy picks the cheapest nodes. Least Time uses all
							available nodes.
						</p>
					</div>

					<div className="space-y-2">
						<Label>Farm Order</Label>
						<Select
							value={farmOrder}
							onValueChange={(val) =>
								setFarmOrder(val as "goalPriority" | "totalMaterials")
							}
						>
							<SelectTrigger className="w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="goalPriority">Goal Priority</SelectItem>
								<SelectItem value="totalMaterials">Total Materials</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Goal Priority farms per-goal sequentially. Total Materials
							combines needs across all goals.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
