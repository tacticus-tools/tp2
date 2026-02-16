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
		<div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
			<div className="w-full max-w-sm rounded-2xl bg-gray-800 p-8 shadow-2xl">
				<h1 className="mb-6 text-center text-2xl font-bold text-white">
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
										className="mb-1 block text-sm font-medium text-gray-300"
									>
										Name <span className="text-gray-500">(optional)</span>
									</label>
									<input
										id={`${uid}-name`}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
										placeholder="Your name"
									/>
									{field.state.meta.isTouched &&
										field.state.meta.errors.length > 0 && (
											<p className="mt-1 text-xs text-red-400">
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
									className="mb-1 block text-sm font-medium text-gray-300"
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
									className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
									placeholder="you@example.com"
								/>
								{field.state.meta.isTouched &&
									field.state.meta.errors.length > 0 && (
										<p className="mt-1 text-xs text-red-400">
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
									className="mb-1 block text-sm font-medium text-gray-300"
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
									className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
									placeholder="••••••••"
								/>
								{field.state.meta.isTouched &&
									field.state.meta.errors.length > 0 && (
										<p className="mt-1 text-xs text-red-400">
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
										className="mb-1 block text-sm font-medium text-gray-300"
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
										className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
										placeholder="••••••••"
									/>
									{field.state.meta.isTouched &&
										field.state.meta.errors.length > 0 && (
											<p className="mt-1 text-xs text-red-400">
												{errorMessage(field.state.meta.errors[0])}
											</p>
										)}
								</div>
							)}
						</form.Field>
					)}

					{error && <p className="text-center text-sm text-red-400">{error}</p>}

					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
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
					className="mt-3 w-full text-sm text-gray-400 transition-colors hover:text-gray-200"
				>
					{flow === "signIn"
						? "Don't have an account? Sign up"
						: "Already have an account? Sign in"}
				</button>

				<div className="my-4 flex items-center gap-3">
					<div className="h-px flex-1 bg-gray-600" />
					<span className="text-sm text-gray-500">or</span>
					<div className="h-px flex-1 bg-gray-600" />
				</div>

				<button
					type="button"
					onClick={handleAnonymous}
					disabled={loading}
					className="w-full rounded-lg bg-gray-700 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Continue as guest
				</button>
			</div>
		</div>
	);
}
