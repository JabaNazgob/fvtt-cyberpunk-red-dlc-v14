import fs from "fs-extra";
import path from "path";
import YAML from "js-yaml";
import * as FoundryPacks from "@foundryvtt/foundryvtt-cli";
import { FileUtils } from "./FileUtils.mjs";
import log from "./logger.mjs";

/**
 * Utility class for processing Foundry VTT packs
 */
export class PackUtils {
  /**
   * Generates a sanitized filename for a pack fragment based on its data
   *
   * @private
   * @param {Object} data - The data object for the pack fragment
   * @returns {string} A sanitized filename for the fragment
   * @throws {Error} If unable to determine filename for the data
   */
  static #getFragmentName(data) {
    // Folders don't have a key, generate a dummy one
    let key = data._key;
    if (!key) {
      key = "!folders!dummyValue";
    }
    const keyType = PackUtils.#getPackType(key);
    const { type } = data;
    const name = data.name ? data.name.split(" ").slice(0, 5).join(" ") : "";

    const typeLower = typeof data.type === "string" ? type.toLowerCase() : "";
    const nameLower = data.name ? name.toLowerCase() : "";

    switch (keyType) {
      case "items":
        return FileUtils.sanitizeFilename(`${typeLower}.${nameLower}.yaml`);
      case "scenes":
        return FileUtils.sanitizeFilename(`scene.${nameLower}.yaml`);
      case "tables":
        return FileUtils.sanitizeFilename(`table.${nameLower}.yaml`);
      case "macros":
        return FileUtils.sanitizeFilename(`macro.${nameLower}.yaml`);
      case "folders":
        return FileUtils.sanitizeFilename(`folder.${nameLower}.yaml`);
      default:
        throw new Error(`Unable to determine filename for ${data}`);
    }
  }

  /**
   * Extracts the pack type from a key string
   *
   * @private
   * @param {string} str - The key string to extract pack type from
   * @returns {string} The extracted pack type
   */
  static #getPackType(str) {
    return str.split("!")[1].split(".")[0];
  }

  /**
   * Sanitizes and cleans up HTML description text
   * Removes unwanted characters, normalizes formatting, and trims
   * whitespace
   *
   * @private
   * @param {string} str - The input description string
   * @returns {string} The sanitized description
   */
  static #sanitizeDescription(str) {
    return str
      .replace(/\u2060/gu, "")
      .replace(/['']/gu, "'")
      .replace(/[""]/gu, '"')
      .replace(/&nbsp;/gu, "")
      .replace(/\sdir="ltr"/g, "")
      .replace(/<br\s*\/?>\s*(?=<br\s*\/?>)/g, "</p>\n<p>")
      .replace(/<p> /g, "<p>")
      .replace(/<\/p> +<p>/gu, "</p>\n<p>")
      .replace(/<p><br><\/p>/gu, "")
      .replace(/[^\S\n]+/g, " ")
      .replace(/^\s+|\s+$/gu, "")
      .replace(/<strong> /g, " <strong>")
      .replace(/ <\/strong>/g, "</strong> ")
      .replace(/ <\/p>/gu, "</p>")
      .replace(/<p><\/p>/gu, "");
  }

  /**
   * Transforms an entry
   *
   * @private
   * @param {Object} entry - The entry to transform
   * @returns {Object} The transformed entry
   */
  static #transformEntry(entry) {
    if (entry.system?.description) {
      const d = entry.system.description.value;
      entry.system.description.value = PackUtils.#sanitizeDescription(d);
    }
    return entry;
  }

  /**
   * Generates a Babel translation file for a pack
   *
   * @private
   * @param {Object} packData - The pack metadata
   * @param {string} packDir - The directory containing pack fragments
   */
  static async #generateBabelFile(config, packData, packDir) {
    const babelFile = path.resolve(
      path.join(
        config.srcDirPath,
        "babele",
        `${config.id}.${packData.name}.json`,
      ),
    );
    const babeleData = {
      label: packData.label,
      mapping: {},
      entries: {},
    };
    const files = fs.readdirSync(packDir);

    for (const file of files) {
      log.debug(`Processing pack fragment '${packData.name}/${file}'`);
      const fragmentData = fs.readFileSync(path.join(packDir, file), "utf-8");
      const data = YAML.load(fragmentData);

      const entryName = data.name;
      const entryDescription = data.system?.description?.value
        ? data.system.description.value
        : "";

      const entry = {
        name: entryName,
        description: entryDescription,
      };

      babeleData.entries[entryName] = entry;
    }

    fs.writeFileSync(babelFile, JSON.stringify(babeleData, null, 2));
  }

  /**
   * Determines the fragment directory for a given pack
   *
   * @private
   * @param {Object} packData - The pack metadata
   * @returns {string} The path to the fragment directory
   */
  static #getFragmentDir(config, packData) {
    const typeDir = packData.path.split("/")[1].split("_")[0];
    const typeNameDir = packData.path.split("/")[1].split("_")[1];
    const fragmentDir = path.join(
      config.srcDirPath,
      "packs",
      typeDir,
      typeNameDir,
    );
    return fragmentDir;
  }

  /**
   * Extracts a Foundry VTT pack into individual YAML fragments
   *
   * @private
   * @param {string} inputDir - The source directory of the pack
   * @param {string} outputDir - The target directory for extracted
   * fragments
   * @throws {Error} If extraction fails
   */
  static async #extractPack(inputDir, outputDir) {
    const yamlOptions = {
      indent: 2,
      sortKeys: true,
      linewidth: 80,
      noRefs: true,
      quotingType: '"',
    };

    try {
      log.debug(`Extracting pack '${path.basename(inputDir)}'`);
      await FoundryPacks.extractPack(inputDir, outputDir, {
        yaml: true,
        yamlOptions: yamlOptions,
        transformName: (entry) => PackUtils.#getFragmentName(entry),
        transformEntry: (entry) => PackUtils.#transformEntry(entry),
      });
    } catch (error) {
      console.error(
        `Error extracting pack from ${inputDir} to ${outputDir}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Compiles pack fragments back into a Foundry VTT pack
   *
   * @private
   * @param {string} fragmentDir - The directory containing pack fragments
   * @param {string} packName - The name of the pack to compile
   */
  static async #compilePack(config, fragmentDir, packName) {
    await FoundryPacks.compilePack(
      fragmentDir,
      path.join(config.buildDirPath, "packs", packName),
      {
        yaml: true,
      },
    );
  }

  /**
   * Extracts all packs defined in the module configuration
   * Clears existing fragment directory and generates new fragments
   * and Babele files
   *
   * @param {Function} done - Callback to signal completion of extraction
   */
  static extractPacks = (config) => async (done) => {
    const packs = config.manifest.packs;

    for (const p of packs) {
      const packsFragmentDir = PackUtils.#getFragmentDir(config, p);
      const packsBuildDir = path.join(config.buildDirPath, "packs", p.name);
      await PackUtils.#extractPack(packsBuildDir, packsFragmentDir);
      await PackUtils.#generateBabelFile(config, p, packsFragmentDir);
    }
    done();
  };

  /**
   * Compiles all packs defined in the module configuration
   *
   * @param {Function} done - Callback to signal completion of compilation
   */
  static compilePacks = (config) => async (done) => {
    const packs = config.manifest.packs;

    for (const p of packs) {
      const fragmentDir = PackUtils.#getFragmentDir(config, p);
      await PackUtils.#compilePack(config, fragmentDir, p.name);
    }
    done();
  };
}
