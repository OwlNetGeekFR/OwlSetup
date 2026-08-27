import js from "@eslint/js";
import globals from "globals";

/**
 * Configuration ESLint (flat config, ESLint 9).
 *
 * Deux profils :
 *  - `src/modules/**` + `test/**` : modules ES modernes, extraits et testables.
 *  - `../app.js` (racine) : script navigateur historique, un seul fichier global.
 *    Analyse en lecture seule via `npm run lint:root:full` pour mesurer la dette,
 *    sans imposer les regles strictes tout de suite.
 */
export default [
  {
    ignores: ["node_modules/**", "coverage/**", "catalog/catalog.generated.js"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.js", "scripts/**/*.mjs", "test/**/*.js", "*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "smart"],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-implicit-globals": "error",
    },
  },
];
