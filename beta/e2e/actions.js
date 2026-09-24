/**
 * Gestes d'utilisateur partagés par les parcours Playwright et par l'outil de
 * parité de rendu (scripts/parite-rendu.mjs). Aucune dépendance au lanceur de
 * tests : ce module doit rester utilisable hors de `playwright test`.
 */

/**
 * Ouvre une vue par la navigation principale, comme l'utilisateur : les
 * entrées rangées dans un menu (Applications, Maintenance…) demandent d'abord
 * d'ouvrir ce menu.
 */
export async function ouvrirVue(page, vue) {
  const cible = `[data-view="${vue}"]`;
  // `has` cherche DANS le menu : le sélecteur ne doit pas remonter à la barre.
  const menu = page.locator(".horizontal-nav .top-nav-group").filter({ has: page.locator(cible) });
  if (await menu.count()) await menu.locator(".top-nav-toggle").click();
  await page.locator(`.horizontal-nav ${cible}`).click();
  await page.locator(`section.view.active#${vue}`).waitFor({ state: "attached" });
}
