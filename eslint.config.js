import tanstackRouter from "@tanstack/eslint-plugin-router";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

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
			"@tanstack/router": tanstackRouter,
			"@typescript-eslint": tseslint,
		},
		rules: {
			"@tanstack/router/create-route-property-order": "error",
			"@tanstack/router/route-param-names": "error",
		},
	},
];
