import path from "node:path";
import { optimize } from "svgo";
import fs from "fs-extra";
import log from "./utils/logger.mjs";
import { FileUtils } from "./utils/FileUtils.mjs";
import gulp from "gulp";

async function _processSvgs(files, srcDir, buildDir) {
  const width = 512;
  const height = 512;
  const svgConfig = {
    multipass: true,
    plugins: [
      // Basic optimizations
      "cleanupAttrs",
      "removeDoctype",
      "removeComments",
      "removeXMLProcInst",
      "removeUselessDefs",
      "convertStyleToAttrs",
      {
        // Custom plugin to set dimensions
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
      const svgString = await fs.readFile(file, "utf8");
      const relativePath = path.relative(srcDir, file);
      const destPath = path.join(buildDir, relativePath);

      // Optimize with SVGO
      const result = optimize(svgString, {
        path: file,
        ...svgConfig,
      });

      // Write to buildDir
      await fs.ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, result.data, "utf8");
    } catch (error) {
      console.error(`✗ Error processing ${file}: ${error.message}`);
      throw error;
    }
  }
}

export const processImages = (config) => async (done) => {
  try {
    const svgFiles = await FileUtils.findFilesByExt(config.srcDirPath, "svg");
    await _processSvgs(svgFiles, config.srcDirPath, config.buildDirPath);
    done();
  } catch (error) {
    console.error("Error processing images:", error);
    done(error);
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
    { key: "CORE_REPO_REF", value: config.schemaVersion },
  ];

  const content = vars.map(({ key, value }) => `${key}=${value}`).join("\n");

  fs.writeFile(config.varsFile, content, (err) => {
    if (err) {
      log.error(`Failed to generate ${config.varsFile}:`, err);
      return done(err);
    }
    log.debug(`${config.varsFile} generated successfully`);
    done();
  });
};
