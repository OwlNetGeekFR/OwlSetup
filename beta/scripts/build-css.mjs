// Assemble ../../styles.css par concaténation des partiels de ../src/styles/.
//
// Concaténation volontaire (pas de bundler, pas de minification), pour les
// mêmes raisons que build-js.mjs : la sortie reste lisible et diffable. La
// feuille est chargée depuis un hôte virtuel local (`pcsetup.local`) par
// WebView2, jamais sur le réseau — minifier ne ferait gagner aucun temps de
// chargement et compliquerait le débogage. L'hôte C# vérifie le SHA-256 de ce
// styles.css : le build doit donc le régénérer de façon déterministe.
//
// L'ORDRE DES PARTIELS EST SIGNIFIANT. La feuille s'est construite par
// accumulation : les surcharges du thème clair, de l'accessibilité et des
// contrastes s'appuient sur le fait d'arriver APRÈS les règles de base, à
// spécificité parfois égale. Réordonner les fichiers change le rendu. Le
// préfixe numérique rend cet ordre explicite.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (relative) => fileURLToPath(new URL(relative, import.meta.url));

export const PARTIELS = [
  "01-fondations.css",
  "02-catalogue-et-recherche.css",
  "03-confort-visuel.css",
  "04-centres-et-panneaux.css",
  "05-assistance-et-diagnostics.css",
  "06-theme-clair.css",
  "07-theme-clair-harmonisation.css",
  "08-entretien-planifie.css",
  "09-accessibilite.css",
  "10-contrastes-aa.css",
];

export const BANNIERE =
  "/* Genere par beta/scripts/build-css.mjs depuis beta/src/styles/. Ne pas editer a la main. */";

export function assembler() {
  const morceaux = PARTIELS.map((nom) => readFileSync(here(`../src/styles/${nom}`), "utf8"));
  return `${BANNIERE}\n${morceaux.join("\n")}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sortie = assembler();
  writeFileSync(here("../../styles.css"), sortie);
  const regles = (sortie.match(/^[^\s@/].*\{\s*$/gm) || []).length;
  console.log(
    `Ecrit styles.css (${PARTIELS.length} partiels, ${sortie.split("\n").length} lignes, ~${regles} regles de niveau 0)`
  );
}
