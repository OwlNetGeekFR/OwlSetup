// Audit de couverture de la traduction anglaise.
//
// `i18n.js` traduit le DOM a l execution, avec la chaine francaise pour cle.
// Ce script extrait les chaines francaises reellement affichables depuis
// `index.html` (texte + attributs traduits) et `app.js` (litteraux inseres dans
// le DOM), puis les compare au dictionnaire `translations.en`.
//
//   node beta/scripts/audit-i18n.mjs           # rapport lisible
//   node beta/scripts/audit-i18n.mjs --json    # sortie machine
//   node beta/scripts/audit-i18n.mjs --check   # code 1 si index.html a des trous
//
// Le HTML est parcouru par un petit analyseur a un seul passage, et non par des
// expressions regulieres : retirer les commentaires et les elements `script` /
// `style` / `svg` a coups de `replace()` est fragile (une balise fermante
// ecrite `</script >` echappe au motif) et CodeQL le signale a juste titre.
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

// Attributs que `i18n.js` traduit reellement.
const TRANSLATED_ATTRIBUTES = new Set([
  "placeholder",
  "title",
  "aria-label",
  "data-help-title",
  "data-help-text",
]);

// Elements dont le contenu n est pas du texte d interface.
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "svg"]);

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
    // JSON.parse interprete tous les echappements (`\n`, `\"`, `\\`) : un
    // remplacement manuel laissait « \n » litteral dans la cle, qui ne
    // correspondait alors jamais au texte reel du DOM.
    try {
      keys.add(JSON.parse('"' + match[1] + '"'));
    } catch {
      keys.add(match[1]);
    }
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

// Decodage en UN seul passage : enchainer des `replace()` produirait un
// double-desechappement (« &amp;lt; » deviendrait « < » au lieu de « &lt; »).
const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#10": "\n",
};

function decodeEntities(value) {
  return value.replace(/&(#?\w+);/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(ENTITIES, name) ? ENTITIES[name] : whole
  );
}

function clean(value) {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

// i18n.js compare la valeur d attribut telle quelle (au trim pres) : il ne faut
// donc pas y ecraser les sauts de ligne, sinon la cle du dictionnaire ne
// correspondrait jamais a ce que voit le DOM.
function cleanAttribute(value) {
  return decodeEntities(value).trim();
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

/**
 * Parcourt le HTML une fois et renvoie le texte affichable et les valeurs des
 * attributs traduits. Les commentaires et le contenu de `script` / `style` /
 * `svg` sont sautes en cherchant leur veritable fin, ce qui evite les pieges
 * des motifs (`</script >`, `<!-- <script> -->`).
 */
function extractFromHtml(source) {
  const texts = [];
  const attributes = [];
  const lower = source.toLowerCase();
  let index = 0;

  while (index < source.length) {
    const open = source.indexOf("<", index);
    if (open < 0) {
      texts.push(source.slice(index));
      break;
    }
    if (open > index) texts.push(source.slice(index, open));

    if (source.startsWith("<!--", open)) {
      const end = source.indexOf("-->", open + 4);
      index = end < 0 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith("<!", open)) {
      const end = source.indexOf(">", open);
      index = end < 0 ? source.length : end + 1;
      continue;
    }

    // Fin de balise, en tenant compte des valeurs d attributs entre guillemets.
    let cursor = open + 1;
    let quote = null;
    while (cursor < source.length) {
      const character = source[cursor];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        break;
      }
      cursor += 1;
    }

    const tag = source.slice(open, Math.min(cursor + 1, source.length));
    index = cursor + 1;

    const name = /^<\s*(\/?)\s*([a-zA-Z][\w:-]*)/.exec(tag);
    if (!name) continue;
    if (name[1] === "/") continue;

    for (const attribute of tag.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*"([^"]*)"/g)) {
      if (TRANSLATED_ATTRIBUTES.has(attribute[1].toLowerCase())) {
        attributes.push(attribute[2]);
      }
    }

    const elementName = name[2].toLowerCase();
    if (RAW_TEXT_ELEMENTS.has(elementName) && !/\/\s*>$/.test(tag)) {
      // Sauter jusqu a la balise fermante reelle, quelle que soit sa casse et
      // meme si elle contient des espaces avant le « > ».
      const closing = lower.indexOf("</" + elementName, index);
      if (closing < 0) {
        index = source.length;
      } else {
        const end = source.indexOf(">", closing);
        index = end < 0 ? source.length : end + 1;
      }
    }
  }

  return { texts, attributes };
}

const { texts, attributes } = extractFromHtml(html);
for (const text of texts) record(text, "index.html");
for (const value of attributes) {
  const text = cleanAttribute(value);
  if (isCandidate(text) && !found.has(text)) found.set(text, "index.html (attribut)");
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
      { total, covered, percent, missing: missing.map(([text, from]) => ({ text, from })) },
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

// --check ne gate que index.html : l extraction des litteraux de app.js ramene
// aussi des chaines qui n atteignent jamais le DOM (journaux, fragments
// PowerShell), ce qui rendrait la porte inutilisable.
const blocking = missing.filter(([, origin]) => origin.startsWith("index.html"));
if (process.argv.includes("--check")) {
  if (blocking.length) {
    console.error(`\n${blocking.length} chaine(s) de index.html sans traduction anglaise.`);
    process.exit(1);
  }
  console.log("index.html : couverture anglaise complete.");
}
