/**
 * Inventaire Windows Update (lecture seule) — mise en forme et lecture des
 * marqueurs émis par le script WUA de l'hôte.
 *
 * Miroir de `OwlSetupWebView.cs` :
 *  - `SearchWindowsUpdates` émet une ligne `PCSETUP_WU_ITEM|{json}` par mise à
 *    jour (JSON échappé en ASCII pur), puis `PCSETUP_WU_END|ok|<n>` ou
 *    `PCSETUP_WU_END|error|<message>`.
 *  - `ScanWindowsUpdates` renvoie déjà le tableau structuré à l'interface ; ce
 *    module sert au test de parité (`beta/test/windows-update.test.js`) et au
 *    formatage côté `app.js`.
 */

const ITEM_PREFIX = "PCSETUP_WU_ITEM|";
const END_PREFIX = "PCSETUP_WU_END|";

/** @typedef {{title:string, kb:string, kind:"driver"|"software", bytes:number, downloaded:boolean, severity:string}} WindowsUpdateItem */

function toItem(raw) {
  const title = String(raw && raw.title != null ? raw.title : "").trim();
  if (!title) return null;
  let bytes = 0;
  const n = Number(raw && raw.bytes);
  if (Number.isFinite(n) && n > 0) bytes = Math.round(n);
  return {
    title,
    kb: String(raw && raw.kb != null ? raw.kb : ""),
    kind: String(raw && raw.kind) === "driver" ? "driver" : "software",
    bytes,
    downloaded: Boolean(raw && raw.downloaded),
    severity: String(raw && raw.severity != null ? raw.severity : ""),
  };
}

/**
 * Lit la sortie brute du script WUA.
 * @param {string} output
 * @returns {{updates: WindowsUpdateItem[], completed: boolean, error: string|null}}
 */
export function parseWindowsUpdateMarkers(output) {
  const updates = [];
  let completed = false;
  let error = null;
  for (const line of String(output ?? "").split(/\r\n|\r|\n/)) {
    if (line.startsWith(ITEM_PREFIX)) {
      let parsed;
      try {
        parsed = JSON.parse(line.slice(ITEM_PREFIX.length));
      } catch {
        continue;
      }
      const item = toItem(parsed);
      if (item) updates.push(item);
    } else if (line.startsWith(END_PREFIX)) {
      const parts = line.split("|");
      if (parts[1] === "ok") completed = true;
      else if (parts[1] === "error") error = parts.slice(2).join("|") || "Erreur inconnue.";
    }
  }
  if (!completed && !error) error = "La recherche Windows Update ne s'est pas terminée.";
  return { updates, completed, error };
}

const SECURITY_SEVERITIES = new Set(["critical", "important", "moderate", "low"]);

/**
 * @param {WindowsUpdateItem[]} updates
 * @returns {{count:number, driverCount:number, softwareCount:number, totalBytes:number, securityCount:number, downloadedCount:number}}
 */
export function summarizeWindowsUpdates(updates) {
  const list = Array.isArray(updates) ? updates : [];
  let driverCount = 0;
  let totalBytes = 0;
  let securityCount = 0;
  let downloadedCount = 0;
  for (const u of list) {
    if (u.kind === "driver") driverCount += 1;
    if (Number.isFinite(u.bytes)) totalBytes += u.bytes;
    if (SECURITY_SEVERITIES.has(String(u.severity || "").toLowerCase())) securityCount += 1;
    if (u.downloaded) downloadedCount += 1;
  }
  return {
    count: list.length,
    driverCount,
    softwareCount: list.length - driverCount,
    totalBytes,
    securityCount,
    downloadedCount,
  };
}

/** Taille courte en français : « 620 Mo », « 1,4 Go », « — » si nul. */
export function formatWindowsUpdateBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const mo = n / (1024 * 1024);
  if (mo < 1024) return `${Math.round(mo)} Mo`;
  return `${(mo / 1024).toFixed(1).replace(".", ",")} Go`;
}

/**
 * Phrase de synthèse pour l'interface.
 * @param {ReturnType<typeof summarizeWindowsUpdates>} summary
 * @returns {string}
 */
export function describeWindowsUpdates(summary) {
  const s = summary || summarizeWindowsUpdates([]);
  if (s.count === 0) return "Aucune mise à jour Windows en attente.";
  const parts = [`${s.count} mise${s.count > 1 ? "s" : ""} à jour Windows en attente`];
  if (s.driverCount > 0) parts.push(`${s.driverCount} pilote${s.driverCount > 1 ? "s" : ""}`);
  if (s.securityCount > 0) parts.push(`${s.securityCount} de sécurité`);
  if (s.totalBytes > 0) parts.push(formatWindowsUpdateBytes(s.totalBytes));
  return `${parts.join(" · ")}.`;
}
