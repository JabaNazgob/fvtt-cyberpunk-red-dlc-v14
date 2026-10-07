# Cyberpunk RED DLC

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
- `gulpfile.mjs` configures the build tasks for this module.
- Core owns document schemas and runtime behavior; DLC supplies content in that system's supported data format.

## Validation

Install dependencies with `npm ci`; `npx gulp build` builds the module. `.gitlab-ci.yml` configures formatting,
Core pack-schema validation, and the vendored-subtree check. Consult its `system_ref` setting for any override of
the manifest-declared Core schema version.
