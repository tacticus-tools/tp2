import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import MyComponent from "./Header";

// TODO: This fails due to it integrating with Convex + Clerk;
// We need to figure out how to handle those integrations in tests, either by mocking them or by setting up a test environment that can handle them.
// For now, we can just skip this test to avoid having it fail and block our CI pipeline, but we should come back to it and implement it properly.
test.skip("Can use Testing Library", () => {
	render(<MyComponent />);
	const myComponent = screen.getByTestId("header");
	expect(myComponent).to;
});
