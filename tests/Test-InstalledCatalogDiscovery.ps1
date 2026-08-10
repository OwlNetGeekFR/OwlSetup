$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$frontend = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

$checks = @(
    @{ Name = "inventaire WinGet complet"; Text = $native; Token = 'winget.exe","list --accept-source-agreements --disable-interactivity' },
    @{ Name = "métadonnées découvertes"; Text = $native; Token = 'discovered=!catalog.ContainsKey(id)' },
    @{ Name = "nom des applications découvertes"; Text = $native; Token = 'name=catalog.ContainsKey(id)?catalog[id]' },
    @{ Name = "icône locale transmise"; Text = $native; Token = 'iconData=discoveredById.ContainsKey(id)' },
    @{ Name = "extraction sécurisée des icônes Windows"; Text = $native; Token = 'string ReadInstalledIconData(string displayIcon)' },
    @{ Name = "fusion dans le catalogue"; Text = $frontend; Token = 'function mergeDiscoveredInstalledApps' },
    @{ Name = "categorie locale"; Text = $frontend; Token = 'discoveredInstalled: true' },
    @{ Name = "icône Windows utilisée en secours"; Text = $frontend; Token = 'brand.logo || item.iconData || ""' },
    @{ Name = "avertissement réservé aux résultats externes"; Text = $frontend; Token = 'app.externalWinget&&!app.discoveredInstalled' },
    @{ Name = "retrait des cartes obsolètes"; Text = $frontend; Token = 'apps.splice(index, 1)' },
    @{ Name = "désinstallation limitée aux paquets vérifiés"; Text = $frontend; Token = 'wingetManageableApps.has(id)' }
)

foreach ($check in $checks) {
    if (-not $check.Text.Contains($check.Token)) {
        throw "Contrôle manquant ($($check.Name)) : $($check.Token)"
    }
}

Write-Host "Catalogue des applications installées : OK" -ForegroundColor Green
