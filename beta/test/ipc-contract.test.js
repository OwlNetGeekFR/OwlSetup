import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Contrat des messages hôte → interface (lot 2).
 *
 * `handleInstallMessage` (beta/src/app/legacy.js) est le SEUL point d'entrée
 * des messages envoyés par l'hôte C# : 97 branches `message.type === "..."`.
 * Rien ne garantissait jusqu'ici que les deux côtés parlent de la même chose.
 *
 * Un type émis sans branche correspondante ne provoque aucune erreur : le
 * message est simplement ignoré, et la fonctionnalité ne fait rien — le pire
 * genre de panne, silencieuse. Ce test tient les deux côtés ensemble, et servira
 * de filet quand ce routeur de 827 lignes sera découpé.
 */

const legacy = readFileSync(new URL("../src/app/legacy.js", import.meta.url), "utf8");
const native = readFileSync(new URL("../../OwlSetupWebView.cs", import.meta.url), "utf8");

/** Types pour lesquels l'interface a une branche. */
function typesTraites(source) {
  const out = new Set();
  for (const [, type] of source.matchAll(/message\.type\s*===?\s*"([^"]+)"/g)) out.add(type);
  return out;
}

/**
 * Types que l'hôte envoie. Deux formes coexistent dans OwlSetupWebView.cs :
 * l'initialiseur d'objet `new { type="x", ... }` et l'affectation de
 * dictionnaire `snapshot["type"]="x"`. N'en chercher qu'une laisse croire à un
 * handler mort.
 */
function typesEmis(source) {
  const out = new Set();
  for (const [, type] of source.matchAll(/\btype\s*=\s*"([a-z0-9-]+)"/g)) out.add(type);
  for (const [, type] of source.matchAll(/\["type"\]\s*=\s*"([a-z0-9-]+)"/g)) out.add(type);
  return out;
}

const traites = typesTraites(legacy);
const emis = typesEmis(native);

describe("contrat des messages hôte → interface", () => {
  it("le routeur reste le seul point d'entrée", () => {
    // Si un second dispatcher apparaît, ce test devient faux sans prévenir :
    // on vérifie donc que toutes les branches sont bien dans cette fonction.
    const debut = legacy.indexOf("function handleInstallMessage(");
    expect(debut, "handleInstallMessage introuvable").toBeGreaterThan(-1);
    const fin = legacy.indexOf("\n}", debut);
    const dehors = legacy.slice(0, debut) + legacy.slice(fin);
    expect([...typesTraites(dehors)], "des branches message.type vivent hors du routeur").toEqual(
      []
    );
  });

  it("chaque type émis par l'hôte est traité par l'interface", () => {
    const orphelins = [...emis].filter((type) => !traites.has(type)).sort();
    expect(
      orphelins,
      `l'hôte envoie ces messages que personne ne traite : ${orphelins.join(", ")}`
    ).toEqual([]);
  });

  it("chaque type traité par l'interface est émis par l'hôte", () => {
    const morts = [...traites].filter((type) => !emis.has(type)).sort();
    expect(morts, `ces branches ne peuvent jamais s'exécuter : ${morts.join(", ")}`).toEqual([]);
  });

  it("le contrat couvre bien l'ensemble des messages", () => {
    // Garde-fou du test lui-même : si une extraction cassait, les ensembles
    // deviendraient vides et les deux contrôles ci-dessus passeraient à tort.
    expect(traites.size).toBeGreaterThan(80);
    expect(emis.size).toBeGreaterThan(80);
  });
});
