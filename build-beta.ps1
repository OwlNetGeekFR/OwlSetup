param(
    [string]$Version = "3.6.0-beta.4"
)

$ErrorActionPreference = "Stop"

if ($Version -notmatch '^(\d+\.\d+\.\d+)-([A-Za-z0-9.-]+)$') {
    throw "Utilisez un numéro comme 3.4.0-beta.3."
}

$appVersion = $Matches[1]
$label = $Matches[2]
$artifactFolder = Join-Path $PSScriptRoot "artifacts\beta"
$output = Join-Path $artifactFolder ("OwlSetup-Beta-"+$Version+".exe")

& (Join-Path $PSScriptRoot "build.ps1") `
    -Output $output `
    -AppVersion $appVersion `
    -Channel beta `
    -PrereleaseLabel $label

if (-not (Test-Path -LiteralPath $output)) {
    throw "L'exécutable bêta n'a pas été créé."
}

$hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
$commit = try { (& git -C $PSScriptRoot rev-parse --short HEAD 2>$null) } catch { "inconnu" }
$info = @(
    "OwlSetup $Version"
    "Canal : bêta locale, non publiée"
    "Commit : $commit"
    "Compilation : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
    "SHA-256 : $hash"
    ""
    "Fichier à tester : $output"
)
$info | Set-Content -LiteralPath (Join-Path $artifactFolder "BETA-INFO.txt") -Encoding UTF8

Write-Host ""
Write-Host "Bêta prête à tester, sans publication GitHub :" -ForegroundColor Cyan
Write-Host $output -ForegroundColor Green
Write-Host "SHA-256 : $hash"
