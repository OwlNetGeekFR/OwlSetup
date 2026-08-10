$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$frontend = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$styles = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8

$checks = @(
    @{ Name = "navigation par type de catalogue"; Text = $html; Token = 'id="catalogScopes"' },
    @{ Name = "filtre des composants systeme"; Text = $frontend; Token = 'function isSystemComponentApp' },
    @{ Name = "categorisation automatique"; Text = $frontend; Token = 'function inferInstalledCategory' },
    @{ Name = "categorie de secours"; Text = $frontend; Token = '"Autres applications"' },
    @{ Name = "conservation du choix de catalogue"; Text = $frontend; Token = 'owlsetup-catalog-scope-v1' },
    @{ Name = "resultats WinGet externes visibles"; Text = $frontend; Token = 'app.externalWinget===true&&!app.discoveredInstalled' },
    @{ Name = "mise en forme des trois vues"; Text = $styles; Token = '.catalog-scopes' }
)

foreach ($check in $checks) {
    if (-not $check.Text.Contains($check.Token)) {
        throw "Controle manquant ($($check.Name)) : $($check.Token)"
    }
}

Write-Host "Vues et categories du catalogue : OK" -ForegroundColor Green
