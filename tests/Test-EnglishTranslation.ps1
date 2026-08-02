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

Write-Host "Enhanced English translation: OK"
