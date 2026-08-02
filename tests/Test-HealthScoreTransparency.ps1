$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8

$requiredHtml = @(
    'id="healthDetails"',
    'id="healthDetailsModal"',
    'id="healthDetailsScore"',
    'id="healthDetailsList"'
)
foreach ($value in $requiredHtml) {
    if (-not $html.Contains($value)) { throw "Transparence du score absente du HTML : $value" }
}

$requiredJs = @('getHealthBreakdown', 'openHealthDetails', 'deductions.updates', 'restartPenalty')
foreach ($value in $requiredJs) {
    if (-not $js.Contains($value)) { throw "Détail du score absent de l’interface : $value" }
}

$requiredNative = @('updatePenalty', 'diskPenalty', 'restartPenalty', 'scanPenalty', 'deductions=new')
foreach ($value in $requiredNative) {
    if (-not $native.Contains($value)) { throw "Détail du calcul absent du moteur : $value" }
}

if (-not $css.Contains('.health-details-dialog')) { throw "Design du détail du score absent." }

Write-Host "Transparence du score de maintenance : OK" -ForegroundColor Green
