$ErrorActionPreference = "Stop"

# Garde les correctifs de l'onglet Maintenance (4.0.0-beta.2 -> beta.6) :
# si l'un de ces marqueurs disparaît, une régression est probable.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$app = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}
function Assert-Missing([string]$Text, [string]$Token, [string]$Message) {
    if ($Text.Contains($Token)) { throw $Message }
}

# --- Mises à jour : versions inconnues + lanceurs auto-gérés ---
Assert-Has $native 'upgrade --include-unknown' "QueryAvailableUpdates n'interroge plus WinGet avec --include-unknown."
Assert-Has $native '{"unknownVersion",unknownVersion}' "Le champ unknownVersion n'est plus transmis à l'interface."
Assert-Has $native 'SelfManagedUpdaters = new HashSet<string>' "La liste des lanceurs auto-gérés a disparu de l'hôte."
Assert-Has $native 'bool IsVersionPrefixMismatch' "La détection d'écart de schéma de version a disparu."
Assert-Has $native 'lenientPackages.Contains(id)' "RunUpdate ne traite plus les paquets tolérés sans échec."
# Migré en module (lot 2, 4.0.0-beta.31) : la liste est inlinée depuis
# beta/src/modules/update-heuristics.js et le Set en est dérivé.
Assert-Has $app  'const SELF_MANAGED_UPDATERS = [' "app.js ne connaît plus la liste des lanceurs auto-gérés."
Assert-Has $app  'const SELF_MANAGED_UPDATER_IDS = new Set(SELF_MANAGED_UPDATERS.map(' "app.js ne dérive plus le Set des lanceurs auto-gérés du module."

# --- Liste d'ignorés des mises à jour (beta.4) ---
Assert-Has $app  'owlsetup-update-ignore-v1' "La clé de stockage de la liste d'ignorés a changé sans migration."
Assert-Has $app  'function getIgnoredUpdateIds' "getIgnoredUpdateIds a disparu."
Assert-Has $html 'id="ignoredUpdatesBar"' "La barre « Réafficher » des mises à jour masquées est absente."

# --- Centre des opérations : réconciliation + actions (beta.6) ---
Assert-Has $app 'function reconcileMaintenanceOperations' "La réconciliation automatique du Centre des opérations a disparu."
Assert-Has $app 'function resolveAllOperations' "Le bouton « Tout classer résolu » a perdu sa fonction."
Assert-Has $app 'function clearFinishedOperations' "Le bouton « Effacer les terminées » a perdu sa fonction."
Assert-Has $app 'data-operation-resolve' "Le bouton « Marquer résolu » par ligne est absent."
Assert-Has $html 'id="resolveAllOperations"' "Le bouton d'en-tête « Tout classer résolu » est absent du HTML."

# --- Nettoyage : app-leftovers retiré, catégories navigateur, plafond de mesure ---
Assert-Missing $html 'data-cleanup="app-leftovers"' "L'option inactive « Résidus d'applications » est de retour dans le nettoyage intégré."
Assert-Missing $native '"user-temp","windows-temp","recycle-bin","delivery","components","app-leftovers"' "La zone app-leftovers est de retour dans la liste autorisée du nettoyage."
Assert-Has $app 'function syncBrowserCategoryAvailability' "La désactivation des catégories navigateur sans effet a disparu."
Assert-Has $app 'engineUnsupportedCategories' "La table des catégories non prises en charge par moteur est absente."
Assert-Has $native 'MeasurePathFileCap' "Le plafond de mesure n'est plus une constante nommée."
Assert-Has $native 'lastMeasureTruncated' "L'indicateur de mesure partielle a disparu."

# --- Identifiants de paquet durcis (beta.2) ---
Assert-Has $native '^[A-Za-z0-9][A-Za-z0-9.+_-]*$' "La regex durcie des identifiants de paquet a été retirée de l'hôte."
Assert-Missing $native 'Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")' "Un identifiant de paquet non ancré sur un caractère alphanumérique est de retour."

Write-Host "Durcissement de l'onglet Maintenance : marqueurs présents." -ForegroundColor Green
