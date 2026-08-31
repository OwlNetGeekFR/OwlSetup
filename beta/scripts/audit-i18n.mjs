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
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const html = readFileSync(here("../../index.html"), "utf8");
const appJs = readFileSync(here("../../app.js"), "utf8");
const i18n = readFileSync(here("../../i18n.js"), "utf8");
const natif = readFileSync(here("../../OwlSetupWebView.cs"), "utf8");

/**
 * Dette de traduction declaree.
 *
 * Le scan de l hote a revele d un coup 234 chaines sans traduction : les
 * traduire toutes dans le meme lot aurait melange un changement de mecanisme et
 * deux cents traductions relues a la va-vite. Elles sont donc ECRITES ICI, dans
 * le depot, et `--check` sert de cliquet :
 *
 *   - une chaine non traduite qui n est PAS dans cette liste fait echouer ;
 *   - une chaine de la liste qui est desormais traduite fait echouer aussi,
 *     pour que le fichier soit reduit au fur et a mesure et ne dorme jamais.
 *
 * La dette ne peut donc que diminuer. `--dette` regenere le fichier.
 */
const detteFichier = here("../i18n-dette.json");
const dette = new Set(JSON.parse(readFileSync(detteFichier, "utf8")).chaines);

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
  // Le litteral regulier peut etre colle au crochet (`[/motif/, "..."]`) ou
  // seul sur sa ligne quand l entree est formatee sur plusieurs lignes. Exiger
  // « [/ » faisait manquer toute la seconde forme — et l audit annoncait alors
  // des trous deja couverts.
  for (const match of block.matchAll(/^\s*\[?\s*\/(.+?)\/\s*,/gm)) {
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

// MIROIR de `translateFragment` dans i18n.js : meme decomposition (segments
// « · », compteur final entre parentheses, nombre en tete). Les deux doivent
// evoluer ensemble, sinon l audit annoncerait une couverture que l interface n a
// pas — ou l inverse.
const SEGMENT_SEPARATOR = " · ";
const LEADING_COUNT = /^(\d[\d  .,]*(?:\s*%)?)\s+(.+)$/;
const TRAILING_COUNT = /^(.+?)\s*\((\d+)\)$/;

/**
 * Feuilles NON couvertes d une chaine : ce qu il reste a ajouter au
 * dictionnaire ou a couvrir par un motif. Meme decoupe que `estCouverte`, mais
 * on descend au lieu de s arreter au premier echec.
 */
function feuillesManquantes(value, depth = 0, out = new Set()) {
  if (translated.has(value) || isCoveredByPattern(value) || VALUE_ONLY.test(value)) return out;
  if (prefixeCouvert(value)) return out;
  if (depth >= 2) {
    out.add(value);
    return out;
  }
  if (value.includes(SEGMENT_SEPARATOR)) {
    for (const part of value.split(SEGMENT_SEPARATOR)) {
      feuillesManquantes(part.trim(), depth + 1, out);
    }
    return out;
  }
  const trailing = TRAILING_COUNT.exec(value);
  if (trailing) return feuillesManquantes(trailing[1], depth + 1, out);
  const leading = LEADING_COUNT.exec(value);
  if (leading) return feuillesManquantes(leading[2], depth + 1, out);
  out.add(value);
  return out;
}

// Un segment sans texte (« 4,2 Go », « 12 », « 45 % ») n a rien a traduire.
// MIROIR de VALUE_ONLY dans i18n.js.
const VALUE_ONLY = /^[\d\s.,:%/+-]*\d[\d\s.,:%/+-]*(?:\s*(?:o|K?o|Mo|Go|To|B|[KMGT]B|h|min|s))?$/i;

// MIROIR de translateFragmentPrefix dans i18n.js.
//
// L hote construit beaucoup de messages par concatenation : « Emplacement
// demandé : » + un chemin, « Analyse de » + un nom + « ... ». Le litteral C#
// finit alors par une espace, et c est ce qui le distingue d une phrase
// complete — une phrase ne finit jamais par une espace.
//
// Ces fragments sont donc gardes AVEC leur espace finale (voir recordNatif), et
// une chaine d execution est couverte des qu un fragment du dictionnaire la
// prefixe : le reste est une valeur, pas du texte a traduire.
function prefixeCouvert(value) {
  for (const cle of fragments) {
    if (cle.length < value.length && value.startsWith(cle)) return true;
  }
  return false;
}

function estCouverte(value, depth = 0) {
  if (translated.has(value) || isCoveredByPattern(value)) return true;
  if (VALUE_ONLY.test(value)) return true;
  if (prefixeCouvert(value)) return true;
  if (depth >= 2) return false;

  if (value.includes(SEGMENT_SEPARATOR)) {
    return value.split(SEGMENT_SEPARATOR).every((part) => estCouverte(part.trim(), depth + 1));
  }

  const trailing = TRAILING_COUNT.exec(value);
  if (trailing && estCouverte(trailing[1], depth + 1)) return true;

  const leading = LEADING_COUNT.exec(value);
  if (leading && estCouverte(leading[2], depth + 1)) return true;

  return false;
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

// Cles du dictionnaire qui sont des fragments de tete (espace finale).
const fragments = [...translated].filter((cle) => /\s$/.test(cle));

const found = new Map(); // chaine -> origine

/**
 * Enregistre un litteral de l hote SANS le rogner.
 *
 * `record` normalise les espaces et rogne — ce qu il faut pour du HTML, mais qui
 * ecraserait justement l espace finale qui fait d un litteral un fragment de
 * tete plutot qu une phrase.
 */
function recordNatif(value, origin) {
  // L espace FINALE est gardee : elle signe un fragment de tete. L espace
  // INITIALE ne porte rien — un suffixe apres un compteur (« 3 échec(s) ») est
  // deja decompose par LEADING_COUNT, qui cherche « échec(s) » sans espace.
  const text = decodeEntities(value)
    .replace(/[ \t]+/g, " ")
    .replace(/^ /, "");
  if (!isCandidate(text.trim())) return;
  if (!found.has(text)) found.set(text, origin);
}

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
/**
 * Rend un gabarit en substituant chaque `${...}` selon ce qu il produit.
 *
 * Une substitution uniforme ne suffit pas : beaucoup de gabarits interpolent la
 * MARQUE DU PLURIEL au milieu d un mot (`mise${n > 1 ? "s" : ""} a jour`).
 * Remplacer cette expression par « 1 » donnait « 1 mise1 a jour », une chaine
 * qui n existe nulle part et contre laquelle on ne peut ecrire aucun motif.
 *
 * On distingue donc deux natures d expression, et on rend le gabarit au
 * singulier puis au pluriel — les deux formes que verra l utilisateur.
 */
/**
 * Reconnait une marque d accord : un ternaire dont une branche est la chaine
 * vide et l autre une terminaison courte. Couvre le pluriel (`? "s" : ""`) comme
 * l accord du verbe (`? "nt" : ""` pour « resiste » / « resistent »).
 *
 * Renvoie la terminaison a ajouter au pluriel, ou null si l expression produit
 * une valeur ordinaire.
 */
function marqueAccord(expression) {
  if (!expression.includes("?")) return null;
  const litteraux = [...expression.matchAll(/(["'`])((?:[^\\]|\\.)*?)\1/g)].map((m) => m[2]);
  if (litteraux.length !== 2) return null;
  const vide = litteraux.find((l) => l === "");
  const terminaison = litteraux.find((l) => l !== "");
  if (vide === undefined || terminaison === undefined) return null;
  return /^[a-zà-ÿ]{1,3}$/i.test(terminaison) ? terminaison : null;
}

function rendreGabarit(source, nombre) {
  return source.replace(INTERPOLATION, (expression) => {
    const accord = marqueAccord(expression.slice(2, -1));
    if (accord !== null) return nombre > 1 ? accord : "";
    return String(nombre);
  });
}

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
  // Singulier puis pluriel : ce sont les deux chaines que i18n.js soumettra
  // reellement a `englishPatterns`.
  for (const nombre of [1, 3]) {
    const rendu = rendreGabarit(contenu, nombre);
    const candidats = rendu.includes("<") ? extractFromHtml(rendu).texts : [rendu];
    for (const brut of candidats) {
      const text = clean(brut);
      if (!isCandidate(text) || text.length < 12) continue;
      // Artefact de sonde : le chiffre s est colle a un mot parce que le
      // gabarit interpolait un suffixe optionnel (`${rebootRequired ? " · ..."
      // : ""}`) qu on ne sait pas evaluer. « Windows est a jour1. » n existe pas
      // a l execution — la vraie chaine est produite par une autre sonde.
      if (new RegExp(`[A-Za-zà-ÿ]${nombre}(?![0-9])`, "i").test(text)) continue;
      if (estCouverte(text)) continue;
      interpolated.add(text);
    }
  }
}

// --- OwlSetupWebView.cs : messages envoyes par l hote ---
//
// L hote produit lui aussi du texte affiche : titres d etape, messages d erreur,
// libelles de resultat. Ils arrivent dans le DOM par les messages postes a la
// WebView, donc l observateur de i18n.js les voit — mais ils n etaient scannes
// nulle part. L audit annoncait 100 % en ne regardant que index.html et app.js.
//
// Les litteraux C# se lisent en deux formes : "..." avec echappements, et @"..."
// verbatim ou le guillemet se double.
function scanCsharpLiterals(source) {
  const out = [];
  for (const m of source.matchAll(/@"((?:[^"]|"")*)"|"((?:[^"\\]|\\.)*)"/g)) {
    const brut = m[1] !== undefined ? m[1].split('""').join('"') : m[2];
    if (!brut) continue;
    // Ce qui PRECEDE le litteral dit s il est affiche ou consomme.
    if (ENTREE.test(source.slice(Math.max(0, m.index - 60), m.index))) continue;
    out.push(brut);
  }
  return out;
}

// Un litteral passe a Contains/StartsWith/... est une ENTREE : OwlSetup y
// reconnait la sortie de winget, y compris ses variantes francaises et leurs
// versions abimees (« aucun package trouvÃ© »). Le traduire n aurait aucun sens
// et ajouterait du mojibake au dictionnaire.
//
// Console.Write* part vers le shim CLI, jamais vers le DOM : meme raison que
// HORS_DOM cote app.js.
const ENTREE =
  /\.(?:Contains|StartsWith|EndsWith|IndexOf|LastIndexOf|Equals|Split)\s*\(\s*$|Console\.(?:Out\.|Error\.)?(?:Write|WriteLine|Error)[^;]*$/;

// Ce qui ne part pas vers l interface : chemins, cles de registre, arguments de
// ligne de commande, fragments PowerShell, noms de fichiers. Les compter
// gonflerait l audit de chaines qu aucun utilisateur ne lit.
const NATIF_TECHNIQUE =
  /^(https?:|HKEY|SOFTWARE\\|Software\\|[A-Za-z]:\\|\\\\|\/|--|-[A-Za-z]|\{|\[|%|\$)|\.(exe|dll|ps1|log|json|txt|ico|png|css|js|html)$|winget|powershell|cmd\.exe|\$env:/i;

// Prefixe de nom de fichier journal (« PC-Setup-Nettoyage- » + horodatage +
// « .log ») : le tiret final le signe. Ces noms ne sont jamais affiches.
const NATIF_NOM_DE_FICHIER = /^[A-Za-z][\w]*(?:-[\w]+)+-$/;

// Chaines qui partent dans un journal, pas dans le DOM, et que rien dans leur
// forme ne distingue. Les lister explicitement vaut mieux qu une heuristique
// large qui masquerait de vrais messages.
const NATIF_JOURNAL = new Set([
  // SummarizeElevationArguments : trace du journal d elevation.
  "(sans argument)",
]);

for (const brut of scanCsharpLiterals(natif)) {
  if (NATIF_NOM_DE_FICHIER.test(brut) || NATIF_JOURNAL.has(brut)) continue;
  // Les sauts de ligne echappes signent un message console ou une boite native,
  // pas un noeud du DOM.
  if (HORS_DOM.test(brut)) continue;
  if (POWERSHELL.test(brut)) continue;
  if (NATIF_TECHNIQUE.test(brut)) continue;
  if (/[{}]/.test(brut)) continue;
  recordNatif(brut, "OwlSetupWebView.cs");
}

const missing = [...found.entries()]
  .filter(([text]) => !estCouverte(text))
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
        leaves: [...new Set([...interpolated].flatMap((v) => [...feuillesManquantes(v)]))]
          // Pas `isCandidate` ici : une feuille comme « libres » ou
          // « introuvable(s) » n a ni accent ni mot-outil, mais reste bien du
          // texte a traduire. Le filtre la masquait, et le total ne bougeait
          // plus sans qu on sache pourquoi.
          .filter((v) => v.length >= 3 && !VALUE_ONLY.test(v))
          .sort((a, b) => a.localeCompare(b, "fr")),
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
// Les gabarits interpoles sont DANS la porte depuis la 4.0.0-beta.50 : ils sont
// tous couverts, soit par un motif, soit par la decomposition (compteur en tete,
// compteur final, segments « · ») dont ce script reproduit la logique.
if (process.argv.includes("--dette")) {
  writeFileSync(
    detteFichier,
    JSON.stringify(
      {
        commentaire:
          "Chaines de OwlSetupWebView.cs qui attendent leur traduction anglaise. Cette liste ne peut que diminuer : audit-i18n.mjs --check echoue si une chaine s y ajoute, ET si une chaine traduite y reste. Regenerer avec : node beta/scripts/audit-i18n.mjs --dette",
        chaines: missing.map(([text]) => text),
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Dette ecrite : ${missing.length} chaine(s).`);
}

if (process.argv.includes("--check")) {
  const nouvelles = missing.filter(([text]) => !dette.has(text));
  if (nouvelles.length) {
    console.error(`\n${nouvelles.length} nouvelle(s) chaine(s) sans traduction anglaise :`);
    for (const [text, origin] of nouvelles) console.error(`  [${origin}] ${text}`);
    process.exit(1);
  }
  const encoreListees = new Set(missing.map(([text]) => text));
  const resolues = [...dette].filter((text) => !encoreListees.has(text));
  if (resolues.length) {
    console.error(
      `\n${resolues.length} chaine(s) de la dette sont traduites : regenerez beta/i18n-dette.json` +
        ` (node beta/scripts/audit-i18n.mjs --dette).`
    );
    process.exit(1);
  }
  if (dette.size) {
    console.log(`Dette de traduction : ${dette.size} chaine(s) de l hote, aucune nouvelle.`);
  }
  if (interpolated.size) {
    console.error(
      `\n${interpolated.size} chaine(s) construite(s) par interpolation sans traduction :`
    );
    for (const value of interpolated) console.error(`  ${value}`);
    process.exit(1);
  }
  // Ne pas annoncer « complete » tant que la dette existe : c est exactement le
  // genre de message rassurant qui avait laisse croire a 100 % de couverture
  // pendant que l hote n etait pas scanne.
  if (dette.size) {
    console.log(
      `Aucune regression (${total - dette.size}/${total} chaines traduites, ${dette.size} en dette declaree).`
    );
  } else {
    console.log(`Couverture anglaise complete (${total} chaines, interpolations comprises).`);
  }
}
