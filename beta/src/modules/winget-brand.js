/**
 * Aides d'affichage pour les paquets WinGet decouverts hors catalogue
 * (initiales, couleur de repli deterministe, normalisation de marque).
 *
 * Reference : `app.js` (racine) : `wingetInitials`, `normalizeWingetBrand`,
 * `wingetFallbackColor`.
 */

const FALLBACK_PALETTE = [
  "#3178c6",
  "#7c5ce5",
  "#16a085",
  "#d35454",
  "#ca7a2b",
  "#2788a8",
  "#a64d79",
  "#558b45",
];

/** Marques combinantes Unicode retirees apres normalisation NFD. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Deux/trois lettres a afficher dans la pastille d'une application.
 * @param {unknown} name
 * @returns {string}
 */
export function wingetInitials(name) {
  return (
    String(name || "APP")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 3) || "APP"
  );
}

/**
 * Reduit un nom/identifiant a une cle comparable (sans accents, sans suffixes
 * d'architecture ni ponctuation) pour rapprocher un paquet installe d'une
 * entree du catalogue.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeWingetBrand(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLocaleLowerCase("en")
    .replace(/\b(x64|x86|arm64|desktop|client|community|installer|setup)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Couleur stable derivee du nom : la meme entree donne toujours la meme teinte.
 * @param {unknown} value
 * @returns {string} couleur hexadecimale de la palette
 */
export function wingetFallbackColor(value) {
  const hash = [...String(value || "APP")].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) >>> 0,
    0
  );
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export { FALLBACK_PALETTE };
