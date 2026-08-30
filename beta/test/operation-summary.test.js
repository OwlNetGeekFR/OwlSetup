import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { quarantineSummary } from "../src/modules/operation-summary.js";

/**
 * Test de PARITÉ : les valeurs attendues sont les chaînes que produisait le
 * routeur avant l'extraction, recopiées telles quelles. Le module doit rendre
 * exactement la même chose — sinon l'interface change, et surtout les clés du
 * dictionnaire anglais ne correspondent plus.
 */

describe("quarantineSummary — désinstallation individuelle", () => {
  it("sans échec", () => {
    expect(quarantineSummary({ moved: 3, failed: 0 })).toEqual({
      title: "Nettoyage terminé",
      detail: "3 dossier(s) en quarantaine réversible",
      text: "3 dossier(s) placé(s) en quarantaine réversible.",
      tone: "complete",
    });
  });

  it("avec échecs", () => {
    expect(quarantineSummary({ moved: 5, failed: 2 })).toEqual({
      title: "Nettoyage terminé avec vérifications",
      detail: "2 dossier(s) à vérifier",
      text: "5 dossier(s) placé(s) en quarantaine · 2 à vérifier.",
      tone: "warning",
    });
  });
});

describe("quarantineSummary — désinstallation groupée", () => {
  it("sans échec", () => {
    expect(quarantineSummary({ moved: 3, failed: 0, batch: true })).toEqual({
      title: "Nettoyage terminé",
      detail: "3 dossier(s) en quarantaine réversible",
      text: "3 dossier(s) en quarantaine réversible",
      tone: "complete",
    });
  });

  it("avec échecs", () => {
    expect(quarantineSummary({ moved: 5, failed: 2, batch: true })).toEqual({
      title: "Nettoyage terminé avec vérifications",
      detail: "2 dossier(s) à vérifier",
      text: "5 dossier(s) en quarantaine · 2 à vérifier",
      tone: "warning",
    });
  });
});

describe("quarantineSummary — entrées incomplètes", () => {
  it("traite l'absence de valeur comme zéro", () => {
    const resume = quarantineSummary({});
    expect(resume.title).toBe("Nettoyage terminé");
    expect(resume.text).toBe("0 dossier(s) placé(s) en quarantaine réversible.");
  });

  it("ne casse pas sur un appel sans argument", () => {
    expect(() => quarantineSummary()).not.toThrow();
  });

  it("ignore une valeur non numérique", () => {
    expect(quarantineSummary({ moved: "trois", failed: null }).text).toBe(
      "0 dossier(s) placé(s) en quarantaine réversible."
    );
  });
});

describe("les chaînes restent des clés du dictionnaire anglais", () => {
  // Ces phrases sont traduites à l'exécution par correspondance exacte, ou par
  // la décomposition « compteur en tête » de i18n.js. En modifier une ici la
  // ferait retomber en français dans l'interface anglaise.
  const i18n = readFileSync(new URL("../../i18n.js", import.meta.url), "utf8");

  const attendues = [
    "Nettoyage terminé",
    "Nettoyage terminé avec vérifications",
    "dossier(s) à vérifier",
    "dossier(s) en quarantaine réversible",
    "dossier(s) placé(s) en quarantaine réversible.",
  ];

  for (const phrase of attendues) {
    it(`« ${phrase} » a une entrée`, () => {
      expect(i18n.includes(`"${phrase}"`), `entrée manquante dans i18n.js`).toBe(true);
    });
  }
});
