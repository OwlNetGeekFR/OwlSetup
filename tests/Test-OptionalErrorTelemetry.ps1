$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content (Join-Path $root 'index.html') -Raw -Encoding UTF8
$app = Get-Content (Join-Path $root 'app.js') -Raw -Encoding UTF8
$program = Get-Content (Join-Path $root 'OwlSetup-Dashboard\Program.cs') -Raw -Encoding UTF8
$store = Get-Content (Join-Path $root 'OwlSetup-Dashboard\Services\DashboardStore.cs') -Raw -Encoding UTF8
$dashboard = Get-Content (Join-Path $root 'OwlSetup-Dashboard\Pages\Index.cshtml') -Raw -Encoding UTF8

function Assert-Contains([string]$Text, [string]$Expected, [string]$Message) {
    if (-not $Text.Contains($Expected)) { throw $Message }
}

Assert-Contains $index 'name="errorTelemetryMode" value="never" checked' 'La télémétrie doit être désactivée par défaut.'
Assert-Contains $index 'name="errorTelemetryMode" value="ask"' 'Le mode avec confirmation est absent.'
Assert-Contains $index 'name="errorTelemetryMode" value="automatic"' 'Le mode automatique minimal est absent.'
Assert-Contains $index 'data-view="troubleshooting"' 'The manual troubleshooting view must remain available.'
Assert-Contains $index 'connect-src https://owlsetup-dashboard-owlnetgeekfr.onrender.com' 'La CSP ne limite pas explicitement la destination de télémétrie.'

Assert-Contains $app 'owlsetup-error-telemetry-v1' 'La préférence locale de télémétrie est absente.'
Assert-Contains $app '/api/telemetry/errors' 'Le point de réception des erreurs est absent.'
Assert-Contains $app 'schemaVersion: 2' 'Le client doit utiliser le diagnostic minimal v2.'
Assert-Contains $app 'credentials: "omit"' 'Telemetry requests must not send cookies.'
Assert-Contains $app 'referrerPolicy: "no-referrer"' 'Telemetry requests must not send a referrer.'
if ($app -match 'minimalTelemetrySample[\s\S]{0,1600}(userName|filePath|logContent|installedApps)\s*:') {
    throw 'Le diagnostic minimal contient une donnée personnelle ou un inventaire interdit.'
}

Assert-Contains $program 'RequireRateLimiting("telemetry")' 'La réception anonyme doit être limitée en débit.'
Assert-Contains $program 'UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow' 'Les champs inattendus doivent être refusés.'
Assert-Contains $program 'ContentLength is > 8192' 'La taille des rapports doit être limitée.'
Assert-Contains $program 'input.SchemaVersion is not (1 or 2)' 'La compatibilité avec les rapports v1 doit être conservée.'
Assert-Contains $store 'error-telemetry.json' 'Le stockage privé des diagnostics est absent.'
Assert-Contains $dashboard 'id="tab-telemetry"' 'La vue Diagnostics du dashboard est absente.'

Write-Host 'OK - télémétrie facultative, minimale et contrôlée.' -ForegroundColor Green
