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
					className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition-colors"
				>
					Sign in
				</Link>
			</Unauthenticated>
			<Authenticated>
				<button
					type="button"
					onClick={() => signOut()}
					className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
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
