/**
 * Réponses du faux hôte, écrites d'après les séquences de `OwlSetupWebView.cs`.
 *
 * Chaque fonction reçoit le `payload` de l'action et rend la liste ordonnée
 * des messages que l'hôte enverrait. Les types et les champs sont ceux de
 * l'hôte : `beta/test/faux-hote.test.js` confronte chaque message produit ici
 * aux initialiseurs `new { type="…", … }` du C#, et échoue si un scénario
 * invente un type ou un champ que l'hôte n'envoie pas.
 *
 * Les textes (`title`, `detail`…) reprennent ceux de l'hôte : l'hôte envoie
 * aujourd'hui des phrases en français, et l'interface les traduit à l'affichage.
 */

export const VERSION_SIMULEE = "4.1.0";

/** `SendAppInfo` puis `SendSystemSummary` (action `get-app-info`). */
export function infosApplication() {
  return [
    { type: "app-info", version: VERSION_SIMULEE, channel: "stable", beta: false },
    {
      type: "system-summary",
      os: "Windows 11 Professionnel",
      display: "24H2",
      build: "26100.4061",
      architecture: "x64",
      winget: "v1.11.400",
      wingetReady: true,
      restartPending: false,
      restartReason: "",
    },
  ];
}

/**
 * `ScanInstalled`. Par défaut rien n'est installé ; `installes` liste des
 * identifiants à déclarer installés et gérables par WinGet.
 */
export function applicationsInstallees(payload, installes = []) {
  const noms = new Map((payload?.apps ?? []).map((app) => [app.id, app.name]));
  const details = installes.map((id) => ({
    id,
    name: noms.get(id) ?? id,
    version: "",
    iconData: "",
    discovered: !noms.has(id),
    source: "winget",
    manageable: true,
  }));
  return [
    {
      type: "installed-state",
      ids: [...installes],
      managedIds: [...installes],
      relatedIds: [],
      details,
      method: installes.length ? "winget" : "windows",
      count: installes.length,
      warning: null,
    },
  ];
}

/** `CheckAppUpdate` quand la version publiée est celle qui tourne. */
export function verificationDeMiseAJour() {
  return [
    { type: "app-update-state", status: "checking", current: VERSION_SIMULEE },
    {
      type: "app-update-state",
      status: "current",
      current: VERSION_SIMULEE,
      latest: `v${VERSION_SIMULEE}`,
      page: `https://github.com/OwlNetGeekFR/OwlSetup/releases/tag/v${VERSION_SIMULEE}`,
    },
  ];
}

/**
 * Une ligne de `QueryAvailableUpdates` : l'hôte construit un dictionnaire
 * `name/id/current/available/selfManaged/unknownVersion`.
 */
export function miseAJourDisponible(id, name, current, available) {
  return { name, id, current, available, selfManaged: false, unknownVersion: false };
}

/**
 * `ScanHealth` : il interroge aussi les mises à jour et envoie `updates-found`
 * AVANT `health-state`. Le score suit la formule de l'hôte.
 */
export function etatDeSante(misesAJour = []) {
  const penaliteMisesAJour = Math.min(32, misesAJour.length * 4);
  return [
    { type: "health-scanning" },
    { type: "updates-found", updates: misesAJour, error: null },
    {
      type: "health-state",
      score: Math.max(20, 100 - penaliteMisesAJour),
      freeGb: 182.4,
      totalGb: 475.8,
      freePercent: 38,
      updateCount: misesAJour.length,
      pendingRestart: false,
      quarantineCount: 0,
      error: null,
      deductions: { updates: penaliteMisesAJour, disk: 0, restart: 0, scan: 0 },
    },
  ];
}

/** `ScanUpdates` (action `scan-updates`). */
export function analyseDesMisesAJour(misesAJour = []) {
  return [
    { type: "updates-scanning" },
    { type: "updates-found", updates: misesAJour, error: null },
  ];
}

/** `SendQuarantineState` (action `scan-quarantine`). */
export function quarantaineVide() {
  return [{ type: "quarantine-state", items: [] }];
}

/**
 * `RunInstallPreflight` quand tout est prêt : WinGet, disque, Windows, puis
 * un `winget show` par paquet.
 */
export function diagnosticAvantInstallation(payload) {
  const requestId = payload.requestId;
  const paquets = payload.packages ?? [];
  const etape = (key, state, title, detail) => ({
    type: "install-preflight-progress",
    requestId,
    key,
    state,
    title,
    detail,
  });
  return [
    etape("winget", "checking", "Contrôle de WinGet", "Version et disponibilité..."),
    etape("winget", "success", "Contrôle de WinGet", "v1.11.400"),
    etape("disk", "checking", "Contrôle du stockage", "Espace libre sur le disque choisi..."),
    etape("disk", "success", "Contrôle du stockage", "182,4 Go libres"),
    etape("system", "success", "Compatibilité Windows", "Windows 64 bits compatible"),
    ...paquets.map((id, i) =>
      etape("packages", "checking", "Contrôle des paquets", `${i + 1} / ${paquets.length} · ${id}`)
    ),
    etape("packages", "success", "Contrôle terminé", `${paquets.length} paquet(s) disponible(s)`),
    {
      type: "install-preflight-complete",
      requestId,
      ready: true,
      blockers: [],
      failedPackages: [],
      message: "",
    },
  ];
}

/** `ExplainWingetFailure` pour le code 1603. */
export const ECHEC_1603 =
  "L'installateur de l'éditeur a rencontré une erreur. Fermez l'application concernée puis recommencez.";

/**
 * `RunInstall`, paquet par paquet : progression, source vérifiée, exécution,
 * vérification, résultat ; puis le bilan. `echecs` liste les identifiants dont
 * l'installateur échoue (code 1603) : l'hôte envoie quand même la
 * vérification, négative, puis le message de `ExplainWingetFailure`.
 */
export function installation(payload, echecs = []) {
  const paquets = payload.packages ?? [];
  const total = paquets.length;
  const messages = [{ type: "install-start", total }];
  for (const [i, id] of paquets.entries()) {
    const index = i + 1;
    const ok = !echecs.includes(id);
    messages.push(
      { type: "install-progress", index, total, id },
      { type: "install-security", index, total, id, success: true },
      { type: "install-execution", index, total, id },
      { type: "install-verification", index, total, id, success: ok },
      {
        type: "install-item",
        index,
        total,
        id,
        success: ok,
        code: ok ? 0 : 1603,
        errorMessage: ok ? "" : ECHEC_1603,
      }
    );
  }
  const reussis = paquets.filter((id) => !echecs.includes(id));
  messages.push({
    type: "install-complete",
    success: reussis.length,
    failed: total - reussis.length,
    installedPackages: reussis,
    failedPackages: paquets.filter((id) => echecs.includes(id)),
    logName: "PC-Setup-Installation-2026-09-24-101500.log",
    reportName: "PC-Setup-Installation-2026-09-24-101500.json",
  });
  return messages;
}

/**
 * `LoadHistory` : un élément par journal `PC-Setup-*.log`. `title` et `type`
 * viennent de `HistoryType`, `summary` du rapport JSON quand il existe.
 */
export function historique() {
  const entree = (name, type, summary, result, reportName) => ({
    name,
    date: "24/09/2026 10:15",
    size: "12,4 Ko",
    type,
    title: type,
    summary,
    result,
    reportName,
  });
  return [
    {
      type: "history-state",
      items: [
        entree(
          "PC-Setup-Installation-2026-09-24-101500.log",
          "Installation",
          "2 réussi(s) · 0 échec(s)",
          "success",
          "PC-Setup-Installation-2026-09-24-101500.json"
        ),
        entree(
          "PC-Setup-Mise-a-jour-2026-09-23-184200.log",
          "Mise à jour",
          "1 réussi(s) · 1 échec(s)",
          "failed",
          "PC-Setup-Mise-a-jour-2026-09-23-184200.json"
        ),
        entree("PC-Setup-Nettoyage-2026-09-20-090000.log", "Nettoyage", "", "", ""),
      ],
    },
  ];
}

/** Un élément de `BuildQuarantineItems` (dictionnaire de l'hôte). */
export function elementEnQuarantaine(batch, item, ageDays, bytes, size) {
  return {
    batch,
    item,
    modified: "20/09/2026 09:00",
    modifiedSort: "2026-09-20T09:00:00.0000000+02:00",
    ageDays,
    bytes,
    size,
    partial: false,
  };
}

/** `SendQuarantineState` avec des éléments isolés. */
export function quarantaine(elements) {
  return [{ type: "quarantine-state", items: elements }];
}

/** `SendScheduleState` quand une tâche planifiée existe. */
export function planification() {
  return [
    {
      type: "schedule-state",
      exists: true,
      action: "check",
      frequency: "weekly",
      day: 5,
      time: "20:00",
      nextRun: "26/09/2026 20:00",
    },
  ];
}

/** `ScanBrowserData` : un élément par navigateur ayant au moins un profil. */
export function navigateursDetectes() {
  return [
    {
      type: "browser-scan-state",
      items: [
        { id: "chrome", name: "Google Chrome", engine: "Chromium", profiles: 2, running: false },
        { id: "firefox", name: "Mozilla Firefox", engine: "Firefox", profiles: 1, running: true },
      ],
    },
  ];
}

/** `DiagnoseWinget` : progression de l'outil puis résultat. */
export function diagnosticWinget() {
  return [
    { type: "tool-progress", tool: "winget", percent: 10, status: "Verification de WinGet..." },
    { type: "tool-progress", tool: "winget", percent: 55, status: "Version controlee." },
    { type: "tool-progress", tool: "winget", percent: 90, status: "Sources controlees." },
    { type: "tool-progress", tool: "winget", percent: 100, status: "Diagnostic termine." },
    {
      type: "winget-diagnostic",
      available: true,
      sources: true,
      version: "v1.11.400",
      message: "WinGet et ses sources répondent correctement.",
    },
  ];
}

/**
 * Ce que l'hôte répond au lancement d'une interface « au repos » : c'est le
 * jeu de réponses installé par défaut sur le faux hôte.
 */
export const REPONSES_DE_DEMARRAGE = {
  "get-app-info": () => infosApplication(),
  "scan-installed": (payload) => applicationsInstallees(payload),
  "check-app-update": () => verificationDeMiseAJour(),
  "scan-health": () => etatDeSante(),
  "scan-quarantine": () => quarantaineVide(),
};
