import viteReact from "@vitejs/plugin-react";

import { defineConfig } from "vitest/config";

// ToDo: Keep an eye out for a better resolution to the "module is not defined" errors
// This distinct Vite config is a workaround to let Vite pre-bundle the CJS dependencie
// that cause those errors, but it would be nice to have a single config for both development and testing.
// For some reason placing this config in the main vite.config.ts file and running tests with
// `vitest --config vite.config.ts` doesn't work, so we need to have a separate config file for testing.

export default defineConfig({
	plugins: [
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
	],
	test: {
		setupFiles: ["./test-setup.tsx"],
		environment: "happy-dom",
		server: {
			// let Vite pre-bundle CJS deps so that it doesn't blow up with "module is not defined" errors
			deps: {
				inline: [/tiny-warning/],
			},
		},
	},
});
