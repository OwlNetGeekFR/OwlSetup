/**
 * Analyse de la sortie tabulaire de `winget` (upgrade / search / list).
 *
 * `winget` aligne ses colonnes sur des largeurs fixes et n'expose pas de mode
 * machine stable. Ce module lit la **ligne d'en-tete** pour retrouver la
 * position de chaque colonne, puis decoupe chaque ligne par ces positions —
 * ce qui tolere les valeurs contenant des espaces (`< 1.2.3`), les colonnes
 * vides, `Unknown`, les en-tetes localises (FR/EN) et les sequences ANSI.
 *
 * Remplace les analyseurs regex maison de `OwlSetupWebView.cs`
 * (`QueryAvailableUpdates`, `ParseWingetSearchResults`). Le portage C#
 * `ParseWingetTable` doit rester une transcription fidele ; les tests de
 * `beta/test/winget-table.test.js` s'appuient sur de vraies captures.
 */

const ESC = String.fromCharCode(27);
const BOM = String.fromCharCode(0xfeff);
const ANSI = new RegExp(ESC + "\\[[0-9;?]*[ -/]*[@-~]", "g");
const SEPARATOR = /^\s*[-–—]{3,}/;
// Les en-tetes winget sont toujours des MOTS SIMPLES (Nom/Name, ID, Version,
// Disponible/Available, Source, Correspondance/Match) : on decoupe sur tout
// espace. Le decoupage des lignes de donnees se fait par POSITION et tolere les
// espaces dans les valeurs. (Un motif tolerant un espace simple fusionnait
// "Version Source" sur la sortie etroite de `winget list --id X --exact`.)
const HEADER_TOKEN = /\S+/g;

/** Etiquette d'en-tete (minuscule) -> cle normalisee. */
const HEADER_ALIASES = {
  name: "name",
  nom: "name",
  id: "id",
  version: "version",
  available: "available",
  disponible: "available",
  source: "source",
  match: "match",
  correspondance: "match",
};

function stripAnsi(line) {
  let value = String(line ?? "").replace(ANSI, "");
  if (value.charCodeAt(0) === 0xfeff) value = value.slice(1);
  return value;
}

/** Les en-tetes winget connus sont sans accent : minuscule + trim suffit. */
function normalizeLabel(label) {
  return String(label).toLowerCase().trim();
}

/** Tokens non-espaces d'une ligne, avec leur position de depart. */
function tokensWithIndex(line) {
  const out = [];
  HEADER_TOKEN.lastIndex = 0;
  let m;
  while ((m = HEADER_TOKEN.exec(line)) !== null) {
    out.push({ text: m[0], start: m.index });
    if (HEADER_TOKEN.lastIndex === m.index) HEADER_TOKEN.lastIndex += 1;
  }
  return out;
}

/**
 * @param {string} output sortie brute de `winget`
 * @returns {{ columns: string[], rows: Array<Record<string,string>> }}
 */
export function parseWingetTable(output) {
  const lines = String(output ?? "")
    .split(/\r\n|\r|\n/)
    .map(stripAnsi);

  // 1) ligne d'en-tete : >= 2 colonnes connues, dont "id".
  let headerIdx = -1;
  let header = null;
  for (let i = 0; i < lines.length; i += 1) {
    const tokens = tokensWithIndex(lines[i]);
    if (tokens.length < 2) continue;
    const mapped = tokens
      .map((t) => ({ key: HEADER_ALIASES[normalizeLabel(t.text)], start: t.start }))
      .filter((t) => t.key);
    if (mapped.length >= 2 && mapped.some((t) => t.key === "id")) {
      headerIdx = i;
      header = mapped;
      break;
    }
  }
  if (headerIdx < 0) return { columns: [], rows: [] };

  // dedoublonne les cles (garde la premiere occurrence), trie par position
  const seen = new Set();
  const cols = header
    .filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true)))
    .sort((a, b) => a.start - b.start);
  const columns = cols.map((c) => c.key);

  // 2) lignes de donnees : apres le(s) separateur(s), jusqu'a une ligne vide.
  const rows = [];
  const secondColStart = cols.length > 1 ? cols[1].start : 0;
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (SEPARATOR.test(line)) continue;
    if (line.trim() === "") {
      if (rows.length) break;
      continue;
    }
    // ligne de resume / bruit : trop courte pour atteindre la 2e colonne.
    if (secondColStart && line.length <= secondColStart) break;

    const row = {};
    for (let c = 0; c < cols.length; c += 1) {
      const from = cols[c].start;
      const to = c + 1 < cols.length ? cols[c + 1].start : line.length;
      row[cols[c].key] = line.slice(from, Math.min(to, line.length)).trim();
    }
    if (row.name && row.id) rows.push(row);
  }

  return { columns, rows };
}

/**
 * Vrai si `id` apparait dans la colonne ID d'une sortie tabulaire winget.
 * Remplace les `indexOf` / regex qui pouvaient reconnaitre l'identifiant dans
 * un nom d'application ou un chemin. Portage C# : `WingetTableContainsId`.
 * @param {string} output sortie brute de `winget list` / `winget upgrade`
 * @param {string} id identifiant de paquet recherche
 * @returns {boolean}
 */
export function wingetTableHasId(output, id) {
  if (!output || !id) return false;
  const needle = String(id).toLowerCase();
  return parseWingetTable(output).rows.some((row) => (row.id || "").toLowerCase() === needle);
}

export { stripAnsi, BOM };
