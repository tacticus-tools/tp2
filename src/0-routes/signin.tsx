import { useAuthActions } from "@convex-dev/auth/react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect, useId, useState } from "react";
import { z } from "zod";

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

/** Extract the display message from a field error (string from callback, or {message} from Zod). */
function errorMessage(err: unknown): string {
	if (typeof err === "string") return err;
	if (err && typeof err === "object" && "message" in err)
		return String((err as { message: string }).message);
	return "Invalid value";
}

function SignInPage() {
	const { signIn } = useAuthActions();
	const { isAuthenticated } = useConvexAuth();
	const uid = useId();
	const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		onSubmit: ({ value }) => {
			setError(null);
			setLoading(true);
			void signIn("password", {
				email: value.email,
				password: value.password,
				flow,
				...(flow === "signUp" && value.name.trim()
					? { name: value.name.trim() }
					: {}),
			}).catch((err: unknown) => {
				setError(translateError(err instanceof Error ? err.message : ""));
				setLoading(false);
			});
		},
	});

	// Redirect when auth state becomes authenticated
	useEffect(() => {
		if (isAuthenticated) {
			window.location.href = "/";
		}
	}, [isAuthenticated]);

	function switchFlow(next: "signIn" | "signUp") {
		setFlow(next);
		setError(null);
		form.setFieldValue("confirmPassword", "");
	}

	function handleAnonymous() {
		setError(null);
		setLoading(true);
		void signIn("anonymous").catch((err: unknown) => {
			setError(err instanceof Error ? err.message : "Authentication failed.");
			setLoading(false);
		});
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
			<div className="w-full max-w-sm bg-gray-800 rounded-2xl shadow-2xl p-8">
				<h1 className="text-2xl font-bold text-white text-center mb-6">
					{flow === "signIn" ? "Sign in" : "Create account"}
				</h1>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col gap-4"
				>
					{flow === "signUp" && (
						<form.Field
							name="name"
							validators={{
								onChange: z.string().max(100, "Name is too long"),
							}}
						>
							{(field) => (
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
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
										placeholder="Your name"
									/>
									{field.state.meta.isTouched &&
										field.state.meta.errors.length > 0 && (
											<p className="text-red-400 text-xs mt-1">
												{errorMessage(field.state.meta.errors[0])}
											</p>
										)}
								</div>
							)}
						</form.Field>
					)}

					<form.Field
						name="email"
						validators={{
							onChange: z
								.string()
								.min(1, "Email is required")
								.email("Please enter a valid email address"),
						}}
					>
						{(field) => (
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
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									required
									className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
									placeholder="you@example.com"
								/>
								{field.state.meta.isTouched &&
									field.state.meta.errors.length > 0 && (
										<p className="text-red-400 text-xs mt-1">
											{errorMessage(field.state.meta.errors[0])}
										</p>
									)}
							</div>
						)}
					</form.Field>

					<form.Field
						name="password"
						validators={{
							onChange: z
								.string()
								.min(8, "Password must be at least 8 characters"),
						}}
					>
						{(field) => (
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
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									required
									className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
									placeholder="••••••••"
								/>
								{field.state.meta.isTouched &&
									field.state.meta.errors.length > 0 && (
										<p className="text-red-400 text-xs mt-1">
											{errorMessage(field.state.meta.errors[0])}
										</p>
									)}
							</div>
						)}
					</form.Field>

					{flow === "signUp" && (
						<form.Field
							name="confirmPassword"
							validators={{
								onChangeListenTo: ["password"],
								onChange: ({ value, fieldApi }) => {
									const password = fieldApi.form.getFieldValue("password");
									if (value && password && value !== password)
										return "Passwords do not match";
									return undefined;
								},
							}}
						>
							{(field) => (
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
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										required
										className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
										placeholder="••••••••"
									/>
									{field.state.meta.isTouched &&
										field.state.meta.errors.length > 0 && (
											<p className="text-red-400 text-xs mt-1">
												{errorMessage(field.state.meta.errors[0])}
											</p>
										)}
								</div>
							)}
						</form.Field>
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
