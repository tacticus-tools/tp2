// biome-ignore-all lint/correctness/noNodejsModules: CLI script runs in Bun, not browser
// biome-ignore-all lint/performance/noAwaitInLoops: sequential I/O is intentional for clear reporting
// biome-ignore-all lint/correctness/noUndeclaredVariables: Bun global is available at runtime

/**
 * Image normalization script.
 *
 * Scans all image asset folders and ensures every PNG matches the expected
 * dimensions for its category. Images that don't match are resized to fit
 * within the target canvas (preserving aspect ratio) and centered on a
 * transparent background.
 *
 * Usage:
 *   bun run normalize-images          # dry-run — reports mismatches
 *   bun run normalize-images --fix    # resize mismatched images in-place
 */

import path from "node:path";
import { Glob } from "bun";
import sharp from "sharp";

const ASSETS_ROOT = path.resolve(import.meta.dir, "../src/5-assets");

/** Target dimensions for each image folder. */
const RULES: Array<{
	label: string;
	glob: string;
	width: number;
	height: number;
}> = [
	{
		label: "Rank icons",
		glob: "images/tacticus/ranks/*.png",
		width: 64,
		height: 64,
	},
	{
		label: "Alliance badges",
		glob: "images/tacticus/badges/*.png",
		width: 55,
		height: 55,
	},
	{
		label: "Rarity icons",
		glob: "images/tacticus/rarity/*.png",
		width: 44,
		height: 50,
	},
	{
		label: "Rarity frames",
		glob: "images/tacticus/rarity_frames/*.png",
		width: 202,
		height: 267,
	},
	{
		label: "Misc icons (XP books, energy)",
		glob: "images/tacticus/icons/*.png",
		width: 64,
		height: 64,
	},
	{
		label: "Faction icons",
		glob: "snowprint_assets/factions/*.png",
		width: 64,
		height: 64,
	},
];

/**
 * Campaigns have multiple size tiers (classic 55x55, newer 96x96, extremis 120x96).
 * We check whether an image matches any allowed tier and normalize to the nearest one.
 */
const CAMPAIGN_TIERS = [
	{ width: 55, height: 55 },
	{ width: 96, height: 96 },
	{ width: 120, height: 96 },
] as const;

const fix = Bun.argv.includes("--fix");

let totalChecked = 0;
let totalMismatched = 0;
let totalFixed = 0;

async function resizeImage(
	filePath: string,
	targetW: number,
	targetH: number,
): Promise<void> {
	const resized = await sharp(filePath)
		.resize(targetW, targetH, {
			fit: "contain",
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		})
		.png()
		.toBuffer();
	await Bun.write(filePath, resized);
}

async function collectFiles(globStr: string): Promise<string[]> {
	const g = new Glob(globStr);
	const files: string[] = [];
	for await (const match of g.scan({ cwd: ASSETS_ROOT })) {
		files.push(path.join(ASSETS_ROOT, match));
	}
	return files.sort();
}

async function getImageSizes(
	files: string[],
): Promise<Array<{ file: string; w: number; h: number }>> {
	const results = await Promise.all(
		files.map(async (file) => {
			const meta = await sharp(file).metadata();
			return { file, w: meta.width ?? 0, h: meta.height ?? 0 };
		}),
	);
	return results;
}

async function fixImages(
	images: Array<{
		file: string;
		w: number;
		h: number;
		targetW: number;
		targetH: number;
	}>,
): Promise<number> {
	let fixed = 0;
	for (const m of images) {
		const rel = path.relative(ASSETS_ROOT, m.file);
		if (fix) {
			await resizeImage(m.file, m.targetW, m.targetH);
			fixed++;
			console.log(
				`    FIXED  ${rel} (was ${m.w}x${m.h} → ${m.targetW}x${m.targetH})`,
			);
		} else {
			console.log(
				`    NEEDS FIX  ${rel} (${m.w}x${m.h} → should be ${m.targetW}x${m.targetH})`,
			);
		}
	}
	return fixed;
}

async function checkFolder(rule: {
	label: string;
	glob: string;
	width: number;
	height: number;
}): Promise<void> {
	const files = await collectFiles(rule.glob);

	if (files.length === 0) {
		console.log(`  ${rule.label}: no files found (${rule.glob})`);
		return;
	}

	const sizes = await getImageSizes(files);
	totalChecked += files.length;

	const mismatched = sizes
		.filter((s) => s.w !== rule.width || s.h !== rule.height)
		.map((s) => ({ ...s, targetW: rule.width, targetH: rule.height }));

	if (mismatched.length === 0) {
		console.log(
			`  ${rule.label}: ${files.length} files OK (${rule.width}x${rule.height})`,
		);
		return;
	}

	totalMismatched += mismatched.length;
	console.log(
		`  ${rule.label}: ${mismatched.length}/${files.length} need resizing → ${rule.width}x${rule.height}`,
	);
	totalFixed += await fixImages(mismatched);
}

async function checkCampaigns(): Promise<void> {
	const files = await collectFiles("images/tacticus/campaigns/*.png");

	if (files.length === 0) {
		console.log("  Campaigns: no files found");
		return;
	}

	const sizes = await getImageSizes(files);
	totalChecked += files.length;

	const mismatched = sizes
		.filter(
			(s) => !CAMPAIGN_TIERS.some((t) => s.w === t.width && s.h === t.height),
		)
		.map((s) => {
			const area = s.w * s.h;
			const nearest = CAMPAIGN_TIERS.reduce((best, tier) => {
				const tArea = tier.width * tier.height;
				const bArea = best.width * best.height;
				return Math.abs(area - tArea) < Math.abs(area - bArea) ? tier : best;
			});
			return { ...s, targetW: nearest.width, targetH: nearest.height };
		});

	if (mismatched.length === 0) {
		console.log(
			`  Campaigns: ${files.length} files OK (${CAMPAIGN_TIERS.map((t) => `${t.width}x${t.height}`).join(" or ")})`,
		);
		return;
	}

	totalMismatched += mismatched.length;
	console.log(
		`  Campaigns: ${mismatched.length}/${files.length} need resizing`,
	);
	totalFixed += await fixImages(mismatched);
}

console.log(fix ? "Normalizing images...\n" : "Checking image sizes...\n");

for (const rule of RULES) {
	await checkFolder(rule);
}
await checkCampaigns();

console.log(`\nChecked ${totalChecked} images. ${totalMismatched} mismatched.`);
if (fix) {
	console.log(`Fixed ${totalFixed} images.`);
} else if (totalMismatched > 0) {
	console.log("Run with --fix to resize them.");
}
