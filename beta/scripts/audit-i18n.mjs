// Audit de couverture de la traduction anglaise.
//
// `i18n.js` traduit le DOM a l execution, avec la chaine francaise pour cle.
// Ce script extrait les chaines francaises reellement affichables depuis
// `index.html` (texte + attributs traduits) et `app.js` (litteraux inseres dans
// le DOM), puis les compare au dictionnaire `translations.en`.
//
//   node beta/scripts/audit-i18n.mjs           # rapport lisible
//   node beta/scripts/audit-i18n.mjs --json    # sortie machine
//   node beta/scripts/audit-i18n.mjs --check   # code 1 si des chaines manquent
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const html = readFileSync(here("../../index.html"), "utf8");
const appJs = readFileSync(here("../../app.js"), "utf8");
const i18n = readFileSync(here("../../i18n.js"), "utf8");

// Accents ou mots-outils francais : suffisant pour distinguer une chaine
// d interface d un identifiant technique ou d un nom de produit.
const FRENCH =
  /[àâäçéèêëîïôöùûüœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ]|\b(?:le|la|les|des|une|un|du|dans|pour|avec|sur|vos|votre|vous|est|sont|aucun|aucune|sans|puis|selon|ainsi|cette|ces|par|aux|et|ou|tout|toute|toutes|tous|depuis|entre|chaque|mise|mises|jour|logiciel|logiciels|fichier|fichiers|nettoyage)\b/i;

// Chaines volontairement non traduites : noms propres, marques, unites.
const SKIP = new Set([
  "OwlSetup",
  "WinGet",
  "Windows",
  "Windows Update",
  "Microsoft",
  "Ko-fi",
  "BÊTA",
  "ALPHA",
  "GitHub",
  // Selecteur de langue : chaque option s affiche dans sa propre langue.
  "Français",
  "English (Beta)",
  "Español",
  "Deutsch",
  "Italiano",
  "Português",
  "Prochainement",
  "Demnächst",
  "Prossimamente",
  "Próximamente",
  "Em breve",
]);

const translated = (() => {
  const start = i18n.indexOf("const translations = {");
  const end = i18n.indexOf("const englishPatterns");
  const block = i18n.slice(start, end > start ? end : undefined);
  const keys = new Set();
  // Cles du dictionnaire : "clé française": "english"
  for (const match of block.matchAll(/\n\s*"((?:[^"\\]|\\.)*)"\s*:/g)) {
    keys.add(match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
  }
  return keys;
})();

// i18n.js couvre aussi des chaines dynamiques par expressions regulieres
// (« 3 éléments », « Réparer X »…) : il faut les considerer comme traduites.
const patterns = (() => {
  const start = i18n.indexOf("const englishPatterns");
  const block = i18n.slice(start, i18n.indexOf("];", start));
  const list = [];
  for (const match of block.matchAll(/\[\/(.+?)\/,/g)) {
    try {
      list.push(new RegExp(match[1]));
    } catch {
      /* motif non reconstructible : ignore */
    }
  }
  return list;
})();

function isCoveredByPattern(value) {
  return patterns.some((pattern) => pattern.test(value));
}

function clean(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function isCandidate(value) {
  if (!value || value.length < 3) return false;
  if (SKIP.has(value)) return false;
  if (!FRENCH.test(value)) return false;
  if (/^[\d\s.,:%–—-]+$/.test(value)) return false; // valeurs purement numeriques
  if (/^[A-Za-z0-9._+-]+$/.test(value)) return false; // identifiants de paquet
  return true;
}

const found = new Map(); // chaine -> origine

function record(value, origin) {
  const text = clean(value);
  if (!isCandidate(text)) return;
  if (!found.has(text)) found.set(text, origin);
}

// --- index.html : noeuds de texte + attributs traduits par i18n.js ---
const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
const withoutScripts = withoutComments
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<svg[\s\S]*?<\/svg>/gi, "");
for (const chunk of withoutScripts.split(/<[^>]*>/)) record(chunk, "index.html");
for (const match of withoutComments.matchAll(
  /(?:placeholder|title|aria-label|data-help-title|data-help-text)="([^"]*)"/g
)) {
  record(match[1], "index.html (attribut)");
}

// --- app.js : litteraux de chaines inseres dans le DOM ---
for (const match of appJs.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) record(match[1], "app.js");
for (const match of appJs.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) record(match[1], "app.js");
// Fragments de gabarits : on prend les portions litterales entre ${...}
for (const match of appJs.matchAll(/`((?:[^`\\]|\\.)*)`/g)) {
  for (const piece of match[1].split(/\$\{[^}]*\}/)) record(piece, "app.js (gabarit)");
}

const missing = [...found.entries()]
  .filter(([text]) => !translated.has(text) && !isCoveredByPattern(text))
  .sort((a, b) => a[0].localeCompare(b[0], "fr"));

const total = found.size;
const covered = total - missing.length;
const percent = total ? Math.round((covered / total) * 100) : 100;

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      { total, covered, percent, missing: missing.map(([t, o]) => ({ text: t, from: o })) },
      null,
      2
    )
  );
} else {
  console.log(`Traduction anglaise : ${covered}/${total} chaines (${percent} %).`);
  if (missing.length) {
    console.log(`\n${missing.length} chaine(s) sans traduction :`);
    for (const [text, origin] of missing) {
      console.log(`  [${origin}] ${text.length > 90 ? text.slice(0, 90) + "…" : text}`);
    }
  }
}

// --check ne gate que index.html : l extraction des litteraux de app.js
// ramene aussi des chaines qui n atteignent jamais le DOM (journaux, fragments
// PowerShell), ce qui rendrait la porte inutilisable.
const blocking = missing.filter(([, origin]) => origin.startsWith("index.html"));
if (process.argv.includes("--check")) {
  if (blocking.length) {
    console.error(`
${blocking.length} chaine(s) de index.html sans traduction anglaise.`);
    process.exit(1);
  }
  console.log("index.html : couverture anglaise complete.");
}
