$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$i18n = Get-Content -LiteralPath (Join-Path $root "i18n.js") -Raw -Encoding UTF8

foreach ($translation in @(
    "Operations center",
    "Applications detected by WinGet, including unknown versions",
    "Close safely and retry",
    "Windows temporary files",
    "Privacy preview",
    "Show technical details",
    "Artificial intelligence",
    "Virtualization",
    "Private browsing with built-in ad blocking",
    "Run AI models locally on your PC"
)) {
    if (-not $i18n.Contains(('"' + $translation + '"'))) {
        throw "Important English translation missing: $translation"
    }
}

if ($i18n -notmatch 'const englishPatterns = \[') {
    throw "Dynamic English translations are missing."
}
if ($i18n -notmatch 'translate: translateValue') {
    throw "Public translation API does not use the enhanced engine."
}

# Couverture reelle : chaque chaine francaise affichable depuis index.html doit
# avoir une traduction anglaise (ou etre couverte par un motif dynamique).
# Sans ce controle, le test passait alors que 328 chaines restaient en francais.
$node = Get-Command node -ErrorAction SilentlyContinue
$audit = Join-Path $root "beta\scripts\audit-i18n.mjs"
if ($node -and (Test-Path $audit)) {
    & $node.Source $audit --check
    if ($LASTEXITCODE -ne 0) { throw "Des chaines de index.html n ont pas de traduction anglaise." }
}
else {
    Write-Host "Audit de couverture ignore (Node absent)." -ForegroundColor Yellow
}

Write-Host "Enhanced English translation: OK"
