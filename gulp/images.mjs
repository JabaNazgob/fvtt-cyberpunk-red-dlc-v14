import path from "node:path";
import { watch } from "gulp";
import { optimize } from "svgo";
import fs from "fs-extra";
import log from "./utils/logger.mjs";
import { FileUtils } from "./utils/FileUtils.mjs";

/**
 * Processes SVG files by optimizing them with SVGO and copying to build
 * directory. Applies standardized dimensions (512x512) and removes
 * unnecessary elements. Blocking operation - completes before returning.
 *
 * @private
 * @param {string[]} files - Array of SVG file paths to process
 * @param {string} srcDir - Source directory path for calculating relative
 *                          paths
 * @param {string} buildDir - Destination build directory path
 * @returns {void}
 * @throws {Error} If file reading, optimization, or writing fails
 */
function _processSvgs(files, srcDir, buildDir) {
  const width = 512;
  const height = 512;
  const svgConfig = {
    multipass: true,
    plugins: [
      "cleanupAttrs",
      "removeDoctype",
      "removeComments",
      "removeXMLProcInst",
      "removeUselessDefs",
      "convertStyleToAttrs",
      {
        name: "CPRSetDimensions",
        type: "visitor",
        fn: () => ({
          element: {
            enter: (node) => {
              if (node.name === "svg") {
                if (node.attributes.width === undefined) {
                  node.attributes.width = width.toString();
                }
                if (node.attributes.height === undefined) {
                  node.attributes.height = height.toString();
                }
                if (node.attributes.viewBox === undefined) {
                  node.attributes.viewBox = `0 0 ${width} ${height}`;
                }
              }
            },
          },
        }),
      },
    ],
  };

  for (const file of files) {
    try {
      const svgString = fs.readFileSync(file, "utf8");
      const relativePath = path.relative(srcDir, file);
      const destPath = path.join(buildDir, relativePath);

      const result = optimize(svgString, {
        path: file,
        ...svgConfig,
      });

      fs.ensureDirSync(path.dirname(destPath));
      fs.writeFileSync(destPath, result.data, "utf8");
    } catch (error) {
      log.error(`Error processing ${file}: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Copies raster image files (PNG, WebP, etc.) to build directory.
 * Preserves the original directory structure from source to build
 * directory. Blocking operation - completes before returning.
 *
 * @private
 * @param {string[]} files - Array of raster image file paths to copy
 * @param {string} srcDir - Source directory path for calculating relative
 *                          paths
 * @param {string} buildDir - Destination build directory path
 * @returns {void}
 * @throws {Error} If file copying or directory creation fails
 */
function _processRasters(files, srcDir, buildDir) {
  for (const file of files) {
    try {
      const relativePath = path.relative(srcDir, file);
      const destPath = path.join(buildDir, relativePath);

      fs.ensureDirSync(path.dirname(destPath));
      fs.copyFileSync(file, destPath);
    } catch (error) {
      log.error(`Error copying ${file}: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Removes processed image files from build directory. Handles deletion
 * of both SVG and raster image files. Blocking operation - completes
 * before returning.
 *
 * @private
 * @param {string[]} files - Array of image file paths to remove from
 *                           build
 * @param {string} srcDir - Source directory path for calculating relative
 *                          paths
 * @param {string} buildDir - Destination build directory path
 * @returns {void}
 * @throws {Error} If file deletion fails for critical reasons
 */
function _deleteImages(files, srcDir, buildDir) {
  for (const file of files) {
    try {
      const relativePath = path.relative(srcDir, file);
      const destPath = path.join(buildDir, relativePath);

      if (fs.pathExistsSync(destPath)) {
        fs.removeSync(destPath);
      }
    } catch (error) {
      log.error(`Error deleting ${file}: ${error.message}`);
    }
  }
}

/**
 * Routes a single image file to the appropriate processing function
 * based on file extension. Wraps the file in an array to use existing
 * batch processing functions. Blocking operation.
 *
 * @private
 * @param {string} file - File path to process
 * @param {string} srcDir - Source directory path
 * @param {string} buildDir - Build directory path
 * @param {string[]} imageExts - Array of supported image extensions
 * @returns {void}
 * @throws {Error} If file processing fails
 */
function _processFile(file, srcDir, buildDir, imageExts) {
  if (file.endsWith(".svg")) {
    _processSvgs([file], srcDir, buildDir);
  } else if (imageExts.some((ext) => file.endsWith(ext))) {
    _processRasters([file], srcDir, buildDir);
  }
}

/**
 * Routes a single image file deletion to the appropriate cleanup
 * function based on file extension. Wraps the file in an array to use
 * existing batch deletion functions. Explicitly handles SVG files to
 * match processing behavior. Blocking operation.
 *
 * @private
 * @param {string} file - File path to delete from build
 * @param {string} srcDir - Source directory path
 * @param {string} buildDir - Build directory path
 * @param {string[]} imageExts - Array of supported image extensions
 * @returns {void}
 */
function _deleteFile(file, srcDir, buildDir, imageExts) {
  const isSvg = file.endsWith(".svg");
  const isSupportedRaster = imageExts.some((ext) => file.endsWith(ext));

  if (isSvg || isSupportedRaster) {
    _deleteImages([file], srcDir, buildDir);
  }
}

/**
 * Processes all image files in the project during initial build. Finds
 * all image files matching supported extensions in the source directory
 * and processes them according to their type (optimization for SVGs,
 * copying for rasters). Uses single directory walk for performance.
 *
 * @param {Object} config - Build configuration object containing paths
 * @param {string} config.srcDirPath - Source directory path
 * @param {string} config.buildDirPath - Build directory path
 * @param {string[]} config.imageExts - Array of supported image
 *                                      extensions
 * @returns {Function} Gulp task function that accepts a done callback
 */
export const processImages = (config) => async (done) => {
  try {
    const allFiles = await FileUtils.findFilesByExts(
      config.srcDirPath,
      config.imageExts,
    );

    const svgFiles = allFiles.filter((file) => file.endsWith(".svg"));
    const rasterFiles = allFiles.filter((file) => !file.endsWith(".svg"));

    if (svgFiles.length > 0) {
      _processSvgs(svgFiles, config.srcDirPath, config.buildDirPath);
    }

    if (rasterFiles.length > 0) {
      _processRasters(rasterFiles, config.srcDirPath, config.buildDirPath);
    }

    done();
  } catch (error) {
    log.error("Error processing images:", error);
    done(error);
  }
};

/**
 * Watch task for images during development. Monitors image files for
 * changes and handles file additions, modifications, and deletions.
 * Processes each file individually for fast incremental builds.
 * Debounces rapid file changes to ensure the latest version is
 * processed.
 *
 * Watch events:
 * - add: Processes newly added image files
 * - change: Reprocesses modified image files (debounced)
 * - unlink: Removes deleted image files from build directory
 *
 * @param {Object} config - Build configuration object containing paths
 * @param {string} config.srcDirPath - Source directory path
 * @param {string} config.buildDirPath - Build directory path
 * @param {string[]} config.imageExts - Array of supported image
 *                                      extensions
 * @returns {Function} Gulp task function that returns a watcher object
 */
export const watchImages = (config) => () => {
  const srcPattern = config.imageExts.map((ext) =>
    path.join(config.srcDirPath, `**/*${ext}`),
  );
  const tempPatterns = config.tempFilePatterns;

  const watcher = watch(srcPattern);
  const debounceTimers = new Map();
  const debounceDelay = 50; // milliseconds

  watcher
    .on("add", (file) => {
      if (FileUtils.isTemporaryFile(file, tempPatterns)) {
        return;
      }
      const relPath = path.relative(config.srcDirPath, file);
      log.info(`[image] Added: ${relPath}`);
      try {
        _processFile(
          file,
          config.srcDirPath,
          config.buildDirPath,
          config.imageExts,
        );
      } catch (error) {
        log.error(`Failed to process: ${error.message}`);
      }
    })
    .on("change", (file) => {
      if (FileUtils.isTemporaryFile(file, tempPatterns)) {
        return;
      }
      const relPath = path.relative(config.srcDirPath, file);
      log.info(`[image] Changed: ${relPath}`);
      // debounce to handle potential race conditions like git operations
      // which change files rapidly
      clearTimeout(debounceTimers.get(file));
      debounceTimers.set(
        file,
        setTimeout(() => {
          try {
            _processFile(
              file,
              config.srcDirPath,
              config.buildDirPath,
              config.imageExts,
            );
          } catch (error) {
            log.error(`Failed to process: ${error.message}`);
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
      const relPath = path.relative(config.srcDirPath, file);
      log.info(`[image] Deleted: ${relPath}`);
      try {
        _deleteFile(
          file,
          config.srcDirPath,
          config.buildDirPath,
          config.imageExts,
        );
      } catch (error) {
        log.error(`Failed to delete: ${error.message}`);
      }
    });

  return watcher;
};
