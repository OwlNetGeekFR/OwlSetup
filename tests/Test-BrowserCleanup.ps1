$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw
$js = Get-Content -LiteralPath (Join-Path $root 'app.js') -Raw
$native = Get-Content -LiteralPath (Join-Path $root 'OwlSetupWebView.cs') -Raw

function Assert-Contains([string]$Text, [string]$Value, [string]$Message) {
    if (-not $Text.Contains($Value)) { throw $Message }
}

Assert-Contains $html 'id="browsers"' 'La vue de nettoyage des navigateurs est absente.'
Assert-Contains $html 'id="browserCleanupModal"' 'La confirmation de nettoyage des navigateurs est absente.'
Assert-Contains $html 'mots de passe, favoris, extensions' 'Les protections utilisateur ne sont pas expliquées.'
Assert-Contains $html 'id="selectAllBrowsers"' 'La sélection globale des navigateurs est absente.'
Assert-Contains $html 'data-browser-preset="recommended"' 'Le profil de nettoyage recommandé est absent.'
Assert-Contains $html 'id="browserAnalysisBreakdown"' 'La ventilation de l’analyse est absente.'
Assert-Contains $html 'id="openBrowserCleanupReport"' 'L’accès au rapport après nettoyage est absent.'
Assert-Contains $html 'Que contient chaque catégorie ?' 'L’explication des catégories de données est absente.'
Assert-Contains $html 'id="browserAnalysisProtection"' 'La séparation entre données supprimées et protégées est absente.'
Assert-Contains $html 'Mots de passe' 'La protection explicite des mots de passe est absente.'
Assert-Contains $html 'id="browserHistorySyncWarning"' 'L’avertissement concernant l’historique synchronisé est absent.'
Assert-Contains $html 'Historique synchronisé : il peut réapparaître' 'Le risque de restauration par synchronisation n’est pas expliqué.'
Assert-Contains $js 'action:"scan-browser-data"' 'La détection native des navigateurs n’est pas appelée.'
Assert-Contains $js 'action:"analyze-browser-data"' 'L’analyse native des navigateurs n’est pas appelée.'
Assert-Contains $js 'action:"cleanup-browser-data"' 'Le nettoyage natif des navigateurs n’est pas appelé.'
Assert-Contains $js 'browserLogoFiles' 'Les logos des navigateurs ne sont pas intégrés.'
Assert-Contains $js 'item.running?"Ouvert":"Prêt"' 'L’état ouvert ou prêt du navigateur n’est pas affiché.'
Assert-Contains $js 'categories.includes("history")' 'L’avertissement de synchronisation ne suit pas la sélection de l’historique.'
Assert-Contains $native 'BrowserCleanupPlan' 'Le plan de nettoyage temporaire est absent.'
Assert-Contains $native 'EnsureNoReparsePoints(target.Path,target.Root)' 'La protection contre les liens symboliques est absente.'
Assert-Contains $native 'DateTime.UtcNow.AddMinutes(5)' 'L’expiration de la confirmation est absente.'
Assert-Contains $native '"History-wal","History-shm"' 'Les fichiers SQLite secondaires de l’historique Chromium ne sont pas couverts.'

$targetMethod = [regex]::Match($native, 'IEnumerable<string> BrowserRelativeTargets[\s\S]*?void AnalyzeBrowserData').Value
foreach ($protectedName in @('Login Data','Bookmarks','Extensions','places.sqlite','Downloads')) {
    if ($targetMethod.Contains('new[]{"' + $protectedName)) { throw "Une donnée protégée est ciblée : $protectedName" }
}

Write-Host 'Nettoyage des navigateurs : interface, confirmation et garde-fous validés.' -ForegroundColor Green
