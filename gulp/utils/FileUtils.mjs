import fs from "fs-extra";
import log from "./logger.mjs";

/**
 * Utility class for file system operations with built-in logging and error
 * handling.
 */
export class FileUtils {
  /**
   * Creates a directory if it doesn't exist. Logs success at debug level and
   * errors at error level.
   *
   * @param {string} path - The directory path to create
   * @throws {Error} If directory creation fails
   */
  static createDir(path) {
    try {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
        log.debug(`FileUtils.mjs: Created directory: ${path}`);
      }
    } catch (err) {
      log.error(`FileUtils.mjs: Failed to create directory ${path}: ${err}`);
      throw err;
    }
  }

  /**
   * Writes data to a JSON file with pretty printing. Logs success at debug
   * level and errors at error level.
   *
   * @param {string} path - The file path to write to
   * @param {Object} data - The data to write as JSON
   * @param {Object} [options={ spaces: 2 }] - JSON writing options
   * @param {number} options.spaces - Number of spaces for indentation
   * @throws {Error} If file writing fails
   */
  static writeJSONFile(path, data, options = { spaces: 2 }) {
    try {
      fs.writeJSONSync(path, data, options);
      log.debug(`FileUtils.mjs: Wrote JSON file: ${path}`);
    } catch (err) {
      log.error(`FileUtils.mjs: Failed to write JSON file ${path}: ${err}`);
      throw err;
    }
  }
}
