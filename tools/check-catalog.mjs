// Contrôle du catalogue OwlSetup.
//
// Depuis 4.0.0-beta.11, la source de vérité est `beta/catalog/apps.json`
// (validé par `beta/catalog/catalog.schema.json`). Ce script vérifie ce fichier
// et sa cohérence avec `catalog.generated.js` (le script chargé au runtime).

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const appsJsonPath = path.join(root, "beta", "catalog", "apps.json");
const generatedPath = path.join(root, "catalog.generated.js");

const errors = [];
const warnings = [];

if (!fs.existsSync(appsJsonPath)) {
  console.error("beta/catalog/apps.json est introuvable.");
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(appsJsonPath, "utf8"));
const applications = Array.isArray(catalog.applications) ? catalog.applications : [];

const seen = new Set();
for (const app of applications) {
  const id = app?.id ?? "";
  const key = String(id).toLowerCase();
  if (seen.has(key)) errors.push(`Identifiant dupliqué : ${id}`);
  seen.add(key);
  if (!/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(id)) errors.push(`Identifiant invalide : ${id}`);
  if (!/^https:\/\//i.test(app?.site ?? "")) errors.push(`URL non sécurisée : ${app?.site} (${id})`);
  if (app?.manualInstallUrl && !/^https:\/\//i.test(app.manualInstallUrl)) {
    errors.push(`URL manuelle non sécurisée : ${app.manualInstallUrl} (${id})`);
  }
  if (app?.logo) {
    const logoPath = path.join(root, app.logo.replace(/^assets\//, "assets" + path.sep));
    if (!fs.existsSync(logoPath)) errors.push(`Logo introuvable : ${app.logo} (${id})`);
  }
}
if (applications.length < 90) warnings.push(`Catalogue anormalement court : ${applications.length} applications`);

// Cohérence avec le script généré chargé au runtime.
if (fs.existsSync(generatedPath)) {
  const generated = fs.readFileSync(generatedPath, "utf8");
  const runtimeIds = [...generated.matchAll(/"id":\s*"([^"]+)"/g)].map((m) => m[1]);
  const jsonIds = applications.map((app) => app.id);
  const missing = jsonIds.filter((id) => !runtimeIds.includes(id));
  const extra = runtimeIds.filter((id) => !jsonIds.includes(id));
  if (missing.length) errors.push(`catalog.generated.js n'inclut pas : ${missing.join(", ")}`);
  if (extra.length) errors.push(`catalog.generated.js contient en trop : ${extra.join(", ")}`);
} else {
  warnings.push("catalog.generated.js absent (sera régénéré par build.ps1).");
}

const result = {
  checkedAt: new Date().toISOString(),
  source: "beta/catalog/apps.json",
  applications: applications.length,
  errors,
  warnings,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
