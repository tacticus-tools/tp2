# Data Transformation Pipeline

## Overview
Raw JSON data is datamined into read-only source files, then transformed via `generate-data.ts` into validated, normalized generated files consumed by the app.

## Architecture Pattern

### Folder Structure
Each asset type follows a consistent directory layout:
```
src/5-assets/[asset-type]/
├── data.raw.json              # Datamined source (may include backup files)
├── data.generated.json        # Validated & normalized output (or .ts if small dataset)
├── generate-data.ts           # Build-time transformation script (Zod validation + normalization)
├── index.ts                   # Public API: exports generated data + asset URLs
└── [optional secondary files] # e.g., rank-up-data.raw.json, configs.raw.json, ids.generated.ts
```

**Key file purposes:**
- `*.raw.json` — Read-only source, checked into version control
- `*.generated.*` — Written by `generate-data.ts`, never edited manually, typically .gitignored
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
- **Large datasets** → `data.generated.json` + `ids.generated.ts` (IDs exported as `const` for type inference)
- **Type safety required** → `data.generated.ts` with `export const DATA = [...] as const`, and export `z.infer<typeof Schema>` types for greater type safety than raw JSON imports
- **Multiple files** → e.g., campaigns has both `data.generated.json` (battle nodes) and `configs.generated.json` (campaign metadata)

### Examples by Asset Type

| Asset | Raw File | Generated | Schema Features |
|-------|----------|-----------|-----------------|
| **Materials** | `data.raw.json` + `rank-up-data.raw.json` | `.json` (x2) | Icon filesystem check, recipe cross-validation, rank-up material references |
| **Characters** | `data.raw.json` | `.ts` | Icon filesystem check, unique field validation (id, name, icons), ranged field consistency |
| **Equipment** | `data.raw.json` | `.json` + `ids.generated.ts` | Discriminated union by type, unique `name` field, performance optimization (JSON + ID array) |
| **Campaigns** | `data.raw.json` + `configs.raw.json` | `.json` (x2) | Two separate transforms, cross-validation between battle nodes & configs, reward structure normalization |

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
