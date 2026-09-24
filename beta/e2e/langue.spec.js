import { test, expect, ouvrirVue } from "./fixtures.js";
import { diagnosticAvantInstallation } from "./faux-hote/scenarios.js";

/**
 * L'interface anglaise se construit en traduisant, à l'affichage, le texte
 * français — celui de `index.html`, de `app.js` ET celui que l'hôte envoie.
 * `audit-i18n.mjs` mesure la couverture en lisant les sources ; ce test
 * regarde ce que l'utilisateur voit réellement à l'écran.
 */
test.describe("interface en anglais", () => {
  test.beforeEach(async ({ page, hote }) => {
    await hote.demarrer();
    await ouvrirVue(page, "settings");
    await page.locator("#appLanguage").selectOption("en");
  });

  test("le choix est immédiat et conservé", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#currentView")).toHaveText("Settings");
    await expect(page.locator(".horizontal-nav [data-view='home']")).toContainText("Home");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".horizontal-nav [data-view='home']")).toContainText("Home");
  });

  test("le diagnostic d'installation envoyé par l'hôte est traduit", async ({ page, hote }) => {
    hote.repondre("preflight-install", diagnosticAvantInstallation);
    await ouvrirVue(page, "catalog");
    await page.locator('#catalog [data-app="VideoLAN.VLC"]').click();
    await page.locator("#viewSelection").click();
    await page.locator("#installBtn").click();

    await expect(page.locator("#preflightTitle")).toHaveText("Your PC is ready");
    const etape = (cle) => page.locator(`[data-preflight="${cle}"]`);
    await expect(etape("disk").locator("small")).toHaveText("182,4 GB free");
    await expect(etape("system").locator("small")).toHaveText("Compatible 64-bit Windows");
    await expect(etape("packages").locator("b")).toHaveText("Packages");
    await expect(etape("packages").locator("small")).toHaveText("1 package(s) available");
  });
});
