/**
 * @description Compares legacy JSON files with current *.raw.json files using SHA256 hashes.
 * @usage bun run ./src/5-assets/legacy-json/compare-with-active-pipelines.ts
 *
 * This script helps identify which legacy JSON files correspond to the current active pipelines
 * by computing SHA256 hashes of all JSON files and reporting matches.
 *
 * Scans:
 * - legacy-json/data/ - archived data files
 * - legacy-json/fsd/ - archived feature/entity files from old FSD structure
 * - src/5-assets/[asset-type]/data.raw.json - current active pipelines
 */

/** biome-ignore-all lint/correctness/noNodejsModules: dev script */
import crypto from "node:crypto";
import fs from "node:fs";
import { join } from "node:path";

// Path constants
const LEGACY_DIR = import.meta.dirname;
const LEGACY_DATA_DIR = join(LEGACY_DIR, "data");
const LEGACY_FSD_DIR = join(LEGACY_DIR, "fsd");
const ASSETS_ROOT = join(LEGACY_DIR, "..");

function hashFile(filePath: string): string {
	const content = fs.readFileSync(filePath, "utf-8");
	return crypto.createHash("sha256").update(content).digest("hex");
}

function findJsonFiles(dir: string, prefix: string = ""): Map<string, string> {
	const files = new Map<string, string>();

	if (!fs.existsSync(dir)) {
		return files;
	}

	function walk(currentPath: string, relativePath: string = "") {
		const entries = fs.readdirSync(currentPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(currentPath, entry.name);
			const relPath = relativePath
				? join(relativePath, entry.name)
				: entry.name;

			if (entry.isDirectory()) {
				walk(fullPath, relPath);
			} else if (entry.isFile() && entry.name.endsWith(".json")) {
				const key = prefix ? `${prefix}/${relPath}` : relPath;
				files.set(key, fullPath);
			}
		}
	}

	walk(dir);
	return files;
}

function findRawJsonFiles(): Map<string, string> {
	const files = new Map<string, string>();
	const entries = fs.readdirSync(ASSETS_ROOT, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const assetPath = join(ASSETS_ROOT, entry.name);
		const rawJsonPath = join(assetPath, "data.raw.json");

		if (fs.existsSync(rawJsonPath)) {
			files.set(`${entry.name}/data.raw.json`, rawJsonPath);
		}
	}

	return files;
}

export const main = () => {
	console.log(
		"🔍 Comparing legacy JSON files with active pipeline raw files...\n",
	);

	// Scan legacy files from both data/ and fsd/ folders
	const legacyDataFiles = findJsonFiles(LEGACY_DATA_DIR, "data");
	const legacyFsdFiles = findJsonFiles(LEGACY_FSD_DIR, "fsd");

	const allLegacyFiles = new Map([...legacyDataFiles, ...legacyFsdFiles]);
	const activeRawFiles = findRawJsonFiles();

	// Compute hashes
	const legacyHashes = new Map<string, Set<string>>();
	const activeHashes = new Map<string, string>();

	console.log(`📦 Found ${allLegacyFiles.size} legacy JSON files`);
	console.log(
		`   (${legacyDataFiles.size} in data/, ${legacyFsdFiles.size} in fsd/)`,
	);
	for (const [relPath, fullPath] of allLegacyFiles) {
		const hash = hashFile(fullPath);
		if (!legacyHashes.has(hash)) {
			legacyHashes.set(hash, new Set());
		}
		legacyHashes.get(hash)!.add(relPath);
	}

	console.log(`📦 Found ${activeRawFiles.size} active *.raw.json files\n`);
	for (const [relPath, fullPath] of activeRawFiles) {
		const hash = hashFile(fullPath);
		activeHashes.set(relPath, hash);
	}

	// Find matches
	let matchCount = 0;
	const matches: Array<{ legacy: string; active: string }> = [];

	for (const [activePath, hash] of activeHashes) {
		const legacyMatches = legacyHashes.get(hash);
		if (legacyMatches) {
			for (const legacyPath of legacyMatches) {
				matches.push({ legacy: legacyPath, active: activePath });
				matchCount++;
			}
		}
	}

	// Print results
	if (matchCount > 0) {
		console.log(`✅ Found ${matchCount} match(es):\n`);
		for (const { legacy, active } of matches) {
			console.log(`  legacy: src/5-assets/legacy-json/${legacy}`);
			console.log(`  active: src/5-assets/${active}\n`);
		}
	} else {
		console.log(
			"⚠️  No matches found. Legacy JSON files differ from current raw files.",
		);
		console.log(
			"   This is normal if data has been updated since the legacy files were created.\n",
		);
	}

	// Print unmatched files for reference
	const matchedLegacy = new Set<string>();
	for (const { legacy } of matches) {
		matchedLegacy.add(legacy);
	}

	const unmatchedLegacy = Array.from(allLegacyFiles.keys()).filter(
		(path) => !matchedLegacy.has(path),
	);

	if (unmatchedLegacy.length > 0) {
		console.log(
			`ℹ️  ${unmatchedLegacy.length} legacy file(s) don't match any active pipeline:\n`,
		);
		for (const path of unmatchedLegacy) {
			console.log(`  src/5-assets/legacy-json/${path}`);
		}
		console.log();
	}

	// Print active raw files that have no legacy equivalent
	const matchedActive = new Set(matches.map((m) => m.active));
	const unmatchedActive = Array.from(activeRawFiles.keys()).filter(
		(path) => !matchedActive.has(path),
	);

	if (unmatchedActive.length > 0) {
		console.log(
			`ℹ️  ${unmatchedActive.length} active raw file(s) don't match any legacy file:\n`,
		);
		for (const path of unmatchedActive) {
			console.log(`  src/5-assets/${path}`);
		}
		console.log();
	}
};

main();
