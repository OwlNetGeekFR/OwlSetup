$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8

$symbols = @(
    "security-integrity", "security-origin", "security-signature",
    "security-package", "security-webview", "security-worker",
    "security-defender", "security-firewall", "security-privileges"
)
foreach ($symbol in $symbols) {
    if (-not $html.Contains(('id="' + $symbol + '"'))) { throw "Security icon missing: $symbol" }
    if (-not $html.Contains(('href="#' + $symbol + '"'))) { throw "Security icon unused: $symbol" }
}

if (-not $css.Contains('.security-icon svg')) { throw "Security SVG styling is missing." }
if (-not $js.Contains('severity==="info"')) { throw "Informational security state is not rendered." }
if ($native -match 'signatureState=="unsigned"\)recommendations\.Add') {
    throw "An unsigned stable build still creates a permanent action notification."
}

Write-Host "Security center icons and unsigned status: OK" -ForegroundColor Green
