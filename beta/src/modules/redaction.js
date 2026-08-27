/**
 * Anonymisation des lignes de journal avant tout affichage de signalement ou
 * envoi de diagnostic, et empreinte stable d'un incident.
 *
 * Reference : `app.js` (racine) : `redactLogDiagnostic`, `telemetryFingerprint`.
 * Ce module est volontairement pur (aucun acces DOM / reseau / stockage) pour
 * etre couvert a 100 % par les tests : c'est du code sensible a la vie privee.
 */

// Regles reprises a l'identique de `redactLogDiagnostic` dans `app.js` (racine).
// Les libelles de remplacement (accents inclus) DOIVENT rester identiques : le
// test de parite compare octet a octet avec la version inline.
const RULES = [
  // Chemins de profil utilisateur -> variable generique
  [/\b[A-Z]:\\Users\\[^\\\s]+/gi, "%USERPROFILE%"],
  // Adresses e-mail
  [/\b[\w.%+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, "[E-MAIL MASQUÉ]"],
  // Lignes "Nom d'utilisateur : ..." / "Ordinateur : ..."
  [
    /\b(?:Nom d['’]utilisateur|Utilisateur runAs|Ordinateur)\s*:.*$/i,
    (value) => `${value.split(":")[0]} : [MASQUÉ]`,
  ],
  // DOMAINE\compte
  [/\b[A-Z0-9_-]+\\[A-Z0-9._-]+\b/gi, "[COMPTE WINDOWS]"],
];

/** Longueur maximale d'un extrait de journal partage. */
export const MAX_DIAGNOSTIC_LENGTH = 420;

/**
 * @param {unknown} line ligne de journal brute
 * @returns {string} ligne sans chemin, e-mail, nom de compte ni nom de machine,
 *   tronquee a {@link MAX_DIAGNOSTIC_LENGTH} caracteres
 */
export function redactLogDiagnostic(line) {
  let text = String(line || "");
  for (const [pattern, replacement] of RULES) {
    text = text.replace(pattern, /** @type {any} */ (replacement));
  }
  return text.slice(0, MAX_DIAGNOSTIC_LENGTH);
}

/**
 * Empreinte hexadecimale (8 caracteres) deterministe d'un incident, utilisee
 * pour dedupliquer les rapports sans transporter de contenu libre.
 *
 * @param {{errorCategory?: unknown, failureStage?: unknown, targetPackage?: unknown,
 *   errorCode?: unknown, errorKind?: unknown}} context
 * @returns {string}
 */
export function telemetryFingerprint(context) {
  const canonical = [
    context.errorCategory,
    context.failureStage,
    context.targetPackage,
    context.errorCode,
    context.errorKind,
  ]
    .map((value) => String(value || "unknown").toLowerCase())
    .join("|");
  return [...canonical]
    .reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 2166136261)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
}
