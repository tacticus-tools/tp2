// biome-ignore lint/correctness/noNodejsModules: server-side config file, false positive
import { fileURLToPath, URL } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { main as prepareCampaignBattleData } from "./src/5-assets/campaign-battles/generate-data.ts";
import { main as prepareCharacterRankUpMaterialData } from "./src/5-assets/character-rank-up-materials/generate-data.ts";
import { main as prepareCharacterData } from "./src/5-assets/characters/generate-data.ts";
import { main as prepareDropRateData } from "./src/5-assets/drop-rates/generate-data.ts";
import { main as prepareEquipmentData } from "./src/5-assets/equipment/generate-data.ts";
import { main as prepareMaterialData } from "./src/5-assets/materials/generate-data.ts";
import { main as prepareMowData } from "./src/5-assets/mows/generate-data.ts";
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
		// Order is important here. Some of the data generation scripts depend on the output of others.
		// e.g. CharacterRankUpMaterials depends on both Character and Material data.
		{ name: "prepareNpcData", buildStart: prepareNpcData }, // References: <None>
		{ name: "prepareCharacterData", buildStart: prepareCharacterData }, // References: <None>
		{ name: "prepareMaterialData", buildStart: prepareMaterialData }, // References: <None>
		{ name: "prepareOnslaughtData", buildStart: prepareOnslaughtData }, // References: NPCs[ids]
		{ name: "prepareEquipmentData", buildStart: prepareEquipmentData }, // References: Characters[Factions]
		{ name: "prepareMowData", buildStart: prepareMowData }, // References: Characters[Factions]
		{
			name: "prepareCharacterRankUpMaterialData",
			buildStart: prepareCharacterRankUpMaterialData, // References: Characters[ids], Materials[ids]
		},
		{
			name: "prepareCampaignBattleData",
			buildStart: prepareCampaignBattleData, // REferences: Characters[ids], Materials[ids], NPCs[ids]
		},
		{ name: "prepareDropRateData", buildStart: prepareDropRateData }, // References: Campaigns[types]
	],
});

export default config;
