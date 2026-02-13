import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import convexPlugin from "@convex-dev/eslint-plugin";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import tanstackRouter from "@tanstack/eslint-plugin-router";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import jestDom from "eslint-plugin-jest-dom";
import testingLibrary from "eslint-plugin-testing-library";
import zustandRules from "eslint-plugin-zustand-rules";

export default [
	{
		ignores: ["**/convex/_generated/**", "**/src/routeTree.gen.ts"],
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		languageOptions: {
			parser: parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			"@tanstack/query": tanstackQuery,
			"@tanstack/router": tanstackRouter,
			"@typescript-eslint": tseslint,
			"better-tailwindcss": betterTailwindcss,
			"zustand-rules": zustandRules,
		},
		rules: {
			// TanStack Query recommended rules
			"@tanstack/query/exhaustive-deps": "error",
			"@tanstack/query/no-rest-destructuring": "warn",
			"@tanstack/query/stable-query-client": "error",
			"@tanstack/query/no-unstable-deps": "error",
			"@tanstack/query/infinite-query-property-order": "error",
			"@tanstack/query/no-void-query-fn": "error",
			"@tanstack/query/mutation-property-order": "error",
			// TanStack Router recommended rules
			"@tanstack/router/create-route-property-order": "warn",
			"@tanstack/router/route-param-names": "error",
			// better-tailwindcss recommended rules
			...betterTailwindcss.configs.recommended.rules,
			// Zustand recommended rules
			"zustand-rules/enforce-slices-when-large-state": "warn",
			"zustand-rules/use-store-selectors": "error",
			"zustand-rules/no-state-mutation": "error",
			"zustand-rules/enforce-use-setstate": "error",
			"zustand-rules/enforce-state-before-actions": "error",
		},
	},
	...convexPlugin.configs.recommended,
	{
		files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test-setup.tsx"],
		languageOptions: {
			parser: parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			"testing-library": testingLibrary,
			"jest-dom": jestDom,
		},
		rules: {
			...testingLibrary.configs.react.rules,
			...jestDom.configs.recommended.rules,
		},
	},
];
