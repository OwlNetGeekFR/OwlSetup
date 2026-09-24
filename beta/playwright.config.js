import { defineConfig, devices } from "@playwright/test";
import { UTILISATEUR_HABITUE } from "./e2e/profils.js";

/**
 * Parcours de l'interface dans Chromium, face au faux hôte (e2e/faux-hote/).
 * Aucune dépendance à Windows : tourne en CI Linux (quality.yml).
 *
 * Pas de nouvelle tentative : un test qui échoue une fois sur deux est un
 * bug à comprendre, pas un aléa à masquer.
 */
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.js",
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    // Taille d'ouverture de la fenêtre (WebAppForm : Size = 1500 × 920).
    viewport: { width: 1500, height: 920 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    storageState: UTILISATEUR_HABITUE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
