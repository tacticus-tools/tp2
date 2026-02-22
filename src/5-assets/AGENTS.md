# Data Transformation Pipeline

## Overview
Raw JSON data is datamined into read-only source files, then transformed via `generate-data.ts` into validated, normalized generated files consumed by the app.

## Architecture Pattern

### Folder Structure
Each asset type follows a consistent directory layout:
```
src/5-assets/[asset-type]/
├── data.raw.json                      # Single datamined source
├── *.generated.json or *.generated.ts # Validated & normalized output(s)
├── generate-data.ts                   # Build-time transformation script (Zod validation + normalization)
├── index.ts                           # Public API: exports generated data + asset URLs
```

**Key design principle:** Each folder has exactly one `.raw.json` input. Output file names vary to reflect what data is extracted (e.g., `ids.generated.ts` for ID constants, `types.generated.ts` for enums, `data.generated.json` for the main dataset).

**Key file purposes:**
- `*.raw.json` — Read-only source, checked into version control
- `*.generated.*` — Written by `generate-data.ts`, never edited manually
- `generate-data.ts` — Zod schemas + transformation logic; runs as Vite plugin during build
- `index.ts` — Single entry point for importing data into the app; resolves asset URLs using `import.meta.glob`

### Pipeline Stages
1. **Raw Data** (`*.raw.json`) — Unstructured datamined JSON with denormalized fields
2. **Validation** — Zod schemas catch structure & data integrity issues early
3. **Normalization** — Transform raw field names/types into app-friendly structure
4. **Optimization** — Remove unused data, pre-compute values, reduce size
5. **Generated Output** — Type-safe `.json` or `.ts` files ready for consumption

### Common Patterns

#### Input: `data.raw.json`
- May have verbose field names (e.g., `"Full Name"`, `"Melee Damage"`)
- May use loose types (strings instead of enums, empty strings instead of null)
- May include redundant/unused fields

#### Validation with Zod
- Use **strict schemas** (`z.strictObject()`) to reject unknown fields — catches breaking changes from dataminers
- **File system checks** — if assets reference image files, verify they exist on disk
- **Cross-validation** — relationships (e.g., recipe ingredients must reference existing materials) enforced after initial parse
- **Conditional logic** — use `.superRefine()` for complex rules (e.g., "if craftable, must have recipe")

#### Cross-Dataset Validation
When one pipeline depends on data from another, validate references at build time:

**Setup:** Import the generated ID constants from dependent pipelines. Since `generate-data.ts` runs during Vite's `buildStart` phase (before the app boots), import directly from the generated files, not from `index.ts`:

```ts
// Note: we bypass the `index.ts` here to avoid side effects that might require the Vite environment to be fully started up
import { DATA as CHARACTER_IDS } from "../characters/ids.generated.ts";
import { DATA as MATERIAL_IDS } from "../materials/ids.generated.ts";

const RankUpSchema = z.record(
  z.enum(CHARACTER_IDS),  // Ensures all character keys exist
  z.record(z.string(), z.array(z.enum(MATERIAL_IDS)).length(6))  // Ensures all materials exist
);
```

**Execution order matters:** In `vite.config.ts`, register dependent pipelines **after** their dependencies. Add inline comments to clarify the dependency graph:

```ts
// vite.config.ts
plugins: [
  { name: "prepareMaterialData", buildStart: prepareMaterialData },              // References: <None>
  { name: "prepareCharacterData", buildStart: prepareCharacterData },            // References: <None>
  {
    name: "prepareCharacterRankUpMaterialData",
    buildStart: prepareCharacterRankUpMaterialData,  // References: Characters[ids], Materials[ids]
  },
  {
    name: "prepareCampaignBattleData",
    buildStart: prepareCampaignBattleData,  // References: Characters[ids], Materials[ids], NPCs[ids]
  },
  { name: "prepareDropRateData", buildStart: prepareDropRateData },             // References: Campaigns[types]
]
```

**Error messages:** Zod will halt the build if a reference is invalid, providing clear context about which ID was not found. For example, if rank-up data references a non-existent character ID, the error message will identify the exact problem and prevent bad data from being deployed.

**Why this matters:** Build-time validation catches data mismatches immediately rather than causing runtime errors or silently ignoring bad references.

#### Normalization via `.transform()`
- `camelCase` field names for JS consistency (e.g., `"Full Name"` → `fullName`)
- `null` instead of `undefined` or empty strings for optionals (easier to work with)
- Flatten nested data structures for easier access (e.g. `rewards: { guaranteed: [...], oneTime: [...] }` → `guaranteedRewards: [...], oneTimeRewards: [...]`)
- Derive IDs from fields (e.g., `snowprintId` → `id`)

#### Discriminated Unions
When multiple types exist with different stats (e.g., 5 equipment types with different fields):
- Define base schema with shared fields
- Define type-specific stat schemas
- Use `z.discriminatedUnion()` to link them by a `type` field
- Provides full IDE autocomplete: `item.type === "I_Block"` narrows stats to only valid fields

#### Output Formats
Output file naming reflects the nature and size of the extracted data:
- **Main dataset** → `data.generated.json` (large datasets where exact types are not critical)
- **Main dataset (type-safe)** → `data.generated.ts` with `export const DATA = [...] as const`, and export `z.infer<typeof Schema>` types (small datasets or where runtime type safety is critical)
- **Derived values** → `ids.generated.ts`, `types.generated.ts`, etc. (IDs as constants for type inference, enum lists, lookup tables)

Multiple output files can coexist when extracting different aspects of the input (e.g., `campaign-battles/` outputs `data.generated.json` for nodes plus `types.generated.ts` for campaign type enums extracted from the data).



### Key Principles
- **Fail loudly at build time** — validation errors are caught before deployment
- **Type safety & DX** — extract types from generated files so app code is self-documenting
- **Performance** — use `.ts` with `as const` for small datasets, `.json` for large ones
- **Maintainability** — normalized structure + comments make diffs clear when data changes

## Vite Integration

### Plugin Registration
Each `generate-data.ts` exports a `main()` function that runs at build time. Register it in `vite.config.ts`:

```ts
import { main as prepareCharacterData } from "./src/5-assets/characters/generate-data.ts";

export default defineConfig({
  plugins: [
    // ... other plugins ...
    { name: "prepareCharacterData", buildStart: prepareCharacterData },
  ],
});
```

### Execution Order
- Plugins execute in list order during `buildStart` phase (before module resolution)
- Place data generation plugins **before** any framework plugins (Vite React, TanStack Start, etc.)
- This ensures generated files exist when app code imports them

### Error Handling
- Zod validation errors throw during `buildStart`, halting the build with a clear error message
- File system errors (missing icons) also throw immediately
- No generated files are written if validation fails — app can't accidentally import stale/invalid data

### Pattern Summary
1. Import `main` functions from all asset-specific `generate-data.ts` files
2. Wrap each in a plugin object with `buildStart` hook
3. Errors halt the build and display validation failure reasons
4. Generated files are ready for import once build completes
