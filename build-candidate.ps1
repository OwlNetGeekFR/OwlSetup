param(
    [string]$Version = "3.7.0-rc.1"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if ($Version -notmatch '^(\d+\.\d+\.\d+)-(rc\.\d+)$') {
    throw "Utilisez un numéro de Release Candidate comme 3.7.0-rc.1."
}

$appVersion = $Matches[1]
$label = $Matches[2]
$candidateFolder = Join-Path $root "artifacts\candidate"
$output = Join-Path $candidateFolder ("OwlSetup-" + $Version + ".exe")
$readinessTest = Join-Path $root "tests\Test-ReleaseCandidateReadiness.ps1"

& powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $readinessTest
if ($LASTEXITCODE -ne 0) {
    throw "Les contrôles de préparation ont échoué. La Release Candidate n'a pas été créée."
}

& (Join-Path $root "build.ps1") `
    -Output $output `
    -AppVersion $appVersion `
    -Channel beta `
    -PrereleaseLabel $label

if (-not (Test-Path -LiteralPath $output)) {
    throw "L'exécutable Release Candidate n'a pas été créé."
}

$file = Get-Item -LiteralPath $output
$hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash
if ($file.Length -lt 1MB) {
    throw "L'exécutable Release Candidate est anormalement petit."
}
if ($file.VersionInfo.ProductVersion -ne $Version) {
    throw "La version intégrée est incorrecte : $($file.VersionInfo.ProductVersion)."
}

@(
    "OwlSetup $Version"
    "Canal : Release Candidate locale, non publiée"
    "Compilation : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
    "Fichier : $output"
    "Taille : $($file.Length) octets"
    "SHA-256 : $hash"
    ""
    "Cette version ne doit pas être renommée stable avant la validation du PC de test."
) | Set-Content -LiteralPath (Join-Path $candidateFolder "CANDIDATE-INFO.txt") -Encoding UTF8

Write-Host ""
Write-Host "Release Candidate prête, sans publication GitHub :" -ForegroundColor Cyan
Write-Host $output -ForegroundColor Green
Write-Host "SHA-256 : $hash"
