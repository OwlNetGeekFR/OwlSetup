param(
    [string]$Version = "3.5.0",
    [switch]$SkipApplicationBuild
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "La version doit utiliser le format majeur.mineur.correctif, par exemple 3.4.1."
}

$application = Join-Path $root "OwlSetup.exe"
$installerScript = Join-Path $root "installer\OwlSetup.iss"
$outputFolder = Join-Path $root "artifacts\installer"
$installer = Join-Path $outputFolder "OwlSetup-Setup.exe"

if (-not $SkipApplicationBuild) {
    & (Join-Path $root "build.ps1") -Output $application -AppVersion $Version -Channel stable
}
if (-not (Test-Path -LiteralPath $application)) {
    throw "OwlSetup.exe est introuvable. Compilez l'application avant l'installateur."
}

$isccCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe"),
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)
$iscc = $isccCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $iscc) {
    throw "Inno Setup 6 est requis. Installez le paquet JRSoftware.InnoSetup avec WinGet."
}

New-Item -ItemType Directory -Force -Path $outputFolder | Out-Null
& $iscc "/DMyAppVersion=$Version" $installerScript
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $installer)) {
    throw "La compilation de l'installateur a échoué."
}

$applicationHash = (Get-FileHash -LiteralPath $application -Algorithm SHA256).Hash
$installerHash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash
Write-Host ""
Write-Host "Installateur OwlSetup prêt : $installer" -ForegroundColor Green
Write-Host "Version : $Version"
Write-Host "SHA-256 application : $applicationHash"
Write-Host "SHA-256 installateur : $installerHash"
