// biome-ignore lint/correctness/noNodejsModules: server-side config file, false positive
import { fileURLToPath, URL } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { main as prepareCampaignData } from "./src/5-assets/campaigns/generate-data.ts";
import { main as prepareCharacterData } from "./src/5-assets/characters/generate-data.ts";
import { main as prepareEquipmentData } from "./src/5-assets/equipment/generate-data.ts";
import { main as prepareMaterialData } from "./src/5-assets/materials/generate-data.ts";
import { main as prepareNpcData } from "./src/5-assets/npcs/generate-data.ts";
import { main as prepareOnslaughtData } from "./src/5-assets/onslaught/generate-data.ts";

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
		{ name: "prepareCharacterData", buildStart: prepareCharacterData },
		{ name: "prepareOnslaughtData", buildStart: prepareOnslaughtData },
		{ name: "prepareNpcData", buildStart: prepareNpcData },
		{ name: "prepareEquipmentData", buildStart: prepareEquipmentData },
		{ name: "prepareMaterialData", buildStart: prepareMaterialData },
		{ name: "prepareCampaignData", buildStart: prepareCampaignData },
	],
});

export default config;
