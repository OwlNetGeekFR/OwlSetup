/**
 * Logique pure de resolution du theme (clair / sombre / selon Windows).
 *
 * Reference : `app.js` (racine) : `getThemePreference`, `applyThemePreference`.
 * Les effets de bord (lecture `localStorage`, `matchMedia`, ecriture sur
 * `document.documentElement`) restent dans `app.js` ; ce module ne contient que
 * la decision, facile a tester.
 */

/** @typedef {"system" | "dark" | "light"} ThemePreference */
/** @typedef {"dark" | "light"} ResolvedTheme */

export const THEME_PREFERENCES = /** @type {const} */ (["system", "dark", "light"]);
export const DEFAULT_PREFERENCE = "system";

/**
 * Ramene une valeur quelconque (contenu `localStorage`, `<select>`) a une
 * preference valide.
 * @param {unknown} value
 * @returns {ThemePreference}
 */
export function normalizeThemePreference(value) {
  return THEME_PREFERENCES.includes(/** @type {ThemePreference} */ (value))
    ? /** @type {ThemePreference} */ (value)
    : DEFAULT_PREFERENCE;
}

/**
 * Theme effectivement applique a l'interface.
 * @param {unknown} preference preference brute
 * @param {boolean} systemPrefersLight resultat de
 *   `matchMedia("(prefers-color-scheme: light)").matches`
 * @returns {ResolvedTheme}
 */
export function resolveTheme(preference, systemPrefersLight) {
  const selected = normalizeThemePreference(preference);
  if (selected === "system") return systemPrefersLight ? "light" : "dark";
  return selected;
}
