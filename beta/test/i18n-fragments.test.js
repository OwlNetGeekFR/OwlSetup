import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Fragments de tête du dictionnaire (lot 8).
 *
 * L'hôte C# construit beaucoup de messages par concaténation : `"Dossier
 * restauré : "` suivi d'un chemin, `"Analyse de "` suivi d'un nom. Le littéral
 * finit alors par une espace, et `translateFragmentPrefix` s'en sert pour le
 * reconnaître comme un préfixe plutôt que comme une phrase complète.
 *
 * Cette espace doit exister **des deux côtés**. Une traduction qui la perd
 * produit « Folder restored:C:\\Temp » — un défaut discret, qui ne casse rien
 * et que personne ne signale. Ce test le rend impossible.
 */

const i18n = readFileSync(new URL("../../i18n.js", import.meta.url), "utf8");

/** Le dictionnaire anglais, clés et valeurs, tel qu'il est écrit dans i18n.js. */
function dictionnaire() {
  const entrees = new Map();
  // Une entrée par ligne : "clé française": "traduction",
  for (const [, cle, valeur] of i18n.matchAll(
    /^\s*"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)",?\s*$/gm
  )) {
    try {
      entrees.set(JSON.parse(`"${cle}"`), JSON.parse(`"${valeur}"`));
    } catch {
      /* littéral non reconstructible : ignoré */
    }
  }
  return entrees;
}

const entrees = dictionnaire();

describe("fragments de tête", () => {
  it("le dictionnaire est lisible", () => {
    // Garde-fou du test : si l'extraction cassait, tout passerait à vide.
    expect(entrees.size).toBeGreaterThan(1000);
  });

  it("une clé qui finit par une espace a une traduction qui finit par une espace", () => {
    const perdues = [...entrees]
      .filter(([cle, valeur]) => /\s$/.test(cle) && !/\s$/.test(valeur))
      .map(([cle, valeur]) => `${JSON.stringify(cle)} → ${JSON.stringify(valeur)}`);
    expect(perdues, `l'espace finale disparaît : ${perdues.join(", ")}`).toEqual([]);
  });

  it("une traduction qui finit par une espace vient bien d'une clé fragment", () => {
    // L'inverse est tout aussi faux : une espace ajoutée à une phrase complète
    // produirait « Scan complete. » suivi d'un blanc parasite.
    const ajoutees = [...entrees]
      .filter(([cle, valeur]) => !/\s$/.test(cle) && /\s$/.test(valeur))
      .map(([cle, valeur]) => `${JSON.stringify(cle)} → ${JSON.stringify(valeur)}`);
    expect(ajoutees, `espace finale ajoutée sans raison : ${ajoutees.join(", ")}`).toEqual([]);
  });

  it("il existe bien des fragments à garder", () => {
    // Si le mécanisme disparaissait, les deux contrôles ci-dessus passeraient à
    // vide sans rien dire.
    const fragments = [...entrees.keys()].filter((cle) => /\s$/.test(cle));
    expect(fragments.length).toBeGreaterThan(30);
  });

  it("i18n.js applique bien la décomposition de fragment", () => {
    expect(i18n).toContain("function translateFragmentPrefix(source)");
    expect(i18n).toContain("const prefixe = translateFragmentPrefix(source);");
  });
});
