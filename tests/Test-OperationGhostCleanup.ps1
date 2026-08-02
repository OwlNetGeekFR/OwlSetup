$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$script = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8

$required = @(
    'if(item.status==="running"&&item.id!==activeId)',
    'status:"interrupted"',
    'if(!active)active=operationFeed.find(item=>item.status==="running")||null;',
    'running+failed',
    'item.status==="interrupted"?'
)

foreach ($token in $required) {
    if (-not $script.Contains($token)) {
        throw "Nettoyage des opérations fantômes absent : $token"
    }
}

Write-Host "Les opérations fantômes sont réconciliées sans faux badge." -ForegroundColor Green
