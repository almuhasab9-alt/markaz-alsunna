# Deployment Diagnosis Report v2
Date: Tue Aug 25 06:41:49 UTC 2026

## HTTP Status Check
HTTP status: 000

## DNS Resolution

## Cloudflare Pages Projects

 ⛅️ wrangler 4.118.0
────────────────────


## Pages Deployments for markaz-alsunna

 ⛅️ wrangler 4.118.0 (update available 4.125.0)
───────────────────────────────────────────────

[31m✘ [41;31m[[41;97mERROR[41;31m][0m [1mA request to the Cloudflare API (/accounts/23f393728445f65d19a245d16cb4d4dd/pages/projects/markaz-alsunna/deployments) failed.[0m

  Project not found. The specified project name does not match any of your existing projects. [code: 8000007]
  
  If you think this is a bug, please open an issue at: [4mhttps://github.com/cloudflare/workers-sdk/issues/new/choose[0m


🪵  Logs were written to "/home/runner/.config/.wrangler/logs/wrangler-2026-08-25_06-41-52_729.log"

## D1 Databases

 ⛅️ wrangler 4.118.0 (update available 4.125.0)
───────────────────────────────────────────────
┌──────────────────────────────────────┬───────────────────┬──────────────────────────┬────────────┬────────────┬───────────┬──────────────┐
│ uuid                                 │ name              │ created_at               │ version    │ num_tables │ file_size │ jurisdiction │
├──────────────────────────────────────┼───────────────────┼──────────────────────────┼────────────┼────────────┼───────────┼──────────────┤
│ 875ba0cb-7f3f-4b5c-aa90-4960fa8bd154 │ webapp-production │ 2026-08-25T06:22:09.015Z │ production │ 0          │ 114688    │              │
└──────────────────────────────────────┴───────────────────┴──────────────────────────┴────────────┴────────────┴───────────┴──────────────┘

## D1 Tables

 ⛅️ wrangler 4.118.0 (update available 4.125.0)
───────────────────────────────────────────────
Resource location: remote 

🌀 Executing on remote database webapp-production (875ba0cb-7f3f-4b5c-aa90-4960fa8bd154):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 1 command in 0.24ms
[
  {
    "results": [
      {
        "name": "_cf_KV"
      },
      {
        "name": "d1_migrations"
      },
      {
        "name": "sqlite_sequence"
      },
      {
        "name": "users"
      },
      {
        "name": "teachers"
      },
      {
        "name": "circles"
      },
      {
        "name": "students"
      },
      {
        "name": "sessions"
      },
      {
        "name": "attendance"
      },
      {
        "name": "memorization"
      },
      {
        "name": "achievements"
      },
      {
        "name": "settings"
      }
    ],
    "success": true,
    "meta": {
      "served_by": "v3-prod",
      "served_by_region": "WNAM",
      "served_by_colo": "LAX",
      "served_by_primary": true,
      "timings": {
        "sql_duration_ms": 0.2405
      },
      "duration": 0.2405,
      "changes": 0,
      "last_row_id": 0,
      "changed_db": false,
      "size_after": 114688,
      "rows_read": 24,
      "rows_written": 0,
      "total_attempts": 1
    }
  }
]

## Attempt dry-run deploy

[31m✘ [41;31m[[41;97mERROR[41;31m][0m [1mUnknown arguments: dry-run, dryRun[0m


wrangler pages deploy [directory]

Deploy a directory of static assets as a Pages deployment

POSITIONALS
  directory  The directory of static files to upload  [string]

GLOBAL FLAGS
      --cwd             Run as if Wrangler was started in the specified directory instead of the current working directory  [string]
      --env-file        Path to an .env file to load - can be specified multiple times - values from earlier files are overridden by values in later files  [array]
  -h, --help            Show help  [boolean]
      --install-skills  Install Cloudflare skills for detected AI coding agents before running the command  [boolean] [default: false]
      --profile         Use a specific auth profile  [string]
  -v, --version         Show version number  [boolean]

OPTIONS
      --project-name        The name of the project you want to deploy to  [string]
      --branch              The name of the branch you want to deploy to  [string]
      --commit-hash         The SHA to attach to this deployment  [string]
      --commit-message      The commit message to attach to this deployment  [string]
      --commit-dirty        Whether or not the workspace should be considered dirty for this deployment  [boolean]
      --skip-caching        Skip asset caching which speeds up builds  [boolean]
      --no-bundle           Whether to run bundling on `_worker.js` before deploying  [boolean]
      --upload-source-maps  Whether to upload any server-side sourcemaps with this deployment  [boolean] [default: false]
🪵  Logs were written to "/home/runner/.config/.wrangler/logs/wrangler-2026-08-25_06-41-57_683.log"

## Attempt real deploy with verbose

[31m✘ [41;31m[[41;97mERROR[41;31m][0m [1mUnknown argument: verbose[0m


wrangler pages deploy [directory]

Deploy a directory of static assets as a Pages deployment

POSITIONALS
  directory  The directory of static files to upload  [string]

GLOBAL FLAGS
      --cwd             Run as if Wrangler was started in the specified directory instead of the current working directory  [string]
      --env-file        Path to an .env file to load - can be specified multiple times - values from earlier files are overridden by values in later files  [array]
  -h, --help            Show help  [boolean]
      --install-skills  Install Cloudflare skills for detected AI coding agents before running the command  [boolean] [default: false]
      --profile         Use a specific auth profile  [string]
  -v, --version         Show version number  [boolean]

OPTIONS
      --project-name        The name of the project you want to deploy to  [string]
      --branch              The name of the branch you want to deploy to  [string]
      --commit-hash         The SHA to attach to this deployment  [string]
      --commit-message      The commit message to attach to this deployment  [string]
      --commit-dirty        Whether or not the workspace should be considered dirty for this deployment  [boolean]
      --skip-caching        Skip asset caching which speeds up builds  [boolean]
      --no-bundle           Whether to run bundling on `_worker.js` before deploying  [boolean]
      --upload-source-maps  Whether to upload any server-side sourcemaps with this deployment  [boolean] [default: false]
🪵  Logs were written to "/home/runner/.config/.wrangler/logs/wrangler-2026-08-25_06-41-59_135.log"

