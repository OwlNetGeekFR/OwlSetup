// Audit de couverture de la traduction anglaise.
//
// `i18n.js` traduit le DOM a l execution, avec la chaine francaise pour cle.
// Ce script extrait les chaines francaises reellement affichables depuis
// `index.html` (texte + attributs traduits) et `app.js` (litteraux inseres dans
// le DOM), puis les compare au dictionnaire `translations.en`.
//
//   node beta/scripts/audit-i18n.mjs           # rapport lisible
//   node beta/scripts/audit-i18n.mjs --json    # sortie machine
//   node beta/scripts/audit-i18n.mjs --check   # code 1 s il reste une chaine sans traduction
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

// Accents ou mots francais : suffisant pour distinguer une chaine d interface
// d un identifiant technique ou d un nom de produit.
//
// La deuxieme liste tient aux chaines SANS accent : « Espace disque »,
// « Validation avant action » ou « Langue » echappaient a la detection, donc a
// l audit, et restaient en francais dans l interface anglaise. On n y met que
// des mots qui ne s ecrivent pas pareil en anglais — pas « installation »,
// « version », « configuration », « guide » ni « selection ».
const FRENCH =
  /[àâäçéèêëîïôöùûüœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ]|\b(?:le|la|les|des|une|un|du|dans|pour|avec|sur|vos|votre|vous|est|sont|aucun|aucune|sans|puis|selon|ainsi|cette|ces|par|aux|et|ou|tout|toute|toutes|tous|depuis|entre|chaque|mise|mises|jour|logiciel|logiciels|fichier|fichiers|nettoyage|avant|apres|ouvrir|fermer|langue|locale|locaux|cours|jointe|joint|choisir|lancer|enregistrer|supprimer|restauration|espace|disque|facultatif|facultative|analyse|profil|profils|securite|parametres|resultat|semaine|taille|dossier|dossiers|exemple|zone|zones)\b/i;

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
  // Identifiants de paquet (« Microsoft.Edge », « 7-Zip ») : il faut un
  // separateur ENTRE deux groupes alphanumeriques. Sans cette precision,
  // « Analyse... » passait pour un identifiant et echappait a l audit.
  if (/^[A-Za-z0-9]+(?:[._+-][A-Za-z0-9]+)+$/.test(value)) return false;
  if (/^[.#][A-Za-z][\w-]*$/.test(value)) return false; // selecteur CSS
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
//
// Un litteral de app.js n est pas forcement une chaine affichee telle quelle :
// beaucoup contiennent du HTML. On les passe alors au meme tokeniseur que
// index.html, pour ne retenir que les vrais noeuds de texte et les attributs
// traduits — sinon on compte un bloc `<div>...<small>...</small></div>` comme
// une seule chaine introuvable dans le dictionnaire.

// Chaines destinees a la console ou au shim CLI : elles ne passent jamais par
// le DOM, donc jamais par l observateur de i18n.js. Les compter fausserait la
// couverture.
const HORS_DOM = /\\[nrt]/;

// Scripts PowerShell construits en chaines JS : ils partent vers l hote, pas
// vers le DOM. Reperables a leurs sous-expressions `$(...)` et a leurs
// variables automatiques.
const POWERSHELL =
  /\$\(|\$LASTEXITCODE|\$ErrorActionPreference|\$env:|-ErrorAction\b|\bJoin-Path\b|\b(?:Get|Set|New|Remove|Clear|Test|Start|Stop)-[A-Z][A-Za-z]+\b/;

/**
 * Parcourt le JavaScript une fois et renvoie ses litteraux de chaines.
 *
 * Un simple `matchAll` sur les guillemets se trompe des qu une apostrophe
 * francaise apparait dans une chaine a guillemets doubles : "n'a pas ... l'app"
 * fait croire a un litteral simple quote « a pas ... l ». Il faut donc suivre l
 * etat du source : commentaires, litteraux, echappements, et litteraux
 * reguliers (qui peuvent contenir des guillemets).
 */
function scanJsLiterals(source) {
  const out = [];
  let i = 0;
  let precedent = ""; // dernier caractere significatif, pour distinguer / regex et / division
  while (i < source.length) {
    const c = source[i];

    if (c === "/" && source[i + 1] === "/") {
      const fin = source.indexOf("\n", i);
      i = fin < 0 ? source.length : fin;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const fin = source.indexOf("*/", i + 2);
      i = fin < 0 ? source.length : fin + 2;
      continue;
    }
    // Litteral regulier : seulement la ou une valeur peut commencer.
    if (c === "/" && /[(,=:[!&|?{};+\-*%~^]|^$/.test(precedent)) {
      i++;
      let classe = false;
      while (i < source.length) {
        const d = source[i];
        if (d === "\\") i += 2;
        else if (d === "[") ((classe = true), i++);
        else if (d === "]") ((classe = false), i++);
        else if (d === "/" && !classe) {
          i++;
          break;
        } else if (d === "\n") break;
        else i++;
      }
      precedent = "/";
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      const debut = ++i;
      let profondeur = 0;
      let contenu = "";
      while (i < source.length) {
        const d = source[i];
        if (d === "\\") {
          contenu += source.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (quote === "`" && d === "$" && source[i + 1] === "{") {
          profondeur++;
          contenu += "${";
          i += 2;
          continue;
        }
        if (quote === "`" && profondeur > 0) {
          if (d === "{") profondeur++;
          else if (d === "}") profondeur--;
          contenu += d;
          i++;
          continue;
        }
        if (d === quote) {
          i++;
          break;
        }
        if (d === "\n" && quote !== "`") break; // chaine non terminee : on abandonne
        contenu += d;
        i++;
      }
      out.push({ quote, contenu, debut });
      precedent = quote;
      continue;
    }

    if (!/\s/.test(c)) precedent = c;
    i++;
  }
  return out;
}

function recordLiteral(value, origin) {
  if (HORS_DOM.test(value) || POWERSHELL.test(value)) return;
  if (!value.includes("<")) {
    record(value, origin);
    return;
  }
  const { texts, attributes } = extractFromHtml(value);
  for (const text of texts) record(text, origin);
  for (const attribute of attributes) {
    const text = cleanAttribute(attribute);
    if (isCandidate(text) && !found.has(text)) found.set(text, `${origin} (attribut)`);
  }
}

// Gabarits : sans interpolation, le litteral est la chaine finale. Avec
// interpolation, le noeud de texte rendu est la CONCATENATION des morceaux et
// des valeurs injectees : aucune cle exacte ne peut correspondre. Ces cas
// relevent d un motif dans `englishPatterns` (ou d une restructuration du
// code), pas d une entree de dictionnaire — on les compte a part.
const INTERPOLATION = /\$\{(?:[^{}]|\{[^}]*\})*\}/g;
// Deux sondes suffisent a couvrir les motifs existants : un compteur et un nom
// d application.
const SONDES = ["1", "Chrome"];
const interpolated = new Set();

for (const { quote, contenu } of scanJsLiterals(appJs)) {
  if (quote !== "`") {
    recordLiteral(contenu, "app.js");
    continue;
  }
  if (!contenu.includes("${")) {
    recordLiteral(contenu, "app.js");
    continue;
  }
  if (HORS_DOM.test(contenu) || POWERSHELL.test(contenu)) continue;
  // On INSTANCIE le gabarit au lieu de le decouper : le noeud de texte rendu
  // est la concatenation des morceaux et des valeurs, et c est cette chaine
  // complete que i18n.js soumet a `englishPatterns`. Un fragment isole ferait
  // croire a un trou alors que le motif « ^Desinstaller (.+)$ » couvre le cas.
  // Deux instanciations suffisent a couvrir les motifs existants : une valeur
  // numerique (compteurs) et un nom d application.
  for (const valeur of SONDES) {
    const rendu = contenu.replace(INTERPOLATION, valeur);
    const candidats = rendu.includes("<") ? extractFromHtml(rendu).texts : [rendu];
    for (const brut of candidats) {
      const text = clean(brut);
      if (!isCandidate(text) || text.length < 12) continue;
      if (translated.has(text) || isCoveredByPattern(text)) continue;
      // On compte des FORMES, pas des instanciations : les deux sondes
      // produiraient sinon deux entrees pour un meme gabarit.
      interpolated.add(text.replaceAll(valeur, "%s"));
    }
  }
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
      {
        total,
        covered,
        percent,
        missing: missing.map(([text, from]) => ({ text, from })),
        interpolated: [...interpolated].sort((a, b) => a.localeCompare(b, "fr")),
      },
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
  if (interpolated.size) {
    console.log(
      `\n${interpolated.size} portion(s) de gabarit interpole : le noeud rendu melange texte et` +
        ` valeurs, il faut un motif dans englishPatterns (ou restructurer l appel).`
    );
  }
}

// --check gate desormais index.html ET app.js.
//
// La porte ne couvrait que index.html tant que l extraction de app.js ramenait
// des chaines qui n atteignent jamais le DOM. Ce n est plus le cas : les
// litteraux sont lus par un vrai scanner JS, le HTML qu ils contiennent passe
// par le tokeniseur, et les scripts PowerShell comme les sorties console sont
// ecartes. La couverture exacte etant a 100 %, la porte protege l acquis.
//
// Les gabarits interpoles restent HORS de la porte : leur noeud rendu melange
// texte et valeurs, ils relevent de `englishPatterns` et non du dictionnaire.
if (process.argv.includes("--check")) {
  if (missing.length) {
    console.error(`\n${missing.length} chaine(s) sans traduction anglaise.`);
    process.exit(1);
  }
  console.log(`Couverture anglaise complete (${total} chaines).`);
  if (interpolated.size) {
    console.log(
      `Rappel : ${interpolated.size} chaine(s) construite(s) par interpolation restent a couvrir` +
        ` par un motif (hors porte).`
    );
  }
}
