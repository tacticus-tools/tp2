import { fileURLToPath, URL } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { main as prepareCharacterData } from "./src/5-assets/characters/generate-data";
import { main as prepareNpcData } from "./src/5-assets/npcs/generate-data";
import { main as prepareOnslaughtData } from "./src/5-assets/onslaught/generate-data";

const config = defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"~": fileURLToPath(new URL("./convex", import.meta.url)),
		},
	},
	ssr: {
		// @convex-dev/auth/react has a "use client" directive that the
		// Cloudflare Workers SSR environment misinterprets as an RSC boundary,
		// producing a client-reference stub that never resolves and hangs the Worker.
		// Bundling it inline skips that boundary processing.
		noExternal: ["@convex-dev/auth"],
	},
	plugins: [
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart({
			prerender: { enabled: true },
			spa: { enabled: true },
			router: { routesDirectory: "0-routes" },
		}),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		{ name: "generate-character-data", buildStart: prepareCharacterData },
		{ name: "generate-onslaught-data", buildStart: prepareOnslaughtData },
		{ name: "generate-npc-data", buildStart: prepareNpcData },
	],
});

export default config;
