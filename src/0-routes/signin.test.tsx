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
