import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Contrat des messages hôte → interface (lot 2).
 *
 * Les messages envoyés par l'hôte C# entrent tous par `handleInstallMessage`
 * (beta/src/app/legacy.js), qui délègue à dix fonctions de domaine déclarées
 * dans `MESSAGE_DOMAINS`. Rien ne garantissait que les deux côtés de cette
 * frontière parlent de la même chose.
 *
 * Un type émis sans branche correspondante ne provoque aucune erreur : le
 * message est simplement ignoré et la fonctionnalité ne fait rien — le pire
 * genre de panne, silencieuse.
 *
 * Le découpage du routeur (4.0.0-beta.58) ouvre une SECONDE panne silencieuse :
 * une branche peut exister dans une fonction de domaine sans figurer dans la
 * table, et le répartiteur ne l'appellera jamais. Le test « la table décrit
 * exactement le code » compare les deux, domaine par domaine.
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

/** Corps d'une fonction de premier niveau, accolade fermante exclue. */
function corpsDeFonction(source, nom) {
  const debut = source.indexOf(`\nfunction ${nom}(`);
  if (debut < 0) return null;
  return source.slice(debut, source.indexOf("\n}", debut + 1));
}

/** La table des domaines, telle qu'elle est écrite dans le code. */
function tableDesDomaines(source) {
  const depart = source.indexOf("const MESSAGE_DOMAINS = [");
  const bloc = source.slice(depart, source.indexOf("\n];", depart));
  const table = [];
  for (const [, nom, liste] of bloc.matchAll(/\{\s*run:\s*(\w+),\s*types:\s*\[([^\]]*)\]/g)) {
    table.push({ nom, types: [...liste.matchAll(/"([^"]+)"/g)].map(([, t]) => t) });
  }
  return table;
}

const table = tableDesDomaines(legacy);
const traites = typesTraites(legacy);
const emis = typesEmis(native);

describe("contrat des messages hôte → interface", () => {
  it("la table des domaines est lisible et non vide", () => {
    // Garde-fou du test lui-même : si l'extraction cassait, les comparaisons
    // ci-dessous passeraient à vide, donc à tort.
    expect(table.length, "MESSAGE_DOMAINS introuvable ou illisible").toBeGreaterThan(5);
    for (const { nom, types } of table) {
      expect(types.length, `le domaine ${nom} ne déclare aucun type`).toBeGreaterThan(0);
      expect(corpsDeFonction(legacy, nom), `fonction ${nom} introuvable`).toBeTruthy();
    }
  });

  it("la table décrit exactement le code de chaque domaine", () => {
    // Un type déclaré sans branche est du routage vers rien ; une branche non
    // déclarée est du code mort que le répartiteur n'atteindra jamais.
    for (const { nom, types } of table) {
      const reels = [...typesTraites(corpsDeFonction(legacy, nom))].sort();
      expect(
        [...types].sort(),
        `la table de ${nom} ne correspond pas aux branches de sa fonction`
      ).toEqual(reels);
    }
  });

  it("aucun type n'est réclamé par deux domaines", () => {
    // Le premier domaine listé gagnerait : le second serait mort en silence.
    const vus = new Map();
    const doublons = [];
    for (const { nom, types } of table) {
      for (const type of types) {
        if (vus.has(type)) doublons.push(`${type} (${vus.get(type)} et ${nom})`);
        vus.set(type, nom);
      }
    }
    expect(doublons, `types réclamés deux fois : ${doublons.join(", ")}`).toEqual([]);
  });

  it("aucune branche ne vit hors des fonctions de domaine", () => {
    // Si un second dispatcher apparaît ailleurs, les tests suivants deviennent
    // faux sans prévenir.
    let dehors = legacy;
    for (const { nom } of table) dehors = dehors.replace(corpsDeFonction(legacy, nom), "");
    expect([...typesTraites(dehors)], "des branches message.type vivent hors des domaines").toEqual(
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
    expect(traites.size).toBeGreaterThan(80);
    expect(emis.size).toBeGreaterThan(80);
  });
});
