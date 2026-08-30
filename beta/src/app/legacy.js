// Catalogue des applications : fourni par catalog.generated.js (genere depuis
// beta/catalog/apps.json), charge avant ce script et verifie par le controle
// d integrite SHA-256 de l hote. Chaque entree porte deja son `logo`
// (`assets/logos/<fichier>`) : apps.json est la seule source de verite, il n'y
// a plus de table `appLogos` a maintenir ici.
const apps = Array.isArray(window.PC_SETUP_CATALOG)
  ? window.PC_SETUP_CATALOG.map(app => ({ ...app }))
  : [];
const builtInCatalogIds = new Set(apps.map(app => app.id.toLocaleLowerCase("en")));

const customPackagesStorageKey = "owlsetup-custom-packages-v1";
// `isValidPackageId` / `sanitizePackageIds` / `telemetrySafePackageId` :
// fournis par beta/src/modules/package-id.js, inlinés en tête de app.js.
// L’ajout libre d’identifiants WinGet a été retiré : seules les applications
// contrôlées du catalogue OwlSetup peuvent être proposées à l’utilisateur.
localStorage.removeItem(customPackagesStorageKey);

const catalogScopeStorageKey = "owlsetup-catalog-scope-v1";
let activeCatalogScope = ["catalog", "installed", "system"].includes(localStorage.getItem(catalogScopeStorageKey)) ? localStorage.getItem(catalogScopeStorageKey) : "catalog";
document.querySelector("#homeCatalogCount").textContent = apps.length;
let selected;
try {
  const storedSelection = JSON.parse(localStorage.getItem("pcsetup-selection") || "[]");
  selected = new Set((Array.isArray(storedSelection) ? storedSelection : []).filter(id => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(id)));
} catch {
  selected = new Set();
  localStorage.removeItem("pcsetup-selection");
}
apps.filter(app => app.manualInstall).forEach(app => selected.delete(app.id));
let installedApps = new Set();
let managedInstalled = new Set();
let wingetManageableApps = new Set();
let installedDetection = new Map();
let relatedWindowsApps = new Set();
let discoveredInstalledIds = new Set();
let pendingUninstallId = null;
let pendingUninstallResidueToken = "";
let pendingRepairId = null;
let pendingBatchUninstall = [];
let pendingBatchResidueToken = "";
let batchUninstallSimulationPending = false;
let batchUninstallSimulationTimer = 0;
let pendingCleanupChoices = [];
let lastFailedInstallPackages = [];
let lastInstallReportName = "";
let installPreflightRequestId = 0;
let installSubmissionPending = false;
let availableUpdates = [];
let selectedUpdates = new Set();
// Miroir de SelfManagedUpdaters (OwlSetupWebView.cs) : lanceurs qui embarquent
// leur propre mise à jour et que WinGet reproposera toujours. La liste et les
// heuristiques vivent dans le module `update-heuristics.js` (branché par
// build-js.mjs) ; ici on n'a besoin que du Set en minuscules.
const SELF_MANAGED_UPDATER_IDS = new Set(SELF_MANAGED_UPDATERS.map(id => id.toLowerCase()));
let appUpdateReleasePage = "https://github.com/OwlNetGeekFR/OwlSetup/releases/latest";
let currentBuildVersion = "inconnue";
let currentBuildChannel = "stable";
let feedbackDiagnostics = "Non généré";
let updatesLoaded = false;
let activeCategory = "Tout";
let searchTerm = "";
let extendedWingetResults = [];
let extendedWingetQuery = "";
let extendedWingetPending = false;
let extendedWingetSearchTimer = 0;
let installedSearchTerm = "";
let installedSortMode = "name";
const onboardingStorageKey = "owlsetup-onboarding-completed-v1";
const firstRunConfigurationStorageKey = "owlsetup-first-run-configuration-v1";
let onboardingStep = 0;
let onboardingPreviousFocus = null;
const notificationStorageKey = "owlsetup-notifications-v2";
let notificationFeed = [];
const shownSessionToasts = new Set();
let currentInstallRun = "";
let currentUninstallRun = "";
let activeUninstallMode = "";
let currentReportName = "";
let currentLogName = "";
let currentLogCategory = "";
let currentLogIssues = [];
let historyItems = [];
let pendingFeedbackReport = null;
let pendingProtectedAction = null;
let lastUpdateIssue = null;
let lastInstallIssue = null;
const accessibilityStorageKey = "owlsetup-accessibility-v1";
const themeStorageKey = "owlsetup-theme-v1";
const feedbackFollowupStorageKey = "owlsetup-feedback-followups-v1";
const errorTelemetryStorageKey = "owlsetup-error-telemetry-v1";
const telemetryIncidentStorageKey = "owlsetup-telemetry-incidents-v2";
const errorTelemetryEndpoint = "https://owlsetup-dashboard-owlnetgeekfr.onrender.com/api/telemetry/errors";
const autoRestoreStorageKey = "owlsetup-auto-restore-v1";
const prereleaseStorageKey = "owlsetup-prerelease-v1";
const operationsStorageKey = "owlsetup-operations-v1";
const activeOperationStorageKey = "owlsetup-active-operation-v1";
const expertModeStorageKey = "owlsetup-expert-mode-v1";
const alphaPreferencesStorageKey = "owlsetup-alpha4-preferences-v1";
let alphaOneClickPending = false;
let alphaLastPlan = [];
let alphaLastScore = 0;
let alphaReviewMode = "recommended";
let alphaSelectedPlanIds = new Set();
const alphaHistoryStorageKey = "owlsetup-alpha4-history-v1";
let operationFeed = [];
let pendingResumeOperation = null;
let selectedOperationFix = null;
let operationProcessPackages = [];
let processCloseContext = "operations";
let updateBlockerPackages = [];
let updateBlockerReady = false;
let updateBlockerInspected = false;
let updateBlockerProcessNames = [];
let lastSecurityStatus = null;
let activeSecurityDetail = "";
const securityRetentionStorageKey = "owlsetup-security-retention-v1";
const updateIgnoreStorageKey = "owlsetup-update-ignore-v1";
const sentTelemetryFingerprints = new Set();
let pendingTelemetryReport = null;
let lastTelemetrySendError = "";
let browserScanLoaded = false;
let browserScanItems = [];
let browserAnalysisData = null;
let browserCleanupRunning = false;
let lastBrowserCleanupReport = "";
const browserLogoFiles = {chrome:"googlechrome.svg",brave:"brave.svg",vivaldi:"vivaldi.svg",opera:"opera.svg","opera-gx":"operagx-color.svg",firefox:"firefox.svg",librewolf:"librewolf.svg",floorp:"floorp.svg",waterfox:"waterfox-color.svg",tor:"torbrowser-color.svg"};
const browserCategoryDetails = {
  cache:{label:"Cache de navigation",detail:"Images, scripts, polices et fichiers temporaires",risk:"safe"},
  "media-cache":{label:"Cache multimédia",detail:"Copies temporaires audio et vidéo",risk:"safe"},
  crash:{label:"Rapports de plantage",detail:"Diagnostics locaux devenus inutiles",risk:"safe"},
  cookies:{label:"Cookies",detail:"Connexions et préférences de sites",risk:"warning"},
  "site-data":{label:"Données de sites",detail:"Stockage local et données hors ligne",risk:"warning"},
  history:{label:"Historique",detail:"Liste des pages visitées",risk:"warning"}
};
const browserProtectedLabels=["Mots de passe","Favoris","Extensions","Téléchargements","Sessions ouvertes","Profils"];

const $ = selector => document.querySelector(selector);
// `escapeHtml` est fourni par beta/src/modules/escape-html.js, inliné en tête de
// app.js par beta/scripts/build-js.mjs (lot 2).

// Décision pure du thème (normalizeThemePreference / resolveTheme) : fournie par
// beta/src/modules/theme.js, inlinée en tête de app.js. Les effets de bord
// (localStorage, matchMedia, dataset du document) restent ici.
const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: light)");
function getThemePreference() {
  return normalizeThemePreference(localStorage.getItem(themeStorageKey));
}
function applyThemePreference(preference=getThemePreference()) {
  const selected=normalizeThemePreference(preference);
  const resolved=resolveTheme(selected,systemThemeQuery?.matches);
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.themePreference=selected;
  document.documentElement.style.colorScheme=resolved;
  document.querySelectorAll("#appTheme,#firstRunTheme").forEach(control=>{control.value=selected;});
}
function saveThemePreference(preference) {
  const selected=normalizeThemePreference(preference);
  localStorage.setItem(themeStorageKey,selected);
  applyThemePreference(selected);
}
applyThemePreference();
systemThemeQuery?.addEventListener?.("change",()=>{if(getThemePreference()==="system")applyThemePreference("system");});

const logosRequiringLightSurface = new Set([
  "Tailscale.Tailscale",
  "ElectronicArts.EADesktop",
  "Rustlang.Rustup",
  "Ollama.Ollama"
]);
const logoSurfaceClass = app => logosRequiringLightSurface.has(app?.id) ? " app-icon-light" : "";
const icon = app => `<span class="app-icon${logoSurfaceClass(app)}" style="--app:${escapeHtml(app.color)}">${app.logo ? `<img src="${escapeHtml(app.logo)}" alt="" loading="lazy" data-image-fallback="${escapeHtml(app.icon)}"><span class="app-icon-fallback" hidden>${escapeHtml(app.icon)}</span>` : `<span class="app-icon-fallback">${escapeHtml(app.icon)}</span>`}</span>`;
const save = () => localStorage.setItem("pcsetup-selection", JSON.stringify([...selected]));

function setNavAlert(selector, value, warning = false) {
  const badge = $(selector);
  if (!badge) return;
  const visible = value !== null && value !== undefined && value !== "" && Number(value) !== 0;
  badge.classList.toggle("hidden", !visible);
  badge.classList.toggle("warning", visible && warning);
  if (visible) badge.textContent = String(value);
  updateTopMenuAlert(badge.closest(".top-nav-group"));
}

function updateTopMenuAlert(group) {
  if (!group) return;
  const summary = group.querySelector(".top-menu-alert");
  if (!summary) return;
  const alerts = [...group.querySelectorAll(".top-nav-menu .new-badge:not(.hidden)")];
  const numbers = alerts.map(item => Number.parseInt(item.textContent, 10)).filter(Number.isFinite);
  const total = numbers.reduce((sum, value) => sum + value, 0);
  summary.classList.toggle("hidden", alerts.length === 0);
  summary.textContent = total > 0 ? String(total) : "!";
}

function notify(title, detail, kind = "success") {
  const glyphs = { success: "✓", info: "i", warning: "!", error: "✕" };
  const toast = $("#toast");
  const icon = $("#toastIcon");
  if (icon) icon.textContent = glyphs[kind] || "✓";
  toast.classList.remove("toast-info", "toast-warning", "toast-error");
  if (kind === "info" || kind === "warning" || kind === "error") toast.classList.add(`toast-${kind}`);
  $("#toastTitle").textContent = title;
  $("#toastText").textContent = detail;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), kind === "error" ? 4000 : 2600);
}

function getErrorTelemetryMode() {
  const value = localStorage.getItem(errorTelemetryStorageKey);
  return ["never", "ask", "automatic"].includes(value) ? value : "never";
}

function setErrorTelemetryMode(value) {
  const mode = ["never", "ask", "automatic"].includes(value) ? value : "never";
  localStorage.setItem(errorTelemetryStorageKey, mode);
  document.querySelectorAll('[name="errorTelemetryMode"]').forEach(input => { input.checked = input.value === mode; });
  return mode;
}

function inferTelemetryContext(message = "", supplied = {}) {
  const text = String(message).toLowerCase();
  const view = supplied.operation || document.querySelector(".view.active")?.id || "unknown";
  const categoryByView = {catalog:"installation",queue:"installation",install:"installation",preflight_install:"installation","preflight-install":"installation",installed:"uninstall",uninstall:"uninstall",repair:"repair",updates:"update",update:"update",cleanup:"cleanup",tools:"system",security:"security"};
  const category = supplied.errorCategory || categoryByView[view] || (view === "troubleshooting" ? "system" : "unknown");
  let stage = supplied.failureStage || "execution";
  if (/télécharg|download/.test(text)) stage = "download";
  else if (/processus|fichier.+utilis|files?.+use|déjà.+cours/.test(text)) stage = "process-lock";
  else if (/réseau|network|http|source.+indisponible/.test(text)) stage = "network";
  else if (/permission|accès refus|administrateur|uac/.test(text)) stage = "permissions";
  else if (/vérifi|hash|détecté après/.test(text)) stage = "verification";
  else if (/pré.?requis|preflight|winget.+indisponible/.test(text)) stage = "preflight";
  let targetPackage = supplied.targetPackage || "";
  if (!targetPackage && category === "update" && selectedUpdates?.size === 1) targetPackage = [...selectedUpdates][0];
  if (!targetPackage && category === "uninstall") targetPackage = pendingUninstallId || pendingRepairId || "";
  if (!targetPackage && category === "installation" && lastFailedInstallPackages?.length === 1) targetPackage = lastFailedInstallPackages[0];
  targetPackage = telemetrySafePackageId(targetPackage);
  const errorKind = supplied.errorKind || (stage === "network" ? "network" : stage === "permissions" ? "permission" : stage === "process-lock" ? "process-lock" : /winget/.test(text) ? "winget" : "application");
  return {operation:view,errorCategory:category,failureStage:stage,targetPackage,errorKind,resolutionStatus:supplied.resolutionStatus || "open"};
}

function minimalTelemetrySample(fingerprint = "EXEMPLE01", message = "", supplied = {}) {
  const context = inferTelemetryContext(message, supplied);
  const code = String(supplied.errorCode ?? message).match(/(?:0x[0-9a-f]+|-?\d{6,})/i)?.[0] || String(supplied.errorCode || "non disponible");
  return {
    schemaVersion: 2,
    eventId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fingerprint: String(fingerprint).slice(0, 32),
    errorCode: code.slice(0, 32),
    operation: context.operation,
    errorCategory: context.errorCategory,
    failureStage: context.failureStage,
    targetPackage: context.targetPackage || null,
    errorKind: context.errorKind,
    resolutionStatus: context.resolutionStatus,
    owlSetupVersion: currentBuildVersion || "unknown",
    channel: currentBuildChannel || "stable",
    language: window.owlI18n?.getLanguage?.() || "fr",
    occurredAtUtc: new Date().toISOString()
  };
}

async function sendTelemetryPayload(payload) {
  const dedupeKey = `${payload?.fingerprint || ""}:${payload?.resolutionStatus || "open"}`;
  if (!payload || sentTelemetryFingerprints.has(dedupeKey)) return false;
  sentTelemetryFingerprints.add(dedupeKey);
  lastTelemetrySendError = "";
  const retryDelays = [0, 1200, 3500];
  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    if (retryDelays[attempt]) await new Promise(resolve => window.setTimeout(resolve, retryDelays[attempt]));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(errorTelemetryEndpoint, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: {"Content-Type":"application/json", "Accept":"application/json"},
        body: JSON.stringify(payload),
        referrerPolicy: "no-referrer",
        credentials: "omit",
        signal: controller.signal
      });
      if (response.ok) {
        window.clearTimeout(timeout);
        return true;
      }
      lastTelemetrySendError = response.status === 429
        ? "Le service a reçu trop de rapports. Réessayez dans quelques minutes."
        : response.status >= 500
          ? "Le dashboard démarre ou rencontre une indisponibilité temporaire."
          : `Le dashboard a refusé ce diagnostic (HTTP ${response.status}).`;
      window.clearTimeout(timeout);
      if (response.status < 500 || response.status === 429) break;
    } catch (error) {
      window.clearTimeout(timeout);
      lastTelemetrySendError = error?.name === "AbortError"
        ? "Le dashboard met trop de temps à répondre."
        : "Le dashboard est momentanément inaccessible depuis ce PC.";
    }
  }
  sentTelemetryFingerprints.delete(dedupeKey);
  return false;
}

async function sendMinimalErrorTelemetry(fingerprint, message, context = {}) {
  if (getErrorTelemetryMode() !== "automatic") return false;
  return sendTelemetryPayload(minimalTelemetrySample(fingerprint, message, context));
}

// `telemetryFingerprint` : fourni par beta/src/modules/redaction.js, inliné en
// tête de app.js.

function reportOperationalTelemetry(context) {
  const fingerprint = telemetryFingerprint(context);
  const payload = minimalTelemetrySample(fingerprint, context.message || "", context);
  const mode = getErrorTelemetryMode();
  if (mode === "automatic") {
    try {
      const incidents = JSON.parse(sessionStorage.getItem(telemetryIncidentStorageKey) || "[]").filter(item => item?.fingerprint !== payload.fingerprint);
      incidents.push(payload);
      sessionStorage.setItem(telemetryIncidentStorageKey, JSON.stringify(incidents.slice(-20)));
    } catch {}
    return sendTelemetryPayload(payload);
  }
  if (mode === "ask") {
    pendingTelemetryReport = payload;
    $("#telemetryPreviewTitle").textContent = "Partager ce diagnostic minimal ?";
    $("#telemetryPreviewContent").textContent = JSON.stringify(payload, null, 2);
    $("#sendTelemetryPreview").classList.remove("hidden");
    if (!$("#telemetryPreviewDialog").open) $("#telemetryPreviewDialog").showModal();
  }
  return false;
}

function resolveOperationalTelemetry(errorCategory, targetPackage = "") {
  if (getErrorTelemetryMode() !== "automatic") return false;
  try {
    const incidents = JSON.parse(sessionStorage.getItem(telemetryIncidentStorageKey) || "[]");
    let index = -1;
    for (let cursor = incidents.length - 1; cursor >= 0; cursor -= 1) {
      const item = incidents[cursor];
      if (item?.errorCategory === errorCategory && (!targetPackage || !item.targetPackage || item.targetPackage === targetPackage)) {
        index = cursor;
        break;
      }
    }
    if (index < 0) return false;
    const previous = incidents[index];
    incidents.splice(index, 1);
    sessionStorage.setItem(telemetryIncidentStorageKey, JSON.stringify(incidents));
    sentTelemetryFingerprints.delete(`${previous.fingerprint}:open`);
    return sendTelemetryPayload({...previous,eventId:globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,resolutionStatus:"retry-succeeded",occurredAtUtc:new Date().toISOString()});
  } catch { return false; }
}

let lastNativeError = "";
function showNativeError(details) {
  const supplied = details && typeof details === "object" ? details : {};
  const message = supplied.message ?? details;
  const clean = String(message || "Une erreur inconnue est survenue.").trim().slice(0, 1200);
  const fingerprint = [...clean].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 2166136261).toString(16).toUpperCase().padStart(8, "0");
  lastNativeError = `OwlSetup ${currentBuildVersion || ""}\nDiagnostic ${fingerprint}\n${clean}`.trim();
  $("#nativeErrorMessage").textContent = clean;
  $("#nativeErrorId").textContent = `Diagnostic ${fingerprint}`;
  $("#nativeErrorCard").classList.remove("hidden");
  pushNotification({key:`native-error-${fingerprint}`,title:"Une action nécessite votre attention",detail:clean,kind:"error",action:"troubleshooting",symbol:"!"});
  const telemetryMode = getErrorTelemetryMode();
  if (telemetryMode === "automatic") sendMinimalErrorTelemetry(fingerprint, clean, supplied);
  else if (telemetryMode === "ask") {
    pendingTelemetryReport = minimalTelemetrySample(fingerprint, clean, supplied);
    $("#telemetryPreviewTitle").textContent = "Partager ce diagnostic minimal ?";
    $("#telemetryPreviewContent").textContent = JSON.stringify(pendingTelemetryReport, null, 2);
    $("#sendTelemetryPreview").classList.remove("hidden");
    if (!$("#telemetryPreviewDialog").open) $("#telemetryPreviewDialog").showModal();
  }
}

window.addEventListener("owlsetup:native-error", event => showNativeError(event.detail));

function loadNotificationFeed() {
  try {
    const stored = JSON.parse(localStorage.getItem(notificationStorageKey) || "[]");
    const readRetention = Date.now() - (14 * 24 * 60 * 60 * 1000);
    notificationFeed = Array.isArray(stored)
      ? stored.filter(item => item?.unread || new Date(item?.createdAt || 0).getTime() >= readRetention).slice(0, 40)
      : [];
  } catch { notificationFeed = []; }
  saveNotificationFeed();
  renderNotificationFeed();
}

function saveNotificationFeed() {
  localStorage.setItem(notificationStorageKey, JSON.stringify(notificationFeed.slice(0, 40)));
}

function addNotification({key, title, detail, kind = "info", action = "", symbol = "i", operationType = "", packageIds = []}) {
  const id = key || `${Date.now()}-${Math.random()}`;
  const previous = notificationFeed.find(item => item.key === id);
  const item = {key:id, title, detail, kind, action, symbol, operationType, packageIds:packageIds.filter(isValidPackageId), unread:true, createdAt:new Date().toISOString()};
  notificationFeed = [item, ...notificationFeed.filter(entry => entry.key !== id)].slice(0, 40);
  if (previous && previous.title === title && previous.detail === detail && previous.unread) item.createdAt = previous.createdAt;
  saveNotificationFeed();
  renderNotificationFeed();
}

function renderNotificationFeed() {
  const list = $("#notificationList");
  if (!list) return;
  const unread = notificationFeed.filter(item => item.unread).length;
  const count = $("#notificationCount");
  const clearButton = $("#clearNotifications");
  const deleteReadButton = $("#deleteReadNotifications");
  const readCount = notificationFeed.filter(item => !item.unread).length;
  count.textContent = unread > 99 ? "99+" : String(unread);
  count.classList.toggle("hidden", unread === 0);
  clearButton.disabled = unread === 0;
  clearButton.textContent = unread === 0 ? "Tout est lu" : "Tout marquer comme lu";
  deleteReadButton.disabled = readCount === 0;
  deleteReadButton.textContent = readCount ? `Effacer les lues (${readCount})` : "Aucune notification lue";
  $("#appUpdateNotification").classList.toggle("available", unread > 0);
  setNavAlert("#troubleshootingNavBadge", notificationFeed.filter(item => item.unread && item.kind === "warning").length, true);
  if (!notificationFeed.length) {
    list.innerHTML = `<div class="notification-empty"><span>✓</span><strong>Tout est calme</strong><small>Les mises à jour et installations apparaîtront ici.</small></div>`;
    return;
  }
  list.innerHTML = notificationFeed.map(item => {
    const date = new Date(item.createdAt);
    const time = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("fr-FR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
    const kind = ["info", "success", "warning", "error"].includes(item.kind) ? item.kind : "info";
    return `<article class="notification-item ${kind} ${item.unread ? "unread" : ""}" data-notification-key="${escapeHtml(item.key)}" data-notification-action="${escapeHtml(item.action)}"><span class="notification-symbol">${escapeHtml(item.symbol)}</span><span class="notification-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small><time>${time}</time></span>${item.unread ? `<i class="notification-dot"></i>` : ""}</article>`;
  }).join("");
}

function toggleNotificationCenter(force) {
  const center = $("#notificationCenter");
  const open = typeof force === "boolean" ? force : center.classList.contains("hidden");
  center.classList.toggle("hidden", !open);
}

function setBackgroundInstall(title, detail, percent, state = "running") {
  const dock = $("#backgroundInstall");
  dock.classList.remove("hidden", "complete", "warning");
  if (state !== "running") dock.classList.add(state);
  $("#backgroundInstallTitle").textContent = title;
  $("#backgroundInstallDetail").textContent = detail;
  $("#backgroundInstallPercent").textContent = `${percent}%`;
  $("#backgroundInstallBar").style.width = `${percent}%`;
  $("#showInstallProgress").textContent = state === "running" ? "Afficher" : "Voir le résultat";
}

function minimizeInstallProgress() {
  if ($("#installModal").dataset.running !== "true") return;
  $("#installModal").classList.add("hidden");
  notify("Installation en arrière-plan", "Vous pouvez continuer à utiliser OwlSetup et rouvrir la progression à tout moment.");
}

function setBackgroundUpdate(title, detail, percent, state = "running") {
  const dock = $("#backgroundUpdate");
  dock.classList.remove("hidden", "complete", "warning");
  if (state !== "running") dock.classList.add(state);
  $("#backgroundUpdateTitle").textContent = title;
  $("#backgroundUpdateDetail").textContent = detail;
  $("#backgroundUpdatePercent").textContent = `${percent}%`;
  $("#backgroundUpdateBar").style.width = `${percent}%`;
  $("#showUpdateProgress").textContent = state === "running" ? "Afficher" : "Voir le résultat";
}

function minimizeUpdateProgress() {
  if ($("#updateModal").dataset.running !== "true") return;
  $("#updateModal").classList.add("hidden");
  notify("Mise à jour en arrière-plan", "La progression reste visible. Vous pouvez continuer à utiliser OwlSetup.");
}

function showUpdateProgress() {
  $("#updateModal").classList.remove("hidden");
}

function setBackgroundUninstall(title, detail, percent, state = "running") {
  const dock = $("#backgroundUninstall");
  dock.classList.remove("hidden", "complete", "warning");
  if (state !== "running") dock.classList.add(state);
  $("#backgroundUninstallTitle").textContent = title;
  $("#backgroundUninstallDetail").textContent = detail;
  $("#backgroundUninstallPercent").textContent = `${percent}%`;
  $("#backgroundUninstallBar").style.width = `${percent}%`;
  $("#showUninstallProgress").textContent = state === "running" ? "Afficher" : "Voir le résultat";
}

function activeUninstallModal() {
  return activeUninstallMode === "batch" ? $("#batchUninstallModal") : $("#uninstallModal");
}

function minimizeUninstallProgress(mode = activeUninstallMode) {
  const modal = mode === "batch" ? $("#batchUninstallModal") : $("#uninstallModal");
  if (modal.dataset.running !== "true") return;
  activeUninstallMode = mode;
  modal.classList.add("hidden");
  notify("Désinstallation en arrière-plan", "Vous pouvez continuer à utiliser OwlSetup et rouvrir la progression à tout moment.");
}

function showUninstallProgress() {
  if (!activeUninstallMode) return;
  activeUninstallModal().classList.remove("hidden");
}

function openReportViewer(name) {
  if (!window.chrome?.webview || !name) return;
  currentReportName = name;
  $("#reportViewerTitle").textContent = "Chargement du rapport...";
  $("#reportItems").innerHTML = `<div class="notification-empty"><span>↻</span><strong>Lecture du rapport</strong><small>Préparation de la présentation...</small></div>`;
  $("#reportModal").classList.remove("hidden");
  window.chrome.webview.postMessage({action:"open-report", payload:{name}});
}

function openLogViewer(name) {
  if (!window.chrome?.webview || !name) return;
  currentLogName = name;
  $("#logViewerTitle").textContent = "Chargement du journal...";
  $("#logEntries").innerHTML = `<div class="notification-empty"><span>↻</span><strong>Lecture du journal</strong><small>Analyse locale des événements...</small></div>`;
  $("#logModal").classList.remove("hidden");
  window.chrome.webview.postMessage({action:"open-log", payload:{name}});
}

function closeLogViewer() {
  $("#logModal").classList.add("hidden");
}

// `redactLogDiagnostic` : fourni par beta/src/modules/redaction.js, inliné en
// tête de app.js.

function prepareLogFeedback() {
  if (!currentLogIssues.length) return notify("Aucune erreur à signaler", "Ce journal ne contient aucun élément nécessitant un signalement.");
  const categoryMap = {"Installation":"Installation","Désinstallation":"Désinstallation","Nettoyage":"Nettoyage du disque","Mise à jour":"Mise à jour d'une application"};
  const category = categoryMap[currentLogCategory] || "Autre";
  const errorCount = currentLogIssues.filter(item => item.level === "error").length;
  const warningCount = currentLogIssues.filter(item => item.level === "warning").length;
  const selected = currentLogIssues.slice(0, 10).map(item => `- [${item.level === "error" ? "ERREUR" : "AVERTISSEMENT"}] ${redactLogDiagnostic(item.line)}`).join("\n");
  $("#feedbackCategory").value = category;
  $("#feedbackTitle").value = `${currentLogCategory || "Opération"} : ${errorCount} erreur(s) et ${warningCount} avertissement(s)`;
  $("#feedbackDescription").value = `OwlSetup a détecté des éléments à vérifier dans le journal ${currentLogName}.\n\nExtraits techniques anonymisés :\n${selected}`;
  $("#feedbackSteps").value = `1. Exécuter l’opération ${String(currentLogCategory || "concernée").toLocaleLowerCase("fr-FR")}\n2. Ouvrir le journal depuis OwlSetup\n3. Consulter les lignes signalées`;
  closeLogViewer();
  showView("troubleshooting");
  collectFeedbackDiagnostics();
  notify("Signalement préparé", "Relisez les informations puis choisissez « Ouvrir sur GitHub » pour les envoyer.");
  window.setTimeout(() => $("#feedbackTitle").focus(), 250);
}

function buildLogSuggestions(entries) {
  const text=entries.map(item=>item.line).join("\n");
  const suggestions=[];
  if(/code de sortie\s*:\s*6|fichiers.*utilis|currently.*used/i.test(text))suggestions.push({icon:"□",title:"Fermer l’application concernée",detail:"Un fichier semble encore utilisé. Fermez le logiciel et ses processus, puis réessayez.",action:"retry"});
  if(/winget|source.*introuvable|paquet.*introuvable|no package found/i.test(text))suggestions.push({icon:"W",title:"Contrôler WinGet",detail:"Actualisez les sources et lancez le diagnostic WinGet avant une nouvelle tentative.",action:"winget"});
  if(/accès refusé|acces refuse|access denied|0x80070005/i.test(text))suggestions.push({icon:"!",title:"Autorisation Windows requise",detail:"Relancez l’action et acceptez uniquement la demande UAC affichée par OwlSetup.",action:"help"});
  if(/redémarrage|redemarrage|reboot|restart|3010/i.test(text))suggestions.push({icon:"↻",title:"Redémarrage du PC conseillé",detail:"Enregistrez votre travail, puis redémarrez complètement le PC depuis le menu Démarrer de Windows avant de recommencer.",action:"help"});
  if(!suggestions.length&&entries.length)suggestions.push({icon:"?",title:"Faire analyser le problème",detail:"Préparez un signalement anonymisé pour obtenir une réponse depuis GitHub.",action:"report"});
  return suggestions.slice(0,3);
}

function retryFailedInstallation() {
  if(!lastFailedInstallPackages.length)return notify("Relance indisponible","Aucun paquet en échec n’est encore mémorisé pour cette session.");
  selected=new Set(lastFailedInstallPackages);save();renderApps();renderSelection();closeLogViewer();openInstallModal();
  notify("Échecs sélectionnés",`${lastFailedInstallPackages.length} application(s) sont prêtes à être retentées.`);
}

function renderLogViewer(message) {
  currentLogName = message.name || currentLogName;
  const lines = String(message.content || "").replace(/\r/g, "").split("\n").filter(line => line.trim());
  const classify = line => {
    if (/erreur|échec|echec|failed|fatal|code de sortie\s*:\s*[1-9]/i.test(line)) return "error";
    if (/avertissement|warning|à vérifier|a verifier|encore proposées|encore proposees/i.test(line)) return "warning";
    if (/terminé|termine|succès|succes|réussi|reussi|installé|installe|désinstallé|desinstalle/i.test(line)) return "success";
    return "info";
  };
  const entries = lines.map((line,index) => ({line, index:index + 1, level:classify(line)}));
  const errors = entries.filter(item => item.level === "error").length;
  const warnings = entries.filter(item => item.level === "warning").length;
  const successes = entries.filter(item => item.level === "success").length;
  currentLogCategory = message.category || "Opération";
  currentLogIssues = entries.filter(item => item.level === "error" || item.level === "warning");
  $("#reportLogErrors").classList.toggle("hidden", currentLogIssues.length === 0);
  $("#retryLogFailures").classList.toggle("hidden", !(currentLogCategory === "Installation" && lastFailedInstallPackages.length));
  const suggestions=buildLogSuggestions(currentLogIssues);
  $("#logSuggestions").classList.toggle("hidden",suggestions.length===0);
  $("#logSuggestions").innerHTML=suggestions.map(item=>`<article><span>${item.icon}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div><button type="button" data-log-help="${item.action}">Agir</button></article>`).join("");
  $("#logViewerTitle").textContent = message.category ? `Journal de ${String(message.category).toLocaleLowerCase("fr-FR")}` : "Journal d’opération";
  $("#logFileName").textContent = currentLogName;
  $("#logMeta").innerHTML = `<span>Date <b>${escapeHtml(message.date || "—")}</b></span><span>Taille <b>${escapeHtml(message.size || "—")}</b></span><span>Lignes utiles <b>${entries.length}</b></span>`;
  $("#logErrorCount").textContent = String(errors);
  $("#logWarningCount").textContent = String(warnings);
  $("#logSuccessCount").textContent = String(successes);
  $("#logHero").classList.toggle("warning", errors > 0 || warnings > 0);
  $("#logHeroIcon").textContent = errors > 0 ? "!" : warnings > 0 ? "i" : "✓";
  $("#logHeroTitle").textContent = errors > 0 ? "Des erreurs ont été détectées" : warnings > 0 ? "Journal terminé avec avertissement" : "Journal analysé";
  $("#logHeroDetail").textContent = errors > 0 ? `${errors} ligne(s) nécessitent votre attention.` : warnings > 0 ? `${warnings} avertissement(s) sont présents.` : "Aucune erreur évidente n’a été détectée.";
  $("#logEntries").innerHTML = entries.length ? entries.map(item => `<article class="log-entry ${item.level}"><span class="log-entry-index">${item.index}</span><span class="log-entry-level">${item.level === "error" ? "ERREUR" : item.level === "warning" ? "ATTENTION" : item.level === "success" ? "RÉUSSI" : "INFO"}</span><code>${escapeHtml(item.line)}</code></article>`).join("") : `<div class="notification-empty"><span>i</span><strong>Journal vide</strong><small>Aucun événement n’a été enregistré.</small></div>`;
}

function closeReportViewer() {
  $("#reportModal").classList.add("hidden");
}

function renderReportViewer(message) {
  const report = message.report || {};
  const summary = report.summary || {};
  const items = Array.isArray(report.items) ? report.items : [];
  const success = Number(summary.success || 0);
  const failed = Number(summary.failed || 0);
  const total = Number(summary.total ?? items.length);
  const operationNames = {installation:"Installation", desinstallation:"Désinstallation", reparation:"Réparation", nettoyage:"Nettoyage", update:"Mise à jour"};
  const operation = operationNames[report.operation] || "Opération";
  const date = new Date(report.createdAtUtc);
  currentReportName = message.name || currentReportName;
  $("#reportViewerTitle").textContent = `Rapport d’${operation.toLocaleLowerCase("fr-FR")}`;
  $("#reportHero").classList.toggle("warning", failed > 0);
  $("#reportHeroIcon").textContent = failed > 0 ? "!" : "✓";
  $("#reportHeroTitle").textContent = failed > 0 ? `${operation} terminée avec vérifications` : `${operation} réussie`;
  $("#reportHeroDetail").textContent = failed > 0 ? `${failed} élément(s) nécessitent votre attention.` : "Tous les éléments ont été traités correctement.";
  $("#reportSuccessCount").textContent = String(success);
  $("#reportFailedCount").textContent = String(failed);
  $("#reportTotalCount").textContent = String(total);
  $("#reportFileName").textContent = currentReportName;
  const environment = report.environment || {};
  $("#reportMeta").innerHTML = `<span>Date <b>${Number.isNaN(date.getTime()) ? "Inconnue" : date.toLocaleString("fr-FR")}</b></span><span>Version <b>${escapeHtml(report.owlSetupVersion || "—")}</b></span><span>Canal <b>${escapeHtml(report.channel || "—")}</b></span><span>Windows <b>${escapeHtml(environment.architecture || "—")}</b></span>`;
  $("#reportItems").innerHTML = items.length ? items.map(item => {
    const app = apps.find(entry => entry.id === item.id);
    const appVisual = app?.logo ? `<img src="${escapeHtml(app.logo)}" alt="" data-image-fallback="${escapeHtml(app.icon || "APP")}">` : escapeHtml(app?.icon || "APP");
    const ok = item.success === true;
    return `<article class="report-item"><span class="report-item-icon${logoSurfaceClass(app)}" style="${app ? `color:${escapeHtml(app.color)}` : ""}">${appVisual}</span><span><strong>${escapeHtml(item.name || app?.name || item.id || "Application")}</strong><small>${escapeHtml(item.message || (ok ? "Opération réussie" : `Code de sortie : ${item.code ?? "inconnu"}`))}</small></span><b class="report-result ${ok ? "" : "failed"}">${ok ? "RÉUSSI" : "À VÉRIFIER"}</b></article>`;
  }).join("") : `<div class="notification-empty"><span>i</span><strong>Aucun détail disponible</strong><small>Le résumé général reste valide.</small></div>`;
}

function renderFilters() {
  const scopedApps=apps.filter(catalogScopeMatches);
  const categories=["Tout",...new Set(scopedApps.map(app=>app.category).filter(Boolean))];
  if(!categories.includes(activeCategory))activeCategory="Tout";
  const nonSystemInstalled=[...installedApps].filter(id=>{const app=apps.find(entry=>entry.id===id);return app&&!isSystemComponentApp(app);}).length;
  const systemInstalled=[...installedApps].filter(id=>{const app=apps.find(entry=>entry.id===id);return app&&isSystemComponentApp(app);}).length;
  const scopes=[
    {id:"catalog",label:"Catalogue OwlSetup",detail:"Applications vérifiées",count:[...builtInCatalogIds].length,symbol:"▦"},
    {id:"installed",label:"Installées sur ce PC",detail:"Logiciels utilisateur",count:nonSystemInstalled,symbol:"✓"},
    {id:"system",label:"Composants système",detail:"Runtimes et services",count:systemInstalled,symbol:"⚙"}
  ];
  $("#catalogScopes").innerHTML=scopes.map(scope=>`<button class="catalog-scope ${scope.id===activeCatalogScope?"active":""}" type="button" data-catalog-scope="${scope.id}" aria-pressed="${scope.id===activeCatalogScope}"><span>${scope.symbol}</span><p><strong>${scope.label}</strong><small>${scope.detail}</small></p><b>${scope.count}</b></button>`).join("");
  $("#filters").innerHTML = categories.map(c => `<button class="filter ${c === activeCategory ? "active" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
}

function isSystemComponentApp(app){
  const value=`${app?.id||""} ${app?.name||""} ${app?.category||""}`;
  return app?.systemComponent===true||/\b(runtime|redistributable|visual\s*c\+\+|vcredist|\.net\s*(?:sdk|runtime|native)|gameinput|webview2|edge\s*webview|windows\s*(?:app\s*)?runtime|update\s*health|driver|pilote|framework|sdk)\b/i.test(value)||/^(Microsoft\.(?:VCRedist|DotNet|EdgeWebView2|GameInput|WindowsAppRuntime)|Oracle\.JavaRuntime)/i.test(String(app?.id||""));
}

function catalogScopeMatches(app){
  if(activeCatalogScope==="installed")return installedApps.has(app.id)&&!isSystemComponentApp(app);
  if(activeCatalogScope==="system")return installedApps.has(app.id)&&isSystemComponentApp(app);
  return builtInCatalogIds.has(String(app.id||"").toLocaleLowerCase("en"))||(app.externalWinget===true&&!app.discoveredInstalled);
}

function inferInstalledCategory(item,brand){
  if(brand?.app?.category)return brand.app.category;
  const value=`${item?.id||""} ${item?.name||""}`;
  if(isSystemComponentApp({id:item?.id,name:item?.name}))return "Composants système";
  const rules=[
    [/chrome|firefox|brave|vivaldi|opera|browser|waterfox|floorp|librewolf/i,"Navigateurs"],
    [/steam|epic|battle\.?net|ubisoft|gog|game|playnite|curseforge/i,"Gaming"],
    [/visual studio|github|git\b|node\.?js|python|docker|jetbrains|dbeaver|winscp|putty|filezilla|rust|\bgo\b/i,"Développement"],
    [/defender|malware|antivirus|vpn|bitwarden|keepass|security/i,"Sécurité"],
    [/teams|discord|zoom|thunderbird|nextcloud|google drive|onedrive/i,"Communication"],
    [/office|libreoffice|pdf|calibre|notion/i,"Bureautique"],
    [/vlc|obs|audacity|spotify|handbrake|kdenlive/i,"Multimédia"],
    [/chatgpt|claude|gemini|ollama|lm studio|comfy|stability|mistral|perplexity/i,"Intelligence artificielle"],
    [/7-zip|winrar|rufus|everything|powertoys|setup|search|logitech/i,"Utilitaires"]
  ];
  return rules.find(([pattern])=>pattern.test(value))?.[1]||"Autres applications";
}

function installedSourceInfo(id) {
  const detection=installedDetection.get(id)||{};
  const labels={winget:"WinGet",windows:"Windows",msix:"MSIX",portable:"OwlSetup portable"};
  return {source:detection.source||"windows",label:labels[detection.source]||"Windows",manageable:wingetManageableApps.has(id)};
}

function extendedWingetText(fr,en){return window.owlI18n?.getLanguage?.()==="en"?en:fr;}
// `wingetInitials` / `normalizeWingetBrand` / `wingetFallbackColor` : fournis par
// beta/src/modules/winget-brand.js, inlin\u00e9s en t\u00eate de app.js.
function resolveWingetBrand(item){
  const id=String(item?.id||"");
  const nameKey=normalizeWingetBrand(item?.name);
  const idTail=normalizeWingetBrand(id.split(".").pop());
  let match=apps.find(app=>app.id.toLocaleLowerCase("en")===id.toLocaleLowerCase("en"));
  if(!match&&nameKey)match=apps.find(app=>normalizeWingetBrand(app.name)===nameKey);
  if(!match&&idTail.length>=4)match=apps.find(app=>normalizeWingetBrand(app.id.split(".").pop())===idTail);
  if(!match){
    const aliasSource=`${id} ${item?.name||""}`;
    const aliases=[
      {test:/epic.*online/i,logo:"assets/logos/epicgames.svg",icon:"EP",color:"#32343a"},
      {test:/microsoft.*(?:\.net|net\s+(?:runtime|sdk|native))/i,logo:"assets/logos/dotnet.svg",icon:".N",color:"#6f4bd8"},
      {test:/visual\s*c\+\+|vcredist/i,logo:"assets/logos/cplusplus-color.svg",icon:"C+",color:"#287bc0"},
      {test:/github\s*cli|github\.cli/i,logo:"assets/logos/githubdesktop.svg",icon:"GH",color:"#59636f"}
    ];
    const alias=aliases.find(candidate=>candidate.test.test(aliasSource));
    if(alias)return {...alias,app:null};
  }
  return match
    ? {logo:match.logo||"",icon:match.icon||wingetInitials(item?.name),color:match.color||"#5794dd",app:match}
    : {logo:"",icon:wingetInitials(item?.name),color:wingetFallbackColor(id||item?.name),app:null};
}

function mergeDiscoveredInstalledApps(details = []) {
  const discovered = (Array.isArray(details) ? details : []).filter(item => (item?.discovered || !builtInCatalogIds.has(String(item?.id || "").toLocaleLowerCase("en"))) && isValidPackageId(item.id) && String(item.name || "").trim());
  const nextIds = new Set(discovered.map(item => item.id));
  for (let index = apps.length - 1; index >= 0; index -= 1) {
    const app = apps[index];
    if (app.discoveredInstalled && !nextIds.has(app.id)) {
      apps.splice(index, 1);
      selected.delete(app.id);
      managedInstalled.delete(app.id);
    }
  }
  discovered.forEach(item => {
    let app = apps.find(entry => entry.id.toLocaleLowerCase("en") === item.id.toLocaleLowerCase("en"));
    if (!app) {
      const brand = resolveWingetBrand(item);
      app = {
        id: item.id,
        name: String(item.name).trim(),
        category: inferInstalledCategory(item,brand),
        desc: item.version ? `Version ${item.version} · détectée par ${item.source === "winget" ? "WinGet" : "Windows"}` : `Détectée par ${item.source === "winget" ? "WinGet" : "Windows"}`,
        icon: brand.icon,
        logo: brand.logo || item.iconData || "",
        color: brand.color,
        site: "https://learn.microsoft.com/windows/package-manager/winget/",
        externalWinget: true,
        discoveredInstalled: true,
        wingetVersion: item.version || ""
      };
      apps.push(app);
    } else if (app.discoveredInstalled) {
      app.name = String(item.name).trim();
      app.wingetVersion = item.version || app.wingetVersion || "";
      app.desc = item.version ? `Version ${item.version} · détectée par ${item.source === "winget" ? "WinGet" : "Windows"}` : `Détectée par ${item.source === "winget" ? "WinGet" : "Windows"}`;
      app.category=inferInstalledCategory(item,resolveWingetBrand(item));
      if(item.iconData&&!app.logo)app.logo=item.iconData;
    }
  });
  discoveredInstalledIds = nextIds;
  const catalogCount = document.querySelector("#homeCatalogCount");
  if (catalogCount) catalogCount.textContent = apps.length;
}
function renderExtendedWingetSearch(){
  const button=$("#searchWingetBtn"),state=$("#wingetSearchState"),container=$("#wingetSearchResults");
  if(!button||!state||!container)return;
  const query=searchTerm.trim();
  button.disabled=extendedWingetPending;
  button.classList.toggle("needs-query",query.length<2&&!extendedWingetPending);
  button.title=query.length<2
    ? extendedWingetText("Cliquez puis saisissez au moins 2 caractères dans la recherche.","Click, then enter at least 2 characters in the search field.")
    : extendedWingetText(`Rechercher « ${query} » dans WinGet`,`Search WinGet for “${query}”`);
  button.textContent=extendedWingetPending
    ? extendedWingetText("Recherche en cours…","Searching…")
    : extendedWingetText("Rechercher maintenant","Search now");
  if(!extendedWingetQuery){state.classList.add("hidden");container.classList.add("hidden");container.innerHTML="";return;}
  state.classList.remove("hidden","error");
  if(extendedWingetPending){state.textContent=extendedWingetText(`Recherche de « ${extendedWingetQuery} » dans la source communautaire WinGet…`,`Searching the WinGet community source for “${extendedWingetQuery}”…`);container.classList.add("hidden");return;}
  if(!extendedWingetResults.length){state.textContent=extendedWingetText(`Aucun paquet WinGet supplémentaire trouvé pour « ${extendedWingetQuery} ».`,`No additional WinGet package was found for “${extendedWingetQuery}”.`);container.classList.add("hidden");return;}
  $("#emptyState")?.classList.add("hidden");
  state.textContent=extendedWingetText(`${extendedWingetResults.length} résultat(s) externe(s). Vérifiez le nom et l’identifiant exact avant de l’ajouter.`,`${extendedWingetResults.length} external result(s). Check the name and exact package ID before adding one.`);
  container.classList.remove("hidden");
  container.innerHTML=extendedWingetResults.map(item=>{
    const known=apps.some(app=>app.id.toLocaleLowerCase("en")===item.id.toLocaleLowerCase("en"));
    const brand=resolveWingetBrand(item);
    const visual=brand.logo?`<img src="${escapeHtml(brand.logo)}" alt="" loading="lazy" data-image-fallback="${escapeHtml(brand.icon)}"><span class="winget-result-fallback" hidden>${escapeHtml(brand.icon)}</span>`:`<span class="winget-result-fallback">${escapeHtml(brand.icon)}</span>`;
    return `<article class="winget-result-card"><span class="winget-result-icon" style="--winget-brand:${escapeHtml(brand.color)}">${visual}</span><p class="winget-result-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.version?`${extendedWingetText("Version","Version")} ${item.version}`:extendedWingetText("Version non indiquée","Version not reported"))} · WinGet</small><code title="${escapeHtml(item.id)}">${escapeHtml(item.id)}</code></p><div class="winget-result-actions"><span class="winget-external-badge">${extendedWingetText("HORS CATALOGUE · À VÉRIFIER","OUTSIDE CATALOG · REVIEW")}</span><button class="secondary-dialog-button winget-add-result ${known?"added":""}" data-winget-add="${escapeHtml(item.id)}" ${known?"disabled":""}>${known?extendedWingetText("Déjà ajouté","Already added"):extendedWingetText("Ajouter","Add")}</button></div></article>`;
  }).join("");
}

function requestExtendedWingetSearch(){
  window.clearTimeout(extendedWingetSearchTimer);
  const query=searchTerm.trim();
  if(query.length<2){
    const input=$("#searchInput");
    input?.focus();
    input?.scrollIntoView({behavior:"smooth",block:"center"});
    return notify(extendedWingetText("Saisissez le nom du logiciel","Enter the software name"),extendedWingetText("Écrivez au moins 2 caractères dans la barre de recherche, puis relancez la recherche WinGet.","Enter at least 2 characters in the search field, then run the WinGet search again."));
  }
  if(!/^[\p{L}\p{N} ._+\-]+$/u.test(query))return notify(extendedWingetText("Recherche non valide","Invalid search"),extendedWingetText("Utilisez uniquement des lettres, chiffres, espaces, points, tirets ou signes +.","Use only letters, numbers, spaces, dots, hyphens or plus signs."));
  if(!window.chrome?.webview){return notify(extendedWingetText("Recherche indisponible","Search unavailable"),extendedWingetText("Lancez la bêta Windows pour interroger WinGet.","Run the Windows beta to query WinGet."));}
  extendedWingetQuery=query;extendedWingetResults=[];extendedWingetPending=true;renderExtendedWingetSearch();
  window.chrome.webview.postMessage({action:"search-winget",payload:{query}});
}

function scheduleExtendedWingetSearch(){
  window.clearTimeout(extendedWingetSearchTimer);
  const query=searchTerm.trim();
  if(query.length<2||query.length>80||!/^[\p{L}\p{N} ._+\-]+$/u.test(query)||!window.chrome?.webview){
    extendedWingetQuery="";extendedWingetResults=[];extendedWingetPending=false;renderExtendedWingetSearch();
    return;
  }
  if(query===extendedWingetQuery&&(extendedWingetPending||extendedWingetResults.length))return;
  extendedWingetSearchTimer=window.setTimeout(()=>{
    if(searchTerm.trim()!==query)return;
    requestExtendedWingetSearch();
  },650);
}

function addExtendedWingetResult(id){
  const result=extendedWingetResults.find(item=>item.id===id);
  if(!result||!/^[A-Za-z0-9][A-Za-z0-9._+\-]{1,127}$/.test(result.id))return;
  let app=apps.find(item=>item.id.toLocaleLowerCase("en")===result.id.toLocaleLowerCase("en"));
  if(!app){
    const brand=resolveWingetBrand(result);
    app={id:result.id,name:result.name,category:"Catalogue WinGet",desc:extendedWingetText("Résultat externe WinGet à vérifier avant installation","External WinGet result to review before installation"),icon:brand.icon,logo:brand.logo,color:brand.color,site:"https://github.com/microsoft/winget-pkgs",externalWinget:true,wingetVersion:result.version||""};
    apps.push(app);
  }
  selected.add(app.id);activeCatalogScope="catalog";activeCategory="Tout";localStorage.setItem(catalogScopeStorageKey,activeCatalogScope);renderFilters();renderApps();renderSelection();renderExtendedWingetSearch();
  notify(extendedWingetText("Ajouté à la sélection","Added to selection"),extendedWingetText(`${app.name} sera contrôlé par OwlSetup avant l’installation.`,`${app.name} will be checked by OwlSetup before installation.`));
}

function renderApps() {
  const query = searchTerm.toLocaleLowerCase("fr");
  const visible = apps.filter(app => catalogScopeMatches(app) && (activeCategory === "Tout" || app.category === activeCategory) && `${app.name} ${app.desc} ${app.category}`.toLocaleLowerCase("fr").includes(query));
  $("#resultCount").textContent = `${visible.length} logiciel${visible.length > 1 ? "s" : ""}`;
  $("#appGrid").innerHTML = visible.map(app => {
    const installed=installedApps.has(app.id),detection=installedSourceInfo(app.id),related=relatedWindowsApps.has(app.id);
    const description=related ? "Un composant Windows au nom proche est présent, mais pas cette application exacte." : app.desc;
    const installedActions=detection.manageable?`<span class="installed-actions"><button class="manage-icon ${managedInstalled.has(app.id) ? "active" : ""}" data-manage-installed="${escapeHtml(app.id)}" aria-pressed="${managedInstalled.has(app.id)}" title="Sélectionner pour une désinstallation groupée">${managedInstalled.has(app.id) ? "✓" : "□"}</button><button class="repair-icon" data-repair="${escapeHtml(app.id)}" title="Réparer ${escapeHtml(app.name)}">⚙</button><button class="uninstall-icon" data-uninstall="${escapeHtml(app.id)}" title="Désinstaller ${escapeHtml(app.name)}">×</button></span>`:`<span class="installed-actions"><button class="windows-manage-icon" data-open-windows-apps title="Gérer ${escapeHtml(app.name)} dans les paramètres Windows">Gérer</button></span>`;
    const sourceLink=app.externalWinget?`<span class="winget-catalog-source">${extendedWingetText("Source WinGet ↗","WinGet source ↗")}</span>`:`<a class="official-link" href="${escapeHtml(app.site)}" target="_blank" rel="noopener" title="Ouvrir le site officiel de ${escapeHtml(app.name)}">Site officiel ↗</a>`;
    return `
    <article class="app-card ${selected.has(app.id) ? "selected" : ""} ${installedApps.has(app.id) ? "installed" : ""} ${managedInstalled.has(app.id) ? "managed-selected" : ""} ${app.manualInstall ? "manual-install" : ""} ${app.discoveredInstalled ? "discovered-installed" : ""}" data-app="${escapeHtml(app.id)}" tabindex="0" aria-label="${escapeHtml(app.name)}${managedInstalled.has(app.id) ? ", sélectionné pour désinstallation" : ""}">
      ${icon(app)}<span class="app-copy"><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(description)}</small><span class="app-footer"><em>${escapeHtml(app.category)}</em>${sourceLink}</span>${app.externalWinget&&!app.discoveredInstalled&&!installed?`<b class="external-catalog-notice">${extendedWingetText("Hors catalogue OwlSetup · vérification requise","Outside OwlSetup catalog · review required")}</b>`:""}</span>
      ${installed ? `${installedActions}<span class="repair-capability">${detection.manageable?(app.repairMode === "native" ? "Réparation native" : "Gérable par WinGet"):`Détectée via ${escapeHtml(detection.label)}`}</span><span class="installed-badge">✓ Installé</span>` : app.manualInstall ? `<span class="manual-install-badge">${app.webService ? "Service Web" : "Installation guidée"}</span><span class="add-icon">↗</span>` : `${related ? `<span class="related-component-badge" title="Un module ou complément portant un nom proche a été trouvé dans Windows. Il ne s’agit pas de l’application exacte.">ⓘ Composant associé</span>` : ""}<span class="add-icon">${selected.has(app.id) ? "✓" : "+"}</span>`}
    </article>`;
  }).join("");
  $("#emptyState").classList.toggle("hidden", visible.length !== 0);
  $("#installedManager").classList.toggle("hidden", installedApps.size === 0);
  $("#managedCount").textContent = `${managedInstalled.size} logiciel${managedInstalled.size > 1 ? "s" : ""} sélectionné${managedInstalled.size > 1 ? "s" : ""}`;
  $("#batchUninstallBtn").disabled = batchUninstallSimulationPending || managedInstalled.size === 0;
  $("#clearInstalledSelection").disabled = managedInstalled.size === 0;
  $(".results-line span:last-child").textContent = activeCatalogScope === "catalog" ? "Cliquez sur une carte pour l'ajouter" : "Applications détectées localement sur ce PC";
  renderInstalledPage();
}

function renderOnboarding() {
  const slides = [...document.querySelectorAll("[data-onboarding-step]")];
  slides.forEach((slide,index) => slide.classList.toggle("active", index === onboardingStep));
  $("#onboardingDots").innerHTML = slides.map((_,index) => `<button class="${index === onboardingStep ? "active" : ""}" data-onboarding-dot="${index}" aria-label="Étape ${index + 1}" aria-current="${index === onboardingStep ? "step" : "false"}"></button>`).join("");
  $("#onboardingProgress").style.width = `${(onboardingStep + 1) / slides.length * 100}%`;
  $("#previousOnboarding").disabled = onboardingStep === 0;
  $("#nextOnboarding").innerHTML = onboardingStep === slides.length - 1 ? `Découvrir OwlSetup <span>✓</span>` : `${onboardingStep === 0 ? "Commencer" : "Suivant"} <span>→</span>`;
}

function openFirstRunConfiguration(force = false) {
  if(!window.owlI18n?.hasSelection?.())return false;
  if(!force&&localStorage.getItem(firstRunConfigurationStorageKey)==="true")return false;
  let accessibility={scale:1,contrast:false,motion:false};
  try { accessibility={...accessibility,...JSON.parse(localStorage.getItem(accessibilityStorageKey)||"{}")}; } catch {}
  $("#firstRunTheme").value=getThemePreference();
  $("#firstRunScale").value=String(accessibility.scale||1);
  $("#firstRunContrast").checked=Boolean(accessibility.contrast);
  $("#firstRunMotion").checked=Boolean(accessibility.motion);
  const restoreEnabled=localStorage.getItem(autoRestoreStorageKey)==="true";
  const restoreChoice=document.querySelector(`[name="firstRunRestoreChoice"][value="${restoreEnabled}"]`);
  if(restoreChoice)restoreChoice.checked=true;
  const telemetryChoice=document.querySelector(`[name="firstRunTelemetryChoice"][value="${getErrorTelemetryMode()}"]`);
  if(telemetryChoice)telemetryChoice.checked=true;
  $("#firstRunConfiguration").classList.remove("hidden");
  document.body.classList.add("first-run-open");
  window.setTimeout(()=>$("#firstRunScale").focus(),80);
  return true;
}

function completeFirstRunConfiguration() {
  saveThemePreference($("#firstRunTheme").value);
  const accessibility={scale:Number($("#firstRunScale").value)||1,contrast:$("#firstRunContrast").checked,motion:$("#firstRunMotion").checked};
  localStorage.setItem(accessibilityStorageKey,JSON.stringify(accessibility));
  const restoreEnabled=document.querySelector('[name="firstRunRestoreChoice"]:checked')?.value==="true";
  const telemetryMode=document.querySelector('[name="firstRunTelemetryChoice"]:checked')?.value||"never";
  localStorage.setItem(autoRestoreStorageKey,String(restoreEnabled));
  setErrorTelemetryMode(telemetryMode);
  localStorage.setItem(firstRunConfigurationStorageKey,"true");
  $("#autoRestorePoint").checked=restoreEnabled;
  $("#firstRunConfiguration").classList.add("hidden");
  document.body.classList.remove("first-run-open");
  applyAccessibilitySettings();
  openOnboarding(true);
}

function startFirstRunFlow() {
  if(!window.owlI18n?.hasSelection?.())return;
  if(openFirstRunConfiguration(false))return;
  openOnboarding(false);
}

function openOnboarding(force = false) {
  if (!force && window.owlI18n && !window.owlI18n.hasSelection()) return;
  if (!force && localStorage.getItem(onboardingStorageKey) === "true") return;
  onboardingPreviousFocus = document.activeElement;
  onboardingStep = 0;
  renderOnboarding();
  $("#onboardingOverlay").classList.remove("hidden");
  document.body.classList.add("onboarding-open");
  window.setTimeout(() => $("#skipOnboarding").focus(), 80);
}

function closeOnboarding(skipped = false) {
  localStorage.setItem(onboardingStorageKey, "true");
  $("#onboardingOverlay").classList.add("hidden");
  document.body.classList.remove("onboarding-open");
  if (!skipped) showView("home");
  onboardingPreviousFocus?.focus?.();
  notify(skipped ? "Prise en main ignorée" : "Bienvenue dans OwlSetup", skipped ? "Vous pourrez la relancer depuis le guide d'installation." : "Votre application est prête à être utilisée.");
}

function moveOnboarding(direction) {
  const last = document.querySelectorAll("[data-onboarding-step]").length - 1;
  if (direction > 0 && onboardingStep === last) { closeOnboarding(false); return; }
  onboardingStep = Math.max(0, Math.min(last, onboardingStep + direction));
  renderOnboarding();
}

function renderInstalledPage() {
  const query = installedSearchTerm.toLocaleLowerCase("fr");
  const detected = apps.filter(app => installedApps.has(app.id));
  const visible = detected.filter(app => `${app.name} ${app.id} ${app.category} ${app.desc}`.toLocaleLowerCase("fr").includes(query));
  visible.sort((a,b) => {
    if (installedSortMode === "selected") {
      const selectedOrder = Number(managedInstalled.has(b.id)) - Number(managedInstalled.has(a.id));
      if (selectedOrder) return selectedOrder;
    }
    const left = installedSortMode === "category" ? `${a.category} ${a.name}` : a.name;
    const right = installedSortMode === "category" ? `${b.category} ${b.name}` : b.name;
    return left.localeCompare(right, "fr", {sensitivity:"base"});
  });
  $("#installedNavCount").textContent = detected.length;
  $("#installedPageCount").textContent = `${detected.length} application${detected.length > 1 ? "s" : ""}`;
  $("#installedManagedCount").textContent = `${managedInstalled.size} application${managedInstalled.size > 1 ? "s" : ""} sélectionnée${managedInstalled.size > 1 ? "s" : ""}`;
  $("#installedClearSelection").disabled = managedInstalled.size === 0;
  $("#installedBatchUninstall").disabled = batchUninstallSimulationPending || managedInstalled.size === 0;
  $("#installedAppGrid").innerHTML = visible.map(app => {
    const detection=installedSourceInfo(app.id),selectedForRemoval=managedInstalled.has(app.id);
    return `
    <article class="installed-page-card ${selectedForRemoval ? "selected" : ""} ${detection.manageable?"":"detection-only"}" data-installed-app="${escapeHtml(app.id)}" tabindex="0" aria-label="${escapeHtml(app.name)}${selectedForRemoval ? ", sélectionné pour désinstallation" : detection.manageable?"":`, détecté via ${escapeHtml(detection.label)}`}">
      <span class="installed-select-box" aria-hidden="true">${detection.manageable?(selectedForRemoval ? "✓" : ""):"—"}</span>
      ${icon(app)}
      <span class="installed-page-copy"><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.desc)}</small><code>${escapeHtml(app.id)}</code></span>
      <span class="installed-page-meta"><b>${escapeHtml(app.category)}</b><small>${detection.manageable?`Gérable par ${escapeHtml(detection.label)}`:`Détectée via ${escapeHtml(detection.label)}`}</small></span>
      <span class="installed-page-actions"><a class="official-link" href="${escapeHtml(app.site)}" target="_blank" rel="noopener" title="Site officiel de ${escapeHtml(app.name)}">Site officiel ↗</a>${detection.manageable?`<button class="installed-action repair-action" data-repair="${escapeHtml(app.id)}" aria-label="Réparer ${escapeHtml(app.name)}"><span aria-hidden="true">⚙</span> Réparer</button><button class="installed-action uninstall-action" data-uninstall="${escapeHtml(app.id)}" aria-label="Désinstaller ${escapeHtml(app.name)}"><span aria-hidden="true">×</span> Désinstaller</button>`:`<button class="windows-manage-icon" data-open-windows-apps title="Gérer dans les paramètres Windows">Gérer dans Windows</button>`}</span>
    </article>`;
  }).join("");
  $("#installedEmpty").classList.toggle("hidden", visible.length !== 0);
}

function renderSelection() {
  const picked = apps.filter(app => selected.has(app.id));
  const count = picked.length;
  $("#navCount").textContent = count;
  $("#barCount").textContent = count;
  $("#summaryCount").textContent = count;
  $("#selectionBar").classList.toggle("hidden", count === 0 || $("#queue").classList.contains("active"));
  $("#selectionStack").innerHTML = picked.slice(0, 4).map(icon).join("") + (count > 4 ? `<span class="more">+${count - 4}</span>` : "");
  $("#queueList").innerHTML = count ? picked.map(app => `<article class="queue-item">${icon(app)}<div><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.id)}</small></div><span>${escapeHtml(app.category)}</span><button data-remove="${escapeHtml(app.id)}" aria-label="Retirer ${escapeHtml(app.name)}">×</button></article>`).join("") : `<div class="queue-empty"><span>＋</span><h3>Votre sélection est vide</h3><p>Ajoutez des logiciels depuis le catalogue.</p><button data-go-catalog>Parcourir le catalogue</button></div>`;
  $("#installBtn").disabled = count === 0;
  save();
}

function toggleApp(id) {
  const app = apps.find(item => item.id === id);
  if (installedApps.has(id)) {
    if(!wingetManageableApps.has(id)){notify("Application détectée par Windows","Cette installation n’est pas associée à WinGet. Utilisez le bouton « Gérer dans Windows ».");return;}
    if (managedInstalled.has(id)) managedInstalled.delete(id); else managedInstalled.add(id);
    renderApps();
    return;
  }
  if (app?.manualInstall) {
    openGuidedInstall(app);
    return;
  }
  if (selected.has(id)) selected.delete(id); else {
    selected.add(id);
    notify("Ajouté à la sélection", app.name);
  }
  renderApps(); renderSelection();
}

let guidedInstallApp = null;
function openGuidedInstall(app) {
  guidedInstallApp = app;
  const isVmware = app.id === "VMware.WorkstationPro";
  const isWeb = app.webService === true;
  $("#guidedInstallLogo").textContent = app.icon;
  $("#guidedInstallLabel").textContent = isWeb ? "SERVICE WEB" : "INSTALLATION GUIDÉE";
  $("#guidedInstallTitle").textContent = isWeb ? `Ouvrir ${app.name}` : `Installer ${app.name}`;
  $("#guidedInstallIntro").textContent = isVmware
    ? "Broadcom ne permet plus le téléchargement automatique par WinGet. Un compte gratuit et l’acceptation des conditions sont nécessaires sur son portail officiel."
    : isWeb
      ? `${app.name} s’utilise dans votre navigateur. OwlSetup ouvrira uniquement le site officiel et ne transmettra aucune donnée.`
      : `${app.name} utilise son propre installateur. OwlSetup vous conduit vers la source officielle afin que vous puissiez vérifier les options avant l’installation.`;
  $("#guidedInstallSteps").innerHTML = isVmware
    ? `<li><b>1</b><span><strong>Créer ou ouvrir votre compte Broadcom</strong><small>Aucun identifiant n’est demandé ni enregistré par OwlSetup.</small></span></li><li><b>2</b><span><strong>Compléter le profil gratuit</strong><small>Broadcom peut demander votre pays et les informations de conformité commerciale.</small></span></li><li><b>3</b><span><strong>Choisir VMware Workstation Pro pour Windows</strong><small>Sélectionnez la version puis acceptez les conditions.</small></span></li><li><b>4</b><span><strong>Lancer l’installateur téléchargé</strong><small>Redémarrez ensuite OwlSetup pour afficher « Installé ».</small></span></li>`
    : isWeb
      ? `<li><b>1</b><span><strong>Ouvrir le service officiel</strong><small>L’adresse du site est vérifiée dans le catalogue OwlSetup.</small></span></li><li><b>2</b><span><strong>Se connecter si nécessaire</strong><small>Vos identifiants restent dans votre navigateur et ne sont jamais accessibles à OwlSetup.</small></span></li>`
      : `<li><b>1</b><span><strong>Ouvrir la page officielle</strong><small>Vérifiez la compatibilité et la configuration requise.</small></span></li><li><b>2</b><span><strong>Télécharger la version Windows</strong><small>Choisissez uniquement l’installateur proposé par l’éditeur.</small></span></li><li><b>3</b><span><strong>Contrôler les options</strong><small>Lisez chaque écran avant de valider l’installation.</small></span></li><li><b>4</b><span><strong>Relancer OwlSetup</strong><small>L’application installée pourra ensuite être détectée si elle est enregistrée dans Windows.</small></span></li>`;
  $("#guidedInstallNoteTitle").textContent = isWeb ? "Aucune installation nécessaire" : isVmware ? "VMware Workstation Pro est gratuit" : "Téléchargement depuis l’éditeur";
  $("#guidedInstallNoteText").textContent = isWeb ? "Ce bouton ouvre un nouvel onglet vers le service officiel." : isVmware ? "Les versions récentes sont gratuites. Aucun abonnement payant n’est nécessaire." : "OwlSetup ne télécharge pas silencieusement ce logiciel et vous laisse contrôler l’installateur.";
  $("#openVmwareGuide").textContent = isWeb ? "Voir le site officiel" : "Lire les informations officielles";
  $("#continueVmwareDownload").innerHTML = `<span>↗</span> ${isWeb ? "Ouvrir le service" : "Télécharger"}`;
  $("#guidedInstallModal").classList.remove("hidden");
}
function closeGuidedInstall() {
  $("#guidedInstallModal").classList.add("hidden");
  guidedInstallApp = null;
}
function openGuidedInstallLink(kind) {
  if (!guidedInstallApp) return;
  const url = kind === "download" ? guidedInstallApp.manualInstallUrl : guidedInstallApp.site;
  window.open(url, "_blank", "noopener");
}

function showView(id) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === id));
  document.querySelectorAll(".top-nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === id));
  document.querySelectorAll(".top-nav-group").forEach(group => group.querySelector(".top-nav-toggle")?.classList.toggle("active", Boolean(group.querySelector(`.nav-item[data-view="${id}"]`))));
  closeTopNavigation();
  $("#currentView").textContent = {home:"Accueil", catalog:"Installer des logiciels", installed:"Applications installées", updates:"Tout mettre à jour", operations:"Centre des opérations", cleanup:"Libérer de l'espace", browsers:"Nettoyage des navigateurs", quarantine:"Quarantaine", tools:"Outils système", security:"Centre de sécurité", troubleshooting:"Aide et dépannage", queue:"Ma sélection", history:"Guide d'installation", settings:"Paramètres"}[id];
  document.body.classList.remove("menu-open");
  if (id === "updates" && !updatesLoaded) requestUpdateScan();
  if (id === "quarantine") requestQuarantine();
  if (id === "settings") requestScheduleState();
  if (id === "tools") { requestHistory(); diagnoseWinget(); }
  if (id === "operations") { requestHistory(); reconcileMaintenanceOperations(); renderOperations(); readInterruptedOperation(); }
  if (id === "security") requestSecurityStatus();
  if (id === "installed") renderInstalledPage();
  if (id === "browsers" && !browserScanLoaded) requestBrowserScan();
  if (id === "troubleshooting") renderFeedbackFollowups();
  renderSelection();
  if (id === "catalog") {
    const alreadyVisited = localStorage.getItem("owlsetup-catalog-visited-v1") === "1";
    document.body.classList.toggle("catalog-returning", alreadyVisited);
    localStorage.setItem("owlsetup-catalog-visited-v1", "1");
  }
  window.scrollTo({top: 0, behavior:"smooth"});
}

function selectedBrowserIds(){return [...document.querySelectorAll("[data-browser-id]:checked")].map(input=>input.dataset.browserId);}
function selectedBrowserCategories(){return [...document.querySelectorAll("[data-browser-category]:checked")].map(input=>input.dataset.browserCategory);}
function invalidateBrowserAnalysis(){browserAnalysisData=null;$("#browserAnalysisResult")?.classList.add("hidden");}
function updateBrowserSummary(){
  const selected=selectedBrowserIds().length,total=browserScanItems.length,profiles=browserScanItems.reduce((sum,item)=>sum+(Number(item.profiles)||0),0);
  if($("#browserDetectedCount"))$("#browserDetectedCount").textContent=browserScanLoaded?total:"—";
  if($("#browserSelectedCount"))$("#browserSelectedCount").textContent=selected;
  if($("#browserProfileCount"))$("#browserProfileCount").textContent=browserScanLoaded?profiles:"—";
  if($("#browserSelectionSummary"))$("#browserSelectionSummary").textContent=selected?`${selected} navigateur${selected>1?"s":""} sélectionné${selected>1?"s":""} sur ${total}`:"Aucun navigateur sélectionné";
}
// Catégories sans effet selon le moteur : côté Firefox, OwlSetup ne touche ni
// au cache multimédia ni à l'historique (places.sqlite mêle historique et
// favoris). On désactive alors la case au lieu de proposer un no-op.
const engineUnsupportedCategories={Firefox:["media-cache","history"]};
function syncBrowserCategoryAvailability(){
  const engines=[...new Set(browserScanItems.filter(item=>selectedBrowserIds().includes(item.id)).map(item=>item.engine))];
  document.querySelectorAll("[data-browser-category]").forEach(input=>{
    const cat=input.dataset.browserCategory;
    const unsupported=engines.length>0&&engines.every(engine=>(engineUnsupportedCategories[engine]||[]).includes(cat));
    input.disabled=unsupported;
    if(unsupported)input.checked=false;
    const label=input.closest(".browser-category");
    if(label){
      label.classList.toggle("unsupported",unsupported);
      label.title=unsupported?"Non pris en charge par les navigateurs sélectionnés (Firefox et dérivés)":"";
    }
  });
}
function updateBrowserActionState(){
  syncBrowserCategoryAvailability();
  const categories=selectedBrowserCategories(),button=$("#analyzeBrowserData");
  if(button)button.disabled=!selectedBrowserIds().length||!categories.length||browserCleanupRunning;
  $("#browserHistorySyncWarning")?.classList.toggle("hidden",!categories.includes("history"));
  updateBrowserSummary();
}
function setBrowserPreset(name){
  const sets={recommended:["cache","media-cache","crash"],privacy:["cache","media-cache","crash","cookies","history"]};
  document.querySelectorAll("[data-browser-preset]").forEach(button=>button.classList.toggle("active",button.dataset.browserPreset===name));
  if(sets[name])document.querySelectorAll("[data-browser-category]").forEach(input=>input.checked=sets[name].includes(input.dataset.browserCategory));
  invalidateBrowserAnalysis();updateBrowserActionState();
}
function requestBrowserScan(){
  const list=$("#browserCards");
  if(list)list.innerHTML='<div class="browser-empty"><span>↻</span><strong>Recherche des navigateurs…</strong><small>Analyse locale des profils connus.</small></div>';
  invalidateBrowserAnalysis();
  if(!window.chrome?.webview){if(list)list.innerHTML='<div class="browser-empty"><strong>Fonction disponible dans OwlSetup Windows</strong></div>';return;}
  window.chrome.webview.postMessage({action:"scan-browser-data",payload:{}});
}
function renderBrowserScan(message){
  browserScanLoaded=true;browserScanItems=message.items||[];
  const list=$("#browserCards");if(!list)return;
  if(!browserScanItems.length){list.innerHTML='<div class="browser-empty"><span>✓</span><strong>Aucun navigateur pris en charge détecté</strong><small>Les profils inconnus ne sont jamais parcourus automatiquement.</small></div>';updateBrowserActionState();return;}
  list.innerHTML=browserScanItems.map(item=>{const logo=browserLogoFiles[item.id];return `<label class="browser-card selected${item.running?" running":""}"><input type="checkbox" data-browser-id="${escapeHtml(item.id)}" checked><span class="browser-card-icon">${logo?`<img src="assets/logos/${escapeHtml(logo)}" alt="">`:escapeHtml((item.name||"N").slice(0,2).toUpperCase())}</span><span class="browser-card-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.profiles)} profil(s) · ${escapeHtml(item.engine)}</small></span><em>${item.running?"Ouvert":"Prêt"}</em></label>`}).join("");
  updateBrowserActionState();
}
function analyzeBrowserSelection(){
  const browsers=selectedBrowserIds(),categories=selectedBrowserCategories();if(!browsers.length||!categories.length)return;
  $("#analyzeBrowserData").disabled=true;$("#analyzeBrowserData").innerHTML="<span>↻</span> Analyse en cours…";
  window.chrome?.webview?.postMessage({action:"analyze-browser-data",payload:{browsers,categories}});
}
function renderBrowserAnalysis(message){
  browserAnalysisData=message;const panel=$("#browserAnalysisResult");panel?.classList.remove("hidden");
  $("#browserAnalysisTitle").textContent=`${message.files||0} fichier(s) récupérables`;
  $("#browserAnalysisDetail").textContent=`${(message.items||[]).length} groupe(s) analysé(s) · simulation valable 5 minutes`;
  $("#browserAnalysisSize").textContent=message.size||"0 octet";
  $("#browserAnalysisBreakdown").innerHTML=(message.items||[]).slice(0,8).map(item=>`<span><b>${escapeHtml(item.browser)}</b><small>${escapeHtml(item.categoryLabel)}</small><strong>${escapeHtml(item.size)}</strong></span>`).join("");
  const selected=selectedBrowserCategories().map(id=>browserCategoryDetails[id]).filter(Boolean);
  $("#browserAnalysisProtection").innerHTML=`<div><b>Sera nettoyé après confirmation</b>${selected.map(item=>`<span class="${item.risk}">${escapeHtml(item.label)}<small>${escapeHtml(item.detail)}</small></span>`).join("")}</div><div class="protected"><b>Ne sera jamais supprimé</b>${browserProtectedLabels.map(label=>`<span>✓ ${escapeHtml(label)}</span>`).join("")}</div>`;
  $("#analyzeBrowserData").innerHTML='<span>⌕</span> Analyser la sélection';updateBrowserActionState();panel?.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function openBrowserCleanupReview(){
  if(!browserAnalysisData?.token)return notify("Nouvelle analyse requise","Relancez l’analyse avant le nettoyage.");
  $("#browserCleanupSummary").textContent=`${browserAnalysisData.size} · ${browserAnalysisData.files||0} fichier(s)`;
  $("#browserCleanupReview").innerHTML=(browserAnalysisData.items||[]).map(item=>`<div><span><strong>${escapeHtml(item.browser)}</strong><small>${escapeHtml(item.categoryLabel)}</small></span><b>${escapeHtml(item.size)}</b></div>`).join("");
  const includesHistory=selectedBrowserCategories().includes("history"),warning=$("#browserCleanupWarning");
  if(warning)warning.innerHTML=includesHistory
    ? '<span>!</span> L’historique est supprimé localement. Si la synchronisation du navigateur est active, il peut réapparaître après la réouverture. Utilisez aussi « Effacer les données de navigation » dans le navigateur pour le supprimer des appareils synchronisés.'
    : '<span>!</span> Les cookies et données de sites sélectionnés peuvent vous déconnecter. Les mots de passe, favoris et extensions restent protégés.';
  $("#browserCleanupConfirmView").classList.remove("hidden");$("#browserCleanupProgressView").classList.add("hidden");$("#browserCleanupModal").classList.remove("hidden");
}
function closeBrowserCleanup(){if(browserCleanupRunning)return;$("#browserCleanupModal")?.classList.add("hidden");}
function confirmBrowserCleanup(){
  if(!browserAnalysisData?.token)return;browserCleanupRunning=true;updateBrowserActionState();
  $("#browserCleanupResultActions")?.classList.add("hidden");lastBrowserCleanupReport="";
  $("#browserCleanupConfirmView").classList.add("hidden");$("#browserCleanupProgressView").classList.remove("hidden");$("#browserCleanupBar").style.width="12%";$("#browserCleanupPercent").textContent="12%";
  window.chrome?.webview?.postMessage({action:"cleanup-browser-data",payload:{token:browserAnalysisData.token,browsers:selectedBrowserIds(),categories:selectedBrowserCategories(),closeBrowsers:$("#closeBrowsersBeforeCleanup").checked}});
}

function closeTopNavigation(except = null) {
  document.querySelectorAll(".top-nav-group").forEach(group => {
    if (group === except) return;
    group.classList.remove("open");
    group.querySelector(".top-nav-toggle")?.setAttribute("aria-expanded", "false");
  });
}

function toggleTopNavigation(toggle) {
  const group = toggle?.closest(".top-nav-group");
  if (!group) return;
  const open = !group.classList.contains("open");
  closeTopNavigation(group);
  group.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
}

function composeFeedbackReport() {
  const category = $("#feedbackCategory").value;
  const title = $("#feedbackTitle").value.trim();
  const description = $("#feedbackDescription").value.trim();
  const steps = $("#feedbackSteps").value.trim() || "Non renseignées";
  return {category, title, description, body:`## Problème rencontré\n\n${description}\n\n## Étapes pour reproduire\n\n${steps}\n\n## Informations\n\n- OwlSetup : ${currentBuildVersion}\n- Canal : ${currentBuildChannel}\n- Catégorie : ${category}\n\n## Diagnostic technique\n\n${feedbackDiagnostics}\n\n> Rapport préparé localement par OwlSetup. Aucun journal n'est joint automatiquement.`};
}

function validFeedback(report) {
  if (report.title && report.description) return true;
  notify("Commentaire incomplet", "Ajoutez un titre et une description du problème.");
  (report.title ? $("#feedbackDescription") : $("#feedbackTitle")).focus();
  return false;
}

function safeFeedbackReport(report) {
  const clean = value => String(value || "").split("\n").map(redactLogDiagnostic).join("\n");
  return {...report, title:clean(report.title), description:clean(report.description), body:clean(report.body)};
}

function closeFeedbackPreview() {
  $("#feedbackPreviewModal").classList.add("hidden");
  pendingFeedbackReport = null;
}

function showFeedbackPreview() {
  const report = safeFeedbackReport(composeFeedbackReport());
  if (!validFeedback(report)) return;
  pendingFeedbackReport = report;
  $("#feedbackPreviewTitle").textContent = report.title;
  $("#feedbackPreviewContent").textContent = report.body;
  $("#confirmFeedbackPrivacy").checked = false;
  $("#confirmGitHubFeedback").disabled = true;
  $("#feedbackPreviewModal").classList.remove("hidden");
}

function prepareOperationFeedback(issue) {
  if(!issue)return;
  $("#feedbackCategory").value=issue.category;
  $("#feedbackTitle").value=issue.title;
  $("#feedbackDescription").value=issue.description;
  $("#feedbackSteps").value=issue.steps;
  feedbackDiagnostics=issue.technical;
  $("#feedbackDiagnostics").textContent=feedbackDiagnostics;
  $("#feedbackDiagnostics").classList.remove("hidden");
  showFeedbackPreview();
}

function readFeedbackFollowups() {
  try { return JSON.parse(localStorage.getItem(feedbackFollowupStorageKey) || "[]"); } catch { return []; }
}

function renderFeedbackFollowups(items = null) {
  const target = $("#feedbackFollowupList");
  if (!target) return;
  const saved = readFeedbackFollowups();
  if (!saved.length) { target.innerHTML = `<small>Aucun signalement mémorisé sur cet appareil.</small>`; return; }
  if (!items) {
    target.innerHTML = `<small>Recherche des réponses publiques…</small>`;
    window.chrome?.webview?.postMessage({action:"check-feedback",payload:{titles:saved.map(item => item.title)}});
    return;
  }
  target.innerHTML = items.length ? items.map(item => `<a class="feedback-followup-item" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><strong>${escapeHtml(item.title)}</strong><small>${item.comments} réponse(s) · ${item.state === "closed" ? "Résolu" : "Ouvert"}</small></a>`).join("") : `<small>Aucun signalement correspondant n’a encore été trouvé.</small>`;
}

function confirmGitHubFeedback() {
  if (!pendingFeedbackReport || !$("#confirmFeedbackPrivacy").checked) return;
  const prefix=currentBuildChannel === "beta" ? "[Bêta]" : "[OwlSetup]";
  const fullTitle=`${prefix} ${pendingFeedbackReport.title}`;
  const url=`https://github.com/OwlNetGeekFR/OwlSetup/issues/new?title=${encodeURIComponent(fullTitle)}&body=${encodeURIComponent(pendingFeedbackReport.body)}&labels=bug`;
  const saved=readFeedbackFollowups().filter(item => item.title !== fullTitle);
  saved.unshift({title:fullTitle,date:new Date().toISOString()});
  localStorage.setItem(feedbackFollowupStorageKey,JSON.stringify(saved.slice(0,20)));
  window.open(url,"_blank","noopener");
  closeFeedbackPreview();
  renderFeedbackFollowups();
}

async function copyFeedbackReport() {
  const report = composeFeedbackReport();
  if (!validFeedback(report)) return;
  const text = `${report.title}\n\n${report.body}`;
  try { await navigator.clipboard.writeText(text); }
  catch {
    const area=document.createElement("textarea"); area.value=text; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
  }
  notify("Rapport copié", "Relisez-le avant de le partager.");
}

function openGitHubFeedback() {
  showFeedbackPreview();
}

function renderHistoryItems() {
  const type=$("#historyTypeFilter")?.value || "all";
  const result=$("#historyResultFilter")?.value || "all";
  const items=historyItems.filter(item => (type === "all" || item.type === type) && (result === "all" || item.result === result));
  $("#operationHistory").innerHTML = items.length ? items.map(item => {
    const resultClass = ["success","failed"].includes(item.result) ? item.result : "";
    return `<article><span class="history-type ${resultClass}">${escapeHtml(item.type)}</span><div><strong>${escapeHtml(item.title||item.name)}</strong><small>${escapeHtml(item.date)} · ${escapeHtml(item.size)}${item.summary?` · ${escapeHtml(item.summary)}`:""}</small></div><span class="history-actions"><button data-open-log="${encodeURIComponent(item.name)}">Journal</button>${item.reportName?`<button data-open-report="${encodeURIComponent(item.reportName)}">Rapport visuel</button>`:""}</span></article>`;
  }).join("") : `<p class="tool-empty">Aucun rapport ne correspond aux filtres.</p>`;
}

function applyAccessibilitySettings() {
  let settings={scale:1,contrast:false,motion:false};
  try { settings={...settings,...JSON.parse(localStorage.getItem(accessibilityStorageKey)||"{}")}; } catch {}
  document.documentElement.style.setProperty("--ui-scale",String(settings.scale));
  document.body.classList.toggle("high-contrast",Boolean(settings.contrast));
  document.body.classList.toggle("reduced-motion",Boolean(settings.motion));
  if($("#accessibilityScale")) $("#accessibilityScale").value=String(settings.scale);
  if($("#highContrastMode")) $("#highContrastMode").checked=Boolean(settings.contrast);
  if($("#reducedMotionMode")) $("#reducedMotionMode").checked=Boolean(settings.motion);
}

function saveAccessibilitySettings() {
  const settings={scale:Number($("#accessibilityScale").value)||1,contrast:$("#highContrastMode").checked,motion:$("#reducedMotionMode").checked};
  localStorage.setItem(accessibilityStorageKey,JSON.stringify(settings)); applyAccessibilitySettings();
}

function syncHistoryRetention(value,persist=true) {
  const days=String(value);
  if(!["7","30","90","365"].includes(days))return;
  if($("#historyRetention"))$("#historyRetention").value=days;
  if($("#securityLogRetention"))$("#securityLogRetention").value=days;
  if(persist)localStorage.setItem(securityRetentionStorageKey,days);
}

function openClearHistoryDialog() {
  $("#historyClearOverlay").classList.remove("hidden");
  document.body.classList.add("modal-open");
  window.setTimeout(()=>$("#cancelClearHistory")?.focus(),60);
}

function closeClearHistoryDialog() {
  $("#historyClearOverlay")?.classList.add("hidden");
  document.body.classList.remove("modal-open");
  if($("#confirmClearHistory"))$("#confirmClearHistory").disabled=false;
}

function openContextHelp(button) {
  const popover=$("#contextHelpPopover");
  const translate=window.owlI18n?.translate||((value)=>value);
  $("#contextHelpTitle").textContent=translate(button.dataset.helpTitle||"Aide");
  $("#contextHelpText").textContent=translate(button.dataset.helpText||"");
  popover.classList.remove("hidden");
  const anchor=button.getBoundingClientRect();
  const width=Math.min(370,window.innerWidth-24);
  const left=Math.max(12,Math.min(window.innerWidth-width-12,anchor.left+anchor.width/2-width/2));
  const expectedHeight=145;
  const top=anchor.bottom+10+expectedHeight>window.innerHeight?Math.max(12,anchor.top-expectedHeight-10):anchor.bottom+10;
  popover.style.left=`${left}px`; popover.style.top=`${top}px`;
}

function closeContextHelp() { $("#contextHelpPopover")?.classList.add("hidden"); }

function closeRestoreProtectionDialog(){
  $("#restoreProtectionOverlay")?.classList.add("hidden");
}

function openRestoreProtectionDialog(reason){
  const cancelled=reason==="uac-cancelled";
  $("#restoreProtectionReason").textContent=cancelled
    ? "La demande administrateur Windows a été refusée ou fermée. Aucune opération n’a été lancée."
    : "La protection du système Windows semble désactivée sur le lecteur système. OwlSetup a arrêté l’opération pour respecter votre réglage de sécurité.";
  $("#restoreProtectionOverlay")?.classList.remove("hidden");
  window.setTimeout(()=>$("#openSystemProtection")?.focus(),50);
}

function runWithOptionalRestore(action,label) {
  if(localStorage.getItem(autoRestoreStorageKey)!=="true" || !window.chrome?.webview) return action();
  if(pendingProtectedAction) return notify("Opération déjà préparée","Patientez pendant la création du point de restauration.");
  pendingProtectedAction={action,label};
  notify("Protection en cours",`Création d’un point de restauration avant ${label}.`);
  window.chrome.webview.postMessage({action:"create-restore-point",payload:{}});
}

function loadOperationFeed() {
  try {
    const stored=JSON.parse(localStorage.getItem(operationsStorageKey)||"[]");
    operationFeed=Array.isArray(stored)?stored.slice(0,50):[];
  } catch { operationFeed=[]; }
  reconcileOperationHistory();
  reconcileMaintenanceOperations();
  renderOperations();
}

// Résout tout seul les échecs de mise à jour qui n'en sont pas vraiment :
//  - tous les paquets en échec sont des lanceurs auto-updatés (Ankama…) ;
//  - ou tous sont masqués par l'utilisateur (« Ne plus proposer ») ;
//  - ou l'alerte a plus de 14 jours et ne s'est pas reproduite.
function reconcileMaintenanceOperations() {
  const ignored=getIgnoredUpdateIds();
  const now=Date.now();
  let changed=false;
  // La décision par item (auto-géré / masqué / trop vieux) est déléguée au
  // module `operations-reconcile.js` ; ici on ne garde que les effets de bord
  // (libellé de résolution, sauvegarde, notifications).
  operationFeed=operationFeed.map(item=>{
    if(item.status!=="failed")return item;
    const verdict=classifyStaleFailure(
      {status:item.status,type:item.type,packageIds:getOperationPackageIds(item),completedAt:item.completedAt,startedAt:item.startedAt,occurrences:item.occurrences},
      {selfManagedIds:SELF_MANAGED_UPDATER_IDS,ignoredIds:ignored,now});
    if(!verdict)return item;
    changed=true;
    const detail=verdict.resolvedBy==="update-ignored"
      ?"Classé résolu : ces mises à jour ont été masquées dans la liste."
      :verdict.resolvedBy==="self-managed"
        ?"Classé résolu : ces logiciels se mettent à jour eux-mêmes à leur lancement."
        :"Ancienne alerte archivée automatiquement après 14 jours sans récidive.";
    return {...item,status:"resolved",previousDetail:item.previousDetail||item.detail||"",resolvedAt:new Date().toISOString(),resolvedBy:verdict.resolvedBy,detail};
  });
  if(changed){
    saveOperationFeed();
    [...new Set(operationFeed.filter(item=>item.status==="resolved").map(item=>item.type))].forEach(reconcileResolvedNotifications);
  }
  return changed;
}

function manuallyResolveOperation(id){
  const operation=operationFeed.find(item=>item.id===id);
  if(!operation||operation.status!=="failed")return;
  operationFeed=operationFeed.map(item=>item.id===id
    ?{...item,status:"resolved",previousDetail:item.previousDetail||item.detail||"",resolvedAt:new Date().toISOString(),resolvedBy:"manual",detail:"Marqué comme résolu manuellement."}
    :item);
  saveOperationFeed();
  dismissNotificationsForOperation(operation);
  reconcileResolvedNotifications(operation.type);
  $("#operationFixPanel").classList.add("hidden");
  renderOperations();
  notify("Opération classée résolue","Elle reste consultable dans l'historique.");
}

function removeOperation(id){
  const operation=operationFeed.find(item=>item.id===id);
  if(!operation||operation.status==="running"||operation.status==="failed")return;
  operationFeed=operationFeed.filter(item=>item.id!==id);
  saveOperationFeed();
  renderOperations();
}

function clearFinishedOperations(){
  const before=operationFeed.length;
  operationFeed=operationFeed.filter(item=>item.status==="running"||item.status==="failed");
  if(operationFeed.length===before)return;
  saveOperationFeed();
  renderOperations();
  notify("Historique allégé","Les opérations terminées ont été retirées de la liste.");
}

function resolveAllOperations(){
  const failed=operationFeed.filter(item=>item.status==="failed");
  if(!failed.length)return;
  const types=new Set();
  operationFeed=operationFeed.map(item=>item.status==="failed"
    ?(types.add(item.type),{...item,status:"resolved",previousDetail:item.previousDetail||item.detail||"",resolvedAt:new Date().toISOString(),resolvedBy:"manual",detail:"Marqué comme résolu manuellement."})
    :item);
  saveOperationFeed();
  failed.forEach(dismissNotificationsForOperation);
  types.forEach(reconcileResolvedNotifications);
  $("#operationFixPanel").classList.add("hidden");
  renderOperations();
  notify(`${failed.length} opération(s) classée(s) résolue(s)`,"Elles restent consultables dans l'historique.");
}

function dismissNotificationsForOperation(operation){
  const ids=new Set(getOperationPackageIds(operation));
  let changed=false;
  notificationFeed=notificationFeed.map(item=>{
    if(!item.unread||item.kind!=="warning")return item;
    const linked=(item.operationType&&item.operationType===operation.type)
      ||(Array.isArray(item.packageIds)&&item.packageIds.some(id=>ids.has(canonicalOperationPackageId(id))));
    if(!linked)return item;
    changed=true;
    return {...item,unread:false,kind:"success",symbol:"✓",resolvedAt:new Date().toISOString()};
  });
  if(changed){saveNotificationFeed();renderNotificationFeed();}
}

function saveOperationFeed() {
  localStorage.setItem(operationsStorageKey,JSON.stringify(operationFeed.slice(0,50)));
}

function setActiveOperation(type,title,payload={}) {
  const operation={id:`${type}-${Date.now()}`,type,title,payload,startedAt:new Date().toISOString(),status:"running"};
  localStorage.setItem(activeOperationStorageKey,JSON.stringify(operation));
  recordOperation(operation);
  return operation;
}

function recordOperation(operation) {
  if(!operation?.id)return;
  if(operation.status==="failed"){
    const fingerprint=operationFailureFingerprint(operation);
    const duplicate=operationFeed.find(item=>item.id!==operation.id&&item.status==="failed"&&operationFailureFingerprint(item)===fingerprint);
    if(duplicate){
      operation={...operation,occurrences:(Number(duplicate.occurrences)||1)+1,firstSeenAt:duplicate.firstSeenAt||duplicate.completedAt||duplicate.startedAt};
      operationFeed=operationFeed.filter(item=>item.id!==duplicate.id);
    }
  }
  operationFeed=[operation,...operationFeed.filter(item=>item.id!==operation.id)].slice(0,50);
  saveOperationFeed();renderOperations();
}

function canonicalOperationPackageId(id) {
  if(!isValidPackageId(id))return "";
  const value=String(id).trim().toLowerCase();
  const compact=value.replace(/[^a-z0-9]/g,"");
  const match=apps.find(app=>{
    const catalogId=app.id.toLowerCase();
    const suffix=catalogId.split(".").pop();
    return catalogId===value||suffix===value||app.name.toLowerCase()===value||catalogId.replace(/[^a-z0-9]/g,"")===compact||app.name.toLowerCase().replace(/[^a-z0-9]/g,"")===compact;
  });
  return (match?.id||value).toLowerCase();
}

function getOperationPackageIds(operation) {
  const failed=(operation?.failedPackages||[]).map(item=>typeof item==="string"?item:item?.id).filter(isValidPackageId);
  const selected=(operation?.payload?.packages||[]).filter(isValidPackageId);
  const values=operation?.status==="failed"&&failed.length?failed:selected;
  return [...new Set(values.map(canonicalOperationPackageId).filter(Boolean))];
}

function operationFailureFingerprint(operation) {
  const packages=getOperationPackageIds(operation).sort().join(",");
  return [operation?.type||"operation",operation?.failureKind||"",String(operation?.code??""),packages].join("|");
}

function resolveOperationFromDetection(item,detail,resolvedBy) {
  return {...item,status:"resolved",verified:true,previousDetail:item.previousDetail||item.detail||"",detail,resolvedAt:new Date().toISOString(),resolvedBy};
}

function reconcileOperationsWithDetectedState({installedIds=null,availableUpdateIds=null,updateScanReliable=false}={}) {
  const installed=installedIds?new Set([...installedIds].map(canonicalOperationPackageId).filter(Boolean)):null;
  const pendingUpdates=availableUpdateIds?new Set([...availableUpdateIds].map(canonicalOperationPackageId).filter(Boolean)):null;
  let changed=false;
  operationFeed=operationFeed.map(item=>{
    if(item.status!=="failed")return item;
    const packageIds=getOperationPackageIds(item);
    if(!packageIds.length)return item;
    if(item.type==="installation"&&installed&&packageIds.every(id=>installed.has(id))){
      changed=true;
      return resolveOperationFromDetection(item,"Résolu automatiquement : les applications sont maintenant détectées comme installées sur ce PC.","installed-scan");
    }
    if(item.type==="update"&&updateScanReliable&&pendingUpdates&&packageIds.every(id=>!pendingUpdates.has(id))){
      changed=true;
      return resolveOperationFromDetection(item,"Résolu automatiquement : WinGet ne propose plus ces mises à jour après le nouveau contrôle.","update-scan");
    }
    return item;
  });
  if(changed){
    saveOperationFeed();
    [...new Set(operationFeed.filter(item=>item.status==="resolved").map(item=>item.type))].forEach(reconcileResolvedNotifications);
    renderOperations();
  }
  return changed;
}

function reconcileResolvedNotifications(operationType) {
  if(operationFeed.some(item=>item.status==="failed"&&item.type===operationType))return false;
  const action=operationType==="update"?"updates":operationType==="installation"?"queue":"";
  if(!action)return false;
  let changed=false;
  notificationFeed=notificationFeed.map(item=>{
    if(item.action!==action||item.kind!=="warning"||item.resolvedAt)return item;
    changed=true;
    return {...item,kind:"success",symbol:"✓",unread:false,resolvedAt:new Date().toISOString(),title:"Problème résolu automatiquement",detail:"Une nouvelle tentative a réussi. L’ancienne alerte est conservée dans l’historique."};
  });
  if(changed){saveNotificationFeed();renderNotificationFeed();}
  return changed;
}

function reconcileOperationHistory() {
  let activeId="";
  try { activeId=JSON.parse(localStorage.getItem(activeOperationStorageKey)||"null")?.id||""; } catch { localStorage.removeItem(activeOperationStorageKey); }
  const successes=operationFeed.filter(item=>item.status==="success"&&getOperationPackageIds(item).length);
  let changed=false;
  operationFeed=operationFeed.map(item=>{
    if(item.status==="running"&&item.id!==activeId){
      changed=true;
      return {...item,status:"interrupted",detail:"Opération interrompue : aucune tâche OwlSetup n’est encore active.",completedAt:item.completedAt||new Date().toISOString()};
    }
    if(item.status!=="failed")return item;
    if(item.type==="update"&&Number(item.code)===-1978335189){
      changed=true;
      return {...item,status:"resolved",previousDetail:item.previousDetail||item.detail||"",detail:"Résolu automatiquement : WinGet indique qu’aucune mise à jour n’est applicable et que le logiciel est déjà à jour.",resolvedAt:new Date().toISOString(),resolvedBy:"winget-no-applicable-update"};
    }
    const failedIds=getOperationPackageIds(item);
    if(!failedIds.length)return item;
    const failedAt=new Date(item.completedAt||item.startedAt||0).getTime();
    const recovery=successes.find(success=>{
      if(success.type!==item.type)return false;
      const successAt=new Date(success.completedAt||success.startedAt||0).getTime();
      const successIds=new Set(getOperationPackageIds(success));
      return successAt>failedAt&&failedIds.every(id=>successIds.has(id));
    });
    if(!recovery)return item;
    changed=true;
    const resolvedAt=recovery.completedAt||new Date().toISOString();
    return {...item,status:"resolved",previousDetail:item.previousDetail||item.detail||"",detail:"Résolu automatiquement après une nouvelle tentative réussie.",resolvedAt,resolvedBy:recovery.id};
  });
  if(changed){
    saveOperationFeed();
    [...new Set(operationFeed.filter(item=>item.status==="resolved").map(item=>item.type))].forEach(reconcileResolvedNotifications);
  }
  return changed;
}

function completeActiveOperation(status,detail,extra={}) {
  let active=null;
  try { active=JSON.parse(localStorage.getItem(activeOperationStorageKey)||"null"); } catch {}
  if(!active)active=operationFeed.find(item=>item.status==="running")||null;
  if(active){
    recordOperation({...active,...extra,status,detail,completedAt:new Date().toISOString()});
    if(status==="success")reconcileOperationHistory();
  }
  localStorage.removeItem(activeOperationStorageKey);
  pendingResumeOperation=null;
  renderOperationRecovery();
}

function readInterruptedOperation() {
  try {
    const operation=JSON.parse(localStorage.getItem(activeOperationStorageKey)||"null");
    if(operation?.status==="running") pendingResumeOperation=operation;
  } catch { localStorage.removeItem(activeOperationStorageKey); }
  renderOperationRecovery();
}

function renderOperationRecovery() {
  const panel=$("#operationRecovery");if(!panel)return;
  panel.classList.toggle("hidden",!pendingResumeOperation);
  if(pendingResumeOperation) $("#operationRecoveryDetail").textContent=`${pendingResumeOperation.title} a été interrompue. OwlSetup vous ramène à l'étape de contrôle, sans relancer automatiquement une action.`;
}

function resumeInterruptedOperation() {
  const operation=pendingResumeOperation;if(!operation)return;
  const values=Array.isArray(operation.payload?.packages)?operation.payload.packages.filter(isValidPackageId):[];
  if(operation.type==="installation") {
    selected=new Set(values.filter(id=>!installedApps.has(id)));renderApps();renderSelection();showView("queue");openInstallModal();
  } else if(operation.type==="update") {
    selectedUpdates=new Set(values);showView("updates");if(values.length)openUpdateModal();
  } else if(operation.type==="cleanup") {
    document.querySelectorAll("[data-cleanup]").forEach(input=>input.checked=(operation.payload.choices||[]).includes(input.dataset.cleanup));updateCleanupCount();showView("cleanup");openCleanupModal();
  } else showView("installed");
  localStorage.removeItem(activeOperationStorageKey);pendingResumeOperation=null;renderOperationRecovery();
}

function renderOperations() {
  const list=$("#operationsList");if(!list)return;
  const running=operationFeed.filter(item=>item.status==="running").length;
  const failed=operationFeed.filter(item=>item.status==="failed").length;
  const success=operationFeed.filter(item=>item.status==="success"||item.status==="resolved").length;
  $("#operationsRunning").textContent=running;$("#operationsFailed").textContent=failed;$("#operationsSuccess").textContent=success;
  setNavAlert("#operationsNavBadge",running+failed,running+failed>0);
  const finished=operationFeed.filter(item=>item.status==="success"||item.status==="resolved"||item.status==="interrupted").length;
  $("#resolveAllOperations")?.classList.toggle("hidden",failed===0);
  $("#clearFinishedOperations")?.classList.toggle("hidden",finished===0);
  list.innerHTML=operationFeed.length?operationFeed.map(item=>`<article class="operation-row ${escapeHtml(item.status||"")}"><span class="operation-status">${item.status==="success"||item.status==="resolved"?"✓":item.status==="failed"?"!":item.status==="interrupted"?"—":"↻"}</span><div><strong>${escapeHtml(item.title||item.type)}</strong><small>${escapeHtml(item.detail||new Date(item.startedAt).toLocaleString("fr-FR"))}</small>${Number(item.occurrences)>1?`<em>${Number(item.occurrences)} occurrences regroupées · dernière tentative affichée</em>`:""}${item.status==="resolved"?(["manual","stale","update-ignored","self-managed"].includes(item.resolvedBy)?`<em>${escapeHtml(item.detail||"Classé résolu")}</em>`:`<em>Résultat vérifié automatiquement sur ce PC</em>`):item.status==="success"&&item.verified?`<em>Résultat confirmé après contrôle</em>`:item.status==="interrupted"?`<em>Aucune action n’est actuellement exécutée</em>`:""}</div><span class="operation-row-actions">${item.status==="failed"?`<button class="secondary-button" data-operation-fix="${escapeHtml(item.id)}">Corriger</button><button class="text-button" data-operation-resolve="${escapeHtml(item.id)}">Marquer résolu</button>`:(item.status==="resolved"||item.status==="success"||item.status==="interrupted")?`<button class="operation-remove" data-operation-remove="${escapeHtml(item.id)}" title="Retirer de la liste" aria-label="Retirer de la liste">✕</button>`:""}</span></article>`).join(""):`<div class="empty-state">Aucune opération enregistrée pour le moment.</div>`;
}

function selectOperationFix(id) {
  const operation=operationFeed.find(item=>item.id===id);if(!operation)return;
  selectedOperationFix=operation;
  $("#operationFixPanel").classList.remove("hidden");
  $("#operationProcessPanel").classList.add("hidden");
  $("#operationFixTitle").textContent=operation.title||"Opération à corriger";
  const failedNames=(operation.failedPackages||[]).map(item=>item.name||item.id).filter(Boolean).join(", ");
  if(operation.failureKind==="files-in-use") {
    $("#operationFixDetail").textContent=`${failedNames||"L'application concernée"} doit être complètement fermée. OwlSetup préparera ensuite uniquement la mise à jour en échec.`;
    $("#operationAutoFix").textContent="Préparer la relance";
  } else if(operation.failureKind==="restart-required") {
    $("#operationFixDetail").textContent="Le PC doit être redémarré afin que Windows termine cette opération.";
    $("#operationAutoFix").textContent="Voir pourquoi redémarrer le PC";
  } else {
    $("#operationFixDetail").textContent=operation.detail||"OwlSetup peut vérifier WinGet puis vous laisser relancer l'opération.";
    $("#operationAutoFix").textContent="Corriger WinGet";
  }
}

function applyOperationAutoFix() {
  if(!selectedOperationFix)return;
  if(selectedOperationFix.type==="update" && selectedOperationFix.failureKind==="files-in-use") {
    processCloseContext="operations";
    operationProcessPackages=(selectedOperationFix.failedPackages||[]).map(item=>item.id).filter(isValidPackageId);
    if(!operationProcessPackages.length)operationProcessPackages=(selectedOperationFix.payload?.packages||[]).filter(isValidPackageId);
    if(!operationProcessPackages.length)return notify("Relance impossible","Aucun paquet valide n'a été retrouvé dans cette opération.");
    $("#operationProcessPanel").classList.remove("hidden");
    $("#operationProcessTitle").textContent="Recherche des applications encore ouvertes…";
    $("#operationProcessList").innerHTML='<div class="empty-state">Analyse des processus en cours…</div>';
    $("#operationProcessWarning").classList.add("hidden");
    $("#operationForceClose").classList.add("hidden");
    $("#operationGracefulClose").disabled=true;
    $("#operationGracefulClose").textContent="Fermer proprement et réessayer";
    $("#operationAutoFix").disabled=true;
    window.chrome?.webview?.postMessage({action:"inspect-package-processes",payload:{packages:operationProcessPackages}});
    return;
  }
  if(selectedOperationFix.failureKind==="restart-required") {
    showView("home");
    notify("Redémarrage du PC nécessaire","Enregistrez votre travail, choisissez Démarrer > Marche/Arrêt > Redémarrer, puis relancez la détection des mises à jour dans OwlSetup.");
    return;
  }
  showView("tools");
  window.chrome?.webview?.postMessage({action:"repair-winget",payload:{}});
  notify("Correction lancée","WinGet et ses sources vont être contrôlés. Vous pourrez ensuite relancer l'opération.");
}

function prepareFailedUpdateRetry(message="Les applications bloquantes sont fermées. Vérifiez la sélection avant de relancer.") {
  selectedUpdates=new Set(operationProcessPackages.filter(isValidPackageId));
  availableUpdates=[...availableUpdates];
  showView("updates");renderAvailableUpdates();
  $("#operationFixPanel").classList.add("hidden");
  if(selectedUpdates.size)openUpdateModal();
  notify("Mise à jour prête",message);
}

function renderOperationProcesses(processes) {
  const values=Array.isArray(processes)?processes:[];
  $("#operationProcessTitle").textContent=values.length?`${values.length} processus détecté${values.length>1?"s":""}`:"Aucun processus bloquant détecté";
  $("#operationProcessList").innerHTML=values.length?values.map(item=>`<div class="operation-process-item"><span>□</span><div><strong>${escapeHtml(item.name||"Application")}</strong><small>${escapeHtml(item.title||"Processus en arrière-plan")}</small></div><em>PID ${Number(item.pid)||"—"}</em></div>`).join(""):'<div class="empty-state">Le logiciel semble déjà fermé.</div>';
}

function closeOperationProcesses(force=false) {
  if(!operationProcessPackages.length)return;
  $("#operationGracefulClose").disabled=true;
  $("#operationForceClose").disabled=true;
  $("#operationProcessTitle").textContent=force?"Fermeture forcée en cours…":"Demande de fermeture en cours…";
  window.chrome?.webview?.postMessage({action:"close-package-processes",payload:{packages:operationProcessPackages,force,confirmed:force}});
}

function closeUpdateBlockingProcesses(force=false) {
  if(updateBlockerReady) {
    operationProcessPackages=[...updateBlockerPackages];
    closeUpdateModal();
    prepareFailedUpdateRetry("L'application bloquante est fermée. Confirmez maintenant la nouvelle tentative ciblée.");
    return;
  }
  if(!updateBlockerPackages.length)return;
  processCloseContext="update";
  $("#closeUpdateBlocker").disabled=true;
  $("#forceCloseUpdateBlocker").disabled=true;
  if(!updateBlockerInspected&&!force) {
    $("#updateProgressDetail").textContent="Recherche du processus qui verrouille les fichiers du logiciel…";
    window.chrome?.webview?.postMessage({action:"inspect-package-processes",payload:{packages:updateBlockerPackages}});
    return;
  }
  $("#updateProgressDetail").textContent=force?"Fermeture forcée du processus…":"Fermeture normale de l'application…";
  window.chrome?.webview?.postMessage({action:"close-package-processes",payload:{packages:updateBlockerPackages,force,confirmed:force}});
}

function isExpertMode(){return localStorage.getItem(expertModeStorageKey)==="true";}
// Canal de mise à jour : « true » = inclure les préversions (bêtas GitHub).
function prereleaseOptIn(){return localStorage.getItem(prereleaseStorageKey)==="true";}
function updateExpertPreviews(){
  const install=$("#installExpertPreview"),update=$("#updateExpertPreview");
  if(install){install.classList.toggle("hidden",!isExpertMode());install.textContent=[...selected].map(id=>`winget install --id "${id}" --exact --silent`).join("\n");}
  if(update){update.classList.toggle("hidden",!isExpertMode());update.textContent=[...selectedUpdates].map(id=>`winget upgrade --id "${id}" --exact --silent`).join("\n");}
}

function collectPreferences(){
  const keys=["owlsetup-language-v1",themeStorageKey,accessibilityStorageKey,"pcsetup-profiles",onboardingStorageKey,firstRunConfigurationStorageKey,autoRestoreStorageKey,prereleaseStorageKey,expertModeStorageKey,errorTelemetryStorageKey,alphaPreferencesStorageKey];
  const values={};keys.forEach(key=>{const value=localStorage.getItem(key);if(value!==null)values[key]=value;});
  return JSON.stringify(values);
}

function restorePreferences(serialized){
  if(!serialized)return;
  try {
    const values=JSON.parse(serialized);const allowed=new Set(["owlsetup-language-v1",themeStorageKey,accessibilityStorageKey,"pcsetup-profiles",onboardingStorageKey,firstRunConfigurationStorageKey,autoRestoreStorageKey,prereleaseStorageKey,expertModeStorageKey,errorTelemetryStorageKey,alphaPreferencesStorageKey]);
    Object.entries(values||{}).forEach(([key,value])=>{if(allowed.has(key)&&typeof value==="string"&&value.length<32768)localStorage.setItem(key,value);});
    applyThemePreference();applyAccessibilitySettings();refreshProfiles();
    $("#expertMode").checked=isExpertMode();$("#autoRestorePoint").checked=localStorage.getItem(autoRestoreStorageKey)==="true";if($("#prereleaseOptIn"))$("#prereleaseOptIn").checked=prereleaseOptIn();updateExpertPreviews();
  } catch { notify("Réglages ignorés","La sauvegarde contient des préférences non valides."); }
}

function collectFeedbackDiagnostics() {
  if (!window.chrome?.webview) return notify("Diagnostic indisponible", "Cette fonction nécessite l'application Windows.", "error");
  $("#collectFeedbackDiagnostics").disabled=true;
  $("#collectFeedbackDiagnostics").textContent="Analyse en cours...";
  window.chrome.webview.postMessage({action:"feedback-diagnostics",payload:{}});
}

function refreshProfiles() {
  const profiles = readProfiles();
  $("#savedProfiles").innerHTML = `<option value="">Choisir un profil</option>${Object.keys(profiles).sort().map(name => `<option value="${encodeURIComponent(name)}">${escapeHtml(name)}</option>`).join("")}`;
}

function readProfiles() {
  try {
    const value = JSON.parse(localStorage.getItem("pcsetup-profiles") || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function saveProfile() {
  const name=$("#profileName").value.trim();
  if (!name || name.length > 60 || ["__proto__","prototype","constructor"].includes(name.toLocaleLowerCase())) { notify("Nom de profil invalide","Utilisez un nom de 1 à 60 caractères."); return; }
  if (!selected.size) { notify("Profil incomplet","Sélectionnez au moins un logiciel."); return; }
  const profiles=readProfiles();
  profiles[name]=[...selected];
  localStorage.setItem("pcsetup-profiles",JSON.stringify(profiles));
  $("#profileName").value="";refreshProfiles();notify("Profil enregistré",name);
}

function loadProfile() {
  const value=$("#savedProfiles").value;if(!value)return;
  const name=decodeURIComponent(value),profiles=readProfiles();
  const profilePackages=Array.isArray(profiles[name]) ? profiles[name].filter(isValidPackageId).slice(0,100) : [];
  const canonicalPackages=profilePackages.map(id=>apps.find(app=>app.id.toLocaleLowerCase()===id.toLocaleLowerCase())?.id).filter(Boolean);
  selected=new Set(canonicalPackages.filter(id=>!installedApps.has(id) && !apps.some(app=>app.id===id && app.manualInstall)));
  renderFilters();
  renderApps();renderSelection();notify("Profil chargé",name);
}

function requestHistory(){if(window.chrome?.webview)window.chrome.webview.postMessage({action:"load-history",payload:{}});}
function requestSecurityStatus(){
  const button=$("#refreshSecurity");
  if(button){button.disabled=true;button.textContent="Vérification…";}
  if(window.chrome?.webview)window.chrome.webview.postMessage({action:"security-status",payload:{}});
  else if(button){button.disabled=false;button.textContent="Vérifier maintenant";}
}

function securityDetailDefinition(key,message=lastSecurityStatus||{}) {
  const definitions={
    score:{title:"Calcul du score de sécurité",text:"Le score synthétise neuf contrôles locaux : intégrité de l’interface, origine WebView2, signature, versions de WinGet et WebView2, worker protégé, protection antivirus, protection pare-feu et droits de l’interface. Les protections Microsoft et tierces enregistrées auprès du Centre de sécurité Windows sont prises en compte."},
    integrity:{title:"Intégrité de l’interface",text:message.integrity?`Les ressources intégrées correspondent à l’exécutable. SHA-256 : ${message.sha256||"indisponible"}.`:`Les ressources intégrées ont été modifiées. N’utilisez pas cette copie avant de la remplacer depuis la Release officielle.`,action:message.integrity?"":"release",label:"Ouvrir la Release"},
    origin:{title:"Origine WebView2 verrouillée",text:"OwlSetup n’accepte les commandes internes que depuis son origine locale pcsetup.local. Une page Internet ouverte par l’application ne peut pas invoquer les opérations système."},
    signature:{title:"Signature de l’exécutable",text:message.signatureState==="valid"?`Signature approuvée : ${message.signer}.`:message.signatureState==="unsigned-beta"?"Cette bêta locale n’est pas signée. C’est un état attendu tant que le projet ne possède pas de certificat reconnu ; vérifiez son empreinte SHA-256.":message.signed?"Une signature est présente, mais sa chaîne de confiance n’est pas approuvée.":"Aucune signature de code reconnue n’est présente.",action:message.signatureState==="valid"?"":"release",label:"Vérifier la Release"},
    winget:{title:"Gestionnaire de paquets WinGet",text:`Version détectée : ${message.winget||"indisponible"}. ${message.wingetOutdated?"Une mise à jour est recommandée.":"OwlSetup l’utilise pour les installations officielles."}`,action:message.winget==="Indisponible"||message.wingetOutdated?"winget":"",label:"Ouvrir les outils"},
    webview:{title:"Moteur Microsoft WebView2",text:`Version détectée : ${message.webview||"indisponible"}. ${message.webviewOutdated?"Cette version semble ancienne.":"Le moteur Evergreen affiche l’interface locale."}`,action:message.webviewOutdated||message.webview==="Indisponible"?"webview":"",label:"Page officielle"},
    runtime:{title:"Worker système protégé",text:message.secureRuntime?"Le dossier utilisé pour les opérations élevées existe et n’est pas un lien de redirection.":"Le dossier protégé sera créé lors de la première opération qui exige des droits administrateur."},
    defender:{title:"Protection antivirus",text:message.antivirusDetermined===false?"OwlSetup n’a pas pu lire l’état de la protection antivirus (Sécurité Windows indisponible ou clé protégée par la protection contre les falsifications). Ouvrez Sécurité Windows pour le vérifier vous-même.":message.antivirusActive?"Le Centre de sécurité Windows indique qu’une protection antivirus est active. Il peut s’agir de Microsoft Defender ou d’un antivirus tiers correctement enregistré. OwlSetup lit seulement cet état.":"Le Centre de sécurité Windows demande de vérifier la protection antivirus. Ouvrez Sécurité Windows pour connaître le produit concerné.",action:"defender",label:"Ouvrir Sécurité Windows"},
    firewall:{title:"Protection pare-feu",text:message.firewallDetermined===false?"OwlSetup n’a pas pu lire l’état du pare-feu sur ce PC. Ouvrez Sécurité Windows pour le vérifier vous-même.":message.firewallActive?"Le Centre de sécurité Windows indique qu’une protection pare-feu est active. Elle peut être fournie par Windows ou par une suite de sécurité tierce. OwlSetup ne modifie aucun réglage.":"Le Centre de sécurité Windows demande de vérifier la protection pare-feu.",action:"firewall",label:"Ouvrir le pare-feu"},
    privileges:{title:"Droits de l’interface",text:message.standardUser?"L’interface fonctionne avec des droits standards. Windows demande une autorisation UAC séparée uniquement lorsqu’une action l’exige.":"OwlSetup est actuellement lancé en administrateur. Fermez-le puis relancez-le normalement."}
  };
  return definitions[key]||definitions.integrity;
}

function runSecurityAction(action) {
  if(!action||action==="none")return;
  if(action==="release")return window.open("https://github.com/OwlNetGeekFR/OwlSetup/releases/latest","_blank","noopener");
  if(action==="winget")return showView("tools");
  if(action==="webview")return window.open("https://developer.microsoft.com/microsoft-edge/webview2/","_blank","noopener");
  if(["defender","firewall"].includes(action))window.chrome?.webview?.postMessage({action:"open-windows-security",payload:{page:action}});
}

function showSecurityDetail(key) {
  activeSecurityDetail=key;
  const detail=securityDetailDefinition(key);
  $("#securityDetailTitle").textContent=detail.title;
  $("#securityDetailText").textContent=detail.text;
  const action=$("#securityDetailAction");
  action.dataset.securityAction=detail.action||"";
  action.textContent=detail.label||"Ouvrir";
  action.classList.toggle("hidden",!detail.action);
  $("#securityDetailPanel").classList.remove("hidden");
}

function renderSecurityRecommendations(recommendations=[]) {
  const list=$("#securityRecommendations");
  list.innerHTML=recommendations.map(item=>`<div class="security-recommendation ${escapeHtml(item.severity||"warning")}"><span></span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div>${item.action&&item.action!=="none"?`<button class="text-button" type="button" data-security-action="${escapeHtml(item.action)}">Agir</button>`:""}</div>`).join("")||`<div class="security-recommendation success"><span></span><div><strong>Aucune action requise</strong><small>Les contrôles locaux principaux sont satisfaisants.</small></div></div>`;
  const actionable=recommendations.filter(item=>item.action&&item.action!=="none").length;
  $("#securityRecommendationCount").textContent=actionable?`${actionable} action${actionable>1?"s":""}`:"À jour";
}
function diagnoseWinget(){if(window.chrome?.webview){$("#wingetDiagnosticText").textContent="Diagnostic en cours...";window.chrome.webview.postMessage({action:"diagnose-winget",payload:{}});}}

const toolProgressIds={winget:"wingetToolProgress",restore:"restoreToolProgress",startup:"startupToolProgress",disk:"diskToolProgress"};
function setToolProgress(tool,percent,status=""){
  const progress=document.getElementById(toolProgressIds[tool]);if(!progress)return;
  const value=Math.max(0,Math.min(100,Number(percent)||0));
  progress.classList.remove("hidden");
  progress.querySelector("i").style.width=`${value}%`;
  progress.querySelector("b").textContent=`${Math.round(value)}%`;
  if(status)progress.title=status;
}

function requestUpdateScan() {
  if (!window.chrome?.webview) return;
  updatesLoaded = false;
  $("#updateScanState").classList.remove("hidden");
  $("#availableUpdates").classList.add("hidden");
  $("#noUpdates").classList.add("hidden");
  $("#selectAllUpdates").classList.add("hidden");
  $("#clearUpdates").classList.add("hidden");
  $("#scanUpdatesBtn").disabled = true;
  $("#updateAllBtn").disabled = true;
  window.chrome.webview.postMessage({action:"scan-updates", payload:{}});
}

function requestInstalledScan() {
  if (!window.chrome?.webview) {
    notify("Détection locale", "Cette fonction est disponible dans l'application Windows.");
    return;
  }
  $("#installedPageCount").textContent = "Analyse en cours...";
  window.chrome.webview.postMessage({action:"scan-installed", payload:{ids:apps.map(app => app.id), apps:apps.map(app => ({id:app.id,name:app.name,portable:!!app.portable,custom:!!app.custom}))}});
}

function setBatchUninstallVerificationPending(pending) {
  batchUninstallSimulationPending = pending;
  [$("#batchUninstallBtn"), $("#installedBatchUninstall")].filter(Boolean).forEach(button => {
    if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent.trim();
    button.textContent = pending ? "Vérification WinGet…" : button.dataset.defaultLabel;
    button.disabled = pending || managedInstalled.size === 0;
    button.setAttribute("aria-busy", String(pending));
  });
}

function requestBatchUninstall() {
  if (batchUninstallSimulationPending) return;
  const packages=[...managedInstalled].filter(id=>installedApps.has(id)&&wingetManageableApps.has(id));
  if (!packages.length) {
    managedInstalled.clear();
    renderApps();
    notify("Aucune application vérifiée", "Actualisez la détection, puis sélectionnez une application marquée « Gérable par WinGet ».");
    return;
  }
  if (!window.chrome?.webview) {
    notify("Désinstallation locale", "Cette fonction est disponible dans l’application Windows OwlSetup.");
    return;
  }
  setBatchUninstallVerificationPending(true);
  notify("Vérification WinGet", `${packages.length} application(s) sont contrôlée(s) avant la confirmation.`);
  clearTimeout(batchUninstallSimulationTimer);
  batchUninstallSimulationTimer=window.setTimeout(()=>{
    if(!batchUninstallSimulationPending)return;
    setBatchUninstallVerificationPending(false);
    notify("Vérification trop longue", "WinGet ne répond pas. Actualisez la détection ou utilisez la désinstallation individuelle.");
  },30000);
  window.chrome.webview.postMessage({action:"simulate-batch-uninstall",payload:{packages,apps:apps.filter(app=>packages.includes(app.id)).map(app=>({id:app.id,name:app.name}))}});
}

function openBatchUninstallModal(packages) {
  pendingBatchUninstall = [...(packages || [])];
  const selectedApps = pendingBatchUninstall.map(id => apps.find(app => app.id === id) || {id,name:id,icon:"APP",color:"#536174",logo:""});
  $("#batchUninstallCount").textContent = `${selectedApps.length} logiciel${selectedApps.length > 1 ? "s" : ""}`;
  $("#batchUninstallList").innerHTML = selectedApps.map(app => `<article data-batch-package="${escapeHtml(app.id)}">${icon(app)}<span><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.id)}</small></span><b class="batch-item-state">Prêt</b></article>`).join("");
  $("#batchUninstallConfirmView").classList.remove("hidden");
  $("#batchUninstallProgressView").classList.add("hidden");
  $("#batchResiduePanel").classList.add("hidden");
  $("#batchCleanupResidues").checked=true;
  $("#quarantineBatchResidues").disabled=false;
  pendingBatchResidueToken="";
  $("#confirmBatchUninstall").disabled = selectedApps.length === 0;
  $("#batchUninstallModal").dataset.running = "false";
  $("#batchUninstallModal").dataset.success = "0";
  $("#batchUninstallModal").dataset.failed = "0";
  $("#batchUninstallModal").classList.remove("hidden");
}

function closeBatchUninstallModal() {
  if ($("#batchUninstallModal").dataset.running === "true") { minimizeUninstallProgress("batch"); return; }
  $("#batchUninstallModal").classList.add("hidden");
  $("#backgroundUninstall").classList.add("hidden");
  pendingBatchUninstall = [];
  pendingBatchResidueToken = "";
  if (activeUninstallMode === "batch") activeUninstallMode = "";
}

function beginBatchUninstall() {
  if (!pendingBatchUninstall.length || !window.chrome?.webview) return;
  $("#batchUninstallConfirmView").classList.add("hidden");
  $("#batchUninstallProgressView").classList.remove("hidden");
  $("#batchUninstallModal").dataset.running = "true";
  $("#batchUninstallProgressBar").style.width = "4%";
  $("#batchUninstallProgressPercent").textContent = "4%";
  $("#batchUninstallProgressTitle").textContent = "Préparation de la désinstallation";
  $("#batchUninstallProgressDetail").textContent = `${pendingBatchUninstall.length} logiciel(s) dans la file`;
  $("#batchUninstallCurrent").textContent = "Initialisation de WinGet...";
  $("#batchUninstallPosition").textContent = `0/${pendingBatchUninstall.length}`;
  $("#batchUninstallResult").textContent = "0 réussi · 0 à vérifier";
  $("#finishBatchUninstall").classList.add("hidden");
  $("#batchUninstallBackgroundActions").classList.remove("hidden");
  activeUninstallMode = "batch";
  currentUninstallRun = `batch-uninstall-${Date.now()}`;
  setBackgroundUninstall("Préparation de la désinstallation", `${pendingBatchUninstall.length} logiciel(s) dans la file`, 4);
  window.chrome.webview.postMessage({action:"batch-uninstall",payload:{packages:pendingBatchUninstall,apps:apps.filter(app=>pendingBatchUninstall.includes(app.id)).map(app=>({id:app.id,name:app.name})),scanResidues:$("#batchCleanupResidues").checked}});
  window.setTimeout(() => minimizeUninstallProgress("batch"), 450);
}

function appForUpdate(id) { return apps.find(app => app.id.toLocaleLowerCase() === String(id).toLocaleLowerCase()); }

function getIgnoredUpdateIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(updateIgnoreStorageKey) || "[]");
    return new Set((Array.isArray(raw) ? raw : []).filter(isValidPackageId));
  } catch {
    return new Set();
  }
}

function saveIgnoredUpdateIds(ids) {
  try { localStorage.setItem(updateIgnoreStorageKey, JSON.stringify([...ids])); } catch {}
}

function ignoreUpdate(id) {
  if (!isValidPackageId(id)) return;
  const ids = getIgnoredUpdateIds();
  ids.add(id);
  saveIgnoredUpdateIds(ids);
  selectedUpdates.delete(id);
  renderAvailableUpdates();
  const app = appForUpdate(id);
  notify("Mise à jour masquée", `${app?.name || id} ne sera plus proposé. Utilisez « Réafficher » pour revenir en arrière.`);
}

function restoreIgnoredUpdates() {
  saveIgnoredUpdateIds(new Set());
  selectedUpdates = new Set(availableUpdates.map(update => update.id));
  renderAvailableUpdates();
  notify("Mises à jour réaffichées", "Toutes les mises à jour masquées sont de nouveau visibles.");
}

function renderAvailableUpdates() {
  $("#updateScanState").classList.add("hidden");
  $("#scanUpdatesBtn").disabled = false;
  const ignored = getIgnoredUpdateIds();
  const visibleUpdates = availableUpdates.filter(update => !ignored.has(update.id));
  const hiddenCount = availableUpdates.length - visibleUpdates.length;
  [...selectedUpdates].forEach(id => { if (ignored.has(id)) selectedUpdates.delete(id); });
  const hasUpdates = visibleUpdates.length > 0;
  setNavAlert("#updatesNavBadge", visibleUpdates.length, visibleUpdates.length > 0);
  $("#availableUpdates").classList.toggle("hidden", !hasUpdates);
  $("#noUpdates").classList.toggle("hidden", hasUpdates);
  $("#selectAllUpdates").classList.toggle("hidden", !hasUpdates || selectedUpdates.size === visibleUpdates.length);
  $("#clearUpdates").classList.toggle("hidden", !hasUpdates || selectedUpdates.size === 0);
  $("#availableUpdates").innerHTML = visibleUpdates.map(update => {
    const app = appForUpdate(update.id);
    const appIcon = app?.logo ? `<img src="${escapeHtml(app.logo)}" alt="" data-image-fallback="APP">` : `<span>APP</span>`;
    const selfManaged = update.selfManaged
      ? `<span class="update-selfmanaged" title="Ce logiciel intègre sa propre mise à jour : ouvrez-le une fois pour qu'elle se termine. WinGet continuera de le proposer.">⟳ se met à jour seule</span>`
      : "";
    return `<label class="available-update"><input type="checkbox" data-update-id="${escapeHtml(update.id)}" ${selectedUpdates.has(update.id) ? "checked" : ""}><span class="update-check">✓</span><span class="update-app-icon${logoSurfaceClass(app)}">${appIcon}</span><span><strong>${escapeHtml(update.name)}</strong><small>${escapeHtml(update.id)}</small>${selfManaged}</span><span class="version-flow">${escapeHtml(update.current)}<i>→</i><b>${escapeHtml(update.available)}</b></span><button type="button" class="update-ignore" data-ignore-update="${escapeHtml(update.id)}" title="Ne plus proposer cette mise à jour">✕</button></label>`;
  }).join("");
  const ignoredBar = $("#ignoredUpdatesBar");
  if (ignoredBar) {
    ignoredBar.classList.toggle("hidden", hiddenCount === 0);
    $("#ignoredUpdatesText").textContent = hiddenCount
      ? `${hiddenCount} mise${hiddenCount > 1 ? "s" : ""} à jour masquée${hiddenCount > 1 ? "s" : ""}`
      : "";
  }
  const count = selectedUpdates.size;
  $("#updateAllBtn").disabled = count === 0;
  $("#updateReadyTitle").textContent = hasUpdates ? `${count} mise${count > 1 ? "s" : ""} à jour sélectionnée${count > 1 ? "s" : ""}` : "Applications à jour";
  $("#updateReadyDetail").textContent = hasUpdates ? "Vérifiez les versions puis lancez uniquement votre sélection." : "Vous pouvez relancer une recherche à tout moment.";
}

// --- Windows Update (inventaire lecture seule) --------------------------------
let windowsUpdateScanRunning = false;
let windowsUpdateItems = [];
let windowsUpdateSelection = new Set();
let windowsUpdateInstalling = false;

function formatWindowsUpdateBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  const mo = n / (1024 * 1024);
  return mo < 1024 ? `${Math.round(mo)} Mo` : `${(mo / 1024).toFixed(1).replace(".", ",")} Go`;
}

function installableWindowsUpdate(u) {
  return u && typeof u.updateId === "string" && u.updateId.length === 36 && !u.browseOnly;
}

function requestWindowsUpdateScan() {
  if (!window.chrome?.webview) {
    notify("Windows Update", "Cette analyse est disponible dans l'application Windows.", "info");
    return;
  }
  windowsUpdateScanRunning = true;
  $("#windowsUpdateScanState")?.classList.remove("hidden");
  $("#windowsUpdateList")?.classList.add("hidden");
  $("#noWindowsUpdates")?.classList.add("hidden");
  $("#windowsUpdateInstallBar")?.classList.add("hidden");
  const btn = $("#scanWindowsUpdatesBtn");
  if (btn) btn.disabled = true;
  window.chrome.webview.postMessage({ action: "scan-windows-updates", payload: {} });
}

function updateWindowsUpdateInstallBar() {
  const bar = $("#windowsUpdateInstallBar");
  if (!bar) return;
  const chosen = windowsUpdateItems.filter(u => windowsUpdateSelection.has(u.updateId));
  const hasChoice = chosen.length > 0;
  bar.classList.toggle("hidden", windowsUpdateItems.filter(installableWindowsUpdate).length === 0);
  const bytes = chosen.reduce((sum, u) => sum + (Number(u.bytes) || 0), 0);
  const sizeLabel = formatWindowsUpdateBytes(bytes);
  $("#windowsUpdateSelectionText").textContent = hasChoice
    ? `${chosen.length} sélectionnée${chosen.length > 1 ? "s" : ""}${sizeLabel ? ` · ${sizeLabel}` : ""}`
    : "Aucune mise à jour sélectionnée";
  const btn = $("#installWindowsUpdatesBtn");
  if (btn) {
    btn.disabled = !hasChoice || windowsUpdateInstalling;
    btn.textContent = windowsUpdateInstalling ? "Installation en cours…" : `Installer la sélection (${chosen.length})`;
  }
}

function renderWindowsUpdates(message) {
  windowsUpdateScanRunning = false;
  $("#windowsUpdateScanState")?.classList.add("hidden");
  const btn = $("#scanWindowsUpdatesBtn");
  if (btn) btn.disabled = false;
  const list = Array.isArray(message.updates) ? message.updates : [];
  windowsUpdateItems = list;
  const summaryEl = $("#windowsUpdateSummary");
  const listEl = $("#windowsUpdateList");
  const emptyEl = $("#noWindowsUpdates");
  const installBar = $("#windowsUpdateInstallBar");

  if (message.warning) {
    if (summaryEl) summaryEl.textContent = `Analyse Windows Update indisponible : ${message.warning}`;
    listEl?.classList.add("hidden");
    emptyEl?.classList.add("hidden");
    installBar?.classList.add("hidden");
    setNavAlert("#updatesNavBadge", 0, false);
    return;
  }

  const driverCount = Number(message.driverCount || 0);
  const checkedAt = message.checkedAt ? ` · vérifié à ${message.checkedAt}` : "";
  if (list.length === 0) {
    if (summaryEl) summaryEl.textContent = `Windows est à jour${checkedAt}.`;
    listEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    installBar?.classList.add("hidden");
    return;
  }

  // Sélection par défaut : composants oui, pilotes non, préversions/optionnelles
  // jamais (installableWindowsUpdate exclut déjà browseOnly).
  windowsUpdateSelection = new Set(
    list.filter(u => installableWindowsUpdate(u) && u.kind !== "driver").map(u => u.updateId)
  );

  const optionalCount = list.filter(u => u.browseOnly).length;
  const bits = [`${list.length} mise${list.length > 1 ? "s" : ""} à jour Windows en attente`];
  if (driverCount > 0) bits.push(`${driverCount} pilote${driverCount > 1 ? "s" : ""}`);
  if (optionalCount > 0) bits.push(`${optionalCount} optionnelle${optionalCount > 1 ? "s" : ""}`);
  const totalBytes = list.reduce((sum, u) => sum + (Number(u.bytes) || 0), 0);
  const totalLabel = formatWindowsUpdateBytes(totalBytes);
  if (totalLabel) bits.push(totalLabel);
  if (summaryEl)
    summaryEl.textContent = `${bits.join(" · ")}${checkedAt}. Pilotes et mises à jour optionnelles non cochés par défaut${optionalCount > 0 ? " ; les optionnelles s'installent depuis Windows Update" : ""}.`;

  emptyEl?.classList.add("hidden");
  if (listEl) {
    listEl.classList.remove("hidden");
    listEl.innerHTML = list
      .map(u => {
        const kindLabel = u.kind === "driver" ? "Pilote" : "Composant";
        const meta = [u.kb, formatWindowsUpdateBytes(u.bytes), u.downloaded ? "déjà téléchargé" : ""]
          .filter(Boolean)
          .join(" · ");
        const sev = u.browseOnly
          ? `<span class="wu-sev wu-optional">optionnel · Windows Update</span>`
          : u.severity
            ? `<span class="wu-sev">${escapeHtml(u.severity)}</span>`
            : "";
        const canPick = installableWindowsUpdate(u);
        const checked = canPick && windowsUpdateSelection.has(u.updateId) ? "checked" : "";
        const boxTitle = u.browseOnly
          ? "Mise à jour optionnelle / préversion : à installer depuis Windows Update"
          : "Cette mise à jour ne peut être installée que depuis Windows Update";
        const box = canPick
          ? `<input type="checkbox" data-wu-id="${escapeHtml(u.updateId)}" ${checked}><span class="wu-check">✓</span>`
          : `<span class="wu-check wu-check-disabled" title="${escapeHtml(boxTitle)}">–</span>`;
        return `<label class="windows-update-row wu-${u.kind === "driver" ? "driver" : "software"}${u.browseOnly ? " wu-browseonly" : ""}">${box}<span class="wu-kind">${kindLabel}</span><span class="wu-body"><strong>${escapeHtml(u.title)}</strong><small>${escapeHtml(meta)}</small></span>${sev}</label>`;
      })
      .join("");
  }
  updateWindowsUpdateInstallBar();
}

function requestWindowsUpdateInstall() {
  if (!window.chrome?.webview || windowsUpdateInstalling) return;
  const ids = [...windowsUpdateSelection];
  if (ids.length === 0) return;
  const chosen = windowsUpdateItems.filter(u => windowsUpdateSelection.has(u.updateId));
  const drivers = chosen.filter(u => u.kind === "driver").length;
  const driverWarning = drivers
    ? `\n\nDont ${drivers} pilote${drivers > 1 ? "s" : ""} : un pilote proposé par Windows Update peut être plus ancien que celui du fabricant.`
    : "";
  if (
    !window.confirm(
      `Installer ${ids.length} mise${ids.length > 1 ? "s" : ""} à jour Windows ?${driverWarning}\n\nUne autorisation administrateur sera demandée. Un redémarrage peut être nécessaire.`
    )
  ) {
    return;
  }
  runWithOptionalRestore(() => {
    windowsUpdateInstalling = true;
    updateWindowsUpdateInstallBar();
    $("#windowsUpdateInstallState")?.classList.remove("hidden");
    $("#windowsUpdateInstallStatus") &&
      ($("#windowsUpdateInstallStatus").textContent = "Autorisation Windows demandée…");
    window.chrome.webview.postMessage({ action: "install-windows-updates", payload: { updateIds: ids } });
  }, "l'installation des mises à jour Windows");
}

function renderWindowsUpdateInstallComplete(message) {
  windowsUpdateInstalling = false;
  $("#windowsUpdateInstallState")?.classList.add("hidden");
  updateWindowsUpdateInstallBar();
  const installed = Number(message.installed || 0);
  const failed = Number(message.failed || 0);
  const notApplied = Number(message.notApplied || 0);
  if (message.rebootRequired) {
    const bar = $("#windowsUpdateRebootBar");
    if (bar) {
      bar.classList.remove("hidden");
      $("#windowsUpdateRebootText").textContent = `${installed} mise${installed > 1 ? "s" : ""} à jour Windows installée${installed > 1 ? "s" : ""} · un redémarrage est nécessaire pour terminer.`;
    }
  }
  if (message.warning) {
    // "non appliquée" (préversion seeker) : ce n'est pas un plantage, on oriente
    // vers Windows Update plutôt que d'afficher une erreur rouge.
    notify(
      "Windows Update",
      message.warning,
      notApplied && !failed ? "warning" : failed || !installed ? "error" : "warning"
    );
  } else if (message.success) {
    notify(
      "Windows Update",
      `${installed} mise${installed > 1 ? "s" : ""} à jour installée${installed > 1 ? "s" : ""}${message.rebootRequired ? " · redémarrage requis" : ""}.`,
      "success"
    );
  } else if (notApplied) {
    notify(
      "Windows Update",
      `Windows a accepté ${notApplied} mise(s) à jour sans les appliquer (préversion / cumulative optionnelle). Utilisez « Ouvrir Windows Update » pour les installer.`,
      "warning"
    );
  } else {
    notify("Windows Update", `${installed} installée(s), ${failed} en échec. Rapport : ${message.logName || "—"}`, "warning");
  }
  requestWindowsUpdateScan();
  requestHealth();
}

let lastHealthState = null;

function getHealthBreakdown(message) {
  const deductions = message?.deductions || {};
  const updatePenalty = Number(deductions.updates ?? Math.min(32, Number(message?.updateCount || 0) * 4));
  const diskPenalty = Number(deductions.disk ?? (Number(message?.freePercent || 0) < 10 ? 25 : Number(message?.freePercent || 0) < 20 ? 12 : 0));
  const restartPenalty = Number(deductions.restart ?? (message?.pendingRestart ? 8 : 0));
  const scanPenalty = Number(deductions.scan ?? (message?.error ? 35 : 0));
  return [
    {label:"Mises à jour disponibles",value:updatePenalty,detail:updatePenalty?`${message.updateCount} mise(s) à jour · −${updatePenalty} points`:"Applications à jour · aucun point retiré",action:"Installez les mises à jour proposées."},
    {label:"Espace libre sur le disque C:",value:diskPenalty,detail:diskPenalty?`${message.freePercent} % libres · −${diskPenalty} points`:`${message.freePercent} % libres · aucun point retiré`,action:"Libérez de l’espace si Windows manque de place."},
    {label:"Redémarrage du PC",value:restartPenalty,detail:restartPenalty?"Un redémarrage complet est attendu · −8 points":"Aucun redémarrage en attente · aucun point retiré",action:"Enregistrez votre travail puis redémarrez le PC."},
    {label:"Analyse OwlSetup",value:scanPenalty,detail:scanPenalty?"Analyse incomplète · −35 points":"Analyse terminée · aucun point retiré",action:"Actualisez l’analyse ou contrôlez WinGet."}
  ];
}

function renderHealth(message) {
  lastHealthState = {...message};
  $("#refreshHealth").classList.remove("scanning");
  $("#healthScore").textContent = message.score;
  $("#healthRing").style.setProperty("--score", String(Math.max(0, Math.min(100, Number(message.score) || 0))));
  $("#healthStatus").textContent = message.score >= 85 ? "Excellent état" : message.score >= 65 ? "Quelques actions conseillées" : "Entretien recommandé";
  $("#healthRing").classList.remove("good", "warning", "critical");
  $("#healthRing").classList.add(message.score >= 85 ? "good" : message.score >= 65 ? "warning" : "critical");
  // Le compte de mises à jour de la santé/du badge doit EXCLURE les mises à
  // jour masquées (« Ne plus proposer »), comme `renderAvailableUpdates`.
  // `message.updateCount` venu de WinGet est brut : on retire les ignorées.
  const ignoredUpdateIds = getIgnoredUpdateIds();
  const visibleUpdateCount = message.error
    ? 0
    : availableUpdates.filter(update => !ignoredUpdateIds.has(update.id)).length;
  $("#healthUpdates").textContent = message.error ? "Indisponible" : `${visibleUpdateCount} disponible${visibleUpdateCount > 1 ? "s" : ""}`;
  $("#healthUpdatesDetail").textContent = message.error ? "WinGet doit être vérifié" : visibleUpdateCount ? "Nouvelles versions détectées" : "Applications à jour";
  $("#healthDisk").textContent = `${message.freeGb} Go libres`;
  $("#healthDiskDetail").textContent = `${message.freePercent} % de ${message.totalGb} Go`;
  $("#healthRestart").textContent = message.pendingRestart ? "Nécessaire" : "Non requis";
  $("#healthQuarantine").textContent = `${message.quarantineCount} élément${message.quarantineCount > 1 ? "s" : ""}`;
  $("#quarantineNavCount").textContent = message.quarantineCount;
  setNavAlert("#updatesNavBadge", message.error ? "!" : visibleUpdateCount, message.error || visibleUpdateCount > 0);
  setNavAlert("#toolsNavBadge", message.error ? "!" : 0, true);
  if (alphaOneClickPending) renderAlphaOneClickResults(message);
}

function getAlphaPreferences() {
  const defaults={restore:true,scheduleEnabled:false,day:"5",time:"20:00",scheduleRestore:true};
  try { return {...defaults,...JSON.parse(localStorage.getItem(alphaPreferencesStorageKey)||"{}")}; }
  catch { return defaults; }
}

function saveAlphaPreferences(overrides={}) {
  const next={...getAlphaPreferences(),...overrides};
  localStorage.setItem(alphaPreferencesStorageKey,JSON.stringify(next));
  return next;
}

function setAlphaExperienceEnabled(enabled) {
  document.body.classList.toggle("alpha-build",enabled);
  document.querySelectorAll(".alpha-only").forEach(element=>element.classList.toggle("hidden",!enabled));
  if(!enabled)return;
  const preferences=getAlphaPreferences();
  $("#alphaRestoreBeforeFix").checked=Boolean(preferences.restore);
  $("#alphaScheduleEnabled").checked=Boolean(preferences.scheduleEnabled);
  $("#alphaScheduleDay").value=String(preferences.day);
  $("#alphaScheduleTime").value=preferences.time||"20:00";
  $("#alphaScheduleRestore").checked=Boolean(preferences.scheduleRestore);
  renderAlphaScheduleStatus(preferences);
}

function runAlphaOneClickScan() {
  if(currentBuildChannel!=="alpha")return;
  alphaOneClickPending=true;
  const button=$("#alphaOneClickScan");
  button.disabled=true;
  button.classList.add("scanning");
  $("#alphaOneClickStatus").textContent="Analyse de WinGet, du stockage, du redémarrage et de la quarantaine…";
  $("#alphaOneClickResults").classList.add("hidden");
  requestHealth();
}

function renderAlphaOneClickResults(message) {
  alphaOneClickPending=false;
  const button=$("#alphaOneClickScan");
  button.disabled=false;
  button.classList.remove("scanning");
  alphaLastScore=Number(message.score)||0;
  const updateCount=Number(message.updateCount)||0;
  const freePercent=Number(message.freePercent)||0;
  const quarantineCount=Number(message.quarantineCount)||0;
  const plan=[
    {id:"integrity",level:message.error?"advanced":"safe",title:"Sources et intégrité",detail:message.error?"WinGet nécessite un diagnostic avant toute correction.":"Contrôler WinGet et ses sources officielles.",action:"diagnostic",duration:"Moins d’1 min",impact:"Lecture seule",reversible:"Aucune modification",actionable:true,selected:true},
    {id:"updates",level:updateCount>0?"recommended":"safe",title:"Applications",detail:message.error?"Analyse incomplète.":updateCount?`${updateCount} mise(s) à jour sont disponibles.`:"Aucune mise à jour d’application détectée.",action:"updates",duration:updateCount?`${Math.max(3,updateCount*2)} à ${Math.max(8,updateCount*5)} min`:"Aucune",impact:updateCount?`${updateCount} application(s) concernée(s)`:"PC à jour",reversible:"Non annulable après démarrage",irreversible:updateCount>0,actionable:updateCount>0,selected:updateCount>0},
    {id:"cleanup",level:freePercent<20?"recommended":"safe",title:"Espace disque",detail:freePercent<20?`Seulement ${message.freePercent} % sont libres sur C:.`:`${message.freeGb} Go libres : aucun nettoyage urgent.`,action:"cleanup",duration:"2 à 10 min",impact:"Fichiers temporaires recommandés",reversible:"Suppression après confirmation",irreversible:true,actionable:freePercent<20,selected:freePercent<20},
    {id:"restart",level:message.pendingRestart?"recommended":"safe",title:"Redémarrage du PC",detail:message.pendingRestart?"Un redémarrage complet est conseillé avant l’entretien.":"Aucun redémarrage Windows en attente.",action:"restart",duration:"2 à 5 min",impact:"Ferme les applications ouvertes",reversible:"Aucune donnée supprimée",actionable:Boolean(message.pendingRestart),selected:Boolean(message.pendingRestart)},
    {id:"quarantine",level:quarantineCount>0?"advanced":"safe",title:"Quarantaine",detail:quarantineCount>0?`${quarantineCount} élément(s) nécessitent une vérification manuelle.`:"Aucun élément en quarantaine à examiner.",action:"quarantine",duration:"1 à 5 min",impact:"Examen manuel uniquement",reversible:"Restauration disponible",actionable:quarantineCount>0,selected:false}
  ];
  alphaLastPlan=plan;
  alphaSelectedPlanIds=new Set(plan.filter(item=>item.selected&&item.actionable).map(item=>item.id));
  const counts={safe:0,recommended:0,advanced:0};
  plan.forEach(item=>counts[item.level]++);
  $("#alphaSafeCount").textContent=counts.safe;
  $("#alphaRecommendedCount").textContent=counts.recommended;
  $("#alphaAdvancedCount").textContent=counts.advanced;
  $("#alphaResultScore").textContent=`${message.score} / 100`;
  $("#alphaResultList").innerHTML=plan.map(item=>`<article class="${item.level}${item.actionable?" actionable":""}"><label class="alpha-plan-toggle"><input type="checkbox" data-alpha-plan="${item.id}" ${alphaSelectedPlanIds.has(item.id)?"checked":""} ${item.actionable?"":"disabled"}><span>${item.level==="safe"?"✓":item.level==="recommended"?"!":"◇"}</span></label><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small><div class="alpha-plan-meta"><em>Durée : ${escapeHtml(item.duration)}</em><em>Impact : ${escapeHtml(item.impact)}</em><em class="${item.irreversible?"warn":""}">${escapeHtml(item.reversible)}</em></div></div></article>`).join("");
  $("#alphaOneClickStatus").textContent=counts.recommended||counts.advanced?`${counts.recommended+counts.advanced} action(s) à examiner. Rien n’a été modifié.`:"Le PC ne nécessite aucune action urgente.";
  $("#alphaOneClickResults").classList.remove("hidden");
}

function selectedAlphaPlan(levels) {
  return alphaLastPlan.filter(item=>item.actionable&&alphaSelectedPlanIds.has(item.id)&&(!levels||levels.includes(item.level)));
}

function openAlphaReview(mode="recommended") {
  if(!alphaLastPlan.length)return notify("Analyse requise","Lancez d’abord le diagnostic One-Click.");
  alphaReviewMode=mode;
  const levels=mode==="safe"?["safe"]:mode==="advanced"?["safe","recommended","advanced"]:["safe","recommended"];
  const allowed=new Set(alphaLastPlan.filter(item=>item.actionable&&levels.includes(item.level)).map(item=>item.id));
  alphaSelectedPlanIds=new Set([...alphaSelectedPlanIds].filter(id=>allowed.has(id)));
  if(!alphaSelectedPlanIds.size){const first=alphaLastPlan.find(item=>item.actionable&&allowed.has(item.id));if(first)alphaSelectedPlanIds.add(first.id);}
  const titles={safe:"Actions sûres",recommended:"Actions recommandées",advanced:"Mode avancé"};
  $("#alphaReviewMode").textContent=titles[mode].toUpperCase();
  $("#alphaReviewTitle").textContent=`Vérifier · ${titles[mode]}`;
  $("#alphaReviewRestore").checked=$("#alphaRestoreBeforeFix").checked;
  renderAlphaReview(levels);
  $("#alphaReviewModal").classList.remove("hidden");
}

function renderAlphaReview(levels) {
  const items=alphaLastPlan.filter(item=>item.actionable&&levels.includes(item.level));
  $("#alphaReviewSummary").textContent=`${items.length} action(s) disponible(s). Une seule étape contrôlée sera préparée à la fois.`;
  $("#alphaReviewList").innerHTML=items.map(item=>`<label class="alpha-review-row ${item.level}"><input type="checkbox" data-alpha-review-plan="${item.id}" ${alphaSelectedPlanIds.has(item.id)?"checked":""}><span>${item.level==="safe"?"✓":item.level==="recommended"?"!":"◇"}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small><em>${escapeHtml(item.duration)} · ${escapeHtml(item.impact)} · ${escapeHtml(item.reversible)}</em></div></label>`).join("");
  updateAlphaReviewSafety();
}

function updateAlphaReviewSafety() {
  const ids=new Set([...document.querySelectorAll("[data-alpha-review-plan]:checked")].map(input=>input.dataset.alphaReviewPlan));
  alphaSelectedPlanIds=ids;
  const selected=alphaLastPlan.filter(item=>ids.has(item.id));
  $("#alphaIrreversibleWarning").classList.toggle("hidden",!selected.some(item=>item.irreversible));
  $("#confirmAlphaPlan").disabled=!selected.length;
}

function closeAlphaReview() { $("#alphaReviewModal").classList.add("hidden"); }

function recordAlphaPlan(items,status="prepared") {
  let history=[];try{history=JSON.parse(localStorage.getItem(alphaHistoryStorageKey)||"[]");if(!Array.isArray(history))history=[];}catch{history=[];}
  history.unshift({createdAt:new Date().toISOString(),scoreBefore:alphaLastScore,status,actions:items.map(item=>item.id)});
  localStorage.setItem(alphaHistoryStorageKey,JSON.stringify(history.slice(0,20)));
}

function prepareAlphaSelectedActions(items) {
  closeAlphaReview();
  recordAlphaPlan(items);
  const first=items[0];
  $("#alphaOneClickStatus").textContent=`Étape 1/${items.length} préparée : ${first.title}. Les confirmations habituelles restent actives.`;
  if(first.action==="diagnostic"){showView("tools");window.setTimeout(()=>$("#diagnoseWinget")?.click(),100);}
  else if(first.action==="updates"){showView("updates");const visibleForPlan=availableUpdates.filter(update=>!getIgnoredUpdateIds().has(update.id));if(visibleForPlan.length){selectedUpdates=new Set(visibleForPlan.map(update=>update.id));renderAvailableUpdates();window.setTimeout(openUpdateModal,120);}else{window.setTimeout(()=>$("#scanUpdatesBtn")?.click(),120);notify("Vérification des versions","OwlSetup actualise la liste avant de proposer la confirmation.");}}
  else if(first.action==="cleanup"){document.querySelectorAll("[data-cleanup]").forEach(input=>input.checked=["user-temp","windows-temp","delivery"].includes(input.dataset.cleanup));updateCleanupCount();showView("cleanup");window.setTimeout(openCleanupModal,120);}
  else if(first.action==="quarantine")showView("quarantine");
  else if(first.action==="restart")notify("Redémarrage du PC conseillé","Enregistrez votre travail puis redémarrez Windows depuis le menu Démarrer.");
  notify("Plan One-Click préparé",`${first.title} est prêt. ${items.length>1?`${items.length-1} autre(s) étape(s) restent dans le récapitulatif.`:""}`);
}

function confirmAlphaPlan() {
  const items=alphaLastPlan.filter(item=>alphaSelectedPlanIds.has(item.id));
  if(!items.length)return;
  const restore=$("#alphaReviewRestore").checked;
  $("#alphaRestoreBeforeFix").checked=restore;saveAlphaPreferences({restore});
  const modifiesSystem=items.some(item=>["updates","cleanup"].includes(item.action));
  if(restore&&modifiesSystem&&window.chrome?.webview){
    if(pendingProtectedAction)return notify("Protection déjà en cours","Attendez la fin de la création du point de restauration.");
    pendingProtectedAction={action:()=>prepareAlphaSelectedActions(items),label:"le parcours One-Click"};
    closeAlphaReview();notify("Protection en cours","Windows prépare un point de restauration avant la première modification.");
    window.chrome.webview.postMessage({action:"create-restore-point",payload:{}});return;
  }
  prepareAlphaSelectedActions(items);
}

function renderAlphaScheduleStatus(preferences=getAlphaPreferences()) {
  const status=$("#alphaScheduleStatus");
  if(!status)return;
  if(!preferences.scheduleEnabled){status.textContent="Planification désactivée. Aucune tâche Windows n’est créée dans Alpha 2.";return;}
  const days=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  status.textContent=`Préférence locale : chaque ${days[Number(preferences.day)]||"vendredi"} à ${preferences.time}. L’exécution automatique sera activée dans une prochaine Alpha.`;
}

function saveAlphaSchedule() {
  const preferences=saveAlphaPreferences({scheduleEnabled:$("#alphaScheduleEnabled").checked,day:$("#alphaScheduleDay").value,time:$("#alphaScheduleTime").value||"20:00",scheduleRestore:$("#alphaScheduleRestore").checked});
  renderAlphaScheduleStatus(preferences);
  notify("Préparation enregistrée","Cette Alpha conserve le planning localement sans créer de tâche en arrière-plan.");
}

function openHealthDetails() {
  if (!lastHealthState) {
    requestHealth();
    notify("Analyse en cours", "Le détail sera disponible après l’analyse du PC.");
    return;
  }
  $("#healthDetailsScore").textContent = `${lastHealthState.score} / 100`;
  $("#healthDetailsList").innerHTML = getHealthBreakdown(lastHealthState).map(item => `<article class="${item.value ? "penalty" : "healthy"}"><span>${item.value ? `−${item.value}` : "✓"}</span><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small>${item.value ? `<em>${escapeHtml(item.action)}</em>` : ""}</div></article>`).join("");
  $("#healthDetailsModal").classList.remove("hidden");
}

function closeHealthDetails() {
  $("#healthDetailsModal").classList.add("hidden");
}

function requestHealth() {
  if (!window.chrome?.webview) return;
  $("#refreshHealth").classList.add("scanning");
  window.chrome.webview.postMessage({action:"scan-health", payload:{}});
}


// Entretien planifié (lot 6) : pilote une vraie tâche planifiée Windows.
// L'état affiché vient toujours du planificateur Windows, jamais d'une
// préférence locale — si l'utilisateur supprime la tâche depuis Windows,
// l'interface le reflète au prochain affichage des Paramètres.
const scheduleDayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function requestScheduleState() {
  if (!window.chrome?.webview) return;
  window.chrome.webview.postMessage({action:"schedule-state", payload:{}});
}

function setScheduleBusy(busy) {
  const save = $("#saveSchedule"), remove = $("#removeSchedule");
  if (save) { save.disabled = busy; save.textContent = busy ? "Enregistrement…" : "Enregistrer la planification"; }
  if (remove) remove.disabled = busy;
}

function renderScheduleState(message) {
  setScheduleBusy(false);
  const enabled = $("#scheduleEnabled"), remove = $("#removeSchedule"), status = $("#scheduleStatus");
  if (!enabled) return;
  enabled.checked = !!message.exists;
  if (message.exists) {
    if ($("#scheduleAction")) $("#scheduleAction").value = message.action === "update" ? "update" : "check";
    if ($("#scheduleFrequency")) $("#scheduleFrequency").value = message.frequency === "monthly" ? "monthly" : "weekly";
    if ($("#scheduleDay")) $("#scheduleDay").value = String(message.day ?? 5);
    if ($("#scheduleTime")) $("#scheduleTime").value = message.time || "20:00";
  }
  remove?.classList.toggle("hidden", !message.exists);
  if (!status) return;
  if (!message.exists) {
    status.textContent = "Aucune tâche planifiée pour le moment.";
    return;
  }
  const what = message.action === "update" ? "Installation des mises à jour" : "Ouverture d’OwlSetup pour vérifier";
  const when = message.frequency === "monthly" ? "toutes les 4 semaines" : "chaque semaine";
  const day = scheduleDayNames[Number(message.day)] || "";
  status.textContent = `${what} — ${when} le ${day} à ${message.time}.`
    + (message.nextRun ? ` Prochaine exécution : ${message.nextRun}.` : "");
}

function saveSchedule() {
  if (!window.chrome?.webview) return;
  if (!$("#scheduleEnabled").checked) { removeSchedule(); return; }
  setScheduleBusy(true);
  window.chrome.webview.postMessage({action:"schedule-configure", payload:{
    action: $("#scheduleAction").value,
    frequency: $("#scheduleFrequency").value,
    day: Number($("#scheduleDay").value),
    time: $("#scheduleTime").value
  }});
}

function removeSchedule() {
  if (!window.chrome?.webview) return;
  setScheduleBusy(true);
  window.chrome.webview.postMessage({action:"schedule-remove", payload:{}});
}

function requestQuarantine() {
  if (!window.chrome?.webview) return;
  $("#quarantineList").innerHTML = `<div class="quarantine-loading"><span>↻</span> Analyse de la quarantaine...</div>`;
  $("#quarantineEmpty").classList.add("hidden");
  window.chrome.webview.postMessage({action:"scan-quarantine", payload:{}});
}

function renderQuarantine(items) {
  const list = items || [];
  const totalBytes = list.reduce((sum, entry) => sum + (Number(entry.bytes) || 0), 0);
  $("#quarantineCount").textContent = `${list.length} élément${list.length > 1 ? "s" : ""}${totalBytes ? ` · ${formatBytesFr(totalBytes)}` : ""}`;
  setNavAlert("#quarantineNavCount", list.length, false);
  $("#quarantineList").classList.toggle("hidden", list.length === 0);
  $("#quarantineEmpty").classList.toggle("hidden", list.length !== 0);
  const oldCount = list.filter(entry => Number(entry.ageDays) > 30).length;
  const purge = $("#purgeOldQuarantine");
  if (purge) {
    purge.classList.toggle("hidden", oldCount === 0);
    purge.textContent = `Supprimer les ${oldCount} élément(s) de plus de 30 jours`;
  }
  $("#quarantineList").innerHTML = list.map(entry => {
    const meta = [
      escapeHtml(entry.batch),
      `Modifié le ${escapeHtml(entry.modified)}`,
      Number(entry.ageDays) >= 1 ? `il y a ${Number(entry.ageDays)} j` : "aujourd'hui",
      entry.size ? `${escapeHtml(entry.size)}${entry.partial ? " +" : ""}` : ""
    ].filter(Boolean).join(" · ");
    return `<article class="quarantine-item"><span>♲</span><div><strong>${escapeHtml(entry.item)}</strong><small>${meta}</small></div><div class="quarantine-actions"><button class="restore-quarantine" data-quarantine-action="restore" data-batch="${encodeURIComponent(entry.batch)}" data-item="${encodeURIComponent(entry.item)}">↶ Restaurer</button><button class="delete-quarantine" data-quarantine-action="delete" data-batch="${encodeURIComponent(entry.batch)}" data-item="${encodeURIComponent(entry.item)}">× Supprimer</button></div></article>`;
  }).join("");
}

function formatBytesFr(bytes) {
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let value = Number(bytes) || 0, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(unit === 0 ? 0 : value < 10 ? 2 : 1)} ${units[unit]}`;
}

function confirmPurgeQuarantine() {
  if (!window.chrome?.webview) return;
  const overlay = document.createElement("div");
  overlay.className = "quarantine-confirm";
  overlay.innerHTML = `<div><h3>Supprimer les éléments anciens ?</h3><p>Tous les éléments en quarantaine depuis <strong>plus de 30 jours</strong> seront supprimés définitivement. Les éléments plus récents sont conservés.</p><div class="dialog-actions"><button class="secondary-dialog-button" data-confirm-no>Annuler</button><button class="danger-dialog-button" data-confirm-yes>Supprimer les anciens</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("[data-confirm-no]").onclick = () => overlay.remove();
  overlay.querySelector("[data-confirm-yes]").onclick = () => {
    overlay.remove();
    window.chrome.webview.postMessage({ action: "purge-quarantine", payload: { days: 30 } });
  };
}

function confirmQuarantineAction(action, batch, item) {
  const deleting = action === "delete";
  const overlay = document.createElement("div");
  overlay.className = "quarantine-confirm";
  overlay.innerHTML = `<div><h3>${deleting ? "Supprimer définitivement ?" : "Restaurer ce dossier ?"}</h3><p><strong>${escapeHtml(item)}</strong><br>${deleting ? "Cette suppression ne pourra pas être annulée." : "Le dossier sera remis dans son emplacement AppData d'origine."}</p><div class="dialog-actions"><button class="secondary-dialog-button" data-confirm-no>Annuler</button><button class="${deleting ? "danger-dialog-button" : "primary-dialog-button"}" data-confirm-yes>${deleting ? "Supprimer" : "Restaurer"}</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("[data-confirm-no]").onclick = () => overlay.remove();
  overlay.querySelector("[data-confirm-yes]").onclick = () => {
    overlay.remove();
    window.chrome.webview.postMessage({action:`${action}-quarantine`, payload:{batch,item}});
  };
}

function confirmDiskFolderCleanup(path, name) {
  const overlay = document.createElement("div");
  overlay.className = "quarantine-confirm disk-clean-confirm";
  overlay.innerHTML = `<div><div class="disk-clean-confirm-icon"><svg aria-hidden="true"><use href="#tool-safe-clean"/></svg></div><h3>Nettoyer ce cache ?</h3><p><strong>${escapeHtml(name)}</strong><br>Ce dossier sera placé en quarantaine. Il pourra être restauré depuis OwlSetup et aucun autre dossier ne sera touché.</p><div class="disk-clean-path">${escapeHtml(path)}</div><div class="dialog-actions"><button class="secondary-dialog-button" data-confirm-no>Annuler</button><button class="primary-dialog-button" data-confirm-yes>Placer en quarantaine</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("[data-confirm-no]").onclick = () => overlay.remove();
  overlay.querySelector("[data-confirm-yes]").onclick = () => {
    overlay.remove();
    window.chrome?.webview?.postMessage({action:"quarantine-disk-folder", payload:{path}});
  };
}

function generateScript() {
  const picked = apps.filter(app => selected.has(app.id));
  const ids = picked.map(app => `  @{ Id = "${app.id}"; Source = "${app.source || "winget"}" }`).join(",\r\n");
  const script = `# OwlSetup - Installateur Windows\r\n# Généré le ${new Date().toLocaleString("fr-FR")}\r\n# Vérifiez cette liste avant exécution.\r\n\r\n$ErrorActionPreference = "Continue"\r\n$Host.UI.RawUI.WindowTitle = "OwlSetup - Installation"\r\n\r\nif (-not (Get-Command winget -ErrorAction SilentlyContinue)) {\r\n  Write-Host "winget est introuvable. Installez 'App Installer' depuis le Microsoft Store." -ForegroundColor Red\r\n  Read-Host "Appuyez sur Entrée pour quitter"\r\n  exit 1\r\n}\r\n\r\n$packages = @(\r\n${ids}\r\n)\r\n\r\nWrite-Host "OWLSETUP" -ForegroundColor Cyan\r\nWrite-Host "$($packages.Count) élément(s) à installer."\r\n\r\nforeach ($package in $packages) {\r\n  Write-Host "\\nInstallation de $($package.Id)..." -ForegroundColor Yellow\r\n  winget install --id $package.Id --source $package.Source --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity\r\n  if ($LASTEXITCODE -eq 0) { Write-Host "Terminé : $($package.Id)" -ForegroundColor Green }\r\n  else { Write-Host "À vérifier : $($package.Id) (code $LASTEXITCODE)" -ForegroundColor DarkYellow }\r\n}\r\n\r\nWrite-Host "\\nInstallation terminée. Un redémarrage peut être nécessaire." -ForegroundColor Cyan\r\nRead-Host "Appuyez sur Entrée pour fermer"\r\n`;
  const blob = new Blob(["\ufeff", script], {type:"text/plain;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "OwlSetup-Installer.ps1";
  link.click();
  URL.revokeObjectURL(link.href);
}

function generateUpdateScript() {
  const script = `# OwlSetup - Mise a jour complete du PC
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\""
  exit
}

$Host.UI.RawUI.WindowTitle = "OwlSetup - Mise a jour complete"
$logs = Join-Path $env:LOCALAPPDATA "PCSetup\Logs"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$log = Join-Path $logs ("PC-Setup-Update-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
Start-Transcript -Path $log -Force

Write-Host "OWLSETUP - MISE A JOUR COMPLETE" -ForegroundColor Cyan
Write-Host "Ne fermez pas cette fenetre pendant l'operation."

if (Get-Command winget -ErrorAction SilentlyContinue) {
  Write-Host "\\n[1/2] Mise a jour de tous les logiciels..." -ForegroundColor Yellow
  winget source update
  winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
  if ($LASTEXITCODE -eq 0) { Write-Host "Logiciels mis a jour." -ForegroundColor Green }
  else { Write-Host "Certaines applications necessitent peut-etre une action manuelle." -ForegroundColor DarkYellow }
} else {
  Write-Host "winget est absent. Installez App Installer depuis le Microsoft Store." -ForegroundColor Red
}

Write-Host "\\n[2/2] Lancement de Windows Update..." -ForegroundColor Yellow
try {
  $autoUpdate = New-Object -ComObject Microsoft.Update.AutoUpdate
  $autoUpdate.DetectNow()
  Start-Process "ms-settings:windowsupdate"
  Write-Host "Validez les mises a jour et pilotes proposes dans les Parametres." -ForegroundColor Cyan
} catch {
  Write-Host "Impossible de lancer Windows Update." -ForegroundColor Red
}

Write-Host "\\nOperation terminee. Rapport : $log" -ForegroundColor Cyan
Write-Host "Redemarrez le PC si Windows le demande." -ForegroundColor Yellow
Stop-Transcript
Read-Host "Appuyez sur Entree pour fermer"
`;
  const blob = new Blob(["\ufeff", script], {type:"text/plain;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Mettre-a-jour-mon-PC.ps1";
  link.click();
  URL.revokeObjectURL(link.href);
}

function updateCleanupCount() {
  const count = document.querySelectorAll("[data-cleanup]:checked").length;
  $("#cleanupCount").textContent = count;
  $("#cleanupBtn").disabled = count === 0;
}

function generateCleanupScript() {
  const choices = new Set([...document.querySelectorAll("[data-cleanup]:checked")].map(input => input.dataset.cleanup));
  const actions = [];
  if (choices.has("user-temp")) actions.push(`Clear-Folder -Path $env:TEMP -Label "Fichiers temporaires utilisateur"`);
  if (choices.has("windows-temp")) actions.push(`Clear-Folder -Path (Join-Path $env:WINDIR "Temp") -Label "Fichiers temporaires Windows"`);
  if (choices.has("recycle-bin")) actions.push(`Run-Step "Corbeille" { Clear-RecycleBin -Force -ErrorAction Stop }`);
  if (choices.has("delivery")) actions.push(`Run-Step "Cache d'optimisation de livraison" { if (Get-Command Delete-DeliveryOptimizationCache -ErrorAction SilentlyContinue) { Delete-DeliveryOptimizationCache -Force } else { Write-Host "Fonction non disponible sur cette version de Windows." } }`);
  if (choices.has("components")) actions.push(`Run-Step "Anciens composants Windows" { Start-Process dism.exe -ArgumentList "/Online","/Cleanup-Image","/StartComponentCleanup","/NoRestart" -Wait -NoNewWindow }`);

  const script = `# OwlSetup - Liberation d'espace disque
$ErrorActionPreference = "Continue"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\""
  exit
}

$Host.UI.RawUI.WindowTitle = "OwlSetup - Nettoyage du disque"
$dataRoot = Join-Path $env:LOCALAPPDATA "PCSetup"
$logs = Join-Path $dataRoot "Logs"
$quarantineRoot = Join-Path $dataRoot "Quarantine"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
New-Item -ItemType Directory -Path $quarantineRoot -Force | Out-Null
$log = Join-Path $logs ("PC-Setup-Nettoyage-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
Start-Transcript -Path $log -Force

function Run-Step([string]$Label, [scriptblock]$Action) {
  Write-Host "\\nNettoyage : $Label" -ForegroundColor Yellow
  try { & $Action; Write-Host "Termine : $Label" -ForegroundColor Green }
  catch { Write-Host "Ignore : $Label - certains fichiers sont peut-etre utilises." -ForegroundColor DarkYellow }
}

function Clear-Folder([string]$Path, [string]$Label) {
  Run-Step $Label {
    if (Test-Path -LiteralPath $Path) {
      Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Normalize-AppName([string]$Value) {
  return ($Value -replace "[^a-zA-Z0-9]", "").ToLowerInvariant()
}

function Find-AppLeftovers {
  Write-Host "\\nAnalyse des residus d'applications..." -ForegroundColor Yellow
  $uninstallKeys = @(
    "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
    "HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
    "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
  )
  $installed = Get-ItemProperty $uninstallKeys -ErrorAction SilentlyContinue | Where-Object DisplayName | ForEach-Object { Normalize-AppName $_.DisplayName }
  $protected = @("packages","microsoft","temp","crashdumps","d3dscache","history","inetcache","cookies","virtualstore","applicationdata","localsettings","connecteddevicesplatform","comms")
  $roots = @($env:LOCALAPPDATA, $env:APPDATA, $env:PROGRAMDATA) | Select-Object -Unique
  $quarantine = Join-Path $quarantineRoot ("PC-Setup-Quarantaine-" + (Get-Date -Format "yyyy-MM-dd-HHmm"))
  $moved = 0

  foreach ($root in $roots) {
    Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue | Where-Object LastWriteTime -lt (Get-Date).AddDays(-90) | ForEach-Object {
      $folder = $_
      $name = Normalize-AppName $folder.Name
      if ($name.Length -ge 4 -and $name -notin $protected -and -not $folder.Name.StartsWith(".")) {
        $match = $installed | Where-Object { $_ -and ($_.Contains($name) -or $name.Contains($_)) } | Select-Object -First 1
        if (-not $match) {
          Write-Host "\\nCandidat ancien : $($folder.FullName)" -ForegroundColor Cyan
          Write-Host "Derniere modification : $($folder.LastWriteTime)"
          $answer = Read-Host "Deplacer en quarantaine ? Tapez OUI"
          if ($answer -eq "OUI") {
            New-Item -ItemType Directory -Path $quarantine -Force | Out-Null
            $destination = Join-Path $quarantine ((Split-Path $root -Leaf) + "-" + $folder.Name)
            if (Test-Path -LiteralPath $destination) { $destination += "-" + [guid]::NewGuid().ToString("N").Substring(0,6) }
            Move-Item -LiteralPath $folder.FullName -Destination $destination -ErrorAction SilentlyContinue
            $moved++
          }
        }
      }
    }
  }
  Write-Host "Analyse terminee : $moved dossier(s) place(s) en quarantaine." -ForegroundColor Green
  if ($moved -gt 0) { Write-Host "Quarantaine : $quarantine. Gardez-la quelques jours avant de la supprimer." -ForegroundColor Yellow }
}

$drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$before = [math]::Round($drive.FreeSpace / 1GB, 2)
Write-Host "OWLSETUP - LIBERATION D'ESPACE" -ForegroundColor Cyan
Write-Host "Espace libre actuel : $before Go"
Write-Host "Vos documents personnels et le dossier Telechargements ne seront pas touches." -ForegroundColor Cyan
$confirm = Read-Host "Tapez OUI pour commencer"
if ($confirm -ne "OUI") { Stop-Transcript; exit }

${actions.join("\n")}

$drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$after = [math]::Round($drive.FreeSpace / 1GB, 2)
$gained = [math]::Round($after - $before, 2)
Write-Host "\\nNettoyage termine. Espace recupere : $gained Go" -ForegroundColor Cyan
Write-Host "Rapport : $log"
Stop-Transcript
Read-Host "Appuyez sur Entree pour fermer"
`;
  const blob = new Blob(["\ufeff", script], {type:"text/plain;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Liberer-espace-disque.ps1";
  link.click();
  URL.revokeObjectURL(link.href);
}

function notifyAction(title, detail) {
  const toast = $("#toast");
  toast.querySelector("strong").textContent = title;
  $("#toastText").textContent = detail;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

async function runLocalAction(action, payload = {}) {
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage({action, payload});
    notifyAction("Action lancée", "Suivez la progression dans la fenêtre PowerShell.");
    return true;
  }
  const token = new URLSearchParams(location.search).get("token");
  if (!token || !/^https?:$/.test(location.protocol)) {
    showNativeError("Cette action exige l’application OwlSetup. Le mode aperçu ne peut pas lancer une commande système.");
    return false;
  }
  const response = await fetch(`/api/run/${action}`, {
    method: "POST",
    headers: {"Content-Type":"application/json", "X-PCSetup-Token":token},
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Le service local n'a pas pu lancer l'action.");
  notifyAction("Action lancée", result.message || "Suivez la progression dans la fenêtre PowerShell.");
  return true;
}

async function executeWithButton(button, action, payload) {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "<span>◌</span> Lancement...";
  try { await runLocalAction(action, payload); }
  catch (error) { showNativeError(error.message); }
  finally { button.disabled = false; button.innerHTML = original; }
}

function openInstallModal() {
  if(installSubmissionPending){notify("Installation déjà en cours","Suivez sa progression depuis la carte en arrière-plan.");return;}
  if (!selected.size) return;
  $("#modalAppCount").textContent = `${selected.size} logiciel${selected.size > 1 ? "s" : ""}`;
  const portableCount=apps.filter(app=>selected.has(app.id)&&app.portable).length;
  const launchable=selected.size===1&&apps.some(app=>selected.has(app.id)&&app.launchable);
  $("#launchAfterOption").classList.toggle("hidden",!launchable);
  $("#launchAfterInstall").checked=false;
  $("#confirmInstall").innerHTML="<span>▶</span> Commencer l'installation";
  updateInstallLocationControls(false);
  $("#portableInstallNotice").textContent=portableCount
    ? `${portableCount} application(s) portable(s) détectée(s). Le raccourci sera placé selon votre choix, sans déplacer les fichiers gérés par WinGet.`
    : "Les fichiers restent dans le dossier sécurisé choisi par WinGet ou l’éditeur. Certains installateurs peuvent conserver leur propre raccourci.";
  $("#installConfirmView").classList.remove("hidden");
  $("#installProgressView").classList.add("hidden");
  $("#finishInstall").classList.add("hidden");
  $("#installResultActions").classList.add("hidden");
  renderPostInstallVerified([]);
  $("#closeInstallModal").disabled = false;
  $("#installModal").dataset.running = "false";
  $("#installModal").classList.remove("hidden");
  updateExpertPreviews();
  requestInstallPreflight();
}

function renderPostInstallVerified(packageIds = []) {
  const panel=$("#postInstallVerified"),list=$("#postInstallVerifiedList");
  if(!panel||!list)return;
  const verified=[...new Set(packageIds)].map(id=>apps.find(app=>app.id===id)).filter(Boolean);
  panel.classList.toggle("hidden",verified.length===0);
  list.innerHTML=verified.map(app=>`<article><span class="post-install-app-icon${logoSurfaceClass(app)}" style="color:${escapeHtml(app.color)}">${app.logo?`<img src="${escapeHtml(app.logo)}" alt="" data-image-fallback="${escapeHtml(app.icon||"APP")}">`:escapeHtml(app.icon||"APP")}</span><span><strong>${escapeHtml(app.name)}</strong><small>Installation confirmée par WinGet</small></span><button type="button" class="post-install-uninstall" data-post-install-uninstall="${escapeHtml(app.id)}">Désinstaller</button></article>`).join("");
}

function setPreflightState(key, state, detail) {
  const item=document.querySelector(`[data-preflight="${key}"]`);
  if(!item)return;
  item.classList.remove("checking","success","warning","failed");
  item.classList.add(state);
  item.querySelector("i").textContent=state==="success"?"✓":state==="failed"?"×":state==="warning"?"!":"…";
  item.querySelector("small").textContent=detail||"Vérification...";
}

function requestInstallPreflight() {
  const requestId=++installPreflightRequestId;
  const packages=[...selected];
  const button=$("#confirmInstall");
  button.disabled=true;
  $("#preflightTitle").textContent="Analyse de la sélection...";
  ["winget","disk","system","packages"].forEach(key=>setPreflightState(key,"checking","Vérification..."));
  if(!packages.length){$("#preflightTitle").textContent="Aucun logiciel sélectionné";return;}
  if(!window.chrome?.webview){
    $("#preflightTitle").textContent="Diagnostic disponible dans l’application Windows";
    ["winget","disk","system","packages"].forEach(key=>setPreflightState(key,"warning","Mode aperçu"));
    return;
  }
  window.chrome.webview.postMessage({action:"preflight-install",payload:{requestId,packages,apps:apps.filter(app=>selected.has(app.id)).map(app=>({id:app.id,name:app.name,portable:!!app.portable})),locationMode:$("#installLocationMode").value,locationPath:$("#installLocationPath").value}});
}

function updateInstallLocationControls(refreshPreflight=true) {
  const custom=$("#installLocationMode").value==="custom";
  const picker=$("#installLocationPicker");
  picker.classList.toggle("hidden",!custom);
  const hasPath=!!$("#installLocationPath").value.trim();
  picker.classList.toggle("has-error",custom&&!hasPath);
  $("#installLocationNotice").textContent=custom
    ? "OwlSetup crée un sous-dossier par application. Certains installateurs imposent toutefois leur propre emplacement."
    : "WinGet ou l’éditeur choisit l’emplacement le plus compatible.";
  if(custom&&!hasPath)$("#confirmInstall").disabled=true;
  if(refreshPreflight&&$("#installModal")&&!$("#installModal").classList.contains("hidden"))requestInstallPreflight();
}

function chooseInstallLocation() {
  if(!window.chrome?.webview){notify("Dossier d’installation","Le sélecteur de dossier est disponible dans l’application Windows.");return;}
  window.chrome.webview.postMessage({action:"choose-install-location",payload:{currentPath:$("#installLocationPath").value}});
}

function closeInstallModal() {
  if ($("#installModal").dataset.running === "true") { minimizeInstallProgress(); return; }
  $("#installModal").classList.add("hidden");
  $("#backgroundInstall").classList.add("hidden");
}

function beginInstall() {
  if (installSubmissionPending || $("#confirmInstall").disabled) return;
  installSubmissionPending=true;
  $("#installConfirmView").classList.add("hidden");
  $("#installProgressView").classList.remove("hidden");
  $("#closeInstallModal").disabled = false;
  $("#installModal").dataset.running = "true";
  $("#progressTitle").textContent = "Préparation de l'installation";
  $("#progressDetail").textContent = "Connexion au gestionnaire winget";
  $("#progressPercent").textContent = "0%";
  $("#progressBar").style.width = "0%";
  $("#currentPackage").textContent = "Initialisation...";
  $("#packageResult").textContent = "EN ATTENTE";
  $("#progressSummary").textContent = "Ne fermez pas OwlSetup pendant l'installation.";
  $("#installResultActions").classList.add("hidden");
  $("#installBackgroundActions").classList.remove("hidden");
  lastFailedInstallPackages=[];
  currentInstallRun = `install-${Date.now()}`;
  setBackgroundInstall("Préparation de l'installation", `${selected.size} logiciel(s) dans la file`, 0);
  const selectedApps=apps.filter(app=>selected.has(app.id)).map(app=>({id:app.id,name:app.name,portable:!!app.portable}));
  setActiveOperation("installation","Installation de logiciels",{packages:[...selected]});
  const installButton=$("#confirmInstall");
  installButton.disabled=true;
  installButton.innerHTML="<span>◌</span> Installation lancée…";
  runLocalAction("install", {packages:[...selected],apps:selectedApps,shortcut:$("#installShortcutLocation").value,launchAfter:$("#launchAfterInstall").checked,locationMode:$("#installLocationMode").value,locationPath:$("#installLocationPath").value}).catch(error=>{
    installSubmissionPending=false;
    installButton.disabled=false;
    installButton.innerHTML="<span>▶</span> Commencer l'installation";
    showNativeError(error.message);
  });
  window.setTimeout(minimizeInstallProgress, 450);
}

function openUpdateModal() {
  if (!selectedUpdates.size) return;
  $("#updateModalCount").textContent = `${selectedUpdates.size} application${selectedUpdates.size > 1 ? "s" : ""}`;
  $("#updateConfirmView").classList.remove("hidden");
  $("#updateProgressView").classList.add("hidden");
  $("#updateResultActions").classList.add("hidden");
  $("#reportUpdateFailure").classList.add("hidden");
  $("#closeUpdateBlocker").classList.add("hidden");
  $("#forceCloseUpdateBlocker").classList.add("hidden");
  $("#updateBlockerWarning").classList.add("hidden");
  lastUpdateIssue=null;
  $("#closeUpdateModal").disabled = false;
  $("#updateModal").dataset.running = "false";
  $("#updateModal").classList.remove("hidden");
  updateExpertPreviews();
}

function closeUpdateModal() {
  if ($("#updateModal").dataset.running === "true") { minimizeUpdateProgress(); return; }
  $("#updateModal").classList.add("hidden");
  $("#backgroundUpdate").classList.add("hidden");
}

function beginUpdate() {
  if (!window.chrome?.webview) return;
  $("#updateConfirmView").classList.add("hidden");
  $("#updateProgressView").classList.remove("hidden");
  $("#updateResultActions").classList.add("hidden");
  $("#closeUpdateModal").disabled = true;
  $("#updateModal").dataset.running = "true";
  $("#updateProgressTitle").textContent = "Préparation de la mise à jour";
  $("#updateProgressDetail").textContent = "Connexion aux services Windows";
  $("#updateProgressPercent").textContent = "0%";
  $("#updateProgressBar").style.width = "0%";
  $("#updateSummary").textContent = "Ne fermez pas OwlSetup pendant la mise à jour.";
  document.querySelectorAll("[data-update-step]").forEach(step => step.classList.remove("active", "done"));
  setActiveOperation("update","Mise à jour des applications",{packages:[...selectedUpdates]});
  setBackgroundUpdate("Préparation de la mise à jour", `${selectedUpdates.size} application(s) sélectionnée(s)`, 0);
  window.chrome.webview.postMessage({action:"update", payload:{packages:[...selectedUpdates]}});
  window.setTimeout(minimizeUpdateProgress, 450);
}

function showUpdateStage(stage) {
  const order = ["sources", "applications", "windows"];
  const current = order.indexOf(stage);
  document.querySelectorAll("[data-update-step]").forEach(step => {
    const index = order.indexOf(step.dataset.updateStep);
    step.classList.toggle("active", index === current);
    step.classList.toggle("done", index < current);
  });
}

function openCleanupModal() {
  pendingCleanupChoices = [...document.querySelectorAll("[data-cleanup]:checked")].map(input => input.dataset.cleanup);
  if (!pendingCleanupChoices.length) return;
  const count = pendingCleanupChoices.length;
  $("#cleanupModalCount").textContent = `${count} zone${count > 1 ? "s" : ""}`;
  $("#cleanupAnalysisTitle").textContent = "Analyse en cours...";
  $("#cleanupModalDetail").textContent = "Calcul de l'espace récupérable sans suppression";
  $("#cleanupAnalysisList").innerHTML = `<div class="analysis-loading"><span>↻</span> Analyse des dossiers sélectionnés...</div>`;
  $("#protectedFolders").classList.add("hidden");
  $("#confirmCleanup").disabled = true;
  $("#cleanupConfirmView").classList.remove("hidden");
  $("#cleanupProgressView").classList.add("hidden");
  $("#cleanupResultCard").classList.add("hidden");
  $("#cleanupCurrentZone").closest(".cleanup-current-zone").classList.remove("hidden");
  $("#finishCleanup").classList.add("hidden");
  $("#closeCleanupModal").disabled = false;
  $("#cleanupModal").dataset.running = "false";
  $("#cleanupModal").classList.remove("hidden");
  if (window.chrome?.webview) window.chrome.webview.postMessage({action:"analyze-cleanup", payload:{choices:pendingCleanupChoices}});
}

function openRepairModal(id) {
  const app = apps.find(item => item.id === id);
  if (!app) return;
  pendingRepairId = id;
  $("#repairAppName").textContent = app.name;
  $("#repairConfirmView").classList.remove("hidden");
  $("#repairProgressView").classList.add("hidden");
  $("#finishRepair").classList.add("hidden");
  $("#closeRepairModal").disabled = false;
  $("#repairModal").dataset.running = "false";
  $("#repairModal").classList.remove("hidden");
}

function closeRepairModal() {
  if ($("#repairModal").dataset.running === "true") return;
  $("#repairModal").classList.add("hidden");
  pendingRepairId = null;
}

function beginRepair() {
  if (!pendingRepairId || !window.chrome?.webview) return;
  $("#repairConfirmView").classList.add("hidden");
  $("#repairProgressView").classList.remove("hidden");
  $("#closeRepairModal").disabled = true;
  $("#repairModal").dataset.running = "true";
  $("#repairProgressBar").style.width = "35%";
  window.chrome.webview.postMessage({action:"repair", payload:{id:pendingRepairId}});
}

function exportConfiguration() {
  if (!window.chrome?.webview) return;
  const cleanup = [...document.querySelectorAll("[data-cleanup]:checked")].map(input => input.dataset.cleanup);
  window.chrome.webview.postMessage({action:"export-config", payload:{selected:[...selected], cleanup, preferences:collectPreferences()}});
}

function importConfiguration() {
  if (!window.chrome?.webview) return;
  window.chrome.webview.postMessage({action:"import-config", payload:{}});
}

function closeCleanupModal() {
  if ($("#cleanupModal").dataset.running === "true") return;
  $("#cleanupModal").classList.add("hidden");
  pendingCleanupChoices = [];
}

function beginCleanup() {
  if (!pendingCleanupChoices.length || !window.chrome?.webview) return;
  $("#cleanupConfirmView").classList.add("hidden");
  $("#cleanupProgressView").classList.remove("hidden");
  $("#closeCleanupModal").disabled = true;
  $("#cleanupModal").dataset.running = "true";
  $("#cleanupProgressTitle").textContent = "Préparation du nettoyage";
  $("#cleanupProgressDetail").textContent = `${pendingCleanupChoices.length} zone(s) dans la file`;
  $("#cleanupProgressPercent").textContent = "0%";
  $("#cleanupProgressBar").style.width = "0%";
  $("#cleanupCurrentZone").textContent = "Initialisation...";
  $("#cleanupZonePosition").textContent = "—";
  $("#cleanupSummaryText").textContent = "Ne fermez pas OwlSetup pendant le nettoyage.";
  setActiveOperation("cleanup","Nettoyage du disque",{choices:[...pendingCleanupChoices]});
  window.chrome.webview.postMessage({action:"cleanup", payload:{choices:pendingCleanupChoices}});
}

function openUninstallModal(id) {
  const app = apps.find(item => item.id === id);
  if (!app) return;
  pendingUninstallId = id;
  $("#uninstallAppName").textContent = app.name;
  $("#uninstallSimulationStatus").textContent = "Vérification du paquet et de ses accès...";
  $("#uninstallPreviewPackage").textContent = id;
  $("#uninstallPreviewScope").textContent = "Analyse en cours";
  $("#uninstallPreviewShortcuts").textContent = "Analyse en cours";
  $("#confirmUninstall").disabled = true;
  $("#uninstallConfirmView").classList.remove("hidden");
  $("#uninstallProgressView").classList.add("hidden");
  $("#finishUninstall").classList.add("hidden");
  $("#uninstallResiduePanel").classList.add("hidden");
  $("#uninstallCleanupResidues").checked=true;
  $("#quarantineUninstallResidues").disabled=false;
  pendingUninstallResidueToken="";
  $("#closeUninstallModal").disabled = false;
  $("#uninstallModal").dataset.running = "false";
  $("#uninstallModal").classList.remove("hidden");
  if(window.chrome?.webview)window.chrome.webview.postMessage({action:"simulate-uninstall",payload:{id,name:app.name}});
}

function closeUninstallModal() {
  if ($("#uninstallModal").dataset.running === "true") { minimizeUninstallProgress("single"); return; }
  $("#uninstallModal").classList.add("hidden");
  $("#backgroundUninstall").classList.add("hidden");
  pendingUninstallId = null;
  pendingUninstallResidueToken = "";
  if (activeUninstallMode === "single") activeUninstallMode = "";
}

function beginUninstall() {
  if (!pendingUninstallId || !window.chrome?.webview) return;
  $("#uninstallConfirmView").classList.add("hidden");
  $("#uninstallProgressView").classList.remove("hidden");
  $("#closeUninstallModal").disabled = false;
  $("#uninstallModal").dataset.running = "true";
  $("#uninstallProgressBar").style.width = "25%";
  const app=apps.find(item=>item.id===pendingUninstallId);
  $("#uninstallProgressTitle").textContent = "Préparation de la désinstallation";
  $("#uninstallProgressDetail").textContent = app?.name || pendingUninstallId;
  $("#uninstallBackgroundActions").classList.remove("hidden");
  activeUninstallMode = "single";
  currentUninstallRun = `uninstall-${Date.now()}`;
  setBackgroundUninstall(`Préparation de ${app?.name || pendingUninstallId}`, "Connexion à WinGet", 25);
  window.chrome.webview.postMessage({action:"uninstall", payload:{id:pendingUninstallId,name:app?.name||pendingUninstallId,scanResidues:$("#uninstallCleanupResidues").checked}});
  window.setTimeout(() => minimizeUninstallProgress("single"), 450);
}

function openAppUpdateModal() {
  const modal = $("#appUpdateModal");
  modal.dataset.running = "false";
  modal.classList.remove("hidden");
  $("#installAppUpdate").classList.add("hidden");
  $("#appUpdateStateIcon").textContent = "↻";
  $("#appUpdateStateIcon").classList.add("spinning");
  $("#appUpdateStateTitle").textContent = "Recherche d'une nouvelle version";
  $("#appUpdateStateDetail").textContent = "Connexion aux Releases GitHub officielles...";
  $("#appCurrentVersion").textContent = "—";
  $("#appLatestVersion").textContent = "—";
  if (window.chrome?.webview) window.chrome.webview.postMessage({action:"check-app-update", payload:{prerelease:prereleaseOptIn()}});
  else {
    $("#appUpdateStateIcon").classList.remove("spinning");
    $("#appUpdateStateTitle").textContent = "Disponible dans l'application Windows";
    $("#appUpdateStateDetail").textContent = "La démonstration web ne peut pas mettre à jour l'exécutable.";
  }
}

function closeAppUpdateModal() {
  if ($("#appUpdateModal").dataset.running === "true") return;
  $("#appUpdateModal").classList.add("hidden");
}

function beginAppUpdate() {
  if (!window.chrome?.webview) {
    window.open(appUpdateReleasePage, "_blank", "noopener");
    return;
  }
  const modal = $("#appUpdateModal");
  modal.dataset.running = "true";
  $("#installAppUpdate").disabled = true;
  $("#closeAppUpdate").disabled = true;
  $("#cancelAppUpdate").disabled = true;
  const icon = $("#appUpdateStateIcon");
  icon.classList.add("spinning");
  icon.textContent = "↻";
  $("#appUpdateStateTitle").textContent = "Téléchargement sécurisé";
  $("#appUpdateStateDetail").textContent =
    "Téléchargement puis vérification de l'empreinte SHA-256…";
  window.chrome.webview.postMessage({ action: "install-app-update", payload: { prerelease: prereleaseOptIn() } });
}

function renderAppUpdateState(message) {
  const icon = $("#appUpdateStateIcon");
  const install = $("#installAppUpdate");
  const notification = $("#appUpdateNotification");
  $("#appCurrentVersion").textContent = message.current || "—";
  if (message.latest) $("#appLatestVersion").textContent = message.latest;
  icon.classList.toggle("spinning", ["checking", "downloading"].includes(message.status));
  install.classList.add("hidden");
  if (message.status === "checking") {
    $("#appUpdateStateTitle").textContent = "Recherche d'une nouvelle version";
    $("#appUpdateStateDetail").textContent = "Lecture de la dernière Release GitHub...";
  } else if (message.status === "available") {
    const officialRelease = "https://github.com/OwlNetGeekFR/OwlSetup/releases/";
    appUpdateReleasePage = typeof message.page === "string" && message.page.startsWith(officialRelease) ? message.page : `${officialRelease}latest`;
    notification.title = `${message.latest} disponible · ouvrir les notifications`;
    notification.setAttribute("aria-label", `Mise à jour OwlSetup ${message.latest} disponible`);
    if (notification.dataset.notified !== message.latest) {
      notification.dataset.notified = message.latest;
      notifyAction("Mise à jour disponible", `OwlSetup ${message.latest} est disponible.`);
      addNotification({key:`owlsetup-update-${message.latest}`, title:`OwlSetup ${message.latest} est disponible`, detail:"Ouvrez « Mettre OwlSetup à jour » : téléchargement vérifié SHA-256 puis redémarrage.", kind:"warning", action:"self-update", symbol:"↻"});
    }
    icon.textContent = "↓";
    $("#appUpdateStateTitle").textContent = `OwlSetup ${message.latest} est disponible`;
    $("#appUpdateStateDetail").textContent = "« Installer » télécharge la version vérifiée (SHA-256) depuis GitHub, puis OwlSetup redémarre.";
    install.classList.remove("hidden"); install.disabled = false;
  } else if (message.status === "current") {
    notification.title = "Notifications";
    notification.setAttribute("aria-label", "Ouvrir les notifications");
    icon.textContent = "✓";
    $("#appLatestVersion").textContent = message.latest || message.current;
    $("#appUpdateStateTitle").textContent = "OwlSetup est à jour";
    $("#appUpdateStateDetail").textContent = "Vous utilisez déjà la dernière version disponible.";
  } else if (message.status === "beta") {
    $("#appUpdateModal").dataset.running = "false";
    $("#closeAppUpdate").disabled = false;
    $("#cancelAppUpdate").disabled = false;
    install.disabled = true;
    notification.title = "Version bêta locale";
    notification.setAttribute("aria-label", "Version bêta locale");
    icon.classList.remove("spinning");
    icon.textContent = "β";
    $("#appLatestVersion").textContent = "Publication désactivée";
    $("#appUpdateStateTitle").textContent = "Version bêta locale";
    $("#appUpdateStateDetail").textContent = "Cette construction sert aux tests et ne sera pas remplacée automatiquement.";
  } else if (message.status === "downloading") {
    $("#appUpdateModal").dataset.running = "true";
    $("#installAppUpdate").disabled = true;
    $("#closeAppUpdate").disabled = true;
    $("#cancelAppUpdate").disabled = true;
    icon.textContent = "↻";
    $("#appUpdateStateTitle").textContent = "Téléchargement sécurisé";
    $("#appUpdateStateDetail").textContent = "Téléchargement puis vérification de l'empreinte SHA-256…";
  } else if (message.status === "restarting") {
    icon.classList.remove("spinning"); icon.textContent = "✓";
    $("#appLatestVersion").textContent = message.latest || "—";
    $("#appUpdateStateTitle").textContent = "Mise à jour vérifiée";
    $("#appUpdateStateDetail").textContent = "OwlSetup va redémarrer avec la nouvelle version.";
  } else if (message.status === "error") {
    $("#appUpdateModal").dataset.running = "false";
    $("#closeAppUpdate").disabled = false;
    $("#cancelAppUpdate").disabled = false;
    icon.classList.remove("spinning"); icon.textContent = "!";
    $("#appUpdateStateTitle").textContent = "Mise à jour impossible";
    $("#appUpdateStateDetail").textContent = message.message || "Vérifiez votre connexion Internet.";
  }
}

function handleInstallMessage(message) {
  if(message.type==="install-location-selected"){
    $("#installLocationMode").value="custom";
    $("#installLocationPath").value=message.path||"";
    updateInstallLocationControls(true);
    return;
  }
  if (!message) return;
  if (message.type === "tool-progress") {
    setToolProgress(message.tool,message.percent,message.status);
    return;
  }
  if (message.type === "portable-access-ready") {
    const toastKey=`portable-ready-${message.id||message.name}`;
    if(!shownSessionToasts.has(toastKey)){
      shownSessionToasts.add(toastKey);
      notify(`${message.name} est prêt`,"Un raccourci a été ajouté au menu Démarrer.");
    }
    return;
  }
  if (message.type === "security-status") {
    lastSecurityStatus=message;
    const mark=(selector,state,good,bad,severity="warning")=>{const element=$(selector);element.textContent=state?good:bad;element.classList.toggle("security-good",!!state);element.classList.toggle("security-warning",!state&&severity==="warning");element.classList.toggle("security-state-critical",!state&&severity==="critical");element.classList.toggle("security-state-info",!state&&severity==="info");};
    const antivirusActive=message.antivirusActive??message.defenderActive;
    const protectedCore=message.integrity&&message.originLocked&&message.standardUser&&antivirusActive&&message.firewallActive&&message.antivirusDetermined!==false&&message.firewallDetermined!==false;
    const critical=!message.integrity||message.signatureState==="invalid";
    $("#securityHeadline").textContent=critical?"Une anomalie critique a été détectée":protectedCore?"Protections principales actives":"Des contrôles demandent votre attention";
    $("#securityVersion").textContent=`OwlSetup ${message.version}${message.checkedAt?` · vérifié à ${message.checkedAt}`:""}`;
    $("#securityElevation").textContent=message.standardUser?message.elevation:"Interface actuellement administrateur";
    const score=Math.max(0,Math.min(100,Number(message.score)||0));
    $("#securityScore").textContent=String(score);
    $("#securityGauge").style.setProperty("--score",String(score));
    mark("#securityIntegrity",message.integrity,"Intégrité vérifiée","Interface modifiée","critical");
    mark("#securityOrigin",message.originLocked,"Origine verrouillée","Origine non verrouillée");
    const signatureGood=message.signatureState==="valid";
    const signatureText=message.signatureState==="unsigned-beta"?"Bêta locale non signée":message.signed?"Signature non approuvée":"Exécutable non signé";
    mark("#securitySignature",signatureGood,"Signature approuvée",signatureText,message.signatureState==="invalid"?"critical":"info");
    $("#securitySigner").textContent=message.signer;
    mark("#securityWinget",message.winget!=="Indisponible"&&!message.wingetOutdated,message.winget,message.winget==="Indisponible"?"WinGet indisponible":`${message.winget} · ancien`);
    mark("#securityWebView",message.webview!=="Indisponible"&&!message.webviewOutdated,message.webview,message.webview==="Indisponible"?"WebView2 indisponible":`${message.webview} · ancien`);
    mark("#securityWorker",message.secureRuntime,"Dossier protégé actif","Créé au premier nettoyage");
    const antivirusUnknown=message.antivirusDetermined===false;
    const firewallUnknown=message.firewallDetermined===false;
    if(antivirusUnknown){const e=$("#securityDefender");e.textContent="État indéterminé";e.classList.remove("security-good","security-warning","security-state-critical");e.classList.add("security-state-info");}
    else mark("#securityDefender",antivirusActive,"Protection active","Protection à vérifier");
    if(firewallUnknown){const e=$("#securityFirewall");e.textContent="État indéterminé";e.classList.remove("security-good","security-warning","security-state-critical");e.classList.add("security-state-info");}
    else mark("#securityFirewall",message.firewallActive,"Profils actifs","Pare-feu à vérifier");
    $("#securityAntivirusProvider").textContent=message.antivirusManagedByWsc?"État agrégé par Sécurité Windows":antivirusUnknown?"État non lisible sur ce PC":"État Defender de secours";
    $("#securityFirewallProvider").textContent=message.firewallManagedByWsc?"État agrégé par Sécurité Windows":firewallUnknown?"État non lisible sur ce PC":"Profils Windows de secours";
    mark("#securityPrivileges",message.standardUser,"Droits standards","Interface administrateur");
    $("#securityLogs").textContent=`${message.logs} rapport(s) local(aux). Aucun contenu n’est transmis automatiquement.`;
    renderSecurityRecommendations(message.recommendations||[]);
    if(activeSecurityDetail)showSecurityDetail(activeSecurityDetail);
    const securityWarnings=(message.recommendations||[]).filter(item=>item.severity!=="success"&&item.severity!=="info").length;
    setNavAlert("#securityNavBadge", securityWarnings, securityWarnings > 0);
    const refresh=$("#refreshSecurity");refresh.disabled=false;refresh.textContent="Vérifier maintenant";
    return;
  }
  if (message.type === "uninstall-simulation") {
    if(message.id!==pendingUninstallId)return;
    $("#uninstallSimulationStatus").textContent=message.installed?"Aperçu terminé · valable 5 minutes":"Paquet non détecté par WinGet";
    $("#uninstallPreviewPackage").textContent=message.version?`${message.id} · ${message.version}`:message.id;
    $("#uninstallPreviewScope").textContent=message.scope;
    $("#uninstallPreviewShortcuts").textContent=`${message.shortcuts} raccourci(s)`;
    $("#confirmUninstall").disabled=!message.installed;
    return;
  }
  if (message.type === "uninstall-simulation-error") {
    if(message.id!==pendingUninstallId)return;
    $("#uninstallSimulationStatus").textContent=`Simulation impossible : ${message.message}`;
    $("#uninstallPreviewScope").textContent="À vérifier";
    $("#uninstallPreviewShortcuts").textContent="—";
    $("#confirmUninstall").disabled=true;
    return;
  }
  if (message.type === "batch-uninstall-simulation") {
    clearTimeout(batchUninstallSimulationTimer);
    setBatchUninstallVerificationPending(false);
    openBatchUninstallModal(message.packages || []);
    if((message.unresolved||[]).length)notify("Sélection vérifiée", `${message.unresolved.length} application(s) non confirmée(s) par WinGet ont été écartées.`);
    return;
  }
  if (message.type === "batch-uninstall-simulation-error") {
    clearTimeout(batchUninstallSimulationTimer);
    setBatchUninstallVerificationPending(false);
    notify("Désinstallation impossible", message.message || "WinGet n'a confirmé aucun paquet unique.");
    return;
  }
  if (message.type === "winget-diagnostic") {
    $("#wingetDiagnosticText").textContent = `${message.message}${message.version ? ` (${message.version})` : ""}`;
    $("#wingetDiagnosticText").classList.toggle("tool-success", message.available && message.sources);
    setNavAlert("#toolsNavBadge", message.available && message.sources ? 0 : "!", true);
    return;
  }
  if (message.type === "winget-search-complete") {
    const responseQuery=String(message.query||"").trim();
    if(responseQuery!==searchTerm.trim())return;
    extendedWingetPending=false;
    extendedWingetQuery=responseQuery||extendedWingetQuery;
    extendedWingetResults=message.success&&Array.isArray(message.items)?message.items.filter(item=>item&&/^[A-Za-z0-9][A-Za-z0-9._+\-]{1,127}$/.test(String(item.id||""))).slice(0,12):[];
    renderExtendedWingetSearch();
    if(!message.success){const state=$("#wingetSearchState");state.classList.remove("hidden");state.classList.add("error");state.textContent=message.message||extendedWingetText("La recherche WinGet n’a pas abouti.","The WinGet search did not complete.");}
    return;
  }
  if (message.type === "winget-repair-start") {
    $("#wingetDiagnosticText").textContent = "Réenregistrement d'App Installer et actualisation des sources...";
    return;
  }
  if (message.type === "winget-repair-complete") {
    const base = message.success ? "WinGet a été réparé et ses sources ont été actualisées." : `Réparation incomplète (code ${message.code}). Consultez ${message.logName}.`;
    $("#wingetDiagnosticText").textContent = message.sourcesNote ? `${base} ${message.sourcesNote}` : base;
    notify(message.success ? "WinGet réparé" : "Réparation à vérifier", $("#wingetDiagnosticText").textContent, message.success ? "success" : "error");
    setNavAlert("#toolsNavBadge", message.success ? 0 : "!", true);
    return;
  }
  if (message.type === "restore-point-start") {
    $("#restorePointText").textContent = "Création du point de restauration...";
    return;
  }
  if (message.type === "restore-point-complete") {
    const reason=message.reason||(Number(message.code)===1223?"uac-cancelled":"system-protection-disabled");
    const recentText=`Un point de restauration récent existe déjà (créé il y a environ ${Number(message.recentHours)||"<24"} h) et protège déjà votre PC. Windows limite la création à un point par 24 h.`;
    const failureText=reason==="uac-cancelled"
      ? "Création annulée : la demande administrateur Windows a été refusée ou fermée."
      : reason==="not-created"
        ? "Windows n’a pas pu créer de point de restauration. Ouvrez la protection du système pour vérifier qu’elle est activée sur le lecteur C:."
        : "Création impossible : vérifiez que la protection du système est activée sur le lecteur C:.";
    const okText = reason==="recent" ? recentText : "Point de restauration créé avec succès.";
    $("#restorePointText").textContent = message.success ? okText : failureText;
    notify(message.success ? (reason==="recent" ? "Point récent déjà présent" : "Point créé") : "Protection non disponible", $("#restorePointText").textContent, message.success ? "success" : "error");
    if(pendingProtectedAction){
      const pending=pendingProtectedAction; pendingProtectedAction=null;
      if(message.success){ notify("Protection en place",`${reason==="recent"?"Un point récent protège déjà votre PC avant":"Le point a été créé avant"} ${pending.label}.`); window.setTimeout(pending.action,150); }
      else {
        notify("Opération arrêtée en sécurité","Aucune modification n’a été effectuée. Ouvrez l’aide pour choisir la suite.","warning");
        openRestoreProtectionDialog(reason);
      }
    } else if(!message.success) {
      openRestoreProtectionDialog(reason);
    }
    return;
  }
  if (message.type === "history-state") {
    historyItems=message.items || []; renderHistoryItems();
    return;
  }
  if(message.type === "history-pruned"){
    const deleted=Number(message.deleted)||0;
    notify(deleted?"Conservation appliquée":"Aucun ancien rapport",deleted?`${deleted} fichier(s) plus ancien(s) que ${message.days} jours ont été supprimé(s).`:`Tous les rapports ont moins de ${message.days} jours. Pour tout supprimer, utilisez « Effacer tout ».`);
    requestHistory(); requestSecurityStatus(); return;
  }
  if(message.type === "history-cleared"){
    closeClearHistoryDialog();
    notify("Historique effacé",`${Number(message.deleted)||0} fichier(s) local(aux) supprimé(s).`);
    historyItems=[]; renderHistoryItems(); requestHistory(); requestSecurityStatus(); return;
  }
  if(message.type === "security-exported"){ notify("Diagnostic exporté",`${message.name} ne contient ni nom d’utilisateur, ni document personnel, ni contenu de journal.`); return; }
  if(message.type === "feedback-followup-state"){ renderFeedbackFollowups(message.items || []); return; }
  if(message.type === "feedback-followup-error"){ $("#feedbackFollowupList").innerHTML=`<small>Vérification impossible pour le moment.</small>`; return; }
  if(message.type === "support-exported"){ notify("Archive créée",`Le fichier ${message.name} contient uniquement les éléments anonymisés relus.`); return; }
  if(message.type === "self-diagnostic-result"){
    $("#runSelfDiagnostic").disabled=false; $("#runSelfDiagnostic").textContent="Relancer les tests";
    $("#selfDiagnosticSummary").textContent=message.success?`Tous les contrôles sont réussis · ${message.checkedAt}`:`Une vérification demande votre attention · ${message.checkedAt}`;
    $("#selfDiagnosticResults").innerHTML=(message.tests||[]).map(test=>`<article class="${test.success?"success":"failed"}"><span>${test.success?"✓":"!"}</span><div><strong>${escapeHtml(test.name)}</strong><small>${escapeHtml(test.detail)}</small></div></article>`).join(""); return;
  }
  if (message.type === "report-data") {
    renderReportViewer(message);
    return;
  }
  if (message.type === "log-data") {
    renderLogViewer(message);
    return;
  }
  if (message.type === "history-error") {
    $("#operationHistory").innerHTML = `<p class="tool-empty">${escapeHtml(message.message)}</p>`; return;
  }
  if (message.type === "startup-state") {
    $("#startupList").innerHTML = (message.items || []).length ? message.items.map(item => `<article><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.source)} · ${escapeHtml(item.command)}</small></div></article>`).join("") : `<p class="tool-empty">Aucun élément de démarrage détecté.</p>`;
    return;
  }
  if (message.type === "disk-scan-start") {
    setToolProgress("disk",5,"Préparation de l'analyse...");
    $("#diskList").innerHTML = `<p class="tool-empty">Analyse en cours, cela peut prendre quelques instants...</p>`; return;
  }
  if (message.type === "disk-scan-state") {
    const max=Math.max(...(message.items || []).map(item=>Number(item.bytes)),1);
    $("#diskList").innerHTML = (message.items || []).map(item => {
      const path=encodeURIComponent(item.path);
      const name=encodeURIComponent(item.name);
      const fileNote=item.partial?`${Number(item.files)||0}+ fichiers · mesure partielle`:`${Number(item.files)||0} fichiers`;
      return `<article class="disk-item"><div class="disk-item-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.path)} · ${fileNote}</small><i style="width:${Math.min(100,Math.max(2,Number(item.bytes)/max*100))}%"></i></div><div class="disk-item-side"><b>${escapeHtml(item.size)}${item.partial?" +":""}</b><div class="disk-item-actions"><button data-disk-action="open" data-disk-path="${path}" title="Ouvrir ce dossier dans l'Explorateur"><svg aria-hidden="true"><use href="#tool-open-folder"/></svg><span>Ouvrir</span></button>${item.canClean?`<button class="disk-clean-button" data-disk-action="clean" data-disk-path="${path}" data-disk-name="${name}" title="Placer ce cache en quarantaine réversible"><svg aria-hidden="true"><use href="#tool-safe-clean"/></svg><span>Nettoyer</span></button>`:""}</div></div></article>`;
    }).join("");
    return;
  }
  if (message.type === "disk-folder-action") {
    notify(message.success ? "Cache mis en quarantaine" : "Action impossible", message.message);
    if (message.success) {
      requestQuarantine();
      window.chrome?.webview?.postMessage({action:"scan-disk",payload:{}});
    }
    return;
  }
  if (message.type === "disk-scan-error") {
    $("#diskList").innerHTML = `<p class="tool-empty">${escapeHtml(message.message)}</p>`; return;
  }
  if (message.type === "batch-uninstall-start") {
    $("#batchUninstallProgressTitle").textContent="Désinstallation en cours";
    $("#batchUninstallProgressDetail").textContent=`${message.total} logiciel(s) dans la file`;
    setBackgroundUninstall("Désinstallation en cours", `${message.total} logiciel(s) dans la file`, 4);
    return;
  }
  if (message.type === "batch-uninstall-progress") {
    const percent=Math.max(5,Math.round(((message.index-1)/Math.max(message.total,1))*100));
    const app=apps.find(item=>item.id===message.id);
    $("#batchUninstallProgressBar").style.width=`${percent}%`;
    $("#batchUninstallProgressPercent").textContent=`${percent}%`;
    $("#batchUninstallCurrent").textContent=app?.name||message.id;
    $("#batchUninstallPosition").textContent=`${message.index}/${message.total}`;
    setBackgroundUninstall(`Désinstallation de ${app?.name||message.id}`, `${message.index} sur ${message.total}`, percent);
    return;
  }
  if (message.type === "batch-uninstall-item") {
    const modal=$("#batchUninstallModal");
    const key=message.success?"success":"failed";
    modal.dataset[key]=String(Number(modal.dataset[key]||0)+1);
    const row=[...document.querySelectorAll("[data-batch-package]")].find(item=>item.dataset.batchPackage===message.id);
    if(row){const state=row.querySelector(".batch-item-state");state.textContent=message.success?"Désinstallé":"À vérifier";state.className=`batch-item-state ${message.success?"success":"failed"}`;}
    if(message.success){installedApps.delete(message.id);managedInstalled.delete(message.id);renderApps();}
    $("#batchUninstallResult").textContent=`${modal.dataset.success} réussi · ${modal.dataset.failed} à vérifier`;
    const app=apps.find(item=>item.id===message.id);
    const percent=Math.round((message.index/Math.max(message.total,1))*100);
    setBackgroundUninstall(message.success?`${app?.name||message.id} désinstallé`:`${app?.name||message.id} à vérifier`,`${message.index} sur ${message.total} traité(s)`,percent,message.success?"running":"warning");
    addNotification({key:`${currentUninstallRun}-${message.id}`,title:message.success?`${app?.name||message.id} est désinstallé`:`${app?.name||message.id} est à vérifier`,detail:message.success?"L'application a été retirée du PC.":(message.errorMessage||`Code de sortie ${message.code}`),kind:message.success?"success":"warning",action:"installed",symbol:message.success?"✓":"!"});
    return;
  }
  if (message.type === "batch-uninstall-complete") {
    $("#batchUninstallModal").dataset.running="false";
    $("#batchUninstallProgressBar").style.width="100%";
    $("#batchUninstallProgressPercent").textContent="100%";
    $("#batchUninstallProgressTitle").textContent=message.failed?"Désinstallation terminée avec vérifications":"Désinstallation terminée";
    $("#batchUninstallProgressDetail").textContent=`${message.success} réussi(s) · ${message.failed} à vérifier`;
    $("#batchUninstallCurrent").textContent=`Rapport : ${message.logName}`;
    $("#batchUninstallResult").textContent=`${message.success} réussi · ${message.failed} à vérifier`;
    $("#batchUninstallBackgroundActions").classList.add("hidden");
    const residues=message.residues||[];
    if(residues.length){
      pendingBatchResidueToken=message.residueToken||"";
      $("#batchResidueTitle").textContent=`${residues.length} dossier${residues.length>1?"s":""} · ${message.residueSize||"taille inconnue"}`;
      $("#batchResidueList").innerHTML=residues.map(item=>`<article><span>▣</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.display)}</small></div><b>${escapeHtml(item.size)}</b></article>`).join("");
      $("#batchResiduePanel").classList.remove("hidden");
      $("#finishBatchUninstall").classList.add("hidden");
      $("#batchUninstallModal").classList.remove("hidden");
      setBackgroundUninstall("Décision requise", `${residues.length} dossier(s) résiduel(s) à vérifier`, 100, "warning");
      notify("Dossiers résiduels détectés", "Vérifiez-les avant de les conserver ou de les placer en quarantaine.");
    }else $("#finishBatchUninstall").classList.remove("hidden");
    if(!residues.length)setBackgroundUninstall(message.failed?"Désinstallation terminée avec vérifications":"Désinstallation terminée",`${message.success} réussi(s) · ${message.failed} à vérifier`,100,message.failed?"warning":"complete");
    addNotification({key:`${currentUninstallRun}-summary`,title:residues.length?"Désinstallation terminée · décision requise":message.failed?"Désinstallation terminée avec avertissement":"Désinstallation terminée",detail:residues.length?`${residues.length} dossier(s) résiduel(s) à vérifier`:`${message.success} application(s) retirée(s) · ${message.failed} à vérifier`,kind:(residues.length||message.failed)?"warning":"success",action:"installed",symbol:(residues.length||message.failed)?"!":"✓"});
    requestHistory(); requestInstalledScan();
    return;
  }
  if (message.type === "app-info") {
    currentBuildVersion = message.version || "inconnue";
    currentBuildChannel = message.channel || (message.beta ? "beta" : "stable");
    if ($("#settingsBuildVersion")) $("#settingsBuildVersion").textContent = `${currentBuildVersion} · ${currentBuildChannel}`;
    if (message.beta) {
      $("#buildBadge").classList.remove("hidden");
      $("#buildBadge").textContent = currentBuildChannel === "alpha" ? "ALPHA" : "BÊTA";
      $("#buildSubtitle").textContent = message.version;
      document.title = `OwlSetup ${currentBuildChannel === "alpha" ? "ALPHA" : "BÊTA"} ${message.version}`;
      document.body.classList.add("beta-build");
      document.querySelectorAll(".beta-only").forEach(element=>element.classList.remove("hidden"));
    }
    setAlphaExperienceEnabled(currentBuildChannel === "alpha");
    return;
  }
  if (message.type === "system-summary") {
    $("#systemOsName").textContent = message.os || "Windows";
    $("#systemOsBuild").textContent = [message.display, message.build ? `build ${message.build}` : ""].filter(Boolean).join(" · ") || "Version non renseignée";
    $("#systemWinget").textContent = message.winget || "Indisponible";
    $("#systemArchitecture").textContent = message.architecture || "—";
    $("#systemRestart").textContent = message.restartPending ? "Nécessaire" : "Non requis";
    $("#systemRestartReason").textContent = message.restartPending
      ? `${message.restartReason || "Opération Windows en attente"}. Enregistrez votre travail puis redémarrez complètement le PC.`
      : "";
    $("#systemRestartReason").classList.toggle("hidden", !message.restartPending || !message.restartReason);
    const ready = Boolean(message.wingetReady) && !message.restartPending;
    $("#systemReadiness").querySelector("span").textContent = !message.wingetReady ? "WinGet à vérifier" : message.restartPending ? "Redémarrage du PC conseillé" : "PC prêt à configurer";
    $("#systemReadiness").classList.toggle("warning", !ready);
    return;
  }
  if (message.type === "feedback-diagnostics") {
    feedbackDiagnostics=`- Windows : ${message.windows || "Indisponible"}\n- Architecture : ${message.architecture || "Indisponible"}\n- WinGet : ${message.winget || "Indisponible"}\n- WebView2 : ${message.webview || "Indisponible"}\n- OwlSetup : ${message.version || currentBuildVersion}`;
    $("#feedbackDiagnostics").textContent=feedbackDiagnostics;
    $("#feedbackDiagnostics").classList.remove("hidden");
    $("#collectFeedbackDiagnostics").disabled=false;
    $("#collectFeedbackDiagnostics").textContent="Actualiser le diagnostic →";
    notify("Diagnostic terminé", "Vérifiez son aperçu avant de le joindre.");
    return;
  }
  if (message.type === "config-export-start") {
    notify("Sauvegarde en cours", "Lecture des logiciels installés avec WinGet...");
    return;
  }
  if (message.type === "config-export-complete") {
    notify(message.success ? "Configuration sauvegardée" : "Sauvegarde impossible", message.success ? `${message.count} logiciel(s) enregistrés dans ${message.file}.` : message.message);
    return;
  }
  if (message.type === "config-imported") {
    const known = new Set(apps.map(app => app.id.toLocaleLowerCase()));
    const restored = (message.packages || []).filter(id => known.has(String(id).toLocaleLowerCase()) && !installedApps.has(id) && !apps.some(app=>app.id===id && app.manualInstall));
    selected = new Set(restored);
    document.querySelectorAll("[data-cleanup]").forEach(input => { input.checked = (message.cleanup || []).includes(input.dataset.cleanup); });
    restorePreferences(message.preferences);
    updateCleanupCount(); renderApps(); renderSelection(); showView("queue");
    notify("Configuration restaurée", `${restored.length} logiciel(s) disponible(s) ajouté(s) à la sélection depuis ${message.file}.`);
    return;
  }
  if (message.type === "config-import-error") {
    notify("Restauration impossible", message.message);
    return;
  }
  if (message.type === "cleanup-analysis-start") {
    $("#cleanupAnalysisTitle").textContent = "Analyse en cours...";
    return;
  }
  if (message.type === "cleanup-analysis") {
    $("#cleanupAnalysisTitle").textContent = `${message.size} récupérables estimés`;
    $("#cleanupModalDetail").textContent = `${(message.items || []).reduce((sum, item) => sum + Number(item.files || 0), 0)} fichier(s) mesurés avant suppression`;
    $("#cleanupAnalysisList").innerHTML = (message.items || []).map(item => `<article><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.path)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small></div><b>${item.bytes ? escapeHtml(item.size) : "À calculer"}</b></article>`).join("");
    $("#protectedFoldersList").textContent = (message.protectedFolders || []).join(" · ");
    $("#protectedFolders").classList.remove("hidden");
    $("#confirmCleanup").disabled = false;
    return;
  }
  if (message.type === "cleanup-analysis-error") {
    $("#cleanupAnalysisTitle").textContent = "Analyse incomplète";
    $("#cleanupModalDetail").textContent = message.message;
    $("#confirmCleanup").disabled = true;
    return;
  }
  if (message.type === "browser-scan-state") { renderBrowserScan(message); return; }
  if (message.type === "browser-scan-error") {
    browserScanLoaded=false;$("#browserCards").innerHTML=`<div class="browser-empty"><strong>Détection impossible</strong><small>${escapeHtml(message.message)}</small></div>`;updateBrowserActionState();return;
  }
  if (message.type === "browser-analysis-state") { renderBrowserAnalysis(message); return; }
  if (message.type === "browser-analysis-error") {
    $("#analyzeBrowserData").innerHTML='<span>⌕</span> Analyser la sélection';updateBrowserActionState();notify("Analyse impossible",message.message);return;
  }
  if (message.type === "browser-cleanup-start") {
    $("#browserCleanupProgressTitle").textContent="Nettoyage en cours";$("#browserCleanupProgressDetail").textContent=message.detail||"Suppression des données analysées";$("#browserCleanupBar").style.width="45%";$("#browserCleanupPercent").textContent="45%";return;
  }
  if (message.type === "browser-cleanup-complete") {
    browserCleanupRunning=false;browserAnalysisData=null;$("#browserCleanupBar").style.width="100%";$("#browserCleanupPercent").textContent="100%";
    $("#browserCleanupProgressTitle").textContent=message.success?"Nettoyage terminé":"Nettoyage terminé avec avertissement";
    $("#browserCleanupProgressDetail").textContent=`${message.deleted||0} élément(s) supprimé(s) · ${message.skipped||0} ignoré(s)`;
    lastBrowserCleanupReport=message.logName||"";$("#browserCleanupResult").textContent=`${message.recovered||"0 octet"} récupérés · rapport ${message.logName||"local"}`;$("#openBrowserCleanupReport")?.classList.toggle("hidden",!lastBrowserCleanupReport);$("#browserCleanupResultActions").classList.remove("hidden");updateBrowserActionState();notify("Navigateurs nettoyés",$("#browserCleanupProgressDetail").textContent);return;
  }
  if (message.type === "browser-cleanup-error") {
    browserCleanupRunning=false;$("#browserCleanupProgressTitle").textContent="Nettoyage interrompu";$("#browserCleanupProgressDetail").textContent=message.message;$("#browserCleanupResult").textContent="Aucune autre donnée n’a été supprimée.";$("#openBrowserCleanupReport")?.classList.add("hidden");$("#browserCleanupResultActions")?.classList.remove("hidden");updateBrowserActionState();return;
  }
  if (message.type === "app-update-state") {
    renderAppUpdateState(message);
    return;
  }
  if (message.type === "health-scanning") {
    $("#refreshHealth").classList.add("scanning");
    return;
  }
  if (message.type === "schedule-state") { renderScheduleState(message); return; }
  if (message.type === "schedule-busy") { setScheduleBusy(true); return; }
  if (message.type === "schedule-saved") { notify("Entretien planifié", message.nextRun ? `Tâche enregistrée. Prochaine exécution : ${message.nextRun}.` : "Tâche enregistrée dans le planificateur Windows."); return; }
  if (message.type === "schedule-removed") { notify("Entretien planifié", "La tâche planifiée a été supprimée."); return; }
  if (message.type === "schedule-error") { setScheduleBusy(false); notify("Entretien planifié", message.message || "Le planificateur Windows a refusé la demande.", "error"); return; }
  if (message.type === "health-state") {
    renderHealth(message);
    return;
  }
  if (message.type === "updates-scanning") {
    $("#updateScanState").classList.remove("hidden");
    $("#scanUpdatesBtn").disabled = true;
    return;
  }
  if (message.type === "windows-updates-scanning") {
    windowsUpdateScanRunning = true;
    $("#windowsUpdateScanState")?.classList.remove("hidden");
    const wuBtn = $("#scanWindowsUpdatesBtn");
    if (wuBtn) wuBtn.disabled = true;
    return;
  }
  if (message.type === "windows-updates") {
    renderWindowsUpdates(message);
    return;
  }
  if (message.type === "windows-update-open-failed") {
    notify("Windows Update", `Ouverture impossible : ${message.message || "erreur inconnue"}`, "error");
    return;
  }
  if (message.type === "windows-update-install-start") {
    windowsUpdateInstalling = true;
    updateWindowsUpdateInstallBar();
    $("#windowsUpdateInstallState")?.classList.remove("hidden");
    return;
  }
  if (message.type === "windows-update-install-stage") {
    if ($("#windowsUpdateInstallStatus")) $("#windowsUpdateInstallStatus").textContent = message.status || "Installation…";
    return;
  }
  if (message.type === "windows-update-install-complete") {
    renderWindowsUpdateInstallComplete(message);
    return;
  }
  if (message.type === "updates-found") {
    availableUpdates = message.updates || [];
    const ignoredUpdateIds = getIgnoredUpdateIds();
    const visibleUpdates = availableUpdates.filter(update => !ignoredUpdateIds.has(update.id));
    selectedUpdates = new Set(visibleUpdates.map(update => update.id));
    updatesLoaded = true;
    renderAvailableUpdates();
    if (visibleUpdates.length) {
      addNotification({
        key:"application-updates",
        title:`${visibleUpdates.length} mise${visibleUpdates.length > 1 ? "s" : ""} à jour disponible${visibleUpdates.length > 1 ? "s" : ""}`,
        detail:visibleUpdates.slice(0, 3).map(update => update.name).join(", ") + (visibleUpdates.length > 3 ? ` et ${visibleUpdates.length - 3} autre(s)` : ""),
        kind:"warning", action:"updates", symbol:"↥"
      });
    } else {
      notificationFeed = notificationFeed.filter(item => item.key !== "application-updates");
      saveNotificationFeed(); renderNotificationFeed();
    }
    if(!message.error)reconcileOperationsWithDetectedState({availableUpdateIds:new Set(availableUpdates.map(update=>update.id)),updateScanReliable:true});
    if (message.error) notify("Analyse partielle", message.error);
    return;
  }
  if (message.type === "quarantine-state") {
    renderQuarantine(message.items);
    return;
  }
  if (message.type === "quarantine-error") {
    renderQuarantine([]);
    notify("Quarantaine inaccessible", message.error);
    return;
  }
  if (message.type === "quarantine-action") {
    notify(message.success ? "Action terminée" : "Action impossible", message.message, message.success ? "success" : "error");
    requestHealth();
    requestQuarantine();
    return;
  }
  if (message.type === "cleanup-start") {
    $("#cleanupProgressBar").style.width = "6%";
    $("#cleanupProgressPercent").textContent = "6%";
    return;
  }
  if (message.type === "cleanup-stage") {
    $("#cleanupProgressTitle").textContent = "Nettoyage en cours";
    $("#cleanupProgressDetail").textContent = message.label;
    $("#cleanupProgressPercent").textContent = `${message.percent}%`;
    $("#cleanupProgressBar").style.width = `${message.percent}%`;
    $("#cleanupCurrentZone").textContent = message.label;
    $("#cleanupZonePosition").textContent = `${message.index}/${message.total}`;
    return;
  }
  if (message.type === "cleanup-complete") {
    $("#cleanupModal").dataset.running = "false";
    $("#closeCleanupModal").disabled = false;
    $("#cleanupProgressBar").style.width = "100%";
    $("#cleanupProgressPercent").textContent = "100%";
    $("#cleanupProgressTitle").textContent = message.success ? "Nettoyage terminé" : "Nettoyage terminé avec avertissement";
    $("#cleanupProgressDetail").textContent = message.success ? "Les zones sélectionnées ont été traitées" : `Certaines zones sont à vérifier (code ${message.code})`;
    $("#cleanupCurrentZone").closest(".cleanup-current-zone").classList.add("hidden");
    $("#cleanupResultCard").classList.remove("hidden");
    $("#cleanupRecovered").textContent = `${message.recovered || "0"} Go`;
    $("#cleanupSummaryText").textContent = `Rapport rangé dans OwlSetup : ${message.logName}`;
    $("#finishCleanup").classList.remove("hidden");
    completeActiveOperation(message.success?"success":"failed",message.success?"Nettoyage terminé":`Nettoyage à vérifier (code ${message.code??"inconnu"})`,{logName:message.logName||""});
    requestHealth(); requestQuarantine();
    return;
  }
  if (message.type === "package-process-scan") {
    const processes=message.processes||[];
    if(processCloseContext==="update") {
      updateBlockerInspected=true;
      updateBlockerProcessNames=[...new Set(processes.map(item=>item.name).filter(Boolean))];
      if(!processes.length&&message.recognized!==false) {
        updateBlockerReady=true;
        $("#updateProgressDetail").textContent="Plus aucun processus ne verrouille les fichiers du logiciel. La nouvelle tentative est prête.";
        $("#closeUpdateBlocker").textContent="Réessayer la mise à jour";
      } else if(!processes.length) {
        $("#updateProgressDetail").textContent="Le processus n'a pas été reconnu. Fermez manuellement l'application qui utilise ces fichiers.";
        $("#closeUpdateBlocker").textContent="Vérifier de nouveau";
        updateBlockerInspected=false;
      } else {
        const names=updateBlockerProcessNames.join(", ");
        $("#updateProgressDetail").textContent=`${names} utilise encore des fichiers du logiciel à mettre à jour. Enregistrez votre travail avant de le fermer.`;
        $("#closeUpdateBlocker").textContent=`Fermer ${names} et relancer`;
      }
      $("#closeUpdateBlocker").disabled=false;
      return;
    }
    renderOperationProcesses(processes);
    $("#operationAutoFix").disabled=false;
    if(!processes.length && message.recognized!==false) {
      $("#operationGracefulClose").disabled=true;
      window.setTimeout(()=>prepareFailedUpdateRetry("Aucun processus bloquant n'est encore actif. La mise à jour ciblée est prête."),350);
    } else if(!processes.length) {
      $("#operationProcessTitle").textContent="Processus non reconnu automatiquement";
      $("#operationProcessList").innerHTML='<div class="empty-state">Fermez manuellement le logiciel et son icône près de l’horloge, puis poursuivez.</div>';
      $("#operationGracefulClose").disabled=true;
    } else {
      $("#operationGracefulClose").disabled=false;
      $("#operationForceClose").classList.add("hidden");
      $("#operationProcessWarning").classList.add("hidden");
    }
    return;
  }
  if (message.type === "package-process-close") {
    const remaining=message.processes||[];
    if(processCloseContext==="update") {
      if(!remaining.length) {
        updateBlockerReady=true;
        $("#updateProgressDetail").textContent=`${message.closed||0} processus fermé${message.closed===1?"":"s"}. Relance silencieuse de la mise à jour…`;
        $("#closeUpdateBlocker").classList.add("hidden");
        $("#forceCloseUpdateBlocker").classList.add("hidden");
        $("#updateBlockerWarning").classList.add("hidden");
        selectedUpdates=new Set(updateBlockerPackages.filter(isValidPackageId));
        window.setTimeout(()=>{if(selectedUpdates.size)beginUpdate();},600);
      } else {
        $("#updateProgressDetail").textContent=`${remaining.length} processus est encore actif. Vérifiez votre travail avant de forcer sa fermeture.`;
        $("#closeUpdateBlocker").textContent="Réessayer la fermeture normale";
        $("#closeUpdateBlocker").disabled=false;
        $("#forceCloseUpdateBlocker").classList.remove("hidden");
        $("#forceCloseUpdateBlocker").disabled=false;
        $("#updateBlockerWarning").classList.remove("hidden");
      }
      return;
    }
    renderOperationProcesses(remaining);
    if(!remaining.length) {
      $("#operationProcessWarning").classList.add("hidden");
      $("#operationForceClose").classList.add("hidden");
      window.setTimeout(()=>prepareFailedUpdateRetry(`${message.closed||0} processus fermé${message.closed===1?"":"s"}. La mise à jour ciblée peut reprendre.`),350);
    } else {
      $("#operationProcessTitle").textContent=`${remaining.length} processus résiste${remaining.length>1?"nt":""} à la fermeture normale`;
      $("#operationProcessWarning").classList.remove("hidden");
      $("#operationForceClose").classList.remove("hidden");
      $("#operationForceClose").disabled=false;
      $("#operationGracefulClose").disabled=false;
      $("#operationGracefulClose").textContent="Réessayer la fermeture normale";
    }
    return;
  }
  if (message.type === "update-start") {
    $("#updateProgressBar").style.width = "5%";
    $("#updateProgressPercent").textContent = "5%";
    setBackgroundUpdate("Mise à jour en cours", "Connexion aux services Windows", 5);
    return;
  }
  if (message.type === "update-stage") {
    $("#updateProgressTitle").textContent = message.title;
    $("#updateProgressDetail").textContent = message.detail;
    $("#updateProgressPercent").textContent = `${message.percent}%`;
    $("#updateProgressBar").style.width = `${message.percent}%`;
    setBackgroundUpdate(message.title, message.detail, message.percent);
    showUpdateStage(message.stage);
    return;
  }
  if (message.type === "update-complete") {
    const applicationsVerified=message.appsSuccess===true;
    const fullyCompleted=applicationsVerified&&message.windowsStarted===true;
    const selfManagedNote=message.selfManagedMessage || "";
    const withSelfManaged=text=>selfManagedNote?`${text}\n\n${selfManagedNote}`:text;
    const wuCount=Number(message.windowsUpdateCount);
    const wuDrivers=Number(message.windowsDriverCount||0);
    const windowsUpdateNote=!Number.isFinite(wuCount)||wuCount<0
      ? ""
      : wuCount===0
        ? "Windows est à jour, aucun composant en attente."
        : `${wuCount} mise${wuCount>1?"s":""} à jour Windows en attente${wuDrivers>0?` (dont ${wuDrivers} pilote${wuDrivers>1?"s":""})`:""}. Ouvrez Windows Update pour les installer.`;
    $("#updateModal").dataset.running = "false";
    $("#closeUpdateModal").disabled = false;
    $("#updateProgressBar").style.width = "100%";
    $("#updateProgressPercent").textContent = "100%";
    $("#updateProgressTitle").textContent = fullyCompleted ? "Votre PC est à jour" : applicationsVerified ? "Applications à jour" : "Mise à jour terminée avec avertissement";
    $("#updateProgressDetail").textContent = withSelfManaged(applicationsVerified ? (message.windowsStarted ? "Applications vérifiées et recherche Windows Update lancée" : "Applications vérifiées. Ouvrez Windows Update pour contrôler le système.") : (message.errorMessage || `Certaines applications sont à vérifier (code ${message.code})`));
    setBackgroundUpdate(fullyCompleted ? "Mise à jour terminée" : applicationsVerified ? "Applications mises à jour" : "Mise à jour terminée avec avertissement", applicationsVerified ? (message.windowsStarted ? "Applications traitées avec succès" : "Windows Update reste à contrôler séparément") : (message.errorMessage || "Consultez le résultat pour les détails."), 100, applicationsVerified ? "complete" : "warning");
    $("#updateSummary").textContent = `${windowsUpdateNote || (message.windowsStarted ? "Recherche Windows Update lancée." : "Windows Update n'a pas pu être lancé.")} Rapport : ${message.logName}`;
    document.querySelectorAll("[data-update-step]").forEach(step => { step.classList.remove("active"); step.classList.add("done"); });
    lastUpdateIssue=applicationsVerified?null:{category:"Mise à jour d'une application",title:"La mise à jour des applications se termine avec un avertissement",description:message.errorMessage||`WinGet n’a pas terminé la mise à jour (code ${message.code ?? "non communiqué"}).`,steps:"1. Ouvrir Tout mettre à jour\n2. Sélectionner les mises à jour proposées\n3. Lancer l’opération et attendre la fin",technical:`Opération : mise à jour\nCode de sortie : ${message.code ?? "non communiqué"}\nJournal local : ${message.logName || "non indiqué"}\nWindows Update lancé : ${message.windowsStarted?"oui":"non"}\n\nLe journal complet reste sur le PC et n’est pas joint automatiquement.`};
    if (applicationsVerified) resolveOperationalTelemetry("update");
    else reportOperationalTelemetry({
      operation:"updates",errorCategory:"update",failureStage:message.failureKind === "files-in-use" ? "process-lock" : "execution",
      targetPackage:(message.failedItems||[]).length === 1 ? message.failedItems[0].id : "",errorKind:message.failureKind || "winget",
      errorCode:message.code ?? "non disponible",message:message.errorMessage || "Mise à jour incomplète"
    });
    updateBlockerPackages=(message.failedItems||[]).map(item=>item.id).filter(isValidPackageId);
    updateBlockerReady=false;
    updateBlockerInspected=false;
    updateBlockerProcessNames=[];
    const blockerNames=(message.failedItems||[]).map(item=>item.name||item.id).filter(Boolean);
    const canCloseBlocker=!applicationsVerified&&message.failureKind==="files-in-use"&&updateBlockerPackages.length>0;
    $("#closeUpdateBlocker").classList.toggle("hidden",!canCloseBlocker);
    $("#closeUpdateBlocker").disabled=false;
    $("#closeUpdateBlocker").textContent="Détecter le processus bloquant";
    $("#forceCloseUpdateBlocker").classList.add("hidden");
    $("#forceCloseUpdateBlocker").disabled=false;
    $("#updateBlockerWarning").classList.add("hidden");
    $("#reportUpdateFailure").classList.toggle("hidden",!lastUpdateIssue);
    $("#updateResultActions").classList.remove("hidden");
    addNotification({
      key:`system-update-${Date.now()}`,
      title:applicationsVerified ? "Applications mises à jour" : "Mises à jour à vérifier",
      detail:withSelfManaged(applicationsVerified ? (message.windowsStarted ? "Les applications sélectionnées ont été vérifiées." : "Applications vérifiées · contrôle Windows Update à effectuer séparément.") : (message.errorMessage || "Consultez le rapport OwlSetup.")),
      kind:applicationsVerified ? "success" : "warning", action:"updates", symbol:applicationsVerified ? "✓" : "!", operationType:"update",
      packageIds:applicationsVerified?[...selectedUpdates]:(message.failedItems||[]).map(item=>item.id)
    });
    completeActiveOperation(applicationsVerified?"success":"failed",applicationsVerified?(message.windowsStarted?"Applications vérifiées · Windows Update lancé":"Applications vérifiées · Windows Update à contrôler"):(message.errorMessage||`Code ${message.code??"inconnu"}`),{verified:applicationsVerified,logName:message.logName||"",code:message.code??null,failureKind:message.failureKind||"winget",failedPackages:message.failedItems||[]});
    updatesLoaded = false; requestHealth();
    return;
  }
  if (message.type === "installed-state") {
    mergeDiscoveredInstalledApps(message.details || []);
    installedApps = new Set(message.ids || []);
    wingetManageableApps = new Set(message.managedIds || message.ids || []);
    installedDetection = new Map((message.details||[]).map(item=>[item.id,item]));
    relatedWindowsApps = new Set(message.relatedIds || []);
    managedInstalled = new Set([...managedInstalled].filter(id => installedApps.has(id)&&wingetManageableApps.has(id)));
    reconcileOperationsWithDetectedState({installedIds:installedApps});
    installedApps.forEach(id => selected.delete(id));
    renderFilters(); renderApps(); renderSelection();
    if (message.warning && message.method === "windows") {
      notify("Détection Windows active", `${message.count || 0} logiciel(s) reconnu(s) localement malgré l’indisponibilité de WinGet.`);
    }
    return;
  }
  if (message.type === "app-health-state") {
    const summary=$("#appHealthSummary"),results=$("#appHealthResults");
    results.classList.remove("hidden");
    summary.textContent=message.error?`Analyse incomplète : ${message.error}`:`${message.healthy||0} gérable(s) par WinGet · ${message.limited||0} détectée(s) via Windows · ${message.warning||0} introuvable(s)`;
    results.innerHTML=(message.items||[]).map(item=>`<div class="app-health-item ${!item.healthy?"warning":item.limited?"limited":"healthy"}"><span>${!item.healthy?"!":item.limited?"i":"✓"}</span><div><strong>${escapeHtml(item.name||item.id)}</strong><small>${escapeHtml(item.detail||"")}</small></div>${item.limited?`<button class="text-button" type="button" data-open-windows-apps>Gérer</button>`:""}</div>`).join("")||`<div class="empty-state">Aucune application installée à analyser.</div>`;
    $("#scanAppHealth").disabled=false;$("#scanAppHealth").textContent="Analyser maintenant";
    return;
  }
  if (message.type === "uninstall-start") {
    $("#uninstallProgressBar").style.width = "55%";
    $("#uninstallProgressDetail").textContent = `Suppression de ${message.id}`;
    const app=apps.find(item=>item.id===message.id);
    setBackgroundUninstall(`Désinstallation de ${app?.name||message.id}`, "Suppression avec WinGet", 55);
    return;
  }
  if (message.type === "repair-start") {
    $("#repairProgressBar").style.width = "55%";
    $("#repairProgressDetail").textContent = `Réparation de ${message.id}`;
    return;
  }
  if (message.type === "repair-fallback") {
    $("#repairProgressBar").style.width = "72%";
    $("#repairProgressTitle").textContent = "Réinstallation réparatrice";
    $("#repairProgressDetail").textContent = "La réparation native n'est pas disponible. OwlSetup réinstalle l'application sans la désinstaller.";
    return;
  }
  if (message.type === "repair-complete") {
    $("#repairModal").dataset.running = "false";
    $("#closeRepairModal").disabled = false;
    $("#repairProgressBar").style.width = "100%";
    $("#repairProgressTitle").textContent = message.success ? "Logiciel réparé" : "Réparation impossible";
    $("#repairProgressDetail").textContent = message.success
      ? (message.mode === "reinstall" ? "L'application a été réinstallée par-dessus sa version actuelle afin de réparer ses fichiers." : "WinGet a terminé la réparation native.")
      : (message.errorMessage || `La réparation native et la réinstallation ont échoué (code ${message.code}).`);
    $("#repairSummary").textContent = `Rapport : ${message.logName}`;
    $("#finishRepair").classList.remove("hidden");
    if (message.success) resolveOperationalTelemetry("repair",message.id || pendingRepairId || "");
    else reportOperationalTelemetry({operation:"installed",errorCategory:"repair",failureStage:"execution",targetPackage:message.id || pendingRepairId || "",errorKind:"winget",errorCode:message.code ?? "non disponible",message:message.errorMessage || "Réparation impossible"});
    return;
  }
  if (message.type === "uninstall-complete") {
    $("#uninstallModal").dataset.running = "false";
    $("#closeUninstallModal").disabled = false;
    $("#uninstallProgressBar").style.width = "100%";
    $("#uninstallProgressTitle").textContent = message.success ? "Logiciel désinstallé" : "Désinstallation à vérifier";
    $("#uninstallProgressDetail").textContent = message.success ? "L'application a été supprimée." : (message.errorMessage || `Code de sortie : ${message.code}`);
    const residues=message.residues||[];
    $("#uninstallBackgroundActions").classList.add("hidden");
    $("#uninstallSummary").textContent = message.success ? (residues.length?`${residues.length} dossier(s) résiduel(s) trouvé(s). Vérifiez-les ci-dessous.`:"La carte a été actualisée automatiquement. Aucun dossier résiduel ciblé n’a été trouvé.") : "Consultez le rapport rangé dans OwlSetup.";
    if(message.success&&residues.length){
      pendingUninstallResidueToken=message.residueToken||"";
      $("#uninstallResidueTitle").textContent=`${residues.length} dossier${residues.length>1?"s":""} · ${message.residueSize||"taille inconnue"}`;
      $("#uninstallResidueList").innerHTML=residues.map(item=>`<article><span>▣</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.display)}</small></div><b>${escapeHtml(item.size)}</b></article>`).join("");
      $("#uninstallResiduePanel").classList.remove("hidden");
      $("#finishUninstall").classList.add("hidden");
      $("#uninstallModal").classList.remove("hidden");
      setBackgroundUninstall("Décision requise", `${residues.length} dossier(s) résiduel(s) à vérifier`, 100, "warning");
      notify("Dossiers résiduels détectés", "Vérifiez-les avant de les conserver ou de les placer en quarantaine.");
    }else $("#finishUninstall").classList.remove("hidden");
    if(!residues.length)setBackgroundUninstall(message.success?"Désinstallation terminée":"Désinstallation à vérifier",message.success?"L'application a été retirée du PC.":(message.errorMessage||`Code de sortie ${message.code}`),100,message.success?"complete":"warning");
    const app=apps.find(item=>item.id===message.id);
    if (message.success) resolveOperationalTelemetry("uninstall",message.id || "");
    else reportOperationalTelemetry({operation:"installed",errorCategory:"uninstall",failureStage:/utilis|processus/i.test(message.errorMessage||"")?"process-lock":"execution",targetPackage:message.id || "",errorKind:"winget",errorCode:message.code ?? "non disponible",message:message.errorMessage || "Désinstallation incomplète"});
    addNotification({key:`${currentUninstallRun}-summary`,title:residues.length?"Désinstallation terminée · décision requise":message.success?`${app?.name||message.id} est désinstallé`:`${app?.name||message.id} est à vérifier`,detail:residues.length?`${residues.length} dossier(s) résiduel(s) à vérifier`:message.success?"L'application a été retirée du PC.":(message.errorMessage||`Code de sortie ${message.code}`),kind:(residues.length||!message.success)?"warning":"success",action:"installed",symbol:(residues.length||!message.success)?"!":"✓"});
    if (message.success) { installedApps.delete(message.id); managedInstalled.delete(message.id); renderApps(); }
    requestHealth();
    return;
  }
  if(message.type==="uninstall-residues-complete"&&message.context!=="batch"){
    const resume=quarantineSummary({moved:message.moved,failed:message.failed,batch:false});
    $("#quarantineUninstallResidues").disabled=false;
    $("#uninstallResiduePanel").classList.add("hidden");
    $("#finishUninstall").classList.remove("hidden");
    $("#uninstallSummary").textContent=resume.text;
    pendingUninstallResidueToken="";
    setBackgroundUninstall(resume.title,resume.detail,100,resume.tone);
    requestHealth();requestQuarantine();requestHistory();
    return;
  }
  if(message.type==="uninstall-residues-complete"&&message.context==="batch"){
    const resume=quarantineSummary({moved:message.moved,failed:message.failed,batch:true});
    $("#quarantineBatchResidues").disabled=false;
    $("#batchResiduePanel").classList.add("hidden");
    $("#finishBatchUninstall").classList.remove("hidden");
    $("#batchUninstallResult").textContent=resume.text;
    pendingBatchResidueToken="";
    setBackgroundUninstall(resume.title,resume.detail,100,resume.tone);
    requestHealth();requestQuarantine();requestHistory();return;
  }
  if (message.type === "install-preflight-progress") {
    if(Number(message.requestId)!==installPreflightRequestId)return;
    setPreflightState(message.key,message.state||"checking",message.detail);
    $("#preflightTitle").textContent=message.title||"Diagnostic en cours...";
    return;
  }
  if (message.type === "install-preflight-complete") {
    if(Number(message.requestId)!==installPreflightRequestId)return;
    $("#preflightTitle").textContent=message.ready?"Votre PC est prêt":"Action requise avant installation";
    $("#confirmInstall").disabled=installSubmissionPending||!message.ready;
    if(message.ready&&!installSubmissionPending) $("#confirmInstall").focus();
    else if(message.message) notify("Diagnostic d’installation",message.message);
    return;
  }
  if (!message.type?.startsWith("install-")) return;
  if (message.type === "install-start") {
    installSubmissionPending=true;
    $("#progressTitle").textContent = "Installation en cours";
    $("#progressDetail").textContent = `${message.total} logiciel(s) dans la file`;
    setBackgroundInstall("Installation en cours", `${message.total} logiciel(s) dans la file`, 2);
  }
  if (message.type === "install-progress") {
    const percent = Math.round(((message.index - 1) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#currentPackage").textContent = message.id;
    $("#packageResult").textContent = "INSTALLATION";
    const app = apps.find(item => item.id === message.id);
    setBackgroundInstall(`Installation de ${app?.name || message.id}`, `${message.index} sur ${message.total}`, percent);
  }
  if (message.type === "install-security") {
    const percent = Math.round(((message.index - 1 + .25) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#packageResult").textContent = message.success ? "SOURCE VÉRIFIÉE" : "SOURCE INTROUVABLE";
    const app = apps.find(item => item.id === message.id);
    setBackgroundInstall(`Vérification de ${app?.name || message.id}`, message.success ? "Source officielle vérifiée" : "Source à vérifier", percent, message.success ? "running" : "warning");
  }
  if (message.type === "install-execution") {
    const percent = Math.round(((message.index - 1 + .45) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#progressDetail").textContent = `Installation de ${message.id} avec WinGet`;
    $("#packageResult").textContent = "INSTALLATION EN COURS";
    const app = apps.find(item => item.id === message.id);
    setBackgroundInstall(`Installation de ${app?.name || message.id}`, "Téléchargement et installation avec WinGet", percent);
  }
  if (message.type === "install-item") {
    const percent = Math.round((message.index / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#packageResult").textContent = message.success ? "TERMINÉ ✓" : "À VÉRIFIER";
    const app = apps.find(item => item.id === message.id);
    if (!message.success && message.errorMessage) $("#progressDetail").textContent = message.errorMessage;
    if (message.success) {
      resolveOperationalTelemetry("installation",message.id || "");
      installedApps.add(message.id); selected.delete(message.id); renderApps(); renderSelection();
      addNotification({key:`${currentInstallRun}-${message.id}`, title:`${app?.name || message.id} est installé`, detail:"L'application est maintenant disponible sur votre PC.", kind:"success", action:"installed", symbol:"✓"});
    } else {
      reportOperationalTelemetry({operation:"queue",errorCategory:"installation",failureStage:/télécharg|download/i.test(message.errorMessage||"")?"download":/utilis|processus/i.test(message.errorMessage||"")?"process-lock":"execution",targetPackage:message.id || "",errorKind:"winget",errorCode:message.code ?? "non disponible",message:message.errorMessage || "Installation incomplète"});
      addNotification({key:`${currentInstallRun}-${message.id}`, title:`${app?.name || message.id} est à vérifier`, detail:message.errorMessage || `Code de sortie ${message.code}`, kind:"warning", action:"history", symbol:"!"});
    }
    setBackgroundInstall(message.success ? `${app?.name || message.id} installé` : `${app?.name || message.id} à vérifier`, `${message.index} sur ${message.total} traité(s)`, percent, message.success ? "running" : "warning");
  }
  if (message.type === "install-verification") {
    $("#progressDetail").textContent=message.success?`Vérification terminée : ${message.id} est bien détecté.`:(message.errorMessage||`${message.id} n'est pas détecté après installation.`);
    return;
  }
  if (message.type === "install-complete") {
    installSubmissionPending=false;
    $("#confirmInstall").innerHTML="<span>▶</span> Commencer l'installation";
    $("#installModal").dataset.running = "false";
    $("#closeInstallModal").disabled = false;
    $("#progressTitle").textContent = message.failed ? "Installation terminée avec avertissement" : "Installation terminée";
    $("#progressDetail").textContent = `${message.success} réussi(s), ${message.failed} à vérifier`;
    $("#progressPercent").textContent = "100%";
    $("#progressBar").style.width = "100%";
    $("#progressSummary").textContent = `Rapport rangé dans OwlSetup : ${message.logName}`;
    renderPostInstallVerified(message.installedPackages||[]);
    lastFailedInstallPackages=[...(message.failedPackages||[])];
    lastInstallIssue=message.failed?{category:"Installation",title:"Une ou plusieurs applications ne s’installent pas",description:`${message.failed} application(s) n’ont pas pu être installée(s) correctement.`,steps:"1. Sélectionner les applications\n2. Cliquer sur Installer\n3. Attendre la fin de l’installation groupée",technical:`Opération : installation\nApplications à vérifier : ${lastFailedInstallPackages.join(", ")}\nJournal local : ${message.logName}\n\nLe journal complet reste sur le PC et n’est pas joint automatiquement.`}:null;
    lastInstallReportName=message.reportName||"";
    $("#openInstallReport").classList.toggle("hidden",!lastInstallReportName);
    $("#retryFailedInstall").classList.toggle("hidden",lastFailedInstallPackages.length===0);
    $("#reportInstallFailure").classList.toggle("hidden",!lastInstallIssue);
    $("#installResultActions").classList.remove("hidden");
    $("#installBackgroundActions").classList.add("hidden");
    $("#finishInstall").classList.remove("hidden");
    setBackgroundInstall(message.failed ? "Installation terminée avec vérifications" : "Installation terminée", `${message.success} réussi(s) · ${message.failed} à vérifier`, 100, message.failed ? "warning" : "complete");
    addNotification({
      key:`${currentInstallRun}-summary`,
      title:message.failed ? "Installation terminée avec avertissement" : "Installation terminée",
      detail:`${message.success} application(s) installée(s) · ${message.failed} à vérifier`,
      kind:message.failed ? "warning" : "success", action:"install-result", symbol:message.failed ? "!" : "✓"
    });
    completeActiveOperation(message.failed?"failed":"success",`${message.success} installée(s) · ${message.failed} à vérifier`,{verified:!message.failed,logName:message.logName||"",failedPackages:lastFailedInstallPackages});
    requestHistory();
    requestHealth();
    requestInstalledScan();
  }
  if(message.type==="install-already-running"){
    installSubmissionPending=true;
    setBackgroundInstall("Installation déjà en cours","La première demande continue normalement.",Math.max(2,Number(message.percent)||2),"running");
    notify("Installation déjà en cours","Aucune deuxième commande n’a été lancée.");
  }
}

if (window.chrome && window.chrome.webview) {
  window.chrome.webview.addEventListener("message", event => handleInstallMessage(event.data));
  window.chrome.webview.postMessage({action:"get-app-info", payload:{}});
  window.chrome.webview.postMessage({action:"scan-installed", payload:{ids:apps.map(app => app.id), apps:apps.map(app => ({id:app.id,name:app.name,portable:!!app.portable,custom:!!app.custom}))}});
  window.chrome.webview.postMessage({action:"check-app-update", payload:{prerelease:prereleaseOptIn()}});
  requestHealth();
  requestQuarantine();
  requestSecurityStatus();
}

document.addEventListener("click", event => {
  const card = event.target.closest("[data-app]");
  const installedCard = event.target.closest("[data-installed-app]");
  const officialLink = event.target.closest(".official-link");
  const uninstall = event.target.closest("[data-uninstall]");
  const postInstallUninstall = event.target.closest("[data-post-install-uninstall]");
  const repair = event.target.closest("[data-repair]");
  const manageInstalled = event.target.closest("[data-manage-installed]");
  const openWindowsApps = event.target.closest("[data-open-windows-apps]");
  const nav = event.target.closest("[data-view]");
  const category = event.target.closest("[data-category]");
  const preset = event.target.closest("[data-preset]");
  const remove = event.target.closest("[data-remove]");
  const quarantineAction = event.target.closest("[data-quarantine-action]");
  const diskAction = event.target.closest("[data-disk-action]");
  const openLog = event.target.closest("[data-open-log]");
  const openReport = event.target.closest("[data-open-report]");
  const topNavToggle = event.target.closest(".top-nav-toggle");
  const logHelp = event.target.closest("[data-log-help]");
  const wingetAdd = event.target.closest("[data-winget-add]");
  if(wingetAdd)addExtendedWingetResult(wingetAdd.dataset.wingetAdd);
  if (topNavToggle) toggleTopNavigation(topNavToggle);
  if (diskAction) {
    const path=decodeURIComponent(diskAction.dataset.diskPath||"");
    if (diskAction.dataset.diskAction === "open") window.chrome?.webview?.postMessage({action:"open-disk-folder",payload:{path}});
    else if (diskAction.dataset.diskAction === "clean") confirmDiskFolderCleanup(path,decodeURIComponent(diskAction.dataset.diskName||".cache"));
  }
  if (postInstallUninstall) {
    $("#installModal").classList.add("hidden");
    openUninstallModal(postInstallUninstall.dataset.postInstallUninstall);
  }
  if (uninstall) openUninstallModal(uninstall.dataset.uninstall);
  if (repair) openRepairModal(repair.dataset.repair);
  if (openWindowsApps) window.chrome?.webview?.postMessage({action:"open-installed-apps",payload:{}});
  if (manageInstalled) {
    const id=manageInstalled.dataset.manageInstalled;
    if(!wingetManageableApps.has(id))return;
    if(managedInstalled.has(id))managedInstalled.delete(id);else managedInstalled.add(id);
    renderApps();
  }
  if (installedCard && !uninstall && !repair && !manageInstalled && !officialLink && !openWindowsApps) {
    const id=installedCard.dataset.installedApp;
    if(!wingetManageableApps.has(id)){notify("Application détectée via Windows","OwlSetup ne proposera pas une désinstallation WinGet non vérifiée.");return;}
    if(managedInstalled.has(id))managedInstalled.delete(id);else managedInstalled.add(id);
    renderApps();
  }
  if (openLog) openLogViewer(decodeURIComponent(openLog.dataset.openLog));
  if (openReport) openReportViewer(decodeURIComponent(openReport.dataset.openReport));
  if (card && !uninstall && !repair && !manageInstalled && !officialLink && !openWindowsApps) toggleApp(card.dataset.app);
  if (nav) showView(nav.dataset.view);
  if (event.target.closest("[data-focus-cleanup]")) {
    const target = event.target.closest("[data-focus-cleanup]").dataset.focusCleanup;
    const input = document.querySelector(`[data-cleanup="${target}"]`);
    if (input) { input.checked = true; updateCleanupCount(); input.closest(".cleanup-option").scrollIntoView({behavior:"smooth", block:"center"}); }
  }
  if (category) { activeCategory = category.dataset.category; renderFilters(); renderApps(); }
  const scope=event.target.closest("[data-catalog-scope]");
  if(scope){activeCatalogScope=scope.dataset.catalogScope;activeCategory="Tout";localStorage.setItem(catalogScopeStorageKey,activeCatalogScope);renderFilters();renderApps();}
  if (preset) { apps.filter(app => app.tags?.includes(preset.dataset.preset)).forEach(app => selected.add(app.id)); renderApps(); renderSelection(); showView("queue"); }
  if (remove) { selected.delete(remove.dataset.remove); renderApps(); renderSelection(); }
  if (quarantineAction) confirmQuarantineAction(quarantineAction.dataset.quarantineAction, decodeURIComponent(quarantineAction.dataset.batch), decodeURIComponent(quarantineAction.dataset.item));
  if (event.target.closest("[data-go-catalog]")) showView("catalog");
  if(logHelp){
    const action=logHelp.dataset.logHelp;
    if(action==="retry")retryFailedInstallation();
    else if(action==="winget"){closeLogViewer();showView("tools");diagnoseWinget();}
    else if(action==="report")prepareLogFeedback();
    else {closeLogViewer();showView("troubleshooting");}
  }
});

document.addEventListener("error", event => {
  const image = event.target?.closest?.("img[data-image-fallback]");
  if (!image) return;
  const fallback = image.dataset.imageFallback || "APP";
  const sibling = image.nextElementSibling;
  image.hidden = true;
  if (sibling?.classList.contains("app-icon-fallback")) {
    sibling.textContent = fallback;
    sibling.hidden = false;
  } else if (image.parentElement) {
    image.parentElement.textContent = fallback;
  }
}, true);

document.addEventListener("change", event => {
  const update = event.target.closest("[data-update-id]");
  if (!update) return;
  if (update.checked) selectedUpdates.add(update.dataset.updateId); else selectedUpdates.delete(update.dataset.updateId);
  renderAvailableUpdates();
});

$("#searchInput").addEventListener("input", event => { searchTerm = event.target.value; if(searchTerm.trim()!==extendedWingetQuery){extendedWingetQuery="";extendedWingetResults=[];extendedWingetPending=false;} renderApps();renderExtendedWingetSearch();scheduleExtendedWingetSearch(); });
$("#searchWingetBtn").addEventListener("click",requestExtendedWingetSearch);
$("#clearAll").addEventListener("click", () => { selected.clear(); renderApps(); renderSelection(); });
$("#viewSelection").addEventListener("click", () => showView("queue"));
$("#installBtn").addEventListener("click", openInstallModal);
$("#confirmInstall").addEventListener("click", beginInstall);
$("#installLocationMode").addEventListener("change",()=>updateInstallLocationControls(true));
$("#chooseInstallLocation").addEventListener("click",chooseInstallLocation);
$("#cancelInstall").addEventListener("click", closeInstallModal);
$("#closeInstallModal").addEventListener("click", closeInstallModal);
$("#finishInstall").addEventListener("click", closeInstallModal);
$("#refreshInstallPreflight").addEventListener("click", requestInstallPreflight);
$("#openInstallReport").addEventListener("click", () => openReportViewer(lastInstallReportName));
$("#closeReportModal").addEventListener("click", closeReportViewer);
$("#finishReport").addEventListener("click", closeReportViewer);
$("#closeLogModal").addEventListener("click", closeLogViewer);
$("#finishLogViewer").addEventListener("click", closeLogViewer);
$("#openLogFolderFromViewer").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"open-log-folder",payload:{}}));
$("#reportLogErrors").addEventListener("click", prepareLogFeedback);
$("#exportTechnicalReport").addEventListener("click", () => {
  if (window.chrome?.webview && currentReportName) window.chrome.webview.postMessage({action:"export-report", payload:{name:currentReportName}});
});
$("#retryFailedInstall").addEventListener("click", retryFailedInstallation);
$("#reportInstallFailure").addEventListener("click",()=>prepareOperationFeedback(lastInstallIssue));
$("#closeGuidedInstall").addEventListener("click", closeGuidedInstall);
$("#openVmwareGuide").addEventListener("click", () => openGuidedInstallLink("guide"));
$("#continueVmwareDownload").addEventListener("click", () => openGuidedInstallLink("download"));
$("#confirmUninstall").addEventListener("click", () => runWithOptionalRestore(beginUninstall,"la désinstallation"));
$("#cancelUninstall").addEventListener("click", closeUninstallModal);
$("#closeUninstallModal").addEventListener("click", closeUninstallModal);
$("#finishUninstall").addEventListener("click", closeUninstallModal);
$("#keepUninstallResidues").addEventListener("click",()=>{$("#uninstallResiduePanel").classList.add("hidden");$("#finishUninstall").classList.remove("hidden");$("#uninstallSummary").textContent="Les dossiers résiduels ont été conservés.";pendingUninstallResidueToken="";setBackgroundUninstall("Désinstallation terminée","Les dossiers résiduels ont été conservés.",100,"complete");});
$("#quarantineUninstallResidues").addEventListener("click",()=>{if(!pendingUninstallResidueToken||!window.chrome?.webview)return;$("#quarantineUninstallResidues").disabled=true;window.chrome.webview.postMessage({action:"quarantine-uninstall-residues",payload:{token:pendingUninstallResidueToken,context:"single"}});});
$("#keepBatchResidues").addEventListener("click",()=>{$("#batchResiduePanel").classList.add("hidden");$("#finishBatchUninstall").classList.remove("hidden");$("#batchUninstallResult").textContent="Les dossiers résiduels ont été conservés.";pendingBatchResidueToken="";setBackgroundUninstall("Désinstallation terminée","Les dossiers résiduels ont été conservés.",100,"complete");});
$("#quarantineBatchResidues").addEventListener("click",()=>{if(!pendingBatchResidueToken||!window.chrome?.webview)return;$("#quarantineBatchResidues").disabled=true;window.chrome.webview.postMessage({action:"quarantine-uninstall-residues",payload:{token:pendingBatchResidueToken,context:"batch"}});});
$("#confirmRepair").addEventListener("click", () => runWithOptionalRestore(beginRepair,"la réparation"));
$("#cancelRepair").addEventListener("click", closeRepairModal);
$("#closeRepairModal").addEventListener("click", closeRepairModal);
$("#finishRepair").addEventListener("click", closeRepairModal);
$("#saveProfile").addEventListener("click", saveProfile);
$("#loadProfile").addEventListener("click", loadProfile);
$("#batchUninstallBtn").addEventListener("click", () => {
  requestBatchUninstall();
});
$("#cancelBatchUninstall").addEventListener("click", closeBatchUninstallModal);
$("#closeBatchUninstallModal").addEventListener("click", closeBatchUninstallModal);
$("#finishBatchUninstall").addEventListener("click", closeBatchUninstallModal);
$("#confirmBatchUninstall").addEventListener("click", () => runWithOptionalRestore(beginBatchUninstall,"la désinstallation groupée"));

document.addEventListener("keydown", event => {
  const card = event.target.closest?.("[data-app],[data-installed-app]");
  if (!card || event.target !== card || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  if (card.dataset.installedApp) {
    const id=card.dataset.installedApp;
    if(managedInstalled.has(id))managedInstalled.delete(id);else managedInstalled.add(id);
    renderApps();
  } else toggleApp(card.dataset.app);
});

// --- Accessibilité des fenêtres modales (lot 6) ---------------------------
// Les 19 boîtes de l'interface déclarent `aria-modal="true"`, mais seules deux
// piégeaient le focus : dans les autres, la tabulation partait derrière la
// fenêtre, ce qui rend l'application inutilisable au clavier. Un mécanisme
// unique observe leur affichage (classe `hidden`) pour, à l'ouverture :
// mémoriser l'élément déclencheur et placer le focus dans la boîte ; pendant :
// retenir Tab / Maj+Tab ; à la fermeture : rendre le focus à l'élément
// d'origine. Échap ne ferme que les boîtes qui exposent un bouton de
// fermeture — les trois boîtes obligatoires (langue, premier démarrage, guide)
// n'en ont pas, et restent donc non annulables.
const modalFocusableSelector =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
// Ces deux boîtes ont déjà leur propre gestion (flèches du guide, Échap bloqué
// sur la configuration initiale) : on les laisse à leur gestionnaire dédié.
const modalsWithOwnKeyboard = new Set(["firstRunConfiguration", "onboardingOverlay"]);
let modalReturnFocus = null;

function isModalVisible(dialog) {
  if (dialog.classList.contains("hidden")) return false;
  const rect = dialog.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function openModals() {
  return [...document.querySelectorAll('[aria-modal="true"]')].filter(isModalVisible);
}

function topModal() {
  const open = openModals();
  return open.length ? open[open.length - 1] : null;
}

function modalFocusable(dialog) {
  return [...dialog.querySelectorAll(modalFocusableSelector)].filter(
    element => !element.closest(".hidden") && element.offsetWidth + element.offsetHeight > 0
  );
}

function focusInsideModal(dialog) {
  const targets = modalFocusable(dialog);
  // On évite de démarrer sur la croix de fermeture : le premier contrôle utile
  // est plus proche de ce que l'utilisateur veut faire.
  const first = targets.find(element => !element.classList.contains("dialog-close")) || targets[0];
  if (first) { first.focus(); return; }
  dialog.setAttribute("tabindex", "-1");
  dialog.focus();
}

function modalDismissControl(dialog) {
  return dialog.querySelector(".dialog-close,[id^='cancel'],[id^='close']");
}

document.addEventListener("keydown", event => {
  const dialog = topModal();
  if (!dialog || modalsWithOwnKeyboard.has(dialog.id)) return;
  if (event.key === "Escape") {
    const dismiss = modalDismissControl(dialog);
    if (dismiss && !dismiss.disabled) { event.preventDefault(); dismiss.click(); }
    return;
  }
  if (event.key !== "Tab") return;
  const targets = modalFocusable(dialog);
  if (!targets.length) return;
  const first = targets[0], last = targets[targets.length - 1];
  if (!dialog.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}, true);

// L'ouverture et la fermeture passent toutes par la classe `hidden` : on
// observe donc l'attribut `class` de chaque boîte plutôt que d'instrumenter les
// dizaines d'endroits qui les affichent.
(() => {
  const dialogs = [...document.querySelectorAll('[aria-modal="true"]')];
  if (!dialogs.length) return;
  const wasVisible = new WeakMap();
  dialogs.forEach(dialog => wasVisible.set(dialog, isModalVisible(dialog)));

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      const dialog = mutation.target;
      const visible = isModalVisible(dialog);
      if (visible === wasVisible.get(dialog)) continue;
      wasVisible.set(dialog, visible);
      if (visible) {
        if (!openModals().some(other => other !== dialog && wasVisible.get(other))) {
          modalReturnFocus = document.activeElement;
        }
        window.setTimeout(() => { if (isModalVisible(dialog)) focusInsideModal(dialog); }, 30);
      } else if (!openModals().length && modalReturnFocus?.isConnected) {
        modalReturnFocus.focus();
        modalReturnFocus = null;
      }
    }
  });
  dialogs.forEach(dialog => observer.observe(dialog, { attributes: true, attributeFilter: ["class"] }));
})();

document.addEventListener("keydown", event => {
  const configuration=$("#firstRunConfiguration");
  if(configuration&&!configuration.classList.contains("hidden")){
    if(event.key==="Escape"){event.preventDefault();return;}
    if(event.key!=="Tab")return;
    const focusable=[...configuration.querySelectorAll("button:not([disabled]),select,input:not([disabled])")];
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    return;
  }
  const overlay = $("#onboardingOverlay");
  if (overlay.classList.contains("hidden")) return;
  if (event.key === "Escape") { event.preventDefault(); closeOnboarding(true); return; }
  if (event.key === "ArrowRight") { event.preventDefault(); moveOnboarding(1); return; }
  if (event.key === "ArrowLeft") { event.preventDefault(); moveOnboarding(-1); return; }
  if (event.key !== "Tab") return;
  const focusable = [...overlay.querySelectorAll("button:not([disabled])")];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$("#selectAllInstalled").addEventListener("click", () => { managedInstalled = new Set([...installedApps].filter(id=>{const app=apps.find(entry=>entry.id===id);return wingetManageableApps.has(id)&&app&&!isSystemComponentApp(app);})); activeCatalogScope="installed";activeCategory = "Tout";localStorage.setItem(catalogScopeStorageKey,activeCatalogScope); renderFilters(); renderApps(); });
$("#clearInstalledSelection").addEventListener("click", () => { managedInstalled.clear(); renderApps(); });
$("#installedSearchInput").addEventListener("input", event => { installedSearchTerm = event.target.value; renderInstalledPage(); });
$("#installedSort").addEventListener("change", event => { installedSortMode = event.target.value; renderInstalledPage(); });
$("#refreshInstalledApps").addEventListener("click", requestInstalledScan);
$("#installedSelectAll").addEventListener("click", () => { managedInstalled = new Set([...installedApps].filter(id=>wingetManageableApps.has(id))); renderApps(); });
$("#installedClearSelection").addEventListener("click", () => { managedInstalled.clear(); renderApps(); });
$("#installedBatchUninstall").addEventListener("click", requestBatchUninstall);
$("#skipOnboarding").addEventListener("click", () => closeOnboarding(true));
$("#completeFirstRunConfiguration").addEventListener("click",completeFirstRunConfiguration);
$("#previousOnboarding").addEventListener("click", () => moveOnboarding(-1));
$("#nextOnboarding").addEventListener("click", () => moveOnboarding(1));
$("#replayOnboarding").addEventListener("click", () => openOnboarding(true));
$("#saveSchedule")?.addEventListener("click", saveSchedule);
$("#removeSchedule")?.addEventListener("click", removeSchedule);
$("#onboardingDots").addEventListener("click", event => { const dot=event.target.closest("[data-onboarding-dot]"); if(!dot)return; onboardingStep=Number(dot.dataset.onboardingDot); renderOnboarding(); });
$("#exportConfig").addEventListener("click", exportConfiguration);
$("#importConfig").addEventListener("click", importConfiguration);
$("#exportAllSettings").addEventListener("click", exportConfiguration);
$("#importAllSettings").addEventListener("click", importConfiguration);
$("#expertMode").addEventListener("change",event=>{localStorage.setItem(expertModeStorageKey,String(event.target.checked));updateExpertPreviews();notify("Mode expert",event.target.checked?"Les commandes préparées sont maintenant visibles avant exécution.":"Les détails techniques sont masqués.");});
$("#scanAppHealth").addEventListener("click",()=>{if(!window.chrome?.webview)return notify("Analyse indisponible","Lancez l'application Windows.");$("#scanAppHealth").disabled=true;$("#scanAppHealth").textContent="Analyse en cours…";window.chrome.webview.postMessage({action:"scan-app-health",payload:{ids:[...installedApps],apps:apps.filter(app=>installedApps.has(app.id)).map(app=>({id:app.id,name:app.name,portable:!!app.portable,custom:!!app.custom}))}});});
$("#refreshOperations").addEventListener("click",()=>{requestHistory();loadOperationFeed();readInterruptedOperation();});
$("#resumeOperation").addEventListener("click",resumeInterruptedOperation);
$("#dismissOperation").addEventListener("click",()=>{localStorage.removeItem(activeOperationStorageKey);pendingResumeOperation=null;renderOperationRecovery();});
$("#operationAutoFix").addEventListener("click",applyOperationAutoFix);
$("#operationGracefulClose").addEventListener("click",()=>closeOperationProcesses(false));
$("#operationForceClose").addEventListener("click",()=>closeOperationProcesses(true));
$("#operationProcessManual").addEventListener("click",()=>prepareFailedUpdateRetry("Fermez vous-même les applications indiquées, puis confirmez la mise à jour ciblée."));
$("#closeUpdateBlocker").addEventListener("click",()=>closeUpdateBlockingProcesses(false));
$("#forceCloseUpdateBlocker").addEventListener("click",()=>closeUpdateBlockingProcesses(true));
$("#operationsList").addEventListener("click",event=>{
  const fix=event.target.closest("[data-operation-fix]");
  if(fix)return selectOperationFix(fix.dataset.operationFix);
  const resolve=event.target.closest("[data-operation-resolve]");
  if(resolve)return manuallyResolveOperation(resolve.dataset.operationResolve);
  const remove=event.target.closest("[data-operation-remove]");
  if(remove)return removeOperation(remove.dataset.operationRemove);
});
$("#resolveAllOperations")?.addEventListener("click",resolveAllOperations);
$("#clearFinishedOperations")?.addEventListener("click",clearFinishedOperations);
$("#appUpdateBtn").addEventListener("click", openAppUpdateModal);
$("#appUpdateNotification").addEventListener("click", event => { event.stopPropagation(); toggleNotificationCenter(); });
$("#clearNotifications").addEventListener("click", () => {
  notificationFeed.forEach(item => { item.unread = false; });
  saveNotificationFeed(); renderNotificationFeed();
});
$("#deleteReadNotifications").addEventListener("click", () => {
  notificationFeed = notificationFeed.filter(item => item.unread);
  saveNotificationFeed(); renderNotificationFeed();
  notify("Historique allégé", "Les notifications déjà lues ont été supprimées de cet appareil.");
});
$("#notificationList").addEventListener("click", event => {
  const item = event.target.closest("[data-notification-key]");
  if (!item) return;
  const notification = notificationFeed.find(entry => entry.key === item.dataset.notificationKey);
  if (notification) {
    notification.unread = false;
    saveNotificationFeed();
    renderNotificationFeed();
  }
  const action = item.dataset.notificationAction;
  toggleNotificationCenter(false);
  if (action === "self-update") openAppUpdateModal();
  else if (action === "updates") showView("updates");
  else if (action === "installed") showView("installed");
  else if (action === "history") showView("history");
  else if (action === "install-result") $("#installModal").classList.remove("hidden");
});
$("#closeNativeError").addEventListener("click", () => $("#nativeErrorCard").classList.add("hidden"));
$("#copyNativeError").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(lastNativeError);
    notify("Diagnostic copié", "Vous pouvez le joindre à un signalement sans transmettre automatiquement vos journaux.");
  } catch {
    notify("Copie impossible", "Sélectionnez le diagnostic affiché puis copiez-le manuellement.", "error");
  }
});
$("#openNativeErrorHelp").addEventListener("click", () => {
  $("#nativeErrorCard").classList.add("hidden");
  showView("troubleshooting");
});
document.addEventListener("click", event => {
  if (!event.target.closest("#notificationCenter") && !event.target.closest("#appUpdateNotification")) toggleNotificationCenter(false);
  if (!event.target.closest(".horizontal-nav")) closeTopNavigation();
});
document.addEventListener("keydown", event => {
  const toggle = event.target.closest?.(".top-nav-toggle");
  if (toggle && event.key === "ArrowDown") {
    event.preventDefault();
    const group = toggle.closest(".top-nav-group");
    if (!group.classList.contains("open")) toggleTopNavigation(toggle);
    group.querySelector(".top-nav-menu .nav-item")?.focus();
    return;
  }
  const menu = event.target.closest?.(".top-nav-menu");
  if (menu && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const items = [...menu.querySelectorAll(".nav-item")];
    const current = items.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next]?.focus();
    return;
  }
  if (event.key === "Escape") {
    const openToggle = document.querySelector(".top-nav-group.open .top-nav-toggle");
    closeTopNavigation();
    openToggle?.focus();
  }
});
$("#hideInstallProgress").addEventListener("click", minimizeInstallProgress);
$("#showInstallProgress").addEventListener("click", () => $("#installModal").classList.remove("hidden"));
$("#showUpdateProgress").addEventListener("click", showUpdateProgress);
$("#hideUninstallProgress").addEventListener("click", () => minimizeUninstallProgress("single"));
$("#hideBatchUninstallProgress").addEventListener("click", () => minimizeUninstallProgress("batch"));
$("#showUninstallProgress").addEventListener("click", showUninstallProgress);
$("#installAppUpdate").addEventListener("click", beginAppUpdate);
$("#cancelAppUpdate").addEventListener("click", closeAppUpdateModal);
$("#closeAppUpdate").addEventListener("click", closeAppUpdateModal);
$("#copyFeedback").addEventListener("click", copyFeedbackReport);
$("#openGitHubFeedback").addEventListener("click", openGitHubFeedback);
$("#previewFeedback").addEventListener("click", showFeedbackPreview);
$("#closeFeedbackPreview").addEventListener("click", closeFeedbackPreview);
$("#cancelFeedbackPreview").addEventListener("click", closeFeedbackPreview);
$("#confirmFeedbackPrivacy").addEventListener("change", event => $("#confirmGitHubFeedback").disabled=!event.target.checked);
$("#confirmGitHubFeedback").addEventListener("click", confirmGitHubFeedback);
document.querySelectorAll('[name="errorTelemetryMode"]').forEach(input=>input.addEventListener("change",event=>{
  const mode=setErrorTelemetryMode(event.target.value);
  notify("Préférence enregistrée", mode === "never" ? "Aucun rapport d’erreur ne sera envoyé." : mode === "ask" ? "OwlSetup vous demandera avant chaque partage." : "Seuls les diagnostics techniques minimaux seront envoyés automatiquement.");
}));
$("#previewTelemetrySample").addEventListener("click",()=>{
  pendingTelemetryReport=null;
  $("#telemetryPreviewTitle").textContent="Exemple de rapport minimal";
  $("#telemetryPreviewContent").textContent=JSON.stringify(minimalTelemetrySample("EXEMPLE01","code -1978335189"),null,2);
  $("#sendTelemetryPreview").classList.add("hidden");
  $("#telemetryPreviewDialog").showModal();
});
$("#closeTelemetryPreview").addEventListener("click",()=>$("#telemetryPreviewDialog").close());
$("#sendTelemetryPreview").addEventListener("click",async()=>{
  const button=$("#sendTelemetryPreview");
  button.disabled=true;
  button.textContent="Envoi en cours…";
  const sent=await sendTelemetryPayload(pendingTelemetryReport);
  button.disabled=false;
  button.textContent=sent ? "Diagnostic envoyé" : "Réessayer l’envoi";
  if(sent){
    $("#telemetryPreviewDialog").close();
    pendingTelemetryReport=null;
    notify("Diagnostic envoyé","Merci. Seules les informations affichées ont été transmises.");
  }else{
    notify("Envoi impossible",`${lastTelemetrySendError || "Le service ne répond pas pour le moment."} Le diagnostic reste affiché afin que vous puissiez réessayer.`);
  }
});
$("#telemetryPreviewDialog").addEventListener("click",event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
$("#openFeedbackFollowup").addEventListener("click", () => window.open("https://github.com/OwlNetGeekFR/OwlSetup/issues?q=is%3Aissue+author%3A%40me","_blank","noopener"));
$("#exportSupportBundle").addEventListener("click", () => {
  if(!window.chrome?.webview)return notify("Export indisponible","Utilisez l’application Windows pour créer l’archive.");
  const excerpts=currentLogIssues.slice(0,10).map(item=>redactLogDiagnostic(item.line)).join("\n");
  const summary=`OWLSETUP — DIAGNOSTIC ANONYMISÉ\nVersion : ${currentBuildVersion}\nCanal : ${currentBuildChannel}\n\n${feedbackDiagnostics}\n\nEXTRAITS RELUS\n${excerpts||"Aucun extrait sélectionné."}`;
  window.chrome.webview.postMessage({action:"export-support",payload:{summary}});
});
$("#collectFeedbackDiagnostics").addEventListener("click", collectFeedbackDiagnostics);
$("#openFeedbackLogs").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"open-log-folder",payload:{}}));
$("#updateAllBtn").addEventListener("click", openUpdateModal);
$("#scanUpdatesBtn").addEventListener("click", requestUpdateScan);
$("#scanWindowsUpdatesBtn")?.addEventListener("click", requestWindowsUpdateScan);
$("#openWindowsUpdateBtn")?.addEventListener("click", () => window.chrome?.webview?.postMessage({ action: "open-windows-update", payload: {} }));
$("#installWindowsUpdatesBtn")?.addEventListener("click", requestWindowsUpdateInstall);
$("#windowsUpdateList")?.addEventListener("change", event => {
  const box = event.target.closest("input[type=checkbox][data-wu-id]");
  if (!box) return;
  if (box.checked) windowsUpdateSelection.add(box.dataset.wuId);
  else windowsUpdateSelection.delete(box.dataset.wuId);
  updateWindowsUpdateInstallBar();
});
$("#dismissWindowsUpdateReboot")?.addEventListener("click", () => $("#windowsUpdateRebootBar")?.classList.add("hidden"));
$("#selectAllUpdates").addEventListener("click",()=>{const ignored=getIgnoredUpdateIds();selectedUpdates=new Set(availableUpdates.filter(update=>!ignored.has(update.id)).map(update=>update.id));renderAvailableUpdates();});
$("#clearUpdates").addEventListener("click",()=>{selectedUpdates.clear();renderAvailableUpdates();});
$("#restoreIgnoredUpdates").addEventListener("click", restoreIgnoredUpdates);
$("#availableUpdates").addEventListener("click", event => {
  const trigger = event.target.closest("[data-ignore-update]");
  if (!trigger) return;
  event.preventDefault();
  event.stopPropagation();
  ignoreUpdate(trigger.dataset.ignoreUpdate);
});
$("#refreshHealth").addEventListener("click", requestHealth);
$("#healthDetails").addEventListener("click", openHealthDetails);
$("#closeHealthDetails").addEventListener("click", closeHealthDetails);
$("#finishHealthDetails").addEventListener("click", closeHealthDetails);
$("#refreshHealthFromDetails").addEventListener("click", () => { closeHealthDetails(); requestHealth(); });
$("#refreshSecurity").addEventListener("click", requestSecurityStatus);
document.querySelectorAll("[data-security-detail]").forEach(card=>card.addEventListener("click",()=>showSecurityDetail(card.dataset.securityDetail)));
$("#securityGauge").addEventListener("click",()=>showSecurityDetail("score"));
$("#securityDetailAction").addEventListener("click",event=>runSecurityAction(event.currentTarget.dataset.securityAction));
$("#securityRecommendations").addEventListener("click",event=>{const button=event.target.closest("[data-security-action]");if(button)runSecurityAction(button.dataset.securityAction);});
$("#exportSecurity").addEventListener("click",()=>{if(!window.chrome?.webview)return notify("Export indisponible","Lancez la version Windows pour exporter le diagnostic.");window.chrome.webview.postMessage({action:"export-security",payload:{}});});
$("#applySecurityRetention").addEventListener("click",()=>{const days=Number($("#securityLogRetention").value);syncHistoryRetention(days,true);window.chrome?.webview?.postMessage({action:"prune-history",payload:{days}});});
$("#securityLogRetention").addEventListener("change",event=>syncHistoryRetention(event.target.value,true));
$("#refreshQuarantine").addEventListener("click", requestQuarantine);
$("#purgeOldQuarantine")?.addEventListener("click", confirmPurgeQuarantine);
$("#diagnoseWinget").addEventListener("click", diagnoseWinget);
$("#repairWinget").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"repair-winget",payload:{}}));
$("#createRestorePoint").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"create-restore-point",payload:{}}));
$("#openSystemRestore").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"open-system-restore",payload:{}}));
$("#openSystemProtection")?.addEventListener("click",()=>{
  window.chrome?.webview?.postMessage({action:"open-system-protection",payload:{}});
  closeRestoreProtectionDialog();
});
$("#disableAutomaticRestore")?.addEventListener("click",()=>{
  localStorage.setItem(autoRestoreStorageKey,"false");
  if($("#autoRestorePoint")) $("#autoRestorePoint").checked=false;
  closeRestoreProtectionDialog();
  notify("Automatisation désactivée","Les prochaines opérations ne demanderont plus de point de restauration automatique.");
});
$("#closeRestoreProtection")?.addEventListener("click",closeRestoreProtectionDialog);
$("#restoreProtectionOverlay")?.addEventListener("click",event=>{if(event.target===event.currentTarget)closeRestoreProtectionDialog();});
$("#scanStartup").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"scan-startup",payload:{}}));
$("#openStartupSettings").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"open-startup-settings",payload:{}}));
$("#scanDisk").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"scan-disk",payload:{}}));
$("#refreshHistory").addEventListener("click", requestHistory);
$("#historyTypeFilter").addEventListener("change",renderHistoryItems);
$("#historyResultFilter").addEventListener("change",renderHistoryItems);
$("#historyRetention").addEventListener("change",event=>syncHistoryRetention(event.target.value,true));
$("#pruneHistory").addEventListener("click",()=>{const days=Number($("#historyRetention").value);syncHistoryRetention(days,true);window.chrome?.webview?.postMessage({action:"prune-history",payload:{days}});});
$("#clearAllHistory").addEventListener("click",openClearHistoryDialog);
$("#cancelClearHistory").addEventListener("click",closeClearHistoryDialog);
$("#confirmClearHistory").addEventListener("click",()=>{if(!window.chrome?.webview)return notify("Action indisponible","Lancez l'application Windows pour effacer les journaux.");$("#confirmClearHistory").disabled=true;window.chrome.webview.postMessage({action:"clear-history",payload:{}});});
$("#historyClearOverlay").addEventListener("click",event=>{if(event.target.id==="historyClearOverlay")closeClearHistoryDialog();});
document.addEventListener("click",event=>{const help=event.target.closest("[data-help-title]");if(help){event.preventDefault();event.stopPropagation();openContextHelp(help);return;}if(!event.target.closest("#contextHelpPopover"))closeContextHelp();});
$("#closeContextHelp").addEventListener("click",closeContextHelp);
document.addEventListener("keydown",event=>{if(event.key!=="Escape")return;closeContextHelp();if(!$("#historyClearOverlay")?.classList.contains("hidden"))closeClearHistoryDialog();});
$("#accessibilityScale").addEventListener("change",saveAccessibilitySettings);
$("#highContrastMode").addEventListener("change",saveAccessibilitySettings);
$("#reducedMotionMode").addEventListener("change",saveAccessibilitySettings);
$("#appTheme").addEventListener("change",event=>saveThemePreference(event.target.value));
$("#firstRunTheme").addEventListener("change",event=>applyThemePreference(event.target.value));
$("#autoRestorePoint").addEventListener("change",event=>localStorage.setItem(autoRestoreStorageKey,String(event.target.checked)));
$("#prereleaseOptIn")?.addEventListener("change",event=>{
  localStorage.setItem(prereleaseStorageKey,String(event.target.checked));
  notify("Mises à jour d'OwlSetup",event.target.checked?"Les préversions (bêtas) seront proposées.":"Seules les versions stables seront proposées.");
  if(window.chrome?.webview) window.chrome.webview.postMessage({action:"check-app-update", payload:{prerelease:event.target.checked}});
});
$("#alphaOneClickScan")?.addEventListener("click",runAlphaOneClickScan);
$("#alphaFixSafe")?.addEventListener("click",()=>openAlphaReview("safe"));
$("#alphaReviewRecommended")?.addEventListener("click",()=>openAlphaReview("recommended"));
$("#alphaOpenAdvanced")?.addEventListener("click",()=>openAlphaReview("advanced"));
$("#alphaResultList")?.addEventListener("change",event=>{const input=event.target.closest("[data-alpha-plan]");if(!input)return;if(input.checked)alphaSelectedPlanIds.add(input.dataset.alphaPlan);else alphaSelectedPlanIds.delete(input.dataset.alphaPlan);});
$("#alphaReviewList")?.addEventListener("change",updateAlphaReviewSafety);
$("#confirmAlphaPlan")?.addEventListener("click",confirmAlphaPlan);
$("#cancelAlphaPlan")?.addEventListener("click",closeAlphaReview);
$("#closeAlphaReview")?.addEventListener("click",closeAlphaReview);
$("#alphaReviewModal")?.addEventListener("click",event=>{if(event.target.id==="alphaReviewModal")closeAlphaReview();});
$("#alphaRestoreBeforeFix")?.addEventListener("change",event=>saveAlphaPreferences({restore:event.target.checked}));
$("#saveAlphaSchedule")?.addEventListener("click",saveAlphaSchedule);
$("#runSelfDiagnostic").addEventListener("click",()=>{if(!window.chrome?.webview)return notify("Tests indisponibles","Lancez la version Windows.");$("#runSelfDiagnostic").disabled=true;$("#runSelfDiagnostic").textContent="Tests en cours…";window.chrome.webview.postMessage({action:"self-diagnostic",payload:{}});});
$("#retryLogFailures").addEventListener("click",retryFailedInstallation);
$("#confirmUpdate").addEventListener("click", () => runWithOptionalRestore(beginUpdate,"la mise à jour"));
$("#cancelUpdate").addEventListener("click", closeUpdateModal);
$("#closeUpdateModal").addEventListener("click", closeUpdateModal);
$("#finishUpdate").addEventListener("click", closeUpdateModal);
$("#reportUpdateFailure").addEventListener("click",()=>prepareOperationFeedback(lastUpdateIssue));
$("#cleanupBtn").addEventListener("click", openCleanupModal);
$("#confirmCleanup").addEventListener("click", () => runWithOptionalRestore(beginCleanup,"le nettoyage"));
$("#cancelCleanup").addEventListener("click", closeCleanupModal);
$("#closeCleanupModal").addEventListener("click", closeCleanupModal);
$("#finishCleanup").addEventListener("click", closeCleanupModal);
$("#scanBrowsers")?.addEventListener("click",requestBrowserScan);
$("#selectAllBrowsers")?.addEventListener("click",()=>{document.querySelectorAll("[data-browser-id]").forEach(input=>{input.checked=true;input.closest(".browser-card")?.classList.add("selected")});invalidateBrowserAnalysis();updateBrowserActionState();});
$("#clearBrowsers")?.addEventListener("click",()=>{document.querySelectorAll("[data-browser-id]").forEach(input=>{input.checked=false;input.closest(".browser-card")?.classList.remove("selected")});invalidateBrowserAnalysis();updateBrowserActionState();});
document.querySelectorAll("[data-browser-preset]").forEach(button=>button.addEventListener("click",()=>setBrowserPreset(button.dataset.browserPreset)));
$("#analyzeBrowserData")?.addEventListener("click",analyzeBrowserSelection);
$("#reviewBrowserCleanup")?.addEventListener("click",openBrowserCleanupReview);
$("#confirmBrowserCleanup")?.addEventListener("click",confirmBrowserCleanup);
$("#cancelBrowserCleanup")?.addEventListener("click",closeBrowserCleanup);
$("#closeBrowserCleanup")?.addEventListener("click",closeBrowserCleanup);
$("#finishBrowserCleanup")?.addEventListener("click",()=>{browserCleanupRunning=false;closeBrowserCleanup();requestBrowserScan();});
$("#openBrowserCleanupReport")?.addEventListener("click",()=>{if(!lastBrowserCleanupReport)return;browserCleanupRunning=false;closeBrowserCleanup();openLogViewer(lastBrowserCleanupReport);});
$("#browserCleanupModal")?.addEventListener("click",event=>{if(event.target.id==="browserCleanupModal")closeBrowserCleanup();});
$("#browserCards")?.addEventListener("change",event=>{event.target.closest(".browser-card")?.classList.toggle("selected",event.target.checked);invalidateBrowserAnalysis();updateBrowserActionState();});
document.querySelectorAll("[data-browser-category]").forEach(input=>input.addEventListener("change",()=>{document.querySelectorAll("[data-browser-preset]").forEach(button=>button.classList.toggle("active",button.dataset.browserPreset==="custom"));invalidateBrowserAnalysis();updateBrowserActionState();}));
document.querySelectorAll("[data-cleanup]").forEach(input => input.addEventListener("change", updateCleanupCount));
$("#recommendedCleanup").addEventListener("click", () => {
  document.querySelectorAll("[data-cleanup]").forEach(input => { input.checked = input.dataset.cleanup !== "components"; });
  updateCleanupCount();
});
$("#mobileMenu").addEventListener("click", () => document.body.classList.toggle("menu-open"));
$("#refreshSystemSummary").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"get-app-info",payload:{}}));
applyThemePreference();
applyAccessibilitySettings();
setErrorTelemetryMode(getErrorTelemetryMode());
$("#autoRestorePoint").checked=localStorage.getItem(autoRestoreStorageKey)==="true";
$("#expertMode").checked=isExpertMode();
if($("#prereleaseOptIn")) $("#prereleaseOptIn").checked=prereleaseOptIn();
const savedSecurityRetention=localStorage.getItem(securityRetentionStorageKey);
syncHistoryRetention(["7","30","90","365"].includes(savedSecurityRetention)?savedSecurityRetention:"30",false);
refreshProfiles(); renderFilters(); renderApps(); renderSelection(); renderFeedbackFollowups();
  loadNotificationFeed();
  loadOperationFeed();readInterruptedOperation();updateExpertPreviews();
window.addEventListener("owlsetup:language-selected", () => window.setTimeout(startFirstRunFlow,120));
window.setTimeout(startFirstRunFlow,650);
