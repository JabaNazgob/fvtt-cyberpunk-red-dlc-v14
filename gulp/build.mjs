import path from "node:path";
import { watch } from "gulp";
import fs from "fs-extra";
import log from "./utils/logger.mjs";
import { FileUtils } from "./utils/FileUtils.mjs";

/**
 * Cleans the build directory by removing all contents while preserving
 * the directory itself. This is typically run at the start of a full
 * build to ensure a clean state.
 *
 * @param {Object} config - Build configuration object
 * @param {string} config.buildDirPath - Path to the build directory
 * @returns {Function} Gulp task function that accepts a done callback
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
 * Copies static assets from source to build directory. Processes each
 * configured asset synchronously and maintains directory structure.
 * Assets are defined in the config.syncPaths array.
 *
 * @param {Object} config - Build configuration object
 * @param {string} config.srcDirPath - Source directory path
 * @param {string} config.buildDirPath - Build directory path
 * @param {string[]} config.syncPaths - Array of asset directories/files
 * @returns {Function} Gulp task function that accepts a done callback
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
 * Determines which configured asset directory a file belongs to.
 *
 * @private
 * @param {string} file - File path to check
 * @param {string} srcDir - Source directory path
 * @param {string[]} syncPaths - Array of configured asset paths
 * @returns {string|null} The asset path if file is within one, null
 *                        otherwise
 */
function findAssetForFile(file, srcDir, syncPaths) {
  const normalizedFile = path.normalize(file);

  for (const asset of syncPaths) {
    const assetPath = path.normalize(path.join(srcDir, asset));
    const normalizedAssetPath = path.normalize(assetPath);

    // Exact match for individual files
    if (normalizedFile === normalizedAssetPath) {
      return asset;
    }

    // Check if file is within this asset directory path
    const relativePath = path.relative(normalizedAssetPath, normalizedFile);

    // If relative path doesn't start with "..", file is within the
    // asset directory
    if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
      return asset;
    }
  }

  return null;
}

/**
 * Watch task for static assets during development. Monitors configured
 * asset directories and individual files for additions, modifications,
 * and deletions. Copies and removes files for fast incremental builds.
 * Debounces rapid file changes to ensure the latest version is
 * processed.
 *
 * Watch events:
 * - add: Copies newly added files to build directory
 * - change: Updates modified files in build directory (debounced)
 * - unlink: Removes deleted files from build directory
 *
 * @param {Object} config - Build configuration object
 * @param {string} config.srcDirPath - Source directory path
 * @param {string} config.buildDirPath - Build directory path
 * @param {string[]} config.syncPaths - Array of asset directories/files
 * @returns {Function} Gulp task function that returns a watcher object
 */
export const watchStaticAssets = (config) => () => {
  const srcDir = config.srcDirPath;
  const destDir = config.buildDirPath;
  const syncPaths = config.syncPaths;
  const tempPatterns = config.tempFilePatterns;

  const watchPatterns = syncPaths.map((asset) => {
    const assetPath = path.join(srcDir, asset);
    const isFile = fs.existsSync(assetPath) && fs.statSync(assetPath).isFile();
    return isFile ? assetPath : path.join(assetPath, "**/*");
  });

  const watcher = watch(watchPatterns);
  const debounceTimers = new Map();
  const debounceDelay = 50;

  watcher
    .on("add", (file) => {
      if (FileUtils.isTemporaryFile(file, tempPatterns)) {
        return;
      }
      try {
        const asset = findAssetForFile(file, srcDir, syncPaths);
        if (asset) {
          const relPath = path.relative(srcDir, file);
          log.info(`[asset] Added: ${relPath}`);
          const srcPath = file;
          const destPath = path.join(destDir, relPath);
          fs.ensureDirSync(path.dirname(destPath));
          fs.copySync(srcPath, destPath);
        }
      } catch (error) {
        log.error(`Failed to copy: ${error.message}`);
      }
    })
    .on("change", (file) => {
      if (FileUtils.isTemporaryFile(file, tempPatterns)) {
        return;
      }
      const relPath = path.relative(srcDir, file);
      log.info(`[asset] Changed: ${relPath}`);
      clearTimeout(debounceTimers.get(file));
      debounceTimers.set(
        file,
        setTimeout(() => {
          try {
            const asset = findAssetForFile(file, srcDir, syncPaths);
            if (asset) {
              const srcPath = file;
              const destPath = path.join(destDir, relPath);
              fs.ensureDirSync(path.dirname(destPath));
              fs.copySync(srcPath, destPath);
            }
          } catch (error) {
            log.error(`Failed to copy: ${error.message}`);
          } finally {
            debounceTimers.delete(file);
          }
        }, debounceDelay),
      );
    })
    .on("unlink", (file) => {
      if (FileUtils.isTemporaryFile(file, tempPatterns)) {
        return;
      }
      try {
        const asset = findAssetForFile(file, srcDir, syncPaths);
        if (asset) {
          const relPath = path.relative(srcDir, file);
          log.info(`[asset] Deleted: ${relPath}`);
          const destPath = path.join(destDir, relPath);
          if (fs.existsSync(destPath)) {
            fs.removeSync(destPath);
          }
        }
      } catch (error) {
        log.error(`Failed to delete: ${error.message}`);
      }
    });

  return watcher;
};

/**
 * Builds the module manifest by generating dynamic data and writing it
 * to the build directory. The manifest includes project metadata,
 * version information, and distribution URLs generated from the
 * configuration.
 *
 * @param {Object} config - Build configuration object
 * @param {Object} config.generateManifest - Generated manifest data with
 *                                           URLs and metadata
 * @param {string} config.buildDirPath - Build directory path
 * @param {string} config._manifestFile - Path to manifest file (relative
 *                                        to project root)
 * @returns {Function} Gulp task function that accepts a done callback
 */
export const buildManifest = (config) => (done) => {
  try {
    const manifestData = config.generateManifest;
    const buildDir = config.buildDirPath;
    const manifestFile = path.basename(config._manifestFile);

    fs.ensureDirSync(buildDir);
    const filePath = path.join(buildDir, manifestFile);
    FileUtils.writeJSONFile(filePath, manifestData, { spaces: 2 });
    done();
  } catch (error) {
    done(error);
  }
};

/**
 * Generates an environment variables file with module information.
 * Creates vars.env containing CHANGELOG_FILE, MODULE_ID, MODULE_TITLE,
 * MODULE_VERSION, and CORE_REPO_REF. This file is used by CI/CD scripts
 * and build processes to access module metadata.
 *
 * @param {Object} config - Build configuration object
 * @param {string} config.changelogPath - Path to changelog file
 * @param {string} config.id - Module ID from manifest
 * @param {string} config.title - Module title from manifest
 * @param {string} config.version - Module version string
 * @param {string} config.schemaVersion - Core repository reference/
 *                                        schema version
 * @param {string} config.varsFile - Path where vars.env should be
 *                                   written
 * @returns {Function} Gulp task function that accepts a done callback
 */
export const generateEnvFile = (config) => (done) => {
  try {
    const vars = [
      { key: "CHANGELOG_FILE", value: config.changelogPath },
      { key: "MODULE_ID", value: config.id },
      { key: "MODULE_TITLE", value: config.title },
      { key: "MODULE_VERSION", value: config.version },
      { key: "CORE_REPO_REF", value: config.schemaVersion },
    ];

    const content = vars.map(({ key, value }) => `${key}=${value}`).join("\n");

    fs.ensureDirSync(path.dirname(config.varsFile));
    FileUtils.writeTextFile(config.varsFile, content);
    done();
  } catch (error) {
    done(error);
  }
};
