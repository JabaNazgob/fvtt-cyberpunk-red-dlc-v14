import fs from "fs";
import path from "path";
import log from "fancy-log";
import chalk from "chalk";
import { format } from "date-fns";

/**
 * Configuration manager for CPRC Foundry Project Build Systems
 */
class Config {
  // Set defaults if no options passed.
  static VARS_FILE = "vars.env";
  static FOUNDRY_CONFIG = "foundryconfig.json";
  static MANIFEST_FILE = "module.json";
  static CHANGELOG_FILE = "CHANGELOG.md";
  static DEFAULT_VERSION = "v0.0.0dev";
  static SRC_DIR = "src";
  static BUILD_DIR = "dist";
  static ASSET_DIRS = [];
  static ASSET_FILES = [];
  static CI = process.env.CI || false;
  static CI_COMMIT_TAG = process.env.CI_COMMIT_TAG || undefined;
  static GITLAB_CI = process.env.GITLAB_CI || false;
  static GITLAB_HOST = process.env.CI_SERVER_FQDN || "example.com";
  static GITLAB_GROUP_NAME = process.env.CI_PROJECT_NAMESPACE || "group";
  static GITLAB_PROJECT_NAME = process.env.CI_PROJECT_NAME || "project";
  static GITLAB_PROJECT_ID = process.env.CI_PROJECT_ID || "0123456789";

  /**
   * Creates a new Config instance with optional configuration overrides.
   * @param {Object} [options={}] - Configuration options to override defaults
   * @param {string} [options.varFile] - vars file used by gitlab scripts
   * @param {string} [options.foundryConfig] - Path to the foundry config file
   * @param {string} [options.manifestFile] - Path to the manifest file
   * @param {string} [options.changelogFile] - Path to the changelog file
   * @param {string} [options.srcDir] - Source directory name
   * @param {string} [options.buildDir] - Build directory name
   * @param {string} [options.assetDirs] - Directories in SRC_DIR to sync to BUILD_DIR
   * @param {string} [options.assetFiles] - Files in SRC_DIR to sync to BUILD_DIR
   * @param {string} [options.defaultVersion] - Default version string
   * @param {string} [options.gitlabHost] - GitLab host URL
   * @param {string} [options.gitlabProjectId] - GitLab project ID
   * @param {string} [options.gitlabProjectName] - GitLab project name
   * @param {string} [options.gitlabGroupName] - GitLab group name
   */
  constructor(options = {}) {
    this._varsFile = options.varsFile || Config.VARS_FILE;
    this._foundryConfig = options.foundryConfig || Config.FOUNDRY_CONFIG;
    this._manifestFile = options.manifestFile || Config.MANIFEST_FILE;
    this._changelogFile = options.changelogFile || Config.CHANGELOG_FILE;
    this._srcDir = options.srcDir || Config.SRC_DIR;
    this._buildDir = options.buildDir || Config.BUILD_DIR;
    this._assetDirs = options.assetDirs || Config.ASSET_DIRS;
    this._assetFiles = options.assetFiles || Config.ASSET_FILES;
    this._defaultVersion = options.defaultVersion || Config.DEFAULT_VERSION;
    this._gitlabHost = options.gitlabHost || Config.GITLAB_HOST;
    this._gitlabProjectId = options.gitlabProjectId || Config.GITLAB_PROJECT_ID;
    this._gitlabProjectName =
      options.gitlabProjectName || Config.GITLAB_PROJECT_NAME;
    this._gitlabGroupName = options.gitlabGroupName || Config.GITLAB_GROUP_NAME;
  }

  /**
   * Finds the project root by searching for package.json or .git
   *
   * @returns {string} Resolved path to project root
   * @throws {Error} If project root cannot be found
   */
  #findProjectRoot() {
    let currentDir = process.cwd();

    while (currentDir !== path.parse(currentDir).root) {
      // Check for package.json or .git directory
      if (
        fs.existsSync(path.join(currentDir, "package.json")) ||
        fs.existsSync(path.join(currentDir, ".git"))
      ) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    throw new Error(
      "Could not find project root (no package.json or .git found)",
    );
  }

  /**
   * Loads and parses the manifest file
   *
   * @returns {Object} Parsed manifest data
   * @throws {Error} If manifest cannot be read or parsed
   */
  #loadManifestData() {
    try {
      const filePath = path.join(this.root, this._manifestFile);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const manifest = JSON.parse(fileContent);
      return manifest;
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Manifest file not found: ${error.path}`);
      } else if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in manifest file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Loads and parses the foundryConfig file
   *
   * @returns {Object} Parsed foundryConfig OR Empty Object if file not found
   * @throws {Error} If manifest cannot be parsed as valid JSON
   */
  #loadFoundryConfig() {
    try {
      const filePath = path.join(this.root, this._foundryConfig);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const config = JSON.parse(fileContent);
      return config;
    } catch (error) {
      if (error.code === "ENOENT") {
        log(
          `${chalk.yellow("WARNING")} ${this._foundryConfig} not found. Using defaults.`,
        );
        return {};
      } else if (error instanceof SyntaxError) {
        throw new Error(
          `Invalid JSON in Foundry Config file: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Generates the zip file name based on project id and version.
   * @returns {string} The zip file name
   */
  #generateZipName() {
    const zipFile = `${this.id}-${this.version}.zip`;
    return zipFile;
  }

  /**
   * Generates GitLab URLs for the project, manifest, and download.
   * @returns {Object} Object containing GitLab URLs
   * @returns {string} return.url - Project URL
   * @returns {string} return.manifest - Manifest URL
   * @returns {string} return.download - Download URL
   */
  #generateGitlabUrls() {
    const zipFile = this.zipName;
    const manifestFile = path.basename(this._manifestFile);
    const baseUrl = `https://${this._gitlabHost}`;
    const groupUrl = `${baseUrl}/${this._gitlabGroupName}`;
    const projectUrl = `${groupUrl}/${this._gitlabProjectName}`;
    const apiUrl = `${baseUrl}/api/v4`;
    const packageUrl = `${apiUrl}/projects/${this._gitlabProjectId}/generic/${this.id}`;
    const manifestUrl = `${packageUrl}/latest/${manifestFile}`;
    const zipUrl = `${packageUrl}/${this.version}/${zipFile}`;

    const url = projectUrl;
    const manifest = manifestUrl;
    const download = zipUrl;

    const output = {
      url: url,
      manifest: manifest,
      download: download,
    };

    return output;
  }

  /**
   * Determines the version string based on priority order: CI tag, CI date, manifest version, or default.
   *
   * @private
   * @returns {string} The determined version string
   */
  #getVersion() {
    // 1st priority: CI tag
    if (Config.CI && Config.CI_COMMIT_TAG) {
      return process.env.CI_COMMIT_TAG;
    }

    // 2nd priority: Date version, if we're in CI but no tag this is probably a
    // dev build
    if (Config.CI && !Config.CI_COMMIT_TAG) {
      return `v${format(new Date(), "yyyyMMdd.HHmm")}`;
    }

    // 3rd priority: manifest version
    try {
      const manifest = this.manifest;
      if (manifest.version) {
        return manifest.version;
      }
    } catch {
      // just skip errors as we don't care here.
    }

    // 4th priority: default
    return this._defaultVersion;
  }

  /**
   * Gets the absolute path to the project root directory.
   *
   * @returns {string} Absolute path to the project root
   */
  get root() {
    return path.resolve(this.#findProjectRoot());
  }

  /**
   * Gets the build directory path
   *
   * @returns {string} Resolved path to build directory
   */
  get buildDirPath() {
    const config = this.#loadFoundryConfig();
    if (config) {
      if (config.dataPath) {
        const moduleType = path.basename(
          this._manifestFile,
          path.extname(this._manifestFile),
        );
        const distPath = path.join(
          config.dataPath,
          "Data",
          `${moduleType}s`,
          this.id,
        );
        return path.resolve(distPath);
      }
    }
    return path.resolve(this.root, this._buildDir);
  }

  /**
   * Gets the source directory path
   *
   * @returns {string} Resolved path to source directory
   */
  get srcDirPath() {
    return path.resolve(this.root, this._srcDir);
  }

  /**
   * Gets the full manifest object
   *
   * @returns {Object} Complete manifest data
   */
  get manifest() {
    if (!this._cachedManifest) {
      this._cachedManifest = this.#loadManifestData();
    }
    return this._cachedManifest;
  }

  /**
   * Gets version from CI environment, manifest, or default
   *
   * @returns {string} Version string
   */
  get version() {
    return this.#getVersion();
  }

  /**
   * Gets the project ID from manifest
   *
   * @returns {string} Project ID
   * @throws {Error} If id is not defined in manifest
   */
  get id() {
    const manifest = this.manifest;
    if (!manifest.id) {
      throw new Error("Module id is not defined in manifest file");
    }
    return manifest.id;
  }

  /**
   * Gets the project title from manifest
   *
   * @returns {string} Project title
   * @throws {Error} If title is not defined in manifest
   */
  get title() {
    const manifest = this.manifest;
    if (!manifest.title) {
      throw new Error("Module title is not defined in manifest file");
    }
    return manifest.title;
  }

  /**
   * Gets the paths to sync from source to build directory.
   *
   * @returns {string[]} Array of sync paths
   */
  get syncPaths() {
    return [...this._assetDirs, ...this._assetFiles];
  }

  /**
   * Gets the path to the changelog file.
   *
   * @returns {string} Resolved path to the changelog file
   */
  get changelogPath() {
    return path.resolve(path.join(this.root, this._changelogFile));
  }

  /**
   * Gets the generated zip file name.
   * @returns {string} The zip file name
   */
  get zipName() {
    return this.#generateZipName();
  }

  /**
   * Gets the path of the vars.env file used by the CI system
   * @returns {path} The path to the varsFile
   */
  get varsFile() {
    return path.join(this.root, this._varsFile);
  }

  /**
   * Gets the distribution manifest with GitLab URLs added.
   * @returns {Object} The manifest object with url, manifest, and download properties
   */
  get generateManifest() {
    const gitlab = this.#generateGitlabUrls();
    return {
      ...this.manifest,
      url: gitlab.url,
      manifest: gitlab.manifest,
      download: gitlab.download,
    };
  }
}

export default Config;
