# Assets Pipeline

This directory contains 2 classes of assets:
1. Static assets (images, logos, UI elements)
2. Datamined game data and the build-time transformations that validate, normalize, and optimize it for use in the app.

## Category 1) Static Assets

## `snowprint_assets/`

- Stores image files (PNGs) for characters and materials.
- Kept distinct from `images/` to separate datamined assets from ones we create ourselves.
- Datamined JSON often references these files, so we want to keep their original directory structure intact.

## `images/`
- General-purpose images (logos, UI assets) that we create.
- Vite tip: use `import` or `import.meta.glob` to reference these in code, which processes them through Vite's asset optimization pipelines.

## `legacy-json/`

- Archive of JSON copied over from v1 of the project.
- Contains old data structures and formats that we used to use before implementing the new Zod-based pipeline.
- Delete each file as we migrate that asset type to the new system, but keep them around for reference until then.

## Category 2) JSON Data + Build-Time Transformations

### Quick Start

Each asset type (characters, equipment, materials, etc.) follows a consistent pattern:

1. **Raw data** (`data.raw.json`) is checked into version control
2. **Build script** (`generate-data.ts`) validates and transforms the data using Zod
3. **Generated files** (`data.generated.json` or `data.generated.ts`) are created at build time
4. **Public API** (`index.ts`) exports the data and resolves asset URLs for use in the app

For detailed architectural patterns, see [`AGENTS.md`](./AGENTS.md).

### How It Works at Build Time

When you run `bun build` (or `bun dev`), the following happens:

1. Vite starts and loads the configuration
2. Each asset's `generate-data.ts` is invoked as a Vite build plugin
3. Raw JSON is read from disk
4. Zod validates the structure and transforms the data
5. Any validation errors **halt the build** with a clear error message
6. Generated files are written to disk
7. App code imports the generated files and assumes they're valid

### Benefits of this approach:
- **Early error detection**: Catches issues with datamined data immediately during development
- **Flexibility**: Changes to the raw data format can be compensated for in the transformation step without affecting app code
- **Type safety**: Ensures all data conforms to expected types, reducing runtime errors
- **Separation of concerns**: Keeps raw data, transformation logic, and public API clearly separated
- **Performance**: Build-time transformations mean the app only loads optimized, validated data at runtime

### Adding a New JSON Asset Type

1. Create a folder: `src/5-assets/your-asset/`
2. Add raw data: `data.raw.json`
3. Create transformation: `generate-data.ts`
   - Import Zod
   - Define schemas with validation rules
   - Export a `main()` function that reads raw, validates, and writes generated files
4. Register in `vite.config.ts`:
   ```ts
   import { main as prepareYourAssetData } from "./src/5-assets/your-asset/generate-data.ts";
   
   export default defineConfig({
     plugins: [
       { name: "prepareYourAssetData", buildStart: prepareYourAssetData },
     ],
   });
   ```
5. Run `bun build` to test the pipeline and ensure generated files are created without errors
6. Create public API: `index.ts`
   - Import generated data
   - Export types and data for app code
   - Use `import.meta.glob` to resolve asset URLs if needed since that's only available in the app context, not in the build script

## Checking Legacy JSON Files for Active Pipelines

The `legacy-json/` folder contains archived JSON files from the previous system. To identify which legacy files correspond to current active pipelines, use the comparison script:

```bash
bun run ./src/5-assets/legacy-json/compare-with-active-pipelines.ts
```

### What it does:
- Scans all JSON files in `legacy-json/data/` and `legacy-json/fsd/`
- Scans all `*.raw.json` files in active asset pipelines
- Computes SHA256 hashes to identify exact matches
- Reports which legacy files match current raw data
- Lists unmatched files on both sides

### Interpreting results:
- **Matches**: Legacy file is identical to an active raw file (safe to delete the legacy file if desired)
- **Unmatched legacy**: File is either outdated or represents data that hasn't been migrated yet (e.g., LRE character data, old i18n files)
- **Unmatched active**: Asset pipeline was created after legacy files were archived (no legacy equivalent exists)
