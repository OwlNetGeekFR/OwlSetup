/**
 * Transforme `catalog/apps.json` en un script classique injecte AVANT `app.js`
 * a la racine du depot :
 *
 *   <script src="catalog.generated.js"></script>
 *   <script src="app.js"></script>
 *
 * `app.js` contient deja le point d'entree :
 *   const apps = Array.isArray(window.PC_SETUP_CATALOG)
 *     ? window.PC_SETUP_CATALOG.map(app => ({ ...app }))
 *     : [];
 *
 * `apps.json` est la SEULE source de verite : chaque entree porte son `logo`
 * (`assets/logos/<fichier>`) et le script genere le transporte tel quel. Il n'y
 * a plus de table `appLogos` a maintenir en parallele dans app.js.
 *
 *   node scripts/build-catalog.mjs            # (re)genere ../../catalog.generated.js
 *   node scripts/build-catalog.mjs --check    # echoue si le fichier a derive
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const IN = fileURLToPath(new URL("../catalog/apps.json", import.meta.url));
const OUT = fileURLToPath(new URL("../../catalog.generated.js", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CHECK = process.argv.includes("--check");

// Doit rester aligne avec l'enum `category` de catalog.schema.json.
const CATEGORIES = [
  "Navigateurs",
  "Utilitaires",
  "Multimédia",
  "Bureautique",
  "Communication",
  "Gaming",
  "Développement",
  "Composants",
  "Sécurité",
  "Internet",
  "Création",
  "Virtualisation",
  "Intelligence artificielle",
];

const catalog = JSON.parse(readFileSync(IN, "utf8"));

/**
 * Controles de coherence qui ne sont pas exprimables (ou pas lisibles) en JSON
 * Schema : identifiants uniques, `count` aligne, categorie connue, fichier logo
 * present sur le disque. Le schema lui-meme reste verifie par
 * `test/catalog-schema.test.js`.
 */
function lint(cat) {
  const errors = [];
  const apps = Array.isArray(cat.applications) ? cat.applications : [];
  if (!apps.length) errors.push("`applications` est vide.");

  if (typeof cat.count === "number" && cat.count !== apps.length) {
    errors.push(`\`count\` = ${cat.count} mais ${apps.length} applications listees.`);
  }

  const seen = new Set();
  for (const app of apps) {
    const id = app && app.id;
    if (!id) {
      errors.push("Une entree n'a pas d'`id`.");
      continue;
    }
    const key = String(id).toLowerCase();
    if (seen.has(key)) errors.push(`Identifiant duplique : ${id}`);
    seen.add(key);

    if (app.category && !CATEGORIES.includes(app.category)) {
      errors.push(`${id} : categorie inconnue « ${app.category} » (voir catalog.schema.json).`);
    }

    if (!app.logo) {
      errors.push(`${id} : champ \`logo\` manquant (attendu \`assets/logos/<fichier>\`).`);
    } else if (!/^assets\/logos\/[^/]+\.(svg|png|ico)$/.test(app.logo)) {
      errors.push(
        `${id} : \`logo\` doit etre \`assets/logos/<fichier>.(svg|png|ico)\`, recu « ${app.logo} ».`
      );
    } else if (!existsSync(join(REPO_ROOT, app.logo))) {
      errors.push(`${id} : fichier logo absent du depot (${app.logo}).`);
    }
  }
  return errors;
}

const problems = lint(catalog);
if (problems.length) {
  console.error("Catalogue invalide :\n  - " + problems.join("\n  - "));
  process.exit(1);
}

const banner =
  "/* Genere par beta/scripts/build-catalog.mjs depuis beta/catalog/apps.json. Ne pas editer a la main. */\n";
const serialized =
  banner + `window.PC_SETUP_CATALOG = ${JSON.stringify(catalog.applications, null, 2)};\n`;

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
  console.log(
    `OK — catalog.generated.js synchronise (${catalog.applications.length} applications).`
  );
} else {
  writeFileSync(OUT, serialized);
  console.log(`Ecrit ${OUT} (${catalog.applications.length} applications)`);
}
