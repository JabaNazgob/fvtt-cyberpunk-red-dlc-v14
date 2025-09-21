import path from "node:path";
import fs from "fs-extra";
import log from "./utils/logger.mjs";
import { FileUtils } from "./utils/FileUtils.mjs";
import { Config } from "./config.mjs";

/**
 * Cleans the build directory by removing all contents while preserving the
 * directory itself. Part of the Gulp build process.
 *
 * @param {Function} done - Gulp callback to signal task completion
 */
export function cleanBuildDir(done) {
  log.debug("Cleaning build directory...");
  const buildDir = Config.buildDir();
  try {
    fs.emptyDirSync(buildDir);
    log.debug("Cleaned build directory.");
    done();
  } catch (err) {
    log.error(`Error cleaning build directory: ${err}`);
    done(err);
  }
}

/**
 * Copies static assets from source to build directory. Processes each asset
 * synchronously and maintains directory structure.
 *
 * @param {Function} done - Gulp callback to signal task completion
 */
export function copyStaticAssets(done) {
  log.debug("Copying static assets...");
  const srcdir = Config.srcDir();
  const destdir = Config.buildDir();
  const staticassets = Config.staticAssets();

  try {
    staticassets.forEach((asset) => {
      log.debug(`copying '${asset}' to '${destdir}'`);
      const srcpath = path.resolve(path.join(srcdir, asset));
      const destpath = path.resolve(path.join(destdir, asset));
      fs.copySync(srcpath, destpath);
    });
    log.debug("Static assets copied successfully.");
    done();
  } catch (err) {
    log.error(`Error copying static assets: ${err}`);
    done(err);
  }
}

/**
 * Builds the module manifest by generating dynamic data and writing it to the
 * build directory.
 *
 * @param {Function} done - Gulp callback to signal task completion
 */
export function buildManifest(done) {
  log.debug("build.mjs: buildManifest");
  const manifestData = Config.generateManifestData();
  const buildDir = Config.buildDir();
  const manifestFile = path.join(buildDir, Config.moduleManifestFile());
  FileUtils.writeJSONFile(manifestFile, manifestData);
  done();
}
