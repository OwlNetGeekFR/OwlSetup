$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$app = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw
$hostCode = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw

foreach ($removed in @('id="customPackageId"','id="installCustomPackage"','function addCustomPackage()','function addCustomAppDefinition(')) {
    if ($html.Contains($removed) -or $app.Contains($removed)) {
        throw "L'ajout libre de paquets WinGet est encore present : $removed"
    }
}

foreach ($required in @(
    'localStorage.removeItem(customPackagesStorageKey)',
    '.filter(Boolean)',
    'ResolveInstalledWingetPackage',
    'RunUninstallWithFallbacks(resolvedPackageId,report)'
)) {
    if (-not ($app.Contains($required) -or $hostCode.Contains($required))) {
        throw "Protection du catalogue ou de la desinstallation absente : $required"
    }
}

Write-Host "Catalogue controle : ajout libre retire et anciennes entrees purgees." -ForegroundColor Green
