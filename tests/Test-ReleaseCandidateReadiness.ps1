$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$node = Get-Command node -ErrorAction Stop

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    Write-Host "[$Label]" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label a échoué avec le code $LASTEXITCODE."
    }
}

Invoke-CheckedCommand "Syntaxe app.js" {
    & $node.Source --check (Join-Path $root "app.js")
}
Invoke-CheckedCommand "Syntaxe i18n.js" {
    & $node.Source --check (Join-Path $root "i18n.js")
}
Invoke-CheckedCommand "Syntaxe catalog.generated.js" {
    & $node.Source --check (Join-Path $root "catalog.generated.js")
}
Invoke-CheckedCommand "Catalogue" {
    & $node.Source (Join-Path $root "tools\check-catalog.mjs")
}
$catalogSync = Join-Path $root "beta\scripts\build-catalog.mjs"
if (Test-Path $catalogSync) {
    Invoke-CheckedCommand "Catalogue genere synchronise" {
        & $node.Source $catalogSync --check
    }
}

$excludedLifecycleTests = @(
    "Test-ReleaseCandidateReadiness.ps1"
)
$tests = Get-ChildItem -LiteralPath $PSScriptRoot -Filter "Test-*.ps1" -File |
    Where-Object { $_.Name -notin $excludedLifecycleTests } |
    Sort-Object Name

foreach ($test in $tests) {
    Invoke-CheckedCommand $test.BaseName {
        & powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $test.FullName
    }
}

$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$ids = [regex]::Matches($html, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$duplicates = $ids | Group-Object | Where-Object Count -gt 1 | Select-Object -ExpandProperty Name
if ($duplicates) {
    throw "Identifiants HTML dupliqués : $($duplicates -join ', ')"
}

$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$selectors = [regex]::Matches($js, '\$\("#([A-Za-z0-9_-]+)"\)') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique
$missingSelectors = $selectors | Where-Object { $_ -notin $ids }
if ($missingSelectors) {
    throw "Sélecteurs sans élément HTML : $($missingSelectors -join ', ')"
}

Write-Host ""
Write-Host "Préparation de la Release Candidate : OK" -ForegroundColor Green
Write-Host "Les essais destructifs (installation, désinstallation et nettoyage) restent à réaliser sur le PC de test." -ForegroundColor Yellow
