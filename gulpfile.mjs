import gulp from "gulp";
import * as BuildTools from "./gulp/build.mjs";

export const build = gulp.series(
  BuildTools.cleanBuildDir,
  BuildTools.buildManifest,
  BuildTools.copyStaticAssets,
);
