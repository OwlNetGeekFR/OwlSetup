/**
 * Transforme `catalog/apps.json` en un script classique injecte AVANT `app.js`
 * a la racine du depot :
 *
 *   <script src="catalog.generated.js"></script>
 *   <script src="app.js"></script>
 *
 * `app.js` contient deja le point d'entree :
 *   if (Array.isArray(window.PC_SETUP_CATALOG) && window.PC_SETUP_CATALOG.length) {
 *     apps.splice(0, apps.length, ...window.PC_SETUP_CATALOG);
 *   }
 *
 * Le bloc `const apps` reste dans app.js comme repli : si le script genere
 * n'est pas charge, l'application fonctionne avec le catalogue embarque.
 *
 *   node scripts/build-catalog.mjs            # (re)genere ../../catalog.generated.js
 *   node scripts/build-catalog.mjs --check    # echoue si le fichier a derive
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const IN = fileURLToPath(new URL("../catalog/apps.json", import.meta.url));
const OUT = fileURLToPath(new URL("../../catalog.generated.js", import.meta.url));
const CHECK = process.argv.includes("--check");

const catalog = JSON.parse(readFileSync(IN, "utf8"));
const apps = catalog.applications.map((app) => {
  // Le logo est reapplique par app.js depuis la table `appLogos` : on ne le
  // duplique pas ici.
  const { logo: _logo, ...rest } = app;
  return rest;
});

const banner =
  "/* Genere par beta/scripts/build-catalog.mjs depuis beta/catalog/apps.json. Ne pas editer a la main. */\n";
const serialized = banner + `window.PC_SETUP_CATALOG = ${JSON.stringify(apps, null, 2)};\n`;

if (CHECK) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    console.error("catalog.generated.js absent — lancez `npm run catalog:build`.");
    process.exit(1);
  }
  if (current !== serialized) {
    console.error(
      "catalog.generated.js a derive de apps.json — lancez `npm run catalog:build` et validez le diff."
    );
    process.exit(1);
  }
  console.log(`OK — catalog.generated.js synchronise (${apps.length} applications).`);
} else {
  writeFileSync(OUT, serialized);
  console.log(`Ecrit ${OUT} (${apps.length} applications)`);
}
