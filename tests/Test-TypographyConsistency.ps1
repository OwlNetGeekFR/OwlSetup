$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$stylesPath = Join-Path $root "styles.css"
$styles = Get-Content -LiteralPath $stylesPath -Raw -Encoding UTF8

$required = @(
    '--owl-font-ui:',
    '--owl-font-mono:',
    'button,input,select,textarea,',
    '.health-ring strong,.feature-copy strong,.summary-number strong,',
    '.install-location-picker input,.help-hint',
    'font-family:var(--owl-font-ui)',
    'font-family:var(--owl-font-mono)'
)

foreach ($token in $required) {
    if (-not $styles.Contains($token)) {
        throw "Normalisation typographique absente : $token"
    }
}

if ($styles -match 'fonts\.googleapis\.com|fonts\.gstatic\.com') {
    throw "Une police distante est encore chargee par OwlSetup."
}

$normalizationIndex = $styles.IndexOf('/* Typographie OwlSetup')
$legacyIndex = $styles.LastIndexOf('font-family:Manrope')
if ($normalizationIndex -lt 0 -or $normalizationIndex -lt $legacyIndex) {
    throw "La normalisation doit rester apres les anciens styles afin de les remplacer."
}

Write-Host "Typographie OwlSetup coherente et disponible hors ligne." -ForegroundColor Green
