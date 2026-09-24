/**
 * États du `localStorage` de l'origine `https://pcsetup.local`, passés à
 * Playwright comme `storageState`.
 */

const ORIGINE = "https://pcsetup.local";

/**
 * Utilisateur qui a déjà choisi sa langue, terminé la configuration initiale
 * et la visite guidée : l'interface s'ouvre directement sur le catalogue.
 * C'est l'état par défaut des tests (playwright.config.js).
 */
export const UTILISATEUR_HABITUE = {
  cookies: [],
  origins: [
    {
      origin: ORIGINE,
      localStorage: [
        { name: "owlsetup-language-v1", value: "fr" },
        { name: "owlsetup-first-run-configuration-v1", value: "true" },
        { name: "owlsetup-onboarding-completed-v1", value: "true" },
      ],
    },
  ],
};

/** Aucun choix enregistré : premier lancement après installation. */
export const PREMIER_LANCEMENT = { cookies: [], origins: [] };
