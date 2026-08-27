/**
 * Décision « cet échec du Centre des opérations n'en est pas vraiment un ».
 *
 * Miroir de la boucle `reconcileMaintenanceOperations()` de `../../app.js`
 * (introduite en 4.0.0-beta.6). Fonction pure : elle reçoit une opération déjà
 * normalisée (ids de paquets canoniques) et renvoie la raison de résolution,
 * ou `null` si l'échec doit rester affiché.
 *
 * Le test `beta/test/operations-reconcile.test.js` vérifie que les constantes
 * et libellés restent alignés avec `app.js`.
 */

/** Une alerte d'échec plus vieille que ça, sans récidive, est archivée. */
export const STALE_FAILURE_DAYS = 14;

/**
 * @typedef {Object} OperationLike
 * @property {string} [status]
 * @property {string} [type]
 * @property {string[]} [packageIds] identifiants déjà canoniques
 * @property {string} [completedAt]
 * @property {string} [startedAt]
 * @property {number} [occurrences]
 */

/**
 * @param {OperationLike} op
 * @param {{selfManagedIds?: Set<string>, ignoredIds?: Set<string>, now?: number}} [opts]
 * @returns {{resolvedBy: "update-ignored" | "self-managed" | "stale"} | null}
 */
export function classifyStaleFailure(op, opts = {}) {
  const selfManagedIds = opts.selfManagedIds || new Set();
  const ignoredIds = opts.ignoredIds || new Set();
  const now = typeof opts.now === "number" ? opts.now : Date.now();

  if (!op || op.status !== "failed") return null;

  const ids = Array.isArray(op.packageIds) ? op.packageIds.filter(Boolean) : [];
  if (op.type === "update" && ids.length) {
    const allIgnored = ids.every((id) => ignoredIds.has(id));
    const allSelfManaged = ids.every((id) => selfManagedIds.has(String(id).toLowerCase()));
    // app.js : `resolvedBy: allIgnored ? "update-ignored" : "self-managed"`
    if (allIgnored) return { resolvedBy: "update-ignored" };
    if (allSelfManaged) return { resolvedBy: "self-managed" };
  }

  const at = new Date(op.completedAt || op.startedAt || 0).getTime();
  const staleBefore = now - STALE_FAILURE_DAYS * 24 * 3600 * 1000;
  if (at && at < staleBefore && !(Number(op.occurrences) > 1)) {
    return { resolvedBy: "stale" };
  }
  return null;
}
