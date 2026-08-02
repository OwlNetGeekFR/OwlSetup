$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$script = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw

foreach ($required in @(
    'function saveProfile()',
    'function loadProfile()',
    'profilePackages.map(id=>apps.find',
    '.filter(Boolean)',
    'localStorage.removeItem(customPackagesStorageKey)'
)) {
    if (-not $script.Contains($required)) {
        throw "Controle des profils de catalogue incomplet : $required"
    }
}

foreach ($removed in @('forEach(id=>addCustomAppDefinition(id))','customPackagesStorageKey,onboardingStorageKey')) {
    if ($script.Contains($removed)) {
        throw "Un profil ou une sauvegarde peut encore restaurer un paquet libre : $removed"
    }
}

Write-Host "Profils limites aux applications du catalogue OwlSetup : controle reussi." -ForegroundColor Green
