// @ts-check
import { defineConfig } from "eslint/config";
import tailwindPlugin from "eslint-plugin-better-tailwindcss";
import convexPlugin from "@convex-dev/eslint-plugin";
import queryPlugin from "@tanstack/eslint-plugin-query";
import routerPlugin from "@tanstack/eslint-plugin-router";
import jestDomPlugin from "eslint-plugin-jest-dom";
import rtlPlugin from "eslint-plugin-testing-library";
import tsPlugin from 'typescript-eslint';

// General Notes:
// - We use Biome as our primary linter. EsLint is only used for plugins that Biome doesn't support.
// - The Convex Plugin version we have installed (1.1.1) is broken on EsLint 10.0.0. Don't upgrade EsLint until Convex releases a fix

export default defineConfig([
  {
		ignores: ["**/convex/_generated/**", "**/src/routeTree.gen.ts"],
	},
  tsPlugin.configs.base, // dependency of convex plugin; we use Biome for our base linting so use minimal install
  ...convexPlugin.configs.recommended,
  ...queryPlugin.configs['flat/recommended'],
  ...routerPlugin.configs['flat/recommended'],
  jestDomPlugin.configs["flat/recommended"],
  rtlPlugin.configs["flat/react"],
  tailwindPlugin.configs.recommended,
]);
