import gulp from "gulp";
import * as BuildTools from "./gulp/build.mjs";
import { PackUtils } from "./gulp/utils/PackUtils.mjs";

gulp.task("cleanBuildDir", BuildTools.cleanBuildDir);
gulp.task("buildManifest", BuildTools.buildManifest);
gulp.task("copyStaticAssets", BuildTools.copyStaticAssets);
gulp.task("extractPacks", PackUtils.extractPacks);
gulp.task("compilePacks", PackUtils.compilePacks);

export const build = gulp.series(
  "cleanBuildDir",
  "buildManifest",
  "copyStaticAssets",
  "compilePacks",
);
