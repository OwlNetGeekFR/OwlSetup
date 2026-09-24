import { test, expect } from "./fixtures.js";
import { diagnosticAvantInstallation } from "./faux-hote/scenarios.js";

/**
 * Quand l'hôte lève une exception en traitant une commande, OnWebMessage la
 * rend à l'interface par `owlsetup:native-error` : c'est le chemin de TOUTES
 * les erreurs de l'hôte (refus d'origine, commande invalide, opération déjà en
 * cours…).
 */
test.describe("erreurs de l'hôte", () => {
  test("une commande refusée s'affiche et entre dans les notifications", async ({ page, hote }) => {
    hote.repondre("preflight-install", diagnosticAvantInstallation);
    hote.refuser("install", "Attendez la fin de l'opération en cours.");
    await hote.demarrer();
    await page.locator('#catalog [data-app="VideoLAN.VLC"]').click();
    await page.locator("#viewSelection").click();
    await page.locator("#installBtn").click();
    await expect(page.locator("#confirmInstall")).toBeEnabled();
    await page.locator("#confirmInstall").click();

    const carte = page.locator("#nativeErrorCard");
    await expect(carte).toBeVisible();
    await expect(page.locator("#nativeErrorMessage")).toHaveText(
      "Attendez la fin de l'opération en cours."
    );
    await expect(page.locator("#nativeErrorId")).toHaveText(/^Diagnostic [0-9A-F]{8}$/);

    // L'erreur reste consultable après la fermeture de la carte.
    await expect(page.locator("#notificationCount")).not.toHaveText("0");
    await page.locator("#appUpdateNotification").click();
    await expect(
      page.locator("#notificationList").getByText("Une action nécessite votre attention")
    ).toBeVisible();
  });
});
