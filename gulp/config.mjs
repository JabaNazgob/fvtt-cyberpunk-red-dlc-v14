import fs from "fs-extra";
import path from "node:path";
import { FileUtils } from "./utils/FileUtils.mjs";
import { BUILD, DIRS, MODULE } from "./constants.mjs";

/**
 * Configuration management class for the build system.
 */
export class Config {
  /**
   * Reads the local build configuration file.
   *
   * @private
   * @returns {Object} The build configuration object
   */
  static #readBuildConfig() {
    const localConfig = path.resolve(BUILD.CONFIG);
    let buildConfig = {};

    if (fs.existsSync(localConfig)) {
      buildConfig = fs.readJSONSync(localConfig);
    }
    return buildConfig;
  }

  /**
   * Generates a version string based on current timestamp.
   * Used for periodic versions created for testing.
   *
   * @private
   * @returns {string} Version string in format "YYYY.MM.DDHHMMSS"
   */
  static #calculateDateVersion() {
    const now = new Date();
    const version =
      "v" +
      now.getUTCFullYear() +
      "." +
      String(now.getMonth() + 1).padStart(2, "0") +
      "." +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    return version;
  }

  /**
   * Generates base URL and project ID for CI environment.
   *
   * @private
   * @returns {{baseUrl: string, projectId: string}} Object containing base
   * URL and gitlab project ID
   */
  static #generateBaseUrl() {
    // We use example.com here so that if a build gets out into the wild
    // it won't actuall install in foundry from the manifest url
    let baseUrl = "https://example.com";
    let projectId = "123456";

    if (BUILD.CI) {
      baseUrl = process.env.CI_API_V4_URL;
      projectId = process.env.CI_PROJECT_ID;
    }
    return { baseUrl, projectId };
  }

  /**
   * Generates the manifest URL for the module.
   *
   * @private
   * @returns {string} Full URL to the module manifest
   */
  static #manifestUrl() {
    const { baseUrl, projectId } = this.#generateBaseUrl();
    const path = [
      "projects",
      projectId,
      "packages",
      "generic",
      MODULE.ID,
      "latest",
      MODULE.MANIFEST,
    ].join("/");
    return new URL(path, baseUrl).href;
  }

  /**
   * Generates the download URL for the module.
   *
   * @private
   * @returns {string} Full URL to the module download
   */
  static #downloadURL() {
    const { baseUrl, projectId } = this.#generateBaseUrl();
    const zipFile = `${MODULE.ID}-${this.moduleVersion()}.zip`;
    const path = [
      "projects",
      projectId,
      "packages",
      "generic",
      MODULE.ID,
      this.moduleVersion(),
      zipFile,
    ].join("/");
    return new URL(path, baseUrl).href;
  }

  /**
   * Gets the source directory path.
   *
   * @returns {string} Path to source directory
   */
  static srcDir() {
    return DIRS.SRC;
  }

  /**
   * Gets the build directory path, creating it if necessary.
   *
   * @returns {string} Path to build directory
   */
  static buildDir() {
    let buildDir = "dist";
    const buildConfig = this.#readBuildConfig();

    if (buildConfig) {
      buildDir = path.join(buildConfig.dataPath, "Data", "modules", MODULE.ID);
    }
    FileUtils.createDir(path.resolve(buildDir));
    return buildDir;
  }

  /**
   * Gets the module version, either from CI tag, timestamp, or default.
   *
   * @returns {string} Module version string
   */
  static moduleVersion() {
    // Use a very obviosu dev string for dev builds
    let version = "v0.0.0dev";

    // In CI grab the TAG as the version string
    if (BUILD.CI) {
      if (process.env.CI_COMMIT_TAG) {
        version = process.env.CI_COMMIT_TAG;
      } else {
        version = this.#calculateDateVersion();
      }
    }
    return version;
  }

  /**
   * Gets the module manifest filename.
   *
   * @returns {string} Manifest filename
   */
  static moduleManifestFile() {
    return MODULE.MANIFEST;
  }

  /**
   * Gets the module ID.
   *
   * @returns {string} Module ID
   */
  static moduleId() {
    return MODULE.ID;
  }

  /**
   * Gets the module name.
   *
   * @returns {string} Module name
   */
  static moduleName() {
    return MODULE.NAME;
  }

  /**
   * Gets the module URL.
   *
   * @returns {string} Module URL
   */
  static moduleUrl() {
    return MODULE.URL;
  }

  /**
   * Gets the list of static assets.
   *
   * @returns {string[]} Array of static asset paths
   */
  static staticAssets() {
    return DIRS.STATIC_ASSETS;
  }

  static moduleData() {
    return fs.readJSONSync(path.resolve(DIRS.SRC, MODULE.MANIFEST));
  }

  /**
   * Generates the complete manifest data by combining the source manifest
   * with dynamic values.
   *
   * @returns {Object} Complete manifest data
   */
  static generateManifestData() {
    const manifestData = this.moduleData();

    manifestData.url = MODULE.URL;
    manifestData.manifest = this.#manifestUrl();
    manifestData.download = this.#downloadURL();
    manifestData.version = this.moduleVersion();

    return manifestData;
  }
}
