/**
 * Transforme `catalog/apps.json` en un script classique injectable AVANT
 * `app.js` :
 *
 *   <script src="catalog.generated.js"></script>
 *   <script src="app.js"></script>
 *
 * `app.js` contient deja le point d'entree :
 *   if (Array.isArray(window.PC_SETUP_CATALOG) && window.PC_SETUP_CATALOG.length) {
 *     apps.splice(0, apps.length, ...window.PC_SETUP_CATALOG);
 *   }
 *
 * Etape du plan : une fois cette generation branchee dans build.ps1 et couverte
 * par le test de parite catalogue, le bloc `const apps` peut disparaitre de
 * app.js.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const IN = fileURLToPath(new URL("../catalog/apps.json", import.meta.url));
const OUT = fileURLToPath(new URL("../catalog/catalog.generated.js", import.meta.url));

const catalog = JSON.parse(readFileSync(IN, "utf8"));
const apps = catalog.applications.map((app) => {
  const { logo, ...rest } = app;
  return rest;
});

const banner =
  "/* Genere par beta/scripts/build-catalog.mjs a partir de catalog/apps.json. Ne pas editer. */\n";
const body = `window.PC_SETUP_CATALOG = ${JSON.stringify(apps, null, 2)};\n`;

writeFileSync(OUT, banner + body);
console.log(`Ecrit ${OUT} (${apps.length} applications)`);
