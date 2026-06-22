import prettier from "prettier";
import log from "./logger.mjs";

/**
 * CPR-specific pack entry cleaning, provided as an opt-in `packs.transformEntry`
 * hook so the generic build system stays project-agnostic. A consumer wires it
 * in their config:
 *
 *   import { cprTransformEntry } from "./gulp/utils/cprPackData.mjs";
 *   new Config({ packs: { transformEntry: cprTransformEntry, stats: true } });
 *
 * It strips Foundry metadata we don't ship, normalizes item usage/effect
 * fields, coerces stringly-typed numbers, and tidies description HTML. The hook
 * mutates the entry in place (the Foundry CLI uses the mutated object) and
 * never discards entries.
 */

/** Item types that carry active effects and a meaningful `usage` value. */
const ITEMS_WITH_EFFECTS = [
  "armor",
  "clothing",
  "cyberware",
  "criticalInjury",
  "drug",
  "gear",
  "program",
  "weapon",
];

/** Valid non-"owned"/"carried" usage values, defaulted to "equipped". */
const DEFAULT_USAGE = "equipped";

/** Physical-possession usages that compendium items should never carry. */
const PHYSICAL_USAGE = ["owned", "carried"];

/**
 * Extracts the pack type (e.g. "items") from a LevelDB key such as
 * "!items!abc" or "!items.effects!abc.def".
 *
 * @param {string} key - The entry's `_key`
 * @returns {string} The pack type
 */
function getPackType(key) {
  return key.split("!")[1].split(".")[0];
}

/**
 * Normalizes text/HTML fields, smoothing out quirks introduced by
 * Foundry/browsers/operating systems/users. Order of operations matters.
 *
 * @param {string} str - The string to clean
 * @returns {string} The cleaned string
 */
function cleanString(str) {
  return str
    .replace(/\u2060/gu, "")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"')
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
 * Removes Foundry metadata keys we never ship in compendium content.
 *
 * @param {Object} entry - The pack entry (mutated in place)
 */
function stripMetadata(entry) {
  delete entry.author;

  if (entry.flags) {
    delete entry.flags.exportSource;
    if (entry.flags.core) {
      delete entry.flags.core.sourceId;
      if (Object.keys(entry.flags.core).length === 0) {
        delete entry.flags.core;
      }
    }
    if (Object.keys(entry.flags).length === 0) {
      delete entry.flags;
    }
  }

  // _stats is regenerated on compile; folders/ownership/etc. aren't shipped.
  delete entry._stats;
  delete entry.folder;
  delete entry.origin;
  delete entry.ownership;
  delete entry.sort;
  delete entry.permission;
  delete entry.tint;
}

/**
 * Applies item-specific normalization: removes stray runtime fields, fixes
 * weapon/cyberware quirks, and enforces `revealed`/`usage` for effect-bearing
 * item types.
 *
 * @param {Object} entry - The item pack entry (mutated in place)
 */
function normalizeItem(entry) {
  if (entry.system) {
    delete entry.system.allowedUsage;
    delete entry.system.dvTableNames;
    delete entry.system.isGM;
    delete entry.system.isOwned;
    delete entry.system.relativeSkills;
    delete entry.system.tags;
  }

  if (entry.type === "weapon") {
    entry.system.ammoVariety = entry.system.ammoVariety.filter((i) => i !== "");
  }

  if (entry.type === "cyberware" && !entry.system.isWeapon) {
    delete entry.system.critFailEffect;
  }

  if (ITEMS_WITH_EFFECTS.includes(entry.type)) {
    entry.system.revealed = true;
    // usage must never be a physical-possession state on a compendium item;
    // default those (and a missing value) to 'equipped'.
    if (
      !("usage" in entry.system) ||
      PHYSICAL_USAGE.includes(entry.system.usage)
    ) {
      entry.system.usage = DEFAULT_USAGE;
    }
  } else {
    delete entry.system?.revealed;
    delete entry.system?.usage;
  }
}

/**
 * Coerces stringly-typed numeric fields to integers.
 *
 * @param {Object} entry - The item pack entry (mutated in place)
 */
function coerceNumbers(entry) {
  if (entry.system?.source?.page) {
    entry.system.source.page = parseInt(entry.system.source.page, 10);
  }
  if (entry.system?.amount) {
    entry.system.amount = parseInt(entry.system.amount, 10);
  }
  if (entry.system?.price) {
    entry.system.price.market = parseInt(entry.system.price.market, 10);
  }
  if (entry.system?.rank) {
    entry.system.rank = parseInt(entry.system.rank, 10);
  }
  if (entry.system?.humanityLoss?.static) {
    entry.system.humanityLoss.static = parseInt(
      entry.system.humanityLoss.static,
      10,
    );
  }
}

/**
 * Cleans a CPR pack entry in place. Intended to be passed as
 * `packs.transformEntry`. Returns nothing so the entry is always kept.
 *
 * @param {Object} entry - The pack entry to clean (mutated in place)
 * @returns {Promise<void>}
 */
export async function cprTransformEntry(entry) {
  stripMetadata(entry);

  if (entry._key && getPackType(entry._key) === "items") {
    normalizeItem(entry);

    if (entry.name) entry.name = cleanString(entry.name);
    if (entry.label) entry.label = cleanString(entry.label);
    if (entry.system?.description?.value) {
      const cleaned = cleanString(entry.system.description.value);
      try {
        entry.system.description.value = await prettier.format(cleaned, {
          parser: "html",
        });
      } catch (error) {
        // Foundry/user-authored HTML can be malformed (e.g. void elements with
        // end tags). Keep the cleaned-but-unformatted value rather than fail
        // the whole build.
        log.warn(
          `cprPackData: could not format description for '${entry.name}', keeping it unformatted (${error.message})`,
        );
        entry.system.description.value = cleaned;
      }
    }

    coerceNumbers(entry);
  }
}
