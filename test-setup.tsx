import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, vi } from "vitest";

expect.extend(matchers);

// Tanstack React Router uses some features that are not available in the testing environment, so we need to mock it.
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
	useRouter: () => ({
		navigate: vi.fn(),
	}),
	createFileRoute: (_path: string) => (routeOptions: unknown) => ({
		options: routeOptions,
		useLoaderData: vi.fn(),
		useSearch: vi.fn(),
	}),
}));
