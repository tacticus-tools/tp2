import convexPlugin from "@convex-dev/eslint-plugin";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import tanstackRouter from "@tanstack/eslint-plugin-router";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import jestDom from "eslint-plugin-jest-dom";
import testingLibrary from "eslint-plugin-testing-library";

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
		},
		rules: {
			"@tanstack/query/exhaustive-deps": "error",
			"@tanstack/query/no-rest-destructuring": "warn",
			"@tanstack/query/stable-query-client": "error",
			"@tanstack/router/create-route-property-order": "error",
			"@tanstack/router/route-param-names": "error",
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
