import fs from "fs-extra";
import path from "path";
import log from "./logger.mjs";

/**
 * Utility class for file system operations with built-in logging and error
 * handling.
 */
export class FileUtils {
  /**
   * Determines if a file is temporary and should be ignored by watchers.
   * Filters out editor temp files, backup files, and atomic write
   * intermediates.
   *
   * @static
   * @param {string} file - File path to check
   * @param {string[]} patterns - Array of patterns to match against
   * @returns {boolean} True if file matches any temporary pattern
   */
  static isTemporaryFile(file, patterns) {
    const filename = path.basename(file);
    return patterns.some((pattern) => {
      if (pattern.includes(".")) {
        return filename.includes(pattern);
      }
      return filename.endsWith(pattern);
    });
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
   * Writes text content to a file. Logs success at debug level and errors
   * at error level.
   *
   * @param {string} path - The file path to write to
   * @param {string} content - The text content to write
   * @param {string} [encoding="utf-8"] - File encoding
   * @throws {Error} If file writing fails
   */
  static writeTextFile(path, content, encoding = "utf-8") {
    try {
      fs.writeFileSync(path, content, encoding);
      log.debug(`FileUtils.mjs: Wrote text file: ${path}`);
    } catch (err) {
      log.error(`FileUtils.mjs: Failed to write text file ${path}: ${err}`);
      throw err;
    }
  }

  /**
   * Sanitizes a string by converting it to a safe filename format.
   *
   * This function performs the following transformations:
   * - Converts diacritical marks and accented characters to their basic
   *   Latin equivalents
   * - Removes parentheses, quotes, and similar characters
   * - Replaces special characters and spaces with underscores
   * - Removes currency symbols and mathematical operators
   * - Converts all characters to lowercase
   * - Removes zero-width characters and other invisible Unicode characters
   *
   * Order of operation is important here!
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
      .replace(/[()'"]/g, "")
      .replace(/[+−×÷=≠<>±≤≥]/g, "")
      .replace(/[^a-z0-9.]/gi, "_")
      .replace(/[\u200B-\u200D\uFEFF\u2060-\u2064\s]+/g, "")
      .toLowerCase();
  }

  /**
   * Recursively searches a directory for files matching multiple extensions.
   * Walks the directory tree once and returns all matching file paths.
   * Performs a single directory traversal for better performance when
   * searching for multiple file types.
   *
   * @async
   * @param {string} searchPath - The directory path to search
   * @param {string[]} exts - Array of file extensions to search for (with
   *                          or without leading dots)
   * @returns {Promise<string[]>} Array of absolute file paths matching any
   *                              of the provided extensions
   * @throws {Error} If searchPath or exts parameters are not provided
   */
  static async findFilesByExts(searchPath, exts) {
    if (!searchPath) {
      throw new Error("searchPath parameter is required");
    }
    if (!exts || !Array.isArray(exts) || exts.length === 0) {
      throw new Error("exts parameter must be a non-empty array");
    }

    const files = [];
    const targetExts = exts.map((ext) =>
      ext.startsWith(".") ? ext : `.${ext}`,
    );

    async function search(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await search(fullPath);
        } else if (
          entry.isFile() &&
          targetExts.includes(path.extname(entry.name))
        ) {
          files.push(fullPath);
        }
      }
    }

    await search(searchPath);
    return files;
  }
}
