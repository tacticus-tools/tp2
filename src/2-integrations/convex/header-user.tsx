import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

function HeaderUser() {
	const { signOut } = useAuthActions();

	return (
		<div>
			<Unauthenticated>
				<Link
					to="/signin"
					className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
				>
					Sign in
				</Link>
			</Unauthenticated>
			<Authenticated>
				<button
					type="button"
					onClick={() => signOut()}
					className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
				>
					Sign out
				</button>
			</Authenticated>
			<AuthLoading>
				<p className="text-sm text-gray-400">Loading...</p>
			</AuthLoading>
		</div>
	);
}

export default HeaderUser;
