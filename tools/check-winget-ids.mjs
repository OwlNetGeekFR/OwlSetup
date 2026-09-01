// Les identifiants du catalogue existent-ils encore chez WinGet ?
//
// Rien ne le vérifiait. Un paquet renommé ou retiré du dépôt officiel reste
// affiché comme installable par OwlSetup, et l'installation échoue chez
// l'utilisateur — sur 93 applications, ce n'est qu'une question de temps.
//
// `winget.exe` n'est pas disponible de façon fiable sur un runner GitHub : on
// interroge donc directement le dépôt de manifestes `microsoft/winget-pkgs`,
// qui est la source dont winget lui-même se sert.
//
//   node tools/check-winget-ids.mjs           # rapport lisible
//   node tools/check-winget-ids.mjs --check   # code 1 si un identifiant manque
//
// Ce contrôle est le seul du dépôt à dépendre du réseau. Il vit donc à part des
// contrôles hors-ligne de `check-catalog.mjs`, et tourne aussi à intervalle
// régulier : un paquet disparaît sans qu'on ait rien changé.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const catalogue = JSON.parse(fs.readFileSync(path.join(root, "beta", "catalog", "apps.json"), "utf8"));
const applications = catalogue.applications || catalogue;

/**
 * Un identifiant « Publisher.Package[.Variante] » se traduit en chemin :
 * `manifests/<initiale minuscule>/<segments séparés par des barres>`.
 *
 * Les cas tordus du catalogue passent : `Notepad++.Notepad++`,
 * `OpenJS.NodeJS.LTS`, `Microsoft.VCRedist.2015+.x64`.
 */
function cheminManifeste(id) {
  return `manifests/${id[0].toLowerCase()}/${id.split(".").join("/")}`;
}

function jeton() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const strict = process.argv.includes("--check");
const token = jeton();

// Sans jeton, l'API limite à 60 requêtes par heure : le contrôle serait
// tronqué et raconterait n'importe quoi. Mieux vaut le dire.
if (!token) {
  const message =
    "Aucun jeton GitHub (GITHUB_TOKEN ou `gh auth token`) : 93 requêtes dépasseraient la limite anonyme.";
  if (strict) {
    console.error(message);
    process.exit(1);
  }
  console.log(`Identifiants WinGet : contrôle ignoré. ${message}`);
  process.exit(0);
}

// Toutes les entrées ne passent pas par WinGet, et les interroger produirait
// autant de fausses alertes — douze au premier essai :
//
//   - `manualInstall: true` : installation guidée vers le site de l'éditeur
//     (`guided.RustDesk`, `VMware.WorkstationPro`) ou application web
//     (`web.GoogleGemini`). Leur identifiant est interne à OwlSetup et n'a
//     jamais existé chez WinGet ;
//   - `source: "msstore"` : le paquet vit dans le Microsoft Store, pas dans
//     winget-pkgs.
const aVerifier = applications.filter(
  (app) => app.id && app.source !== "msstore" && app.manualInstall !== true
);

const absents = [];
const erreurs = [];

for (const app of aVerifier) {
  const url = `https://api.github.com/repos/microsoft/winget-pkgs/contents/${cheminManifeste(app.id)}`;
  let reponse;
  try {
    reponse = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "OwlSetup-catalog-check" },
    });
  } catch (cause) {
    erreurs.push(`${app.id} : ${cause.message}`);
    continue;
  }
  if (reponse.status === 404) {
    absents.push(app.id);
  } else if (!reponse.ok) {
    // Une limite atteinte ou une panne de l'API n'est pas un identifiant
    // invalide : la distinguer evite d'accuser le catalogue a tort.
    erreurs.push(`${app.id} : HTTP ${reponse.status}`);
  }
}

console.log(`Identifiants WinGet : ${aVerifier.length - absents.length}/${aVerifier.length} trouvés dans microsoft/winget-pkgs.`);

if (absents.length) {
  console.error(`\n${absents.length} identifiant(s) introuvable(s) — OwlSetup les propose et l'installation échouerait :`);
  for (const id of absents) console.error(`  ${id}`);
}
if (erreurs.length) {
  console.error(`\n${erreurs.length} contrôle(s) n'ont pas abouti (réseau ou quota, pas un défaut du catalogue) :`);
  for (const erreur of erreurs) console.error(`  ${erreur}`);
}

if (strict && (absents.length || erreurs.length)) process.exit(1);
