# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Serverless backend (AWS SAM) for a personal website (frontend lives in a separate repo, `TiDeane/Personal-website-frontend`). It counts site visitors per country. Node.js 22, ES modules (`.mjs`), region `eu-west-1`.

## Commands

- `npm ci` / `npm install` — install deps
- `npm test` — run Jest (needs `--experimental-vm-modules` for ESM; the npm script already sets it)
- Single test file: `npm test -- __tests__/unit/handlers/inc-visitor-country.test.mjs`
- Single test by name: `npm test -- -t "increments the count"`
- `sam build` — build; `sam deploy` — deploy using `samconfig.toml` (use `--guided` the first time)
- `sam local invoke getTopCountriesFunction --event events/event-get-top-countries.json`
- `sam local invoke incVisitorCountryFunction --event events/event-inc-visitor-country-valid.json`
- `sam local start-api` — emulate the API on port 3000 (needs Docker)

There is no lint step. `env.json` supplies the table name for local invocation (`--env-vars env.json`).

## Architecture

Defined entirely in `template.yaml`: one HTTP API (`VisitorCountryApi`, CORS limited to `https://tiagodeane.com`, GET/POST) fronting two Lambdas that share one DynamoDB table (`CloudResumeVisitorCountry`, key `countryCode`, items `{countryCode, countryName, count}`).

- `GET /top` → `src/handlers/get-top-countries.mjs` (`getTopCountriesHandler`): scans the table (following pagination; result cached in module memory for 30 s, `clearCache()` resets it in tests), drops items whose `countryName` is `'Unknown'`, sorts by `count`, returns the top 3.
- `POST /track` → `src/handlers/inc-visitor-country.mjs` (`incCountryHandler`): reads the country from the CloudFront headers `cloudfront-viewer-country` / `cloudfront-viewer-country-name` (lowercase only, as HTTP API delivers them), and does an atomic `UpdateCommand` increment. Missing or non-two-letter country code → 400 and no write; unknown country name → increments without overwriting `countryName`.

Both handlers return 405 if the HTTP method is wrong, and otherwise return `{statusCode, headers, body: JSON.stringify(...)}`. The DynamoDB client and table name (from the `VISITOR_COUNTRY_TABLE` env var, wired in the template) live in `src/dynamodb.mjs`, shared by both handlers.

Tests (`__tests__/unit/handlers/`) mock `DynamoDBDocumentClient` with `aws-sdk-client-mock`; the `events/` JSON files are sample API Gateway events for local invocation.

## CI/CD

`.github/workflows/deploy-backend.yml` runs on every push to `main`: `npm ci` → `npm test` → `sam build` → `sam deploy --no-confirm-changeset`. Pushing to `main` therefore deploys to production. `buildspec.yml` is a leftover CodeBuild config, not used by the GitHub workflow.

`config.sh` (untracked) holds local AWS credentials/IDs — never commit it.
