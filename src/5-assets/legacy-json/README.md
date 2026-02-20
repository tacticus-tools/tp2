# Legacy JSON

This directory contains JSON files that were copied directly over from the v1 of the project.

The following command was used.

```bash
mkdir -p ~/tp2/src/5-assets/legacy-json/
rsync -av --prune-empty-dirs --include='*/' --include='*.json' --exclude='*' src/ ~/tp2/src/5-assets/legacy-json/
```

The intent is to have these files available for later integration into the new project via a `Vite` plugin (see parent directory README.md).
As we complete pipelines for each JSON file, we will remove it from here.

This allows us to keep track of which files still need to be integrated.
