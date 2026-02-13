// https://docs.convex.dev/auth/clerk
//

import { SignInButton, UserButton } from "@clerk/clerk-react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

function HeaderUser() {
	return (
		<main>
			<Unauthenticated>
				<SignInButton />
			</Unauthenticated>
			<Authenticated>
				<UserButton />
			</Authenticated>
			<AuthLoading>
				<p>Still loading</p>
			</AuthLoading>
		</main>
	);
}

export default HeaderUser;
