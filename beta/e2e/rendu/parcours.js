import { ouvrirVue } from "../actions.js";
import {
  analyseDesMisesAJour,
  applicationsInstallees,
  diagnosticAvantInstallation,
  diagnosticWinget,
  elementEnQuarantaine,
  etatDeSante,
  historique,
  installation,
  miseAJourDisponible,
  navigateursDetectes,
  planification,
  quarantaine,
} from "../faux-hote/scenarios.js";

/**
 * États de l'interface parcourus par l'outil de parité de rendu
 * (scripts/parite-rendu.mjs). Chaque parcours est joué deux fois en parallèle,
 * avec la feuille de référence puis avec la feuille candidate ; à chaque
 * `capturer(nom)` les deux pages doivent présenter exactement les mêmes styles
 * calculés.
 *
 * Plus un parcours affiche d'éléments différents, plus il exerce de règles :
 * les vues sont donc remplies (mises à jour, applications installées,
 * quarantaine, historique…) plutôt que laissées vides.
 */

const ORIGINE = "https://pcsetup.local";

/** Largeurs de fenêtre : une par palier de requête média de la feuille. */
export const LARGEURS = [1500, 1100, 1000, 900, 700, 600, 500];

/** Thème et réglages d'accessibilité, tels que l'interface les enregistre. */
export const VARIANTES = {
  sombre: { theme: "dark", accessibilite: null },
  clair: { theme: "light", accessibilite: null },
  "sombre-accessible": {
    theme: "dark",
    accessibilite: { scale: 1.2, contrast: true, motion: true },
  },
  "clair-accessible": {
    theme: "light",
    accessibilite: { scale: 1.2, contrast: true, motion: true },
  },
};

/** `storageState` d'une variante, pour un utilisateur habitué ou au premier lancement. */
export function stockage(variante, { premierLancement = false } = {}) {
  const { theme, accessibilite } = VARIANTES[variante];
  const valeurs = { "owlsetup-theme-v1": theme };
  if (accessibilite) valeurs["owlsetup-accessibility-v1"] = JSON.stringify(accessibilite);
  if (!premierLancement) {
    valeurs["owlsetup-language-v1"] = "fr";
    valeurs["owlsetup-first-run-configuration-v1"] = "true";
    valeurs["owlsetup-onboarding-completed-v1"] = "true";
  }
  return {
    cookies: [],
    origins: [
      {
        origin: ORIGINE,
        localStorage: Object.entries(valeurs).map(([name, value]) => ({ name, value })),
      },
    ],
  };
}

const FIREFOX = miseAJourDisponible("Mozilla.Firefox", "Mozilla Firefox", "142.0", "143.0.1");
const DISCORD = {
  ...miseAJourDisponible("Discord.Discord", "Discord", "1.0.9205", "1.0.9210"),
  selfManaged: true,
};

/** Un PC « habité » : de quoi remplir chaque vue. */
function hoteGarni(hote) {
  hote.repondre("scan-installed", (payload) =>
    applicationsInstallees(payload, ["VideoLAN.VLC", "7zip.7zip"])
  );
  hote.repondre("scan-health", () => etatDeSante([FIREFOX, DISCORD]));
  hote.repondre("scan-updates", () => analyseDesMisesAJour([FIREFOX, DISCORD]));
  hote.repondre("scan-quarantine", () =>
    quarantaine([
      elementEnQuarantaine("20260920-090000", "Cache", 4, 734003200, "700 Mo"),
      elementEnQuarantaine("20260801-120000", "Residus Zoom", 54, 12582912, "12 Mo"),
    ])
  );
  hote.repondre("load-history", () => historique());
  hote.repondre("schedule-state", () => planification());
  hote.repondre("scan-browser-data", () => navigateursDetectes());
  hote.repondre("diagnose-winget", () => diagnosticWinget());
  hote.repondre("preflight-install", diagnosticAvantInstallation);
}

const LARGE = [1500];
const TOUTES_VARIANTES = Object.keys(VARIANTES);

export const PARCOURS = [
  {
    nom: "vues",
    combinaisons: [
      ...LARGEURS.flatMap((largeur) =>
        ["sombre", "clair"].map((variante) => ({ variante, largeur }))
      ),
      ...["sombre-accessible", "clair-accessible"].map((variante) => ({ variante, largeur: 1500 })),
    ],
    preparer: hoteGarni,
    async jouer({ page, hote, capturer }) {
      await hote.demarrer();
      const vues = await page
        .locator(".horizontal-nav [data-view]")
        .evaluateAll((entrees) => entrees.map((entree) => entree.dataset.view));
      for (const vue of vues) {
        await ouvrirVue(page, vue);
        await capturer(`vue ${vue}`);
      }
    },
  },
  {
    nom: "installation",
    combinaisons: [
      ...TOUTES_VARIANTES.flatMap((variante) => LARGE.map((largeur) => ({ variante, largeur }))),
      { variante: "sombre", largeur: 900 },
      { variante: "clair", largeur: 900 },
    ],
    preparer(hote) {
      hoteGarni(hote);
      hote.repondre("install", (payload) => installation(payload, ["Mozilla.Firefox"]).slice(0, 1));
    },
    async jouer({ page, hote, capturer }) {
      await hote.demarrer();
      for (const id of ["Mozilla.Firefox", "Notepad++.Notepad++"]) {
        await page.locator(`#catalog [data-app="${id}"]`).click();
      }
      await capturer("catalogue avec sélection");
      await page.locator("#viewSelection").click();
      await capturer("ma sélection");
      await page.locator("#installBtn").click();
      await page.locator("#preflightTitle", { hasText: "Votre PC est prêt" }).waitFor();
      await capturer("diagnostic d'installation");
      await page.locator("#confirmInstall").click();
      const payload = await hote.commande("install");
      await page.locator("#installModal").waitFor({ state: "hidden" });
      await hote.envoyer(...installation(payload, ["Mozilla.Firefox"]).slice(1));
      await hote.calme();
      await capturer("installation en arrière-plan");
      await page.locator("#showInstallProgress").click();
      await capturer("bilan d'installation");
      await page.locator("#finishInstall").click();
      await page.locator("#appUpdateNotification").click();
      await capturer("centre de notifications");
    },
  },
  {
    nom: "mise-a-jour",
    combinaisons: TOUTES_VARIANTES.map((variante) => ({ variante, largeur: 1500 })),
    preparer: hoteGarni,
    async jouer({ page, hote, capturer }) {
      await hote.demarrer();
      await ouvrirVue(page, "updates");
      await page.locator("#updateAllBtn").click();
      await capturer("confirmation de mise à jour");
    },
  },
  {
    nom: "premier-lancement",
    premierLancement: true,
    combinaisons: TOUTES_VARIANTES.map((variante) => ({ variante, largeur: 1500 })),
    preparer: hoteGarni,
    async jouer({ page, hote, capturer }) {
      await hote.demarrer();
      await capturer("choix de la langue");
      await page.locator("#languageOverlay [data-language='fr']").click();
      await capturer("configuration initiale");
      await page.locator("#completeFirstRunConfiguration").click();
      await capturer("visite guidée");
    },
  },
  {
    nom: "anglais",
    combinaisons: ["sombre", "clair"].map((variante) => ({ variante, largeur: 1500 })),
    preparer: hoteGarni,
    async jouer({ page, hote, capturer }) {
      await hote.demarrer();
      await page.evaluate(() => window.owlI18n.setLanguage("en"));
      for (const vue of ["home", "catalog", "updates", "settings"]) {
        await ouvrirVue(page, vue);
        await capturer(`vue ${vue} en anglais`);
      }
    },
  },
  {
    nom: "erreur-native",
    combinaisons: ["sombre", "clair"].map((variante) => ({ variante, largeur: 1500 })),
    preparer: hoteGarni,
    async jouer({ page, hote, capturer }) {
      await hote.demarrer();
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("owlsetup:native-error", {
            detail: {
              message: "Action inconnue.",
              operation: "scan-disk",
              failureStage: "execution",
              errorKind: "application",
              resolutionStatus: "open",
            },
          })
        )
      );
      await capturer("erreur de l'hôte");
    },
  },
];
