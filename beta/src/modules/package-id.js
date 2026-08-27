/**
 * Validation des identifiants de paquet (WinGet / MS Store) manipules par l'interface.
 *
 * Meme expression que :
 *  - `app.js` (racine) : `isValidPackageId`, filtre de `pcsetup-selection`.
 *  - `OwlSetupWebView.cs` : `Regex.IsMatch(x, "^[A-Za-z0-9][A-Za-z0-9.+_-]*$")` cote hote.
 *
 * Garder les deux cotes strictement identiques : c'est la frontiere de confiance
 * entre l'UI et l'appel `winget.exe`. Le premier caractere doit etre
 * alphanumerique : un identifiant en `-...` ne peut donc pas etre confondu avec
 * un argument `winget` (durcissement 4.0-beta).
 */

/** Jeu de caracteres autorise dans un identifiant transmis a l'hote. */
export const PACKAGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]*$/;

/** Longueur defensive utilisee par la telemetrie (`targetPackage`). */
export const TELEMETRY_PACKAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,95}$/;

/**
 * @param {unknown} id
 * @returns {id is string} vrai si `id` est une chaine acceptable par l'hote
 */
export function isValidPackageId(id) {
  return typeof id === "string" && PACKAGE_ID_PATTERN.test(id);
}

/**
 * Filtre une liste (selection restauree depuis `localStorage`, profils, etc.)
 * en ne conservant que des identifiants surs et distincts.
 *
 * @param {unknown} list
 * @returns {string[]}
 */
export function sanitizePackageIds(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  for (const value of list) {
    if (!isValidPackageId(value) || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

/**
 * Normalise pour la telemetrie : renvoie l'identifiant s'il est court et sur,
 * sinon une chaine vide (jamais de donnee libre exfiltree).
 *
 * @param {unknown} id
 * @returns {string}
 */
export function telemetrySafePackageId(id) {
  return typeof id === "string" && TELEMETRY_PACKAGE_PATTERN.test(id) ? id : "";
}
