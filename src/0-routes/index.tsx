import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import {
	AlertCircle,
	Key,
	Loader2,
	Settings,
	Shield,
	Sword,
	Swords,
	Users,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/1-components/ui/badge";
import { Button } from "@/1-components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/1-components/ui/card";
import { api } from "~/_generated/api";
import type {
	TacticusGuildResponse,
	TacticusPlayerResponse,
	TacticusUnit,
} from "~/tacticus/types";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	const { isLoading, isAuthenticated } = useConvexAuth();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <LandingPage />;
	}

	return <Dashboard />;
}

/* ─────────── Anonymous Landing ─────────── */

function LandingPage() {
	const features = [
		{
			icon: <Sword className="size-8 text-cyan-400" />,
			title: "Roster Management",
			description:
				"Track all your characters, their gear, abilities, and progression in one place.",
		},
		{
			icon: <Users className="size-8 text-cyan-400" />,
			title: "Guild Overview",
			description:
				"Monitor your guild's activity, members, and raid performance at a glance.",
		},
		{
			icon: <Zap className="size-8 text-cyan-400" />,
			title: "Power Analytics",
			description:
				"Analyze your roster's total power, faction distribution, and growth over time.",
		},
	];

	return (
		<div className="space-y-12 py-8">
			<div className="text-center">
				<div className="mb-4 flex items-center justify-center gap-3">
					<div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-2xl font-bold text-white shadow-lg shadow-cyan-500/20">
						T
					</div>
				</div>
				<h1 className="text-4xl font-bold tracking-tight md:text-5xl">
					<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
						Tacticus Planner
					</span>
				</h1>
				<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
					Your command center for Warhammer 40,000: Tacticus. Connect your
					account, analyze your roster, and plan your path to victory.
				</p>
				<Link to="/signin" className="mt-6 inline-block">
					<Button size="lg" className="mt-6">
						Sign in to get started
					</Button>
				</Link>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				{features.map((f) => (
					<Card key={f.title}>
						<CardHeader>
							<div className="mb-2">{f.icon}</div>
							<CardTitle>{f.title}</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">{f.description}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

/* ─────────── Authenticated Dashboard ─────────── */

const RARITY_LABELS: Record<number, string> = {
	0: "Common",
	3: "Uncommon",
	6: "Rare",
	9: "Epic",
	12: "Legendary",
};

const RARITY_COLORS: Record<number, string> = {
	0: "text-gray-400",
	3: "text-green-400",
	6: "text-blue-400",
	9: "text-purple-400",
	12: "text-amber-400",
};

function getRarity(progressionIndex: number) {
	const thresholds = [12, 9, 6, 3, 0];
	const t = thresholds.find((v) => progressionIndex >= v) ?? 0;
	return {
		label: RARITY_LABELS[t] ?? "Unknown",
		color: RARITY_COLORS[t] ?? "text-gray-400",
	};
}

function computeTotalPower(units: TacticusUnit[]): number {
	return units.reduce((sum, u) => {
		const itemPower = u.items.reduce((s, i) => s + i.level, 0);
		return sum + u.xpLevel + u.rank + itemPower;
	}, 0);
}

function Dashboard() {
	const credentials = useQuery(api.tacticus.credentials.get);

	if (credentials === undefined) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!credentials) {
		return <SetupPrompt />;
	}

	return <DashboardContent hasGuildKey={credentials.hasGuildApiKey} />;
}

function SetupPrompt() {
	return (
		<div className="flex flex-col items-center gap-6 py-16 text-center">
			<div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
				<Key className="size-8 text-muted-foreground" />
			</div>
			<div>
				<h2 className="text-2xl font-bold">Welcome, Commander</h2>
				<p className="mt-2 max-w-md text-muted-foreground">
					Connect your Tacticus account to unlock your dashboard. Add your API
					keys in settings to get started.
				</p>
			</div>
			<Link to="/settings">
				<Button size="lg">
					<Settings className="size-4" />
					Go to Settings
				</Button>
			</Link>
		</div>
	);
}

function DashboardContent({ hasGuildKey }: { hasGuildKey: boolean }) {
	const getPlayerData = useAction(api.tacticus.actions.getPlayerData);
	const getGuildData = useAction(api.tacticus.actions.getGuildData);

	const [playerData, setPlayerData] = useState<TacticusPlayerResponse | null>(
		null,
	);
	const [guildData, setGuildData] = useState<TacticusGuildResponse | null>(
		null,
	);
	const [playerError, setPlayerError] = useState<string | null>(null);
	const [guildError, setGuildError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		async function fetchData() {
			setLoading(true);
			setPlayerError(null);
			setGuildError(null);

			try {
				const data = await getPlayerData();
				if (!cancelled) setPlayerData(data);
			} catch (err) {
				if (!cancelled)
					setPlayerError(
						err instanceof Error ? err.message : "Failed to fetch player data",
					);
			}

			if (hasGuildKey) {
				try {
					const data = await getGuildData();
					if (!cancelled) setGuildData(data);
				} catch (err) {
					if (!cancelled)
						setGuildError(
							err instanceof Error ? err.message : "Failed to fetch guild data",
						);
				}
			}

			if (!cancelled) setLoading(false);
		}

		fetchData();
		return () => {
			cancelled = true;
		};
	}, [hasGuildKey, getPlayerData, getGuildData]);

	if (loading) {
		return (
			<div className="flex flex-col items-center gap-4 py-20">
				<Loader2 className="size-8 animate-spin text-cyan-400" />
				<p className="text-muted-foreground">Loading your command center...</p>
			</div>
		);
	}

	const units = playerData?.player.units ?? [];
	const totalPower = computeTotalPower(units);
	const topUnits = [...units].sort((a, b) => b.xpLevel - a.xpLevel).slice(0, 8);

	return (
		<div className="space-y-6">
			{/* Hero */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
					Command Center
				</h1>
				<p className="text-muted-foreground">
					Your Tacticus operational overview.
				</p>
			</div>

			{/* Stats row */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={<Zap className="size-5 text-cyan-400" />}
					label="Total Power"
					value={totalPower.toLocaleString()}
				/>
				<StatCard
					icon={<Swords className="size-5 text-cyan-400" />}
					label="Characters"
					value={units.length.toString()}
				/>
				{guildData && (
					<>
						<StatCard
							icon={<Shield className="size-5 text-cyan-400" />}
							label="Guild"
							value={guildData.guild.name}
						/>
						<StatCard
							icon={<Users className="size-5 text-cyan-400" />}
							label="Members"
							value={guildData.guild.members.length.toString()}
						/>
					</>
				)}
			</div>

			{/* Errors */}
			{playerError && <ErrorBanner message={playerError} />}
			{guildError && <ErrorBanner message={guildError} />}

			{/* Top roster */}
			{topUnits.length > 0 && (
				<div>
					<h2 className="mb-4 text-lg font-semibold">Top Characters</h2>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{topUnits.map((unit) => (
							<UnitCard key={unit.id} unit={unit} />
						))}
					</div>
				</div>
			)}

			{/* Guild info */}
			{guildData && (
				<div>
					<h2 className="mb-4 text-lg font-semibold">Guild</h2>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Shield className="size-5" />
								{guildData.guild.name}
								<Badge variant="outline">[{guildData.guild.guildTag}]</Badge>
							</CardTitle>
							<CardDescription>Level {guildData.guild.level}</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{guildData.guild.members.length} members
							</p>
						</CardContent>
					</Card>
				</div>
			)}

			{!hasGuildKey && (
				<Card>
					<CardContent className="flex items-center gap-4 py-4">
						<Users className="size-5 shrink-0 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">
							Add a Guild API key in{" "}
							<Link to="/settings" className="text-cyan-400 hover:underline">
								Settings
							</Link>{" "}
							to see guild data here.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
}) {
	return (
		<Card>
			<CardContent className="flex items-center gap-3 py-4">
				{icon}
				<div>
					<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{label}
					</p>
					<p className="text-lg font-bold">{value}</p>
				</div>
			</CardContent>
		</Card>
	);
}

function UnitCard({ unit }: { unit: TacticusUnit }) {
	const { label, color } = getRarity(unit.progressionIndex);

	return (
		<Card>
			<CardContent className="space-y-1 py-3">
				<p className="truncate text-sm font-semibold">{unit.name}</p>
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="text-xs">
						Lv {unit.xpLevel}
					</Badge>
					<span className={`text-xs font-medium ${color}`}>{label}</span>
				</div>
			</CardContent>
		</Card>
	);
}

function ErrorBanner({ message }: { message: string }) {
	return (
		<Card className="border-destructive/50 bg-destructive/5">
			<CardContent className="flex items-center gap-3 py-3">
				<AlertCircle className="size-5 shrink-0 text-destructive" />
				<p className="text-sm text-destructive">{message}</p>
			</CardContent>
		</Card>
	);
}
