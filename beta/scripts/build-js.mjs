// Assemble ../../app.js : d'abord les modules purs importés, puis le corps
// historique de l'interface (beta/src/app/legacy.js), le tout dans une IIFE.
//
// Concaténation volontaire (pas de bundler) : la sortie reste lisible et
// diffable, et `legacy.js` y apparaît verbatim — ce qui préserve les tests de
// parité et les contrôles de présence côté PowerShell pendant la migration
// incrémentale (lot 2). L'hôte C# vérifie le SHA-256 de cet app.js : le build
// doit donc le régénérer de façon déterministe.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (relative) => fileURLToPath(new URL(relative, import.meta.url));

// Modules purs (de ../src/modules/) inlinés en tête, dans l'ordre. Chaque entrée
// ajoutée ici doit s'accompagner du retrait du code équivalent dans legacy.js
// (sinon double déclaration).
const MODULES = [
  "../src/modules/escape-html.js",
  "../src/modules/package-id.js",
  "../src/modules/winget-brand.js",
];

/**
 * Transforme un module ES en code inlinable dans l'IIFE :
 *  - `export function/const/... ` -> retire `export `
 *  - `export default function/class ` -> retire `export default `
 *  - lignes `export default <ident>;` et `export { ... };` -> supprimées
 *    (ré-exports inutiles une fois le code inline).
 */
function stripExports(source) {
  return source
    .split("\n")
    .filter((line) => !/^\s*export\s*\{[^}]*\}\s*;?\s*$/.test(line))
    .filter((line) => !/^\s*export\s+default\s+[A-Za-z_$][\w$]*\s*;?\s*$/.test(line))
    .map((line) => line.replace(/^(\s*)export\s+default\s+(?=function\b|class\b)/, "$1"))
    .map((line) =>
      line.replace(/^(\s*)export\s+(?=(?:const|let|var|function|class|async)\b)/, "$1")
    )
    .join("\n");
}

// Pas de `"use strict"` : `legacy.js` est un script historique en mode
// « sloppy ». L'envelopper dans une IIFE sans directive stricte garde une
// sémantique identique (l'IIFE ne fait que fermer le scope). Les modules ES
// inlinés plus tard sont stricts par nature, sans imposer le mode au reste.
const out = [];
out.push(
  "/* Genere par beta/scripts/build-js.mjs depuis beta/src/app/. Ne pas editer a la main. */"
);
out.push("(function () {");
for (const relativePath of MODULES) {
  out.push(`// ----- ${relativePath} -----`);
  out.push(stripExports(readFileSync(here(relativePath), "utf8").trim()));
  out.push("");
}
out.push("// ----- beta/src/app/legacy.js -----");
out.push(readFileSync(here("../src/app/legacy.js"), "utf8").trimEnd());
out.push("})();");
out.push("");

writeFileSync(here("../../app.js"), out.join("\n"), "utf8");
console.log(`Ecrit app.js (${MODULES.length} module(s) inline + legacy.js)`);
