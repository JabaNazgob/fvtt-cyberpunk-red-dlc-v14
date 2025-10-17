import gulp from "gulp";
import * as BuildTools from "./gulp/build.mjs";
import { PackUtils } from "./gulp/utils/PackUtils.mjs";
import Config from "./gulp/config.mjs";

const config = new Config({
  manifestFile: "src/module.json",
  assetDirs: ["babele", "icons"],
});

gulp.task("generateEnvFile", BuildTools.generateEnvFile(config));
gulp.task("cleanBuildDir", BuildTools.cleanBuildDir(config));
gulp.task("buildManifest", BuildTools.buildManifest(config));
gulp.task("copyStaticAssets", BuildTools.copyStaticAssets(config));
gulp.task("extractPacks", PackUtils.extractPacks(config));
gulp.task("compilePacks", PackUtils.compilePacks(config));

export const build = gulp.series(
  "generateEnvFile",
  "cleanBuildDir",
  "buildManifest",
  "copyStaticAssets",
  "compilePacks",
);
