import { test, expect, ouvrirVue } from "./fixtures.js";

/**
 * Ce que chaque vue demande à l'hôte en s'ouvrant (`showView`). Une vue
 * absente de la table ne doit rien demander.
 *
 * « Tout mettre à jour » n'y figure pas : l'analyse de santé du démarrage
 * fournit déjà la liste (`updates-found`), la vue la réutilise sans relancer
 * WinGet — c'est vérifié dans mises-a-jour.spec.js.
 */
const COMMANDES_PAR_VUE = {
  tools: ["load-history", "diagnose-winget"],
  operations: ["load-history"],
  browsers: ["scan-browser-data"],
  security: ["security-status"],
  quarantine: ["scan-quarantine"],
  settings: ["schedule-state"],
};

test("chaque entrée de la navigation ouvre sa vue et interroge l'hôte", async ({ page, hote }) => {
  await hote.demarrer();
  await expect.poll(() => hote.actions()).toContain("security-status");
  await hote.calme();

  const vues = await page
    .locator(".horizontal-nav [data-view]")
    .evaluateAll((entrees) => entrees.map((entree) => entree.dataset.view));
  expect(vues.length, "navigation introuvable").toBeGreaterThan(10);
  for (const vue of Object.keys(COMMANDES_PAR_VUE)) expect(vues).toContain(vue);

  for (const vue of vues) {
    const avant = hote.commandes.length;
    await ouvrirVue(page, vue);
    await expect(page.locator("#currentView"), `fil d'Ariane de ${vue}`).not.toHaveText("");
    await expect(page.locator(".view.active"), `une seule vue active (${vue})`).toHaveCount(1);
    await expect
      .poll(() => hote.actions().slice(avant), { message: `commandes envoyées par ${vue}` })
      .toEqual(COMMANDES_PAR_VUE[vue] ?? []);
  }
});
