$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

foreach ($required in @(
    'WscGetSecurityProviderHealth',
    'WscSecurityProviderFirewall = 0x1',
    'WscSecurityProviderAntivirus = 0x4',
    '"antivirusActive",antivirusActive',
    '"firewallManagedByWsc",firewallHealthAvailable'
)) {
    if (-not $native.Contains($required)) { throw "Missing Windows Security Center integration: $required" }
}

if (-not $html.Contains('PROTECTION ANTIVIRUS')) { throw "The antivirus card is still Defender-specific." }
if (-not $html.Contains('PROTECTION PARE-FEU')) { throw "The firewall card is still Windows-specific." }
if (-not $js.Contains('message.antivirusActive??message.defenderActive')) { throw "The UI does not consume aggregate antivirus health." }
if (-not $js.Contains('message.antivirusManagedByWsc')) { throw "The aggregate antivirus provider source is not explained." }
if (-not $js.Contains('message.firewallManagedByWsc')) { throw "The aggregate firewall provider source is not explained." }
if ($html -notmatch '<span>Red.marrage</span><b id="systemRestart"') { throw "The restart label is still redundant." }
if ($js -notmatch 'message\.restartPending \? "N.cessaire" : "Non requis"') { throw "The restart value is not concise." }

Write-Host "Third-party antivirus/firewall recognition and restart wording: OK" -ForegroundColor Green
