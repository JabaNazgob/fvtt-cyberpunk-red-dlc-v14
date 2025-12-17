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
