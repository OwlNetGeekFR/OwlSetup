import { readFileSync } from "node:fs";
import { test, expect } from "./fixtures.js";
import { PREMIER_LANCEMENT } from "./profils.js";
import { VERSION_SIMULEE } from "./faux-hote/scenarios.js";

const { applications: catalogue } = JSON.parse(
  readFileSync(new URL("../catalog/apps.json", import.meta.url), "utf8")
);

test.describe("démarrage", () => {
  test("l'interface interroge l'hôte et affiche ses réponses", async ({ page, hote }) => {
    await hote.demarrer();

    // Les six commandes de démarrage, sans rien de plus avant la première
    // action de l'utilisateur.
    await expect
      .poll(() => hote.actions())
      .toEqual([
        "get-app-info",
        "scan-installed",
        "check-app-update",
        "scan-health",
        "scan-quarantine",
        "security-status",
      ]);

    // La détection porte sur tout le catalogue embarqué, dans l'ordre.
    const detection = await hote.commande("scan-installed");
    expect(detection.ids).toEqual(catalogue.map((app) => app.id));
    await expect(page.locator("#homeCatalogCount")).toHaveText(String(catalogue.length));

    // Le résumé système vient de `system-summary`.
    await expect(page.locator("#systemOsName")).toContainText("Windows 11 Professionnel");
    await expect(page.locator("#systemWinget")).toContainText("v1.11.400");
    await expect(page.locator("#systemArchitecture")).toHaveText("x64");

    // La version vient de `app-info` ; une stable n'affiche pas le badge BÊTA.
    await expect(page.locator("#settingsBuildVersion")).toHaveText(`${VERSION_SIMULEE} · stable`);
    await expect(page.locator("#buildBadge")).toBeHidden();

    // Le catalogue est la vue d'ouverture.
    await expect(page.locator("#catalog")).toHaveClass(/\bactive\b/);
    await expect(page.locator("#currentView")).toHaveText("Installer des logiciels");
  });

  test.describe("premier lancement", () => {
    test.use({ storageState: PREMIER_LANCEMENT });

    test("langue, configuration initiale puis visite guidée", async ({ page, hote }) => {
      await hote.demarrer();

      const langue = page.locator("#languageOverlay");
      await expect(langue).toBeVisible();
      await langue.locator("[data-language='fr']").click();
      await expect(langue).toBeHidden();

      const configuration = page.locator("#firstRunConfiguration");
      await expect(configuration).toBeVisible();
      await page.locator("#completeFirstRunConfiguration").click();
      await expect(configuration).toBeHidden();

      const visite = page.locator("#onboardingOverlay");
      await expect(visite).toBeVisible();
      await page.locator("#skipOnboarding").click();
      await expect(visite).toBeHidden();

      // Les trois choix sont retenus : au prochain lancement, plus rien ne s'ouvre.
      const memorise = await page.evaluate(() => ({
        langue: localStorage.getItem("owlsetup-language-v1"),
        configuration: localStorage.getItem("owlsetup-first-run-configuration-v1"),
        visite: localStorage.getItem("owlsetup-onboarding-completed-v1"),
      }));
      expect(memorise).toEqual({ langue: "fr", configuration: "true", visite: "true" });

      await page.reload();
      await expect(page.locator("#catalog")).toHaveClass(/\bactive\b/);
      await expect(langue).toBeHidden();
      await expect(configuration).toBeHidden();
      await expect(visite).toBeHidden();
    });
  });
});
