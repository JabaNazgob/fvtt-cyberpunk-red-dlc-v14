import js from "@eslint/js";
import globals from "globals";
import importX from "eslint-plugin-import-x";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    ignores: ["dist/**", "gulp/**", "src/babele/**", "src/packs/**"],
  },
  js.configs.recommended,
  {
    plugins: {
      import: importX,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        Hooks: "readonly",
        game: "readonly",
      },
    },
    settings: {
      "import/extensions": [".js", ".mjs"],
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "import/extensions": ["error", "always", { ignorePackages: true }],
      "import/no-cycle": "error",
      "import/no-unresolved": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  prettierRecommended,
];
