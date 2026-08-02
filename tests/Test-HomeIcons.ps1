$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8

$requiredSymbols = @("nav-install", "nav-update", "nav-cleanup", "nav-residue", "nav-quarantine", "nav-check")
foreach ($symbol in $requiredSymbols) {
    if ($html -notmatch ('href="#' + [regex]::Escape($symbol) + '"')) {
        throw "Icone d'accueil absente : $symbol"
    }
}

if ($html -match 'class="feature-icon">[^<]') {
    throw "Une ancienne icone typographique subsiste dans une carte d'accueil."
}
if ($css -notmatch '\.feature-icon svg,.health-metric-icon svg') {
    throw "Le style SVG des icones d'accueil est absent."
}

Write-Host "Icones d'accueil : OK"
