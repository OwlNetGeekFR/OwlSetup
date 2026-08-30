/**
 * Validation des identifiants de paquet (WinGet / MS Store) manipules par l'interface.
 *
 * SOURCE DE VERITE : `PackageIdPattern` dans `OwlSetupWebView.cs`. C'est l'hote
 * qui construit les lignes de commande `winget.exe` : sa regle est la seule qui
 * decide vraiment. Ce module la reflete pour que l'interface refuse tot ce que
 * l'hote refusera de toute facon.
 *
 * `beta/test/package-id.test.js` LIT `OwlSetupWebView.cs` et compare les deux :
 * ce n'est plus une copie litterale ecrite dans le test. La version precedente
 * comparait a une chaine figee, et a donc continue de passer en affirmant une
 * egalite devenue fausse quand l'hote a ete durci en 4.0.0-beta.57.
 *
 * Le premier caractere doit etre alphanumerique : un identifiant en `-...` ne
 * peut donc pas etre confondu avec un argument `winget`. La longueur est bornee
 * a 128 : un identifiant demesure n'atteint pas la ligne de commande.
 *
 * Seul l'echappement differe de l'hote (`+-]` ici, `+\-]` en C#) : le tiret en
 * fin de classe est deja litteral en JavaScript, et l'echapper serait signale
 * comme inutile. Le test normalise cette difference et compare aussi les deux
 * regles sur un corpus.
 */

/** Jeu de caracteres autorise dans un identifiant transmis a l'hote. */
export const PACKAGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{1,127}$/;

/** Longueur defensive utilisee par la telemetrie (`targetPackage`). */
export const TELEMETRY_PACKAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+-]{1,95}$/;

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
