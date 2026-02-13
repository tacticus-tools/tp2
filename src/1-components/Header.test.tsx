import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import MyComponent from "./Header";

test("Can use Testing Library", () => {
	render(<MyComponent />);
	const myComponent = screen.getByTestId("header");
	expect(myComponent).to;
});
