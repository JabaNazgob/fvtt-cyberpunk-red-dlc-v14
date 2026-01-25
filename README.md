# Cyberpunk RED - Build System

This repo contains the build system used by the CPRC projects.

## Overview

This repo is designed to be used as a [Git Subtree](https://www.w3docs.com/learn-git/git-subtree.html) (importantly, not a git submodule!)

## Usage

### Add to a repo

`git subtree add --prefix gulp http://gitlab.com/cyberpunk-red-team/cprc-build`

This will add this repo in the `gulp/` directory of the repo.

### Adding your project's `gulpfile.mjs`

To use the build system you'll need to add a `gulpfile.mjs` to your project.
This should look something like:

```js
import gulp from "gulp";
import * as BuildTools from "./gulp/build.mjs";
import * as ImageTools from "./gulp/images.mjs";
import { PackUtils } from "./gulp/utils/PackUtils.mjs";
import Config from "./gulp/config.mjs";

const config = new Config({
  manifestFile: "src/module.json",
  assetDirs: ["babele"],
  assetFiles: ["dlc.js"],
});

gulp.task("generateEnvFile", BuildTools.generateEnvFile(config));
gulp.task("cleanBuildDir", BuildTools.cleanBuildDir(config));
gulp.task("buildManifest", BuildTools.buildManifest(config));
gulp.task("copyStaticAssets", BuildTools.copyStaticAssets(config));
gulp.task("extractPacks", PackUtils.extractPacks(config));
gulp.task("compilePacks", PackUtils.compilePacks(config));
gulp.task("processImages", ImageTools.processImages(config));

gulp.task("watchImages", ImageTools.watchImages(config));
gulp.task("watchStaticAssets", BuildTools.watchStaticAssets(config));

export const build = gulp.series(
  "generateEnvFile",
  "cleanBuildDir",
  "buildManifest",
  "processImages",
  "copyStaticAssets",
  "compilePacks",
);

export const watch = gulp.parallel("watchImages", "watchStaticAssets");
```
