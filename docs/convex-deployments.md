# Convex Deployment Commands

## Push code (functions + schema) to another deployment

Deploy your local Convex functions and schema to a specific deployment without touching its data:

```sh
bunx convex push --url https://<deployment-name>.convex.cloud
```

## Export data from a deployment

```sh
bunx convex export --path backup.zip
```

To export from a specific deployment:

```sh
bunx convex export --path backup.zip --url https://<deployment-name>.convex.cloud
```

## Import data into a deployment

```sh
bunx convex import --path backup.zip
```

To import into a specific deployment:

```sh
bunx convex import --path backup.zip --url https://<deployment-name>.convex.cloud
```

## Deploy to production

```sh
bunx convex deploy
```

This pushes code and runs schema migrations against your production deployment.

## Share a dev deployment between environments

Copy the `CONVEX_DEPLOYMENT` value from `.env.local` to the other environment's `.env.local`. Both will then point to the same dev deployment (shared data and schema).

## Notes

- `convex push` moves **code only** (functions + schema), not data.
- Export/import is the only way to move **data** between deployments.
- There is no native sync/replicate between two dev deployments.
