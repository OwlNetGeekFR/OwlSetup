$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$frontend = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$styles = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8

$checks = @(
    @{ Name = "avertissement externe masque apres installation"; Text = $frontend; Token = 'app.externalWinget&&!app.discoveredInstalled&&!installed' },
    @{ Name = "reserve verticale des cartes externes"; Text = $styles; Token = '.app-card.installed:has(.winget-catalog-source)' },
    @{ Name = "couleur de la vue installee"; Text = $styles; Token = '.catalog-scope[data-catalog-scope="installed"]' },
    @{ Name = "couleur de la vue systeme"; Text = $styles; Token = '.catalog-scope[data-catalog-scope="system"]' },
    @{ Name = "couleur des navigateurs"; Text = $styles; Token = '.filter[data-category="Navigateurs"]' },
    @{ Name = "couleur des applications externes"; Text = $styles; Token = '.external-catalog-notice' },
    @{ Name = "barre du catalogue en grille"; Text = $styles; Token = '#catalog .catalog-tools{' },
    @{ Name = "categories visibles sans defilement horizontal"; Text = $styles; Token = '#catalog .catalog-search-intro{' },
    @{ Name = "explication de la recherche globale"; Text = $html; Token = "OwlSetup consulte d" }
)

foreach ($check in $checks) {
    if (-not $check.Text.Contains($check.Token)) {
        throw "Controle manquant ($($check.Name)) : $($check.Token)"
    }
}

Write-Host "Alignement et couleurs du catalogue : OK" -ForegroundColor Green
