import { useAuthActions } from "@convex-dev/auth/react";
import { Link, Outlet } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Home, LogOut, Menu, Settings, User, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/1-components/ThemeToggle";
import { Button } from "@/1-components/ui/button";
import { Separator } from "@/1-components/ui/separator";
import { cn } from "@/4-lib/utils";

function NavItem({
	to,
	icon: Icon,
	label,
	onClick,
}: {
	to: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	onClick?: () => void;
}) {
	const base =
		"group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all";

	return (
		<Link
			to={to}
			onClick={onClick}
			className={cn(
				base,
				"text-muted-foreground hover:bg-muted hover:text-foreground",
			)}
			activeOptions={{ exact: true }}
			activeProps={{
				className: cn(
					base,
					"bg-cyan-950/40 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]",
				),
			}}
		>
			<Icon className="size-5 shrink-0 transition-transform group-hover:scale-110" />
			<span>{label}</span>
		</Link>
	);
}

function NavSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1">
			<p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
				{title}
			</p>
			{children}
		</div>
	);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
	const { signOut } = useAuthActions();

	return (
		<div className="flex h-full flex-col">
			{/* Logo */}
			<div className="px-6 pb-6 pt-8">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-lg font-bold text-white shadow-lg">
						T
					</div>
					<div>
						<h1 className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-lg font-bold text-transparent">
							TACTICUS
						</h1>
						<p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
							Planner
						</p>
					</div>
				</div>
			</div>

			<div className="mx-6 mb-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

			{/* Navigation */}
			<nav className="flex-1 space-y-6 overflow-y-auto px-4">
				<NavSection title="Command">
					<NavItem to="/" icon={Home} label="Dashboard" onClick={onNavigate} />
					<NavItem
						to="/settings"
						icon={Settings}
						label="Settings"
						onClick={onNavigate}
					/>
				</NavSection>
			</nav>

			{/* Bottom profile card */}
			<div className="p-4">
				<Separator className="mb-4" />
				<div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/40 p-3">
					<div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
						<User className="size-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">Commander</p>
					</div>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => signOut()}
						title="Sign out"
					>
						<LogOut className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}

function AuthenticatedLayout() {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			{/* Desktop sidebar */}
			<aside className="hidden w-72 shrink-0 border-r border-border/60 bg-sidebar md:flex md:flex-col">
				<SidebarContent />
			</aside>

			{/* Mobile overlay */}
			{mobileOpen && (
				<div className="fixed inset-0 z-50 md:hidden">
					<button
						type="button"
						className="absolute inset-0 bg-black/80 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
						aria-label="Close sidebar"
					/>
					<aside className="relative h-full w-72 bg-sidebar shadow-2xl shadow-cyan-900/20">
						<button
							type="button"
							onClick={() => setMobileOpen(false)}
							className="absolute right-3 top-3 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
							aria-label="Close menu"
						>
							<X className="size-5" />
						</button>
						<SidebarContent onNavigate={() => setMobileOpen(false)} />
					</aside>
				</div>
			)}

			{/* Main area */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Top header */}
				<header
					className={cn(
						"sticky top-0 z-30 flex h-14 items-center border-b border-border/60 px-4 md:px-6",
						"bg-sidebar/80 backdrop-blur-md",
					)}
				>
					{/* Mobile hamburger + mini logo */}
					<div className="flex items-center gap-3 md:hidden">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setMobileOpen(true)}
							aria-label="Open menu"
						>
							<Menu className="size-5" />
						</Button>
						<div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 text-xs font-bold text-white">
							T
						</div>
					</div>

					<div className="flex-1" />

					{/* Right side actions */}
					<div className="flex items-center gap-2">
						<ThemeToggle />
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto">
					<div className="mx-auto max-w-7xl p-4 md:p-8">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}

function AnonymousLayout() {
	return (
		<div className="flex min-h-screen flex-col bg-background">
			<header
				className={cn(
					"sticky top-0 z-30 flex h-14 items-center border-b border-border/60 px-4 md:px-6",
					"bg-sidebar/80 backdrop-blur-md",
				)}
			>
				<div className="flex items-center gap-3">
					<div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 text-xs font-bold text-white">
						T
					</div>
					<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-sm font-bold text-transparent">
						TACTICUS PLANNER
					</span>
				</div>

				<div className="flex-1" />

				<div className="flex items-center gap-2">
					<ThemeToggle />
				</div>
			</header>

			<main className="flex-1">
				<div className="mx-auto max-w-7xl p-4 md:p-8">
					<Outlet />
				</div>
			</main>
		</div>
	);
}

export default function AppLayout() {
	const { isAuthenticated, isLoading } = useConvexAuth();

	if (isLoading || !isAuthenticated) {
		return <AnonymousLayout />;
	}

	return <AuthenticatedLayout />;
}
