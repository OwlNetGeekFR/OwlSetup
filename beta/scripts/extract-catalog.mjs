/**
 * Extrait le catalogue d'applications encore code en dur dans `../app.js`
 * (`const apps`, `apps.push(...)`, table `appLogos`) vers un fichier de donnees
 * unique : `beta/catalog/apps.json`.
 *
 *   node scripts/extract-catalog.mjs           # (re)genere apps.json
 *   node scripts/extract-catalog.mjs --check   # echoue si apps.json a derive
 *
 * Objectif du plan : `app.js` chargera ce JSON via `window.PC_SETUP_CATALOG`
 * (le point d'extension existe deja dans le fichier), et les contributions au
 * catalogue deviendront de simples modifications de donnees, verifiables en CI.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT_APP_JS = fileURLToPath(new URL("../../app.js", import.meta.url));
const OUT = fileURLToPath(new URL("../catalog/apps.json", import.meta.url));
const CHECK = process.argv.includes("--check");

const source = readFileSync(ROOT_APP_JS, "utf8");

const appsStart = source.indexOf("const apps = [");
const appsEnd = source.indexOf("\nif (Array.isArray(window.PC_SETUP_CATALOG)", appsStart);
if (appsStart < 0 || appsEnd < 0) {
  throw new Error("Bloc `const apps` introuvable dans app.js (structure modifiee ?)");
}
const appsBlock = source.slice(appsStart, appsEnd);

const logosStart = source.indexOf("const appLogos");
const logosEnd = source.indexOf("};", logosStart) + 2;
if (logosStart < 0 || logosEnd < 1) {
  throw new Error("Bloc `const appLogos` introuvable dans app.js");
}
const logosBlock = source.slice(logosStart, logosEnd);

const build = new Function(`
  ${appsBlock}
  ${logosBlock}
  apps.forEach(app => app.logo = app.logo || (appLogos[app.id] ? "assets/logos/" + appLogos[app.id] : ""));
  return { apps, appLogos };
`);

const { apps, appLogos } = build();

const missingLogos = apps.filter((app) => !app.logo && !app.webService).map((app) => app.id);
const orphanLogos = Object.keys(appLogos).filter((id) => !apps.some((app) => app.id === id));

const catalog = {
  $schema: "./catalog.schema.json",
  generatedFrom: "app.js",
  note: "Fichier genere par beta/scripts/extract-catalog.mjs — ne pas editer a la main tant que app.js reste la source.",
  count: apps.length,
  applications: apps
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((app) => ({
      id: app.id,
      name: app.name,
      category: app.category,
      desc: app.desc,
      icon: app.icon,
      color: app.color,
      site: app.site,
      logo: app.logo || "",
      ...(app.tags ? { tags: app.tags } : {}),
      ...(app.source ? { source: app.source } : {}),
      ...(app.repairMode ? { repairMode: app.repairMode } : {}),
      ...(app.portable ? { portable: true } : {}),
      ...(app.launchable ? { launchable: true } : {}),
      ...(app.manualInstall ? { manualInstall: true } : {}),
      ...(app.manualInstallUrl ? { manualInstallUrl: app.manualInstallUrl } : {}),
      ...(app.webService ? { webService: true } : {}),
      ...(app.systemComponent ? { systemComponent: true } : {}),
    })),
};

const serialized = JSON.stringify(catalog, null, 2) + "\n";

if (CHECK) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    console.error("apps.json absent — lancez `npm run catalog:extract`.");
    process.exit(1);
  }
  if (current !== serialized) {
    console.error(
      "apps.json a derive de app.js — lancez `npm run catalog:extract` et validez le diff."
    );
    process.exit(1);
  }
  console.log(`OK — apps.json synchronise avec app.js (${apps.length} applications).`);
} else {
  writeFileSync(OUT, serialized);
  console.log(`Ecrit ${OUT}`);
  console.log(`  ${apps.length} applications`);
  if (missingLogos.length) console.log(`  logo manquant : ${missingLogos.join(", ")}`);
  if (orphanLogos.length) console.log(`  logo orphelin : ${orphanLogos.join(", ")}`);
}
