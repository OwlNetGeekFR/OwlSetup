/**
 * Libellés d'issue des opérations de quarantaine (lot 2).
 *
 * Le routeur de messages construisait ces phrases deux fois, à quelques mots
 * près, selon que la désinstallation était individuelle ou groupée. Les titres
 * et les détails de la carte d'arrière-plan y étaient rigoureusement
 * identiques : seule la phrase affichée dans le panneau changeait.
 *
 * Les chaînes restent en français mot pour mot : elles servent de clés au
 * dictionnaire de `i18n.js`, qui les traduit à l'exécution. En changer une
 * ici, c'est la faire disparaître de l'interface anglaise.
 */

/**
 * @param {{ moved?: number, failed?: number, batch?: boolean }} resultat
 * @returns {{ title: string, detail: string, text: string, tone: string }}
 */
export function quarantineSummary(resultat) {
  const moved = Number(resultat && resultat.moved) || 0;
  const failed = Number(resultat && resultat.failed) || 0;
  const batch = Boolean(resultat && resultat.batch);

  const title = failed ? "Nettoyage terminé avec vérifications" : "Nettoyage terminé";
  const detail = failed
    ? `${failed} dossier(s) à vérifier`
    : `${moved} dossier(s) en quarantaine réversible`;

  // La désinstallation groupée annonce un bilan compact, l'individuelle une
  // phrase complète terminée par un point.
  const text = batch
    ? failed
      ? `${moved} dossier(s) en quarantaine · ${failed} à vérifier`
      : `${moved} dossier(s) en quarantaine réversible`
    : failed
      ? `${moved} dossier(s) placé(s) en quarantaine · ${failed} à vérifier.`
      : `${moved} dossier(s) placé(s) en quarantaine réversible.`;

  return { title, detail, text, tone: failed ? "warning" : "complete" };
}
