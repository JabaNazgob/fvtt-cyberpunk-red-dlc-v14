import path from "node:path";
import fs from "fs-extra";
import log from "./utils/logger.mjs";
import { FileUtils } from "./utils/FileUtils.mjs";

/**
 * Cleans the build directory by removing all contents while preserving the
 * directory itself. Part of the Gulp build process.
 *
 * @param {Function} done - Gulp callback to signal task completion
 */
export const cleanBuildDir = (config) => (done) => {
  log.debug("Cleaning build directory...");
  const buildDir = config.buildDirPath;
  try {
    fs.emptyDirSync(buildDir);
    log.debug("Cleaned build directory.");
    done();
  } catch (err) {
    log.error(`Error cleaning build directory: ${err}`);
    done(err);
  }
};

/**
 * Copies static assets from source to build directory. Processes each asset
 * synchronously and maintains directory structure.
 *
 * @param {Function} done - Gulp callback to signal task completion
 */
export const copyStaticAssets = (config) => (done) => {
  log.debug("Copying static assets...");
  const srcDir = config.srcDirPath;
  const destDir = config.buildDirPath;
  const staticAssets = config.syncPaths;

  try {
    staticAssets.forEach((asset) => {
      const srcPath = path.resolve(path.join(srcDir, asset));
      const destPath = path.resolve(path.join(destDir, asset));

      if (fs.existsSync(srcPath)) {
        log.debug(`copying '${asset}' to '${destDir}'`);
        fs.copySync(srcPath, destPath);
      } else {
        log.error(`asset path '${srcPath}' does not exist.`);
      }
    });
    log.debug("Static assets copied successfully.");
    done();
  } catch (err) {
    log.error(`Error copying static assets: ${err}`);
    done(err);
  }
};

/**
 * Builds the module manifest by generating dynamic data and writing it to the
 * build directory.
 *
 * @param {Function} done - Gulp callback to signal task completion
 */
export const buildManifest = (config) => (done) => {
  const manifestData = config.generateManifest;
  console.log(JSON.stringify(manifestData, null, 2));
  const buildDir = config.buildDirPath;
  const manifestFile = path.basename(config._manifestFile);
  FileUtils.writeJSONFile(path.join(buildDir, manifestFile), manifestData);
  done();
};

/**
 * Generates an environment variables file with module information.
 * Creates vars.env containing CHANGELOG_FILE, MODULE_ID, MODULE_TITLE, and MODULE_VERSION.
 *
 * @param {Function} done - Gulp callback to signal task completion
 */
export const generateEnvFile = (config) => (done) => {
  log.debug("Generating vars.env");
  const vars = [
    { key: "CHANGELOG_FILE", value: config.changelogPath },
    { key: "MODULE_ID", value: config.id },
    { key: "MODULE_TITLE", value: config.title },
    { key: "MODULE_VERSION", value: config.version },
  ];

  const content = vars.map(({ key, value }) => `${key}="${value}"`).join("\n");

  fs.writeFile(config.varsFile, content, (err) => {
    if (err) {
      log.error(`Failed to generate ${config.varsFile}:`, err);
      return done(err);
    }
    log.debug(`${config.varsFile} generated successfully`);
    done();
  });
};
