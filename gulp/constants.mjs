import log from "./utils/logger.mjs";

export const MODULE = Object.freeze({
  ID: "cyberpunk-red-dlc",
  NAME: "Cyberpunk RED - DLC",
  MANIFEST: "module.json",
  URL: "https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-dlc",
});

export const DIRS = Object.freeze({
  SRC: "src",
  STATIC_ASSETS: Object.freeze(["babele", "icons"]),
});

export const BUILD = Object.freeze({
  CI: Boolean(process.env.CI),
  CONFIG: "foundryconfig.json",
});

// Debug, dump all vars
if (process.env.DEBUG) {
  const constants = { MODULE, DIRS, BUILD };

  Object.entries(constants).forEach(([objectName, object]) => {
    Object.entries(object).forEach(([key, value]) => {
      log.debug(`${objectName}.${key} = ${JSON.stringify(value)}`);
    });
  });
}
