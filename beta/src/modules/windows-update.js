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

/** @typedef {{updateId:string, title:string, kb:string, kind:"driver"|"software", bytes:number, downloaded:boolean, severity:string, mandatory:boolean}} WindowsUpdateItem */

function toItem(raw) {
  const title = String(raw && raw.title != null ? raw.title : "").trim();
  if (!title) return null;
  let bytes = 0;
  const n = Number(raw && raw.bytes);
  if (Number.isFinite(n) && n > 0) bytes = Math.round(n);
  const updateId = String(raw && raw.updateId != null ? raw.updateId : "").trim();
  return {
    updateId: /^[0-9a-fA-F-]{36}$/.test(updateId) ? updateId : "",
    title,
    kb: String(raw && raw.kb != null ? raw.kb : ""),
    kind: String(raw && raw.kind) === "driver" ? "driver" : "software",
    bytes,
    downloaded: Boolean(raw && raw.downloaded),
    severity: String(raw && raw.severity != null ? raw.severity : ""),
    mandatory: Boolean(raw && raw.mandatory),
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

/**
 * Sélection cochée par défaut : les composants toujours, les pilotes seulement
 * si l'utilisateur l'a explicitement demandé. Les entrées sans `updateId`
 * exploitable (installation impossible) sont exclues.
 * @param {WindowsUpdateItem[]} updates
 * @param {{includeDrivers?: boolean}} [opts]
 * @returns {string[]} liste d'`updateId`
 */
export function defaultWindowsUpdateSelection(updates, opts) {
  const includeDrivers = Boolean(opts && opts.includeDrivers);
  return (Array.isArray(updates) ? updates : [])
    .filter((u) => u && typeof u.updateId === "string" && u.updateId.length === 36)
    .filter((u) => includeDrivers || u.kind !== "driver")
    .map((u) => u.updateId);
}

/** Codes de résultat WUA : 2 = réussi, 3 = réussi avec avertissements. */
const WUA_RESULT_OK = 2;
const WUA_RESULT_PARTIAL = 3;

/**
 * Lit le journal du script d'installation élevé.
 * @param {string} output
 * @returns {{items: Array<{updateId:string, ok:boolean, partial:boolean, resultCode:number, hresult:number}>, rebootRequired:boolean, installed:number, failed:number, error:string|null}}
 */
export function parseWindowsUpdateInstallMarkers(output) {
  const items = [];
  let rebootRequired = false;
  let error = null;
  let sawEnd = false;
  for (const line of String(output ?? "").split(/\r\n|\r|\n/)) {
    if (line.startsWith("PCSETUP_WUI_ITEM|")) {
      let raw;
      try {
        raw = JSON.parse(line.slice("PCSETUP_WUI_ITEM|".length));
      } catch {
        continue;
      }
      const resultCode = Number(raw && raw.resultCode) || 0;
      items.push({
        updateId: String(raw && raw.updateId != null ? raw.updateId : ""),
        ok: resultCode === WUA_RESULT_OK,
        partial: resultCode === WUA_RESULT_PARTIAL,
        resultCode,
        hresult: Number(raw && raw.hresult) || 0,
      });
    } else if (line.startsWith("PCSETUP_WUI_END|")) {
      sawEnd = true;
      const parts = line.split("|");
      if (parts[1] === "error") error = parts.slice(2).join("|") || "Échec de l'installation.";
      for (const seg of parts) if (seg === "reboot=1") rebootRequired = true;
    }
  }
  const installed = items.filter((i) => i.ok).length;
  if (!sawEnd && !error) error = "L'installation Windows Update ne s'est pas terminée.";
  return { items, rebootRequired, installed, failed: items.length - installed, error };
}
