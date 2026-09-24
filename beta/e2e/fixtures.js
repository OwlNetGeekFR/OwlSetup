import { test as base, expect } from "@playwright/test";
import { FauxHote } from "./faux-hote/faux-hote.js";

/**
 * `hote` : le faux hôte, branché sur la page avant son chargement.
 *
 * À la fin de CHAQUE test, les garde-fous communs s'appliquent : un parcours
 * qui réussit à l'écran mais lève une exception, demande un fichier que l'hôte
 * n'extrait pas, sort sur le réseau, viole la CSP ou envoie une action que
 * l'hôte refuserait, échoue quand même.
 */
export const test = base.extend({
  hote: async ({ page }, use) => {
    const hote = new FauxHote(page);
    await hote.brancher();
    await use(hote);
    await hote.calme();
    expect(hote.erreursDePage, "exceptions JavaScript dans l'interface").toEqual([]);
    expect(hote.erreursDEnvoi, "messages de l'hôte non remis à l'interface").toEqual([]);
    expect(hote.actionsInconnues, "actions que OnWebMessage refuserait").toEqual([]);
    expect(hote.ressourcesIntrouvables, "fichiers demandés que l'hôte n'extrait pas").toEqual([]);
    expect(hote.requetesExternes, "requêtes réseau sortantes").toEqual([]);
    expect(await hote.violationsCsp(), "violations de la CSP").toEqual([]);
  },
});

export { expect };

export { ouvrirVue } from "./actions.js";
