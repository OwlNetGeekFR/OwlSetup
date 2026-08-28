import js from "@eslint/js";
import globals from "globals";

/**
 * Configuration ESLint (flat config, ESLint 9).
 *
 * Deux profils :
 *  - `src/modules/**` + `test/**` : modules ES modernes, extraits et testables.
 *  - `src/app/legacy.js` : corps historique de l'interface, deplace tel quel
 *    depuis `../app.js` (lot 2). Non analyse tant qu'il n'est pas decoupe en
 *    modules ; `node --check` via `lint:root` garde le garde-fou de syntaxe.
 *  - `../app.js` (racine) : desormais genere par `scripts/build-js.mjs`.
 */
export default [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "catalog/catalog.generated.js",
      "src/app/legacy.js",
    ],
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
