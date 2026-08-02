$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8

foreach ($token in @("open-disk-folder", "quarantine-disk-folder", "diskScanTargets", "GetAuthorizedDiskTarget", "Profile-")) {
    if (-not $native.Contains($token)) { throw "Protection native absente : $token" }
}
if ($native -notmatch 'IsSafeDiskCleanupFolder[\s\S]*?\.cache') {
    throw "Le nettoyage ne limite pas explicitement la cible au cache autorise."
}
if ($native -notmatch 'Path\.GetDirectoryName\(full\).*profile') {
    throw "La cible n'est pas limitee a un dossier direct du profil utilisateur."
}
if ($native -notmatch 'EnsureNoReparsePoints\(full,profile\)') {
    throw "La protection contre les liens de reanalyse est absente."
}
foreach ($token in @('data-disk-action="open"', 'data-disk-action="clean"', 'confirmDiskFolderCleanup', 'disk-folder-action')) {
    if (-not $js.Contains($token)) { throw "Interface de stockage incomplete : $token" }
}
foreach ($symbol in @("tool-open-folder", "tool-safe-clean")) {
    if ($html -notmatch ('id="' + $symbol + '"')) { throw "Icone stockage absente : $symbol" }
}
if ($css -notmatch '\.disk-item-actions' -or $css -notmatch '\.disk-clean-confirm') {
    throw "Styles des actions de stockage absents."
}

Write-Host "Actions prudentes sur les dossiers volumineux : OK"
