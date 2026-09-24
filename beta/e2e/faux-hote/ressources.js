import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Ce que l'hôte virtuel `pcsetup.local` sert réellement.
 *
 * L'hôte C# ne sert pas le dépôt : il sert `AppRoot`, un dossier qu'il remplit
 * au démarrage en extrayant ses ressources embarquées (`Bootstrap.Extract`).
 * Un fichier présent dans le dépôt mais jamais extrait donne une 404 dans
 * l'application, et un fichier extrait sous un autre nom que celui que
 * `index.html` demande aussi — c'est le cas du logo, embarqué depuis
 * `owlsetup-logo-512.png` et servi comme `owlsetup-logo.png`.
 *
 * La carte est donc LUE dans les deux déclarations qui font foi, pas recopiée :
 *  - `beta/csharp/OwlSetup.csproj` : fichier du dépôt → nom logique ;
 *  - `OwlSetupWebView.cs` : nom logique → chemin sous `AppRoot`.
 * (`tests/Test-BuildParity.ps1` garde déjà le `.csproj` aligné sur `build.ps1`.)
 */

export const RACINE_DU_DEPOT = fileURLToPath(new URL("../../../", import.meta.url));

const PROJET = path.join(RACINE_DU_DEPOT, "beta/csharp/OwlSetup.csproj");
const HOTE = path.join(RACINE_DU_DEPOT, "OwlSetupWebView.cs");

/** Nom logique → fichier du dépôt, pour les ressources déclarées une à une. */
function sourcesDesRessources(projet) {
  const sources = new Map();
  const motif = /<EmbeddedResource Include="([^"*]+)"><LogicalName>([^<]+)<\/LogicalName>/g;
  for (const [, inclus, logique] of projet.matchAll(motif)) {
    sources.set(logique, path.resolve(path.dirname(PROJET), inclus.replaceAll("\\", "/")));
  }
  return sources;
}

/**
 * @returns {Map<string, string>} chemin servi (sans `/` initial) → fichier du dépôt
 */
export function carteDesRessources() {
  const projet = readFileSync(PROJET, "utf8");
  const hote = readFileSync(HOTE, "utf8");
  const sources = sourcesDesRessources(projet);
  const carte = new Map();

  const extraction = /Extract\("([^"]+)",\s*Path\.Combine\(AppRoot,\s*([^)]*)\)\)/g;
  for (const [, logique, segments] of hote.matchAll(extraction)) {
    const servi = [...segments.matchAll(/"([^"]+)"/g)].map(([, segment]) => segment).join("/");
    const source = sources.get(logique);
    if (!source) throw new Error(`« ${logique} » est extrait par l'hôte mais absent du .csproj`);
    carte.set(servi, source);
  }

  // Les logos passent par ExtractLogos : chaque ressource « logos.<fichier> »
  // (joker du .csproj) est recopiée dans assets/logos/. Les deux moitiés sont
  // vérifiées avant d'en déduire quoi que ce soit.
  const logosEmbarques =
    /<EmbeddedResource Include="\.\.\\\.\.\\assets\\logos\\\*\.\*">\s*<LogicalName>logos\.%\(Filename\)%\(Extension\)<\/LogicalName>/.test(
      projet
    );
  const logosExtraits =
    hote.includes('Path.Combine(AppRoot,"assets","logos")') &&
    hote.includes('name.StartsWith("logos.",StringComparison.Ordinal)');
  if (!logosEmbarques || !logosExtraits) {
    throw new Error("l'embarquement ou l'extraction des logos a changé : adapter ressources.js");
  }
  const dossierLogos = path.join(RACINE_DU_DEPOT, "assets/logos");
  for (const fichier of readdirSync(dossierLogos)) {
    carte.set(`assets/logos/${fichier}`, path.join(dossierLogos, fichier));
  }

  for (const [servi, source] of carte) {
    if (!existsSync(source)) throw new Error(`${servi} : fichier source introuvable (${source})`);
  }
  return carte;
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".ps1": "text/plain; charset=utf-8",
};

export function typeDeContenu(fichier) {
  return TYPES[path.extname(fichier).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Actions que `OnWebMessage` accepte. Toute autre action lève « Action
 * inconnue. » côté hôte : le faux hôte doit la refuser de la même façon.
 */
export function actionsConnuesDeLHote() {
  const hote = readFileSync(HOTE, "utf8");
  const debut = hote.indexOf("void OnWebMessage(");
  const fin = hote.indexOf('throw new InvalidOperationException("Action inconnue.")', debut);
  if (debut < 0 || fin < 0) throw new Error("OnWebMessage introuvable dans OwlSetupWebView.cs");
  const routeur = hote.slice(debut, fin);
  return new Set(
    [...routeur.matchAll(/action\s*==\s*"([a-z0-9-]+)"/g)].map(([, action]) => action)
  );
}
