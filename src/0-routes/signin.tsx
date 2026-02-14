import { useAuthActions } from "@convex-dev/auth/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";

export const Route = createFileRoute("/signin")({
	component: SignInPage,
});

function translateError(msg: string): string {
	if (msg.includes("InvalidAccountId"))
		return "No account found with this email. Switch to sign up.";
	if (msg.includes("InvalidPassword") || msg.includes("InvalidSecret"))
		return "Incorrect password.";
	if (msg.includes("AccountAlreadyExists"))
		return "An account with this email already exists. Switch to sign in.";
	return msg || "Authentication failed.";
}

function SignInPage() {
	const { signIn } = useAuthActions();
	const navigate = useNavigate();
	const uid = useId();
	const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	function switchFlow(next: "signIn" | "signUp") {
		setFlow(next);
		setError(null);
		setConfirmPassword("");
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (flow === "signUp" && password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setLoading(true);
		try {
			await signIn("password", {
				email,
				password,
				flow,
				...(flow === "signUp" && name.trim() ? { name: name.trim() } : {}),
			});
			navigate({ to: "/" });
		} catch (err) {
			setError(translateError(err instanceof Error ? err.message : ""));
		} finally {
			setLoading(false);
		}
	}

	async function handleAnonymous() {
		setError(null);
		setLoading(true);
		try {
			await signIn("anonymous");
			navigate({ to: "/" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Authentication failed.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
			<div className="w-full max-w-sm bg-gray-800 rounded-2xl shadow-2xl p-8">
				<h1 className="text-2xl font-bold text-white text-center mb-6">
					{flow === "signIn" ? "Sign in" : "Create account"}
				</h1>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					{flow === "signUp" && (
						<div>
							<label
								htmlFor={`${uid}-name`}
								className="block text-sm font-medium text-gray-300 mb-1"
							>
								Name <span className="text-gray-500">(optional)</span>
							</label>
							<input
								id={`${uid}-name`}
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
								placeholder="Your name"
							/>
						</div>
					)}

					<div>
						<label
							htmlFor={`${uid}-email`}
							className="block text-sm font-medium text-gray-300 mb-1"
						>
							Email
						</label>
						<input
							id={`${uid}-email`}
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
							placeholder="you@example.com"
						/>
					</div>

					<div>
						<label
							htmlFor={`${uid}-password`}
							className="block text-sm font-medium text-gray-300 mb-1"
						>
							Password
						</label>
						<input
							id={`${uid}-password`}
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
							placeholder="••••••••"
						/>
					</div>

					{flow === "signUp" && (
						<div>
							<label
								htmlFor={`${uid}-confirmPassword`}
								className="block text-sm font-medium text-gray-300 mb-1"
							>
								Confirm password
							</label>
							<input
								id={`${uid}-confirmPassword`}
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
								placeholder="••••••••"
							/>
						</div>
					)}

					{error && <p className="text-red-400 text-sm text-center">{error}</p>}

					<button
						type="submit"
						disabled={loading}
						className="w-full py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
					>
						{loading
							? "Loading..."
							: flow === "signIn"
								? "Sign in"
								: "Create account"}
					</button>
				</form>

				<button
					type="button"
					onClick={() => switchFlow(flow === "signIn" ? "signUp" : "signIn")}
					className="w-full mt-3 text-sm text-gray-400 hover:text-gray-200 transition-colors"
				>
					{flow === "signIn"
						? "Don't have an account? Sign up"
						: "Already have an account? Sign in"}
				</button>

				<div className="flex items-center gap-3 my-4">
					<div className="flex-1 h-px bg-gray-600" />
					<span className="text-sm text-gray-500">or</span>
					<div className="flex-1 h-px bg-gray-600" />
				</div>

				<button
					type="button"
					onClick={handleAnonymous}
					disabled={loading}
					className="w-full py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
				>
					Continue as guest
				</button>
			</div>
		</div>
	);
}
