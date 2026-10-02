# Cyberpunk RED DLC Agent Instructions

This repository contains official DLC and expansion content for the
[`cyberpunk-red-core`](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core) Foundry VTT system.

## Rules

- **Markdown**: after creating or editing Markdown, run `npx prettier --write <file>` and
  `npx markdownlint --fix <file>`, then fix anything left.
- **Build system**: `gulp/` is vendored from
  [`cprc-build`](https://gitlab.com/cyberpunk-red-team/cprc-build) with `git subtree`. Never edit it here; make
  build-system changes in that repository and consume the synced subtree.
- **GitLab**: use the GitLab MCP or `glab` CLI for GitLab operations. Read the current templates from
  [`cyberpunk-red-team/templates`](https://gitlab.com/cyberpunk-red-team/templates) before creating an issue or
  merge request.

## Repository map

- `src/packs/` contains the per-entry YAML source for compendia. Edit YAML rather than compiled LevelDB packs.
- `src/module.json` declares module metadata, packs, and the compatible Core system version.
- `src/babele/en/` is generated from pack extraction. Other locales are human translations and should not be
  mechanically overwritten.
- `gulpfile.mjs` configures the vendored build system for DLC. `gulp/` itself belongs to `cprc-build`.
- Core owns document schemas and runtime behavior. Inspect the matching Core data model, migration, and pack schema
  before changing persisted DLC data; do not guess the shape from a nearby YAML entry alone.

## Project change checklist

Before marking a change ready for review:

- Edit compendium source in `src/packs/`; do not edit compiled LevelDB packs. Treat generated Babele content as
  generated output and do not mechanically overwrite human translations.
- Confirm persisted fields against the compatible Core DataModel, schema, migration state, and existing analogous
  entries. Do not add DLC-only data shapes that Core does not support.
- Preserve document IDs, installed-item references, folder relationships, source citations, and other cross-entry
  links unless the change intentionally updates them. Run the applicable pack-reference checks.
- Run `npm ci`, `npm run lint`, and `npx gulp build`. Run the repository's formatting and Markdown checks for files
  they cover, plus applicable Core schema validation for pack changes. Do not report checks that were not run.
- When Foundry normalization can affect persisted data, perform an import/export or pack-refresh round-trip against
  the compatible Core system and review every generated change before committing it.
- Inspect the final diff for unrelated content normalization, invalid HTML, schema drift, stale generated files, and
  changes outside the intended entries.
- Use the current merge-request template and list the exact build, schema, reference, and round-trip checks
  performed, along with anything left unverified.

## Validation

Install dependencies with `npm ci`. Run `npm run lint` for repository-owned JavaScript and `npx gulp build` for a
full DLC build. For pack changes, also run the relevant schema and reference checks and, when persisted data can be
normalized by Foundry, a live import/export round-trip against the compatible Core system.
