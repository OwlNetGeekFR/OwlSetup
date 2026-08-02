$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$app = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$hostCode = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

foreach ($id in @("historyRetention","securityLogRetention","clearAllHistory","historyClearOverlay","contextHelpPopover")) {
    if ($html -notmatch ('id="' + $id + '"')) { throw "History or help control missing: $id" }
}
if ($app -notmatch 'function syncHistoryRetention' -or $app -notmatch 'action:"clear-history"') {
    throw "History synchronization or clear action is missing."
}
if ($hostCode -notmatch 'void ClearHistory\(\)' -or $hostCode -notmatch 'action == "clear-history"') {
    throw "Native history clear handler is missing."
}
if (($html | Select-String -Pattern 'class="help-hint"' -AllMatches).Matches.Count -lt 6) {
    throw "Not enough contextual help buttons."
}

Write-Host "History retention and contextual help: OK"
