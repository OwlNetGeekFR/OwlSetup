import { test, expect, ouvrirVue } from "./fixtures.js";
import { analyseDesMisesAJour, etatDeSante, miseAJourDisponible } from "./faux-hote/scenarios.js";

const FIREFOX = miseAJourDisponible("Mozilla.Firefox", "Mozilla Firefox", "142.0", "143.0.1");
const VLC = miseAJourDisponible("VideoLAN.VLC", "VLC media player", "3.0.20", "3.0.21");

test.describe("mises à jour des applications", () => {
  test("la liste du démarrage est reprise sans relancer WinGet", async ({ page, hote }) => {
    hote.repondre("scan-health", () => etatDeSante([FIREFOX, VLC]));
    await hote.demarrer();

    // Le badge de la navigation annonce les mises à jour avant toute visite.
    await expect(page.locator("#updatesNavBadge")).toHaveText("2");

    await ouvrirVue(page, "updates");
    const lignes = page.locator("#availableUpdates .available-update");
    await expect(lignes).toHaveCount(2);
    await expect(lignes.filter({ hasText: "Mozilla Firefox" })).toContainText("142.0→143.0.1");
    await expect(page.locator("#updateReadyTitle")).toHaveText("2 mises à jour sélectionnées");
    await expect(page.locator("#updateAllBtn")).toBeEnabled();
    expect(hote.actions()).not.toContain("scan-updates");
  });

  test("« Ne plus proposer » masque une mise à jour, même après une nouvelle analyse", async ({
    page,
    hote,
  }) => {
    hote.repondre("scan-health", () => etatDeSante([FIREFOX, VLC]));
    hote.repondre("scan-updates", () => analyseDesMisesAJour([FIREFOX, VLC]));
    await hote.demarrer();
    await ouvrirVue(page, "updates");

    await page.locator(`[data-ignore-update="${VLC.id}"]`).click();
    const lignes = page.locator("#availableUpdates .available-update");
    await expect(lignes).toHaveCount(1);
    await expect(page.locator("#ignoredUpdatesText")).toHaveText("1 mise à jour masquée");

    // L'hôte repropose VLC : l'interface continue de le masquer.
    await page.locator("#scanUpdatesBtn").click();
    await hote.commande("scan-updates");
    await hote.calme();
    await expect(lignes).toHaveCount(1);
    await expect(lignes).toContainText("Mozilla Firefox");

    await page.locator("#restoreIgnoredUpdates").click();
    await expect(lignes).toHaveCount(2);
    await expect(page.locator("#ignoredUpdatesBar")).toBeHidden();
  });

  test("aucune mise à jour disponible", async ({ page, hote }) => {
    await hote.demarrer();
    await ouvrirVue(page, "updates");
    await expect(page.locator("#noUpdates")).toBeVisible();
    await expect(page.locator("#availableUpdates")).toBeHidden();
    await expect(page.locator("#updateAllBtn")).toBeDisabled();
  });
});
