import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { JSX } from "react";
import { beforeEach, expect, test, vi } from "vitest";

// Create mock functions that we can control per-test
const mockSignIn = vi.fn();
const mockUseConvexAuth = vi.fn();

// Mock Convex hooks
vi.mock("@convex-dev/auth/react", () => ({
	useAuthActions: () => ({
		signIn: mockSignIn,
	}),
}));

vi.mock("convex/react", () => ({
	useConvexAuth: () => mockUseConvexAuth(),
}));

// Import after mocks are set up
import { Route } from "./signin";

beforeEach(() => {
	// Reset mocks before each test
	mockSignIn.mockReset();
	mockUseConvexAuth.mockReset();

	// Set default implementations
	mockSignIn.mockResolvedValue(undefined);
	mockUseConvexAuth.mockReturnValue({
		isAuthenticated: false,
	});

	// Reset window.location
	Object.defineProperty(window, "location", {
		value: { href: "" },
		writable: true,
		configurable: true,
	});
});

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

test("form submission calls signIn with correct parameters in signIn mode", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(mockSignIn).toHaveBeenCalledWith("password", {
			email: "test@example.com",
			password: "password123",
			flow: "signIn",
		});
	});
});

test("form submission calls signIn with name in signUp mode when name is provided", async () => {
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

	await waitFor(() => {
		expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
	});

	const nameInput = container.querySelector(
		'input[type="text"]',
	) as HTMLInputElement;
	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInputs = container.querySelectorAll('input[type="password"]');

	fireEvent.change(nameInput, { target: { value: "  John Doe  " } });
	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInputs[0], { target: { value: "password123" } });
	fireEvent.change(passwordInputs[1], { target: { value: "password123" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(mockSignIn).toHaveBeenCalledWith("password", {
			email: "test@example.com",
			password: "password123",
			flow: "signUp",
			name: "John Doe",
		});
	});
});

test("form submission in signUp mode without name does not include name field", async () => {
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

	await waitFor(() => {
		expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
	});

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInputs = container.querySelectorAll('input[type="password"]');

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInputs[0], { target: { value: "password123" } });
	fireEvent.change(passwordInputs[1], { target: { value: "password123" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(mockSignIn).toHaveBeenCalledWith("password", {
			email: "test@example.com",
			password: "password123",
			flow: "signUp",
		});
	});
});

test("error message is displayed when signIn fails with InvalidAccountId", async () => {
	mockSignIn.mockRejectedValue(new Error("InvalidAccountId"));

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(
			screen.getByText("No account found with this email. Switch to sign up."),
		).toBeInTheDocument();
	});
});

test("error message is displayed when signIn fails with InvalidPassword", async () => {
	mockSignIn.mockRejectedValue(new Error("InvalidPassword"));

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "wrong" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(screen.getByText("Incorrect password.")).toBeInTheDocument();
	});
});

test("error message is displayed when signIn fails with InvalidSecret", async () => {
	mockSignIn.mockRejectedValue(new Error("InvalidSecret"));

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "wrong" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(screen.getByText("Incorrect password.")).toBeInTheDocument();
	});
});

test("error message is displayed when signIn fails with AccountAlreadyExists", async () => {
	mockSignIn.mockRejectedValue(new Error("AccountAlreadyExists"));

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(
			screen.getByText(
				"An account with this email already exists. Switch to sign in.",
			),
		).toBeInTheDocument();
	});
});

test("generic error message is displayed when signIn fails with unknown error", async () => {
	mockSignIn.mockRejectedValue(new Error("Some unknown error"));

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(screen.getByText("Some unknown error")).toBeInTheDocument();
	});
});

test("handleAnonymous calls signIn with anonymous provider", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const buttons = container.querySelectorAll("button");
	const guestButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Continue as guest"),
	);

	expect(guestButton).toBeTruthy();
	if (guestButton) {
		fireEvent.click(guestButton);
	}

	await waitFor(() => {
		expect(mockSignIn).toHaveBeenCalledWith("anonymous");
	});
});

test("handleAnonymous shows error message on failure", async () => {
	mockSignIn.mockRejectedValue(new Error("Anonymous auth failed"));

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const buttons = container.querySelectorAll("button");
	const guestButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Continue as guest"),
	);

	expect(guestButton).toBeTruthy();
	if (guestButton) {
		fireEvent.click(guestButton);
	}

	await waitFor(() => {
		expect(screen.getByText("Anonymous auth failed")).toBeInTheDocument();
	});
});

test("switchFlow clears confirmPassword and error when switching modes", async () => {
	mockSignIn.mockRejectedValue(new Error("Test error"));

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;
	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(screen.getByText("Test error")).toBeInTheDocument();
	});

	// Switch to sign up
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

test("loading state is shown during form submission", async () => {
	mockSignIn.mockImplementation(
		() => new Promise((resolve) => setTimeout(resolve, 100)),
	);

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const emailInput = container.querySelector(
		'input[type="email"]',
	) as HTMLInputElement;
	const passwordInput = container.querySelector(
		'input[type="password"]',
	) as HTMLInputElement;

	fireEvent.change(emailInput, { target: { value: "test@example.com" } });
	fireEvent.change(passwordInput, { target: { value: "password123" } });

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;

	expect(submitButton).not.toBeDisabled();
	expect(submitButton.textContent).toBe("Sign in");

	fireEvent.click(submitButton);

	await waitFor(() => {
		expect(submitButton).toBeDisabled();
		expect(submitButton.textContent).toBe("Loading...");
	});
});

test("name field validation shows error for name longer than 100 characters", async () => {
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

	await waitFor(() => {
		expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
	});

	const nameInput = container.querySelector(
		'input[type="text"]',
	) as HTMLInputElement;

	const longName = "a".repeat(101);
	fireEvent.change(nameInput, { target: { value: longName } });
	fireEvent.blur(nameInput);

	await waitFor(() => {
		expect(screen.getByText("Name is too long")).toBeInTheDocument();
	});
});

test("redirects to home page when user becomes authenticated", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { rerender } = render(<Component />);

	// User should not be redirected yet
	expect(window.location.href).toBe("");

	// Update mock to return authenticated = true
	mockUseConvexAuth.mockReturnValue({
		isAuthenticated: true,
	});

	rerender(<Component />);

	await waitFor(() => {
		expect(window.location.href).toBe("/");
	});
});

test("button text changes based on flow", async () => {
	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const submitButton = container.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement;

	// Initially in sign in mode
	expect(submitButton.textContent).toBe("Sign in");

	// Switch to sign up mode
	const buttons = container.querySelectorAll("button");
	const signUpButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Sign up"),
	);
	if (signUpButton) {
		fireEvent.click(signUpButton);
	}

	await waitFor(() => {
		expect(submitButton.textContent).toBe("Create account");
	});
});

test("guest button is disabled during loading", async () => {
	mockSignIn.mockImplementation(
		() => new Promise((resolve) => setTimeout(resolve, 100)),
	);

	const Component = Route.options.component as () => JSX.Element;
	const { container } = render(<Component />);

	const buttons = container.querySelectorAll("button");
	const guestButton = Array.from(buttons).find((btn) =>
		btn.textContent?.includes("Continue as guest"),
	) as HTMLButtonElement;

	expect(guestButton).not.toBeDisabled();

	fireEvent.click(guestButton);

	await waitFor(() => {
		expect(guestButton).toBeDisabled();
	});
});