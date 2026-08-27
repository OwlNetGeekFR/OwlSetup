/**
 * Echappement HTML pour l'insertion sure de texte dans `innerHTML`.
 *
 * Reference : `app.js` (racine), constante `escapeHtml`. Ce module est la version
 * extraite et testee ; le bundler (etape 2 du plan) remplacera l'implementation
 * inline par un import de cette fonction.
 *
 * @param {unknown} value valeur brute (toute valeur est convertie en chaine)
 * @returns {string} chaine ou `& < > " '` sont neutralises
 */
export function escapeHtml(value) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (char) => map[char]);
}

export default escapeHtml;
