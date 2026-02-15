import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { JSX } from "react";
import { expect, test, vi } from "vitest";

// Mock Convex hooks
vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({
		signIn: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock("convex/react", () => ({
	useConvexAuth: () => ({
		isAuthenticated: false,
	}),
}));

// Import after mocks are set up
import { Route } from "./signin";

test("signin form uses TanStack Form for state management", () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	// Verify form is rendered
	expect(container.querySelector("form")).toBeInTheDocument();
	const emailInputs = screen.getAllByLabelText("Email");
	const passwordInputs = screen.getAllByLabelText("Password");

	// Verify at least one of each input exists
	expect(emailInputs.length).toBeGreaterThan(0);
	expect(passwordInputs.length).toBeGreaterThan(0);
});

test("form fields can be filled using TanStack Form", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	expect(emailInput).toBeInTheDocument();
	expect(passwordInput).toBeInTheDocument();

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	expect(emailInput.value).toBe("test@example.com");
	expect(passwordInput.value).toBe("password123");
});

test("password mismatch error is shown in signup mode", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	// Switch to signup mode - find the button by looking for text containing "Sign up"
	const buttons = container.querySelectorAll("button");
	const signUpButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign up"),
	);

	expect(signUpButton).toBeTruthy();
	if (signUpButton) {
		fireEvent.click(signUpButton);
	}

	// Wait for the confirm password field to appear
	await waitFor(() => {
		const passwordInputs = container.querySelectorAll('input[type="password"]');
		// In sign-up mode, there should be 2 password fields (password + confirm)
		expect(passwordInputs.length).toBe(2);
	});

	// Fill in form with mismatched passwords
	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInputs = container.querySelectorAll('input[type="password"]');
	const passwordInput = passwordInputs[0] as HTMLInputElement;
	const confirmPasswordInput = passwordInputs[1] as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });
	fireEvent.change(confirmPasswordInput, { target: { value: "different456" } });
	// Trigger blur to activate validation
	fireEvent.blur(confirmPasswordInput);

	// Verify error message appears in field validation (without period at the end)
	await waitFor(() => {
		expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
	});
});

test("email validation shows error for invalid email", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;

	// Enter invalid email
	fireEvent.change(emailInput, { target: { value: "notanemail" } });
	fireEvent.blur(emailInput);

	// Verify error message
	await waitFor(() => {
		expect(
			screen.getByText("Please enter a valid email address"),
		).toBeInTheDocument();
	});
});

test("password validation shows error for short password", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	// Enter short password
	fireEvent.change(passwordInput, { target: { value: "123" } });
	fireEvent.blur(passwordInput);

	// Verify error message
	await waitFor(() => {
		expect(
			screen.getByText("Password must be at least 8 characters"),
		).toBeInTheDocument();
	});
});

test("name field validation shows error when name is too long", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	// Switch to signup mode
	const buttons = container.querySelectorAll("button");
	const signUpButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign up"),
	);

	if (signUpButton) {
		fireEvent.click(signUpButton);
	}

	// Wait for name field to appear
	await waitFor(() => {
		expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
	});

	const nameInput = screen.getByLabelText(/Name/) as HTMLInputElement;

	// Enter name longer than 100 characters
	const longName = "a".repeat(101);
	fireEvent.change(nameInput, { target: { value: longName } });
	fireEvent.blur(nameInput);

	// Verify error message
	await waitFor(() => {
		expect(screen.getByText("Name is too long")).toBeInTheDocument();
	});
});

test("switching from signup to signin clears confirm password field and errors", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	// Switch to signup mode
	let buttons = container.querySelectorAll("button");
	let signUpButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign up"),
	);

	if (signUpButton) {
		fireEvent.click(signUpButton);
	}

	// Wait for confirm password field to appear
	await waitFor(() => {
		const passwordInputs = container.querySelectorAll('input[type="password"]');
		expect(passwordInputs.length).toBe(2);
	});

	// Fill confirm password
	const passwordInputs = container.querySelectorAll('input[type="password"]');
	const confirmPasswordInput = passwordInputs[1] as HTMLInputElement;
	fireEvent.change(confirmPasswordInput, { target: { value: "test123" } });

	// Switch back to signin
	buttons = container.querySelectorAll("button");
	const signInButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign in"),
	);

	if (signInButton) {
		fireEvent.click(signInButton);
	}

	// Wait for confirm password field to disappear
	await waitFor(() => {
		const passwordInputsAfter = container.querySelectorAll(
			'input[type="password"]',
		);
		expect(passwordInputsAfter.length).toBe(1);
	});

	// Switch back to signup and verify confirm password is cleared
	buttons = container.querySelectorAll("button");
	signUpButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign up"),
	);

	if (signUpButton) {
		fireEvent.click(signUpButton);
	}

	await waitFor(() => {
		const passwordInputsFinal = container.querySelectorAll(
			'input[type="password"]',
		);
		expect(passwordInputsFinal.length).toBe(2);
		const confirmPasswordFinal = passwordInputsFinal[1] as HTMLInputElement;
		expect(confirmPasswordFinal.value).toBe("");
	});
});

test("form submission calls signIn with correct parameters in signin mode", async () => {
	const mockSignIn = vi.fn().mockResolvedValue(undefined);

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	fireEvent.submit(form);

	await waitFor(() => {
		expect(mockSignIn).toHaveBeenCalledWith("password", {
			email: "test@example.com",
			password: "password123",
			flow: "signIn",
		});
	});
});

test("form submission calls signIn with name in signup mode when name is provided", async () => {
	const mockSignIn = vi.fn().mockResolvedValue(undefined);

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	// Switch to signup mode
	const buttons = container.querySelectorAll("button");
	const signUpButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign up"),
	);

	if (signUpButton) {
		fireEvent.click(signUpButton);
	}

	await waitFor(() => {
		expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
	});

	const nameInput = screen.getByLabelText(/Name/) as HTMLInputElement;
	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInputs = container.querySelectorAll('input[type="password"]');
	const passwordInput = passwordInputs[0] as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	fireEvent.change(nameInput, { target: { value: "  John Doe  " } });
	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	fireEvent.submit(form);

	await waitFor(() => {
		expect(mockSignIn).toHaveBeenCalledWith("password", {
			email: "test@example.com",
			password: "password123",
			flow: "signUp",
			name: "John Doe",
		});
	});
});

test("form submission does not include name when it is empty in signup mode", async () => {
	const mockSignIn = vi.fn().mockResolvedValue(undefined);

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	// Switch to signup mode
	const buttons = container.querySelectorAll("button");
	const signUpButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign up"),
	);

	if (signUpButton) {
		fireEvent.click(signUpButton);
	}

	await waitFor(() => {
		expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
	});

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInputs = container.querySelectorAll('input[type="password"]');
	const passwordInput = passwordInputs[0] as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	// Leave name empty
	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	fireEvent.submit(form);

	await waitFor(() => {
		expect(mockSignIn).toHaveBeenCalledWith("password", {
			email: "test@example.com",
			password: "password123",
			flow: "signUp",
		});
	});
});

test("form submission displays translated error for InvalidAccountId", async () => {
	const mockSignIn = vi
		.fn()
		.mockRejectedValue(new Error("InvalidAccountId"));

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	fireEvent.submit(form);

	await waitFor(() => {
		expect(
			screen.getByText("No account found with this email. Switch to sign up."),
		).toBeInTheDocument();
	});
});

test("form submission displays translated error for InvalidPassword", async () => {
	const mockSignIn = vi
		.fn()
		.mockRejectedValue(new Error("InvalidPassword"));

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });

	fireEvent.submit(form);

	await waitFor(() => {
		expect(screen.getByText("Incorrect password.")).toBeInTheDocument();
	});
});

test("form submission displays translated error for AccountAlreadyExists", async () => {
	const mockSignIn = vi
		.fn()
		.mockRejectedValue(new Error("AccountAlreadyExists"));

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	fireEvent.submit(form);

	await waitFor(() => {
		expect(
			screen.getByText(
				"An account with this email already exists. Switch to sign in.",
			),
		).toBeInTheDocument();
	});
});

test("form submission displays generic error for unknown error", async () => {
	const mockSignIn = vi
		.fn()
		.mockRejectedValue(new Error("Some unknown error"));

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	fireEvent.submit(form);

	await waitFor(() => {
		expect(screen.getByText("Some unknown error")).toBeInTheDocument();
	});
});

test("anonymous signin button calls signIn with anonymous provider", async () => {
	const mockSignIn = vi.fn().mockResolvedValue(undefined);

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const guestButton = Array.from(container.querySelectorAll("button")).find(
		(btn) => btn.textContent?.includes("Continue as guest"),
	);

	expect(guestButton).toBeTruthy();

	if (guestButton) {
		fireEvent.click(guestButton);
	}

	await waitFor(() => {
		expect(mockSignIn).toHaveBeenCalledWith("anonymous");
	});
});

test("anonymous signin displays error when it fails", async () => {
	const mockSignIn = vi
		.fn()
		.mockRejectedValue(new Error("Anonymous auth failed"));

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const guestButton = Array.from(container.querySelectorAll("button")).find(
		(btn) => btn.textContent?.includes("Continue as guest"),
	);

	if (guestButton) {
		fireEvent.click(guestButton);
	}

	await waitFor(() => {
		expect(screen.getByText("Anonymous auth failed")).toBeInTheDocument();
	});
});

test("button shows loading state during form submission", async () => {
	const mockSignIn = vi.fn(() => new Promise(() => {})); // Never resolves

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	fireEvent.submit(form);

	await waitFor(() => {
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	// Check that buttons are disabled
	const submitButton = Array.from(container.querySelectorAll("button")).find(
		(btn) => btn.textContent?.includes("Loading..."),
	);
	expect(submitButton).toHaveAttribute("disabled");
});

test("redirects to home page when isAuthenticated becomes true", async () => {
	const originalLocation = window.location;
	delete (window as { location?: Location }).location;
	window.location = { ...originalLocation, href: "" } as Location;

	let isAuthenticated = false;

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: vi.fn().mockImplementation(async () => {
				// Simulate successful auth by setting flag
				isAuthenticated = true;
			}),
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { rerender } = render(<Component />);

	// Initially not authenticated
	expect(window.location.href).toBe("");

	// Simulate authentication change by re-importing with updated mock
	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: vi.fn().mockResolvedValue(undefined),
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: true,
		}),
	}));

	const { Route: FreshRoute2 } = await import("./signin");
	const Component2 = FreshRoute2.options.component as () => JSX.Element;

	render(<Component2 />);

	await waitFor(() => {
		expect(window.location.href).toBe("/");
	});

	window.location = originalLocation;
});

test("error is cleared when switching between signin and signup flows", async () => {
	const mockSignIn = vi.fn().mockRejectedValue(new Error("Test error"));

	vi.resetModules();
	vi.doMock("@convex-dev/auth/react", () => ({
		useAuthActions: () => ({
			signIn: mockSignIn,
		}),
	}));

	vi.doMock("convex/react", () => ({
		useConvexAuth: () => ({
			isAuthenticated: false,
		}),
	}));

	const { Route: FreshRoute } = await import("./signin");

	const Component = FreshRoute.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;
	const form = container.querySelector("form") as HTMLFormElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	fireEvent.submit(form);

	// Wait for error to appear
	await waitFor(() => {
		expect(screen.getByText("Test error")).toBeInTheDocument();
	});

	// Switch to signup
	const buttons = container.querySelectorAll("button");
	const signUpButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign up"),
	);

	if (signUpButton) {
		fireEvent.click(signUpButton);
	}

	// Error should be cleared
	await waitFor(() => {
		expect(screen.queryByText("Test error")).not.toBeInTheDocument();
	});
});