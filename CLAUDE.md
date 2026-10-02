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

Developer-specific checkout paths belong in the gitignored `foundryconfig.json`. Use `repos.system`, `repos.dlc`,
and the other configured paths instead of assuming repositories are adjacent.

## Engineering workflow

Use this lifecycle for substantive changes. Routine, obvious edits do not need planning ceremony, but they still
need appropriate verification and a final diff review.

1. **Establish the contract**: Treat an issue as the desired outcome and acceptance criteria, not an infallible
   implementation specification. Confirm the exact content or behavior being changed and how it will be observed.
2. **Investigate before editing**: Find the source entry, Core schema and behavior, analogous content, generated
   outputs, tests, and build configuration that own the result.
3. **Challenge the approach**: Ask what facts could make the proposed solution wrong. Check Core and Foundry
   compatibility, persisted-data or migration concerns, installed-item references, translations, and pack
   round-trips. Follow repository evidence over an issue's suggested implementation and explain material deviations.
4. **Plan when needed**: For nontrivial work, record the approach, affected packs or components, assumptions,
   compatibility concerns, and verification strategy before editing.
5. **Integrate, do not patch around**: Follow existing Core and DLC data patterns. Avoid one-off fields, duplicate
   mechanisms, brittle generated-file edits, and fixes limited to a single demonstrated entry when the underlying
   rule is broader.
6. **Verify mechanically**: Run the relevant lint, formatting, build, schema, pack-reference, import/export, and
   targeted behavior checks. Add regression coverage where practical, and never claim a check that was not run.
7. **Review and repair**: Review the final diff as if it were someone else's merge request. Look for incomplete
   issue coverage, invalid references, schema drift, round-trip changes, generated artifacts, accidental scope,
   stale documentation, and happy-path-only checks. Fix real problems and rerun affected checks.
8. **Report evidence**: State what changed, why it fits Core's architecture and data model, what was verified, and
   what remains uncertain. Distinguish facts established by code, tests, or authoritative documentation from
   inference.

Fix related problems only when they are necessary for the requested result to be correct. Track important unrelated
findings separately rather than silently expanding the change.

## Validation

Install dependencies with `npm ci`. Run `npm run lint` for repository-owned JavaScript and `npx gulp build` for a
full DLC build. For pack changes, also run the relevant schema and reference checks and, when persisted data can be
normalized by Foundry, a live import/export round-trip against the compatible Core system.
