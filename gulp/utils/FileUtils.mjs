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

  /**
   * Sanitizes a string by converting it to a safe filename format.
   *
   * This function performs the following transformations:
   * - Converts diacritical marks and accented characters to their basic Latin equivalents
   * - Replaces special characters and spaces with underscores
   * - Removes currency symbols and mathematical operators
   * - Converts all characters to lowercase
   * - Removes zero-width characters and other invisible Unicode characters
   *
   * @param {string} str - The input string to be sanitized
   * @returns {string} A cleaned string safe for use as a filename
   */
  static sanitizeFilename(str) {
    return str
      .replace(/[àáâãäåāăąǻạảấầẩẫậắằẳẵặ]/g, "a")
      .replace(/[èéêëēĕėęěẹẻẽếềểễệ]/g, "e")
      .replace(/[ìíîïĩīĭįǐỉịớờởỡợ]/g, "i")
      .replace(/[òóôõöōŏőơǒǫǭọỏốồổỗộớờởỡợ]/g, "o")
      .replace(/[ùúûüũūŭůűųưǔǖǘǚǜụủứừửữự]/g, "u")
      .replace(/[ýÿŷỳỵỷỹ]/g, "y")
      .replace(/[æǽ]/g, "ae")
      .replace(/[œ]/g, "oe")
      .replace(/[ĳ]/g, "ij")
      .replace(/[ß]/g, "ss")
      .replace(/[ćçĉċč]/g, "c")
      .replace(/[ḩĥħ]/g, "h")
      .replace(/[ĵ]/g, "j")
      .replace(/[ķ]/g, "k")
      .replace(/[ĺļľŀł]/g, "l")
      .replace(/[ńņňñ]/g, "n")
      .replace(/[ŕŗř]/g, "r")
      .replace(/[śŝşš]/g, "s")
      .replace(/[ţťŧ]/g, "t")
      .replace(/[ŵẃẅẁ]/g, "w")
      .replace(/[źżž]/g, "z")
      .replace(/[ÀÁÂÃÄÅĀĂĄǺẠẢẤẦẨẪẬẮẰẲẴẶ]/g, "A")
      .replace(/[ÈÉÊËĒĔĖĘĚẸẺẼẾỀỂỄỆ]/g, "E")
      .replace(/[ÌÍÎÏĨĪĬĮǏỈỊỚỜỞỠỢ]/g, "I")
      .replace(/[ÒÓÔÕÖŌŎŐƠǑǪǬỌỎỐỒỔỖỘỚỜỞỠỢ]/g, "O")
      .replace(/[ÙÚÛÜŨŪŬŮŰŲƯǓǕǗǙǛỤỦỨỪỬỮỰ]/g, "U")
      .replace(/[ÝŸŶỲỴỶỸ]/g, "Y")
      .replace(/[ÆǼ]/g, "AE")
      .replace(/[Œ]/g, "OE")
      .replace(/[Ĳ]/g, "IJ")
      .replace(/[ĆÇĈĊČ]/g, "C")
      .replace(/[ĤĦḨ]/g, "H")
      .replace(/[Ĵ]/g, "J")
      .replace(/[Ķ]/g, "K")
      .replace(/[ĹĻĽĿŁ]/g, "L")
      .replace(/[ŃŅŇÑ]/g, "N")
      .replace(/[ŔŖŘ]/g, "R")
      .replace(/[ŚŜŞŠ]/g, "S")
      .replace(/[ŢŤŦ]/g, "T")
      .replace(/[ŴẂẄẀ]/g, "W")
      .replace(/[ŹŻŽ]/g, "Z")
      .replace(/[$€£¥¢]/g, "")
      .replace(/[+−×÷=≠<>±≤≥]/g, "")
      .replace(/[^a-z0-9.]/gi, "_")
      .replace(/[\u200B-\u200D\uFEFF\u2060-\u2064\s]+/g, "")
      .toLowerCase();
  }
}
