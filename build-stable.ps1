param(
    [string]$Version = "3.5.0"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    throw "La version stable doit utiliser le format majeur.mineur.correctif, par exemple 3.5.0."
}

& (Join-Path $root "build-installer.ps1") -Version $Version

$application = Join-Path $root "OwlSetup.exe"
$installer = Join-Path $root "artifacts\installer\OwlSetup-Setup.exe"
$releaseFolder = Join-Path $root ("artifacts\stable\" + $Version)
$portableOutput = Join-Path $releaseFolder ("OwlSetup-" + $Version + ".exe")
$installerOutput = Join-Path $releaseFolder ("OwlSetup-Setup-" + $Version + ".exe")
$checksumOutput = Join-Path $releaseFolder "SHA256.txt"
$infoOutput = Join-Path $releaseFolder "STABLE-INFO.txt"
$releaseNotesSource = Join-Path $root ("RELEASE-NOTES-" + $Version + ".md")
$releaseNotesOutput = Join-Path $releaseFolder "RELEASE-NOTES.md"

if (-not (Test-Path -LiteralPath $application) -or -not (Test-Path -LiteralPath $installer)) {
    throw "La compilation stable n'a pas produit tous les fichiers attendus."
}

New-Item -ItemType Directory -Force -Path $releaseFolder | Out-Null
Copy-Item -LiteralPath $application -Destination $portableOutput -Force
Copy-Item -LiteralPath $installer -Destination $installerOutput -Force
if (Test-Path -LiteralPath $releaseNotesSource) {
    Copy-Item -LiteralPath $releaseNotesSource -Destination $releaseNotesOutput -Force
}

$portableHash = (Get-FileHash -LiteralPath $portableOutput -Algorithm SHA256).Hash
$installerHash = (Get-FileHash -LiteralPath $installerOutput -Algorithm SHA256).Hash
@(
    "$portableHash  $(Split-Path $portableOutput -Leaf)"
    "$installerHash  $(Split-Path $installerOutput -Leaf)"
) | Set-Content -LiteralPath $checksumOutput -Encoding ascii

$portableInfo = Get-Item -LiteralPath $portableOutput
if ($portableInfo.VersionInfo.ProductVersion -ne $Version) {
    throw "La version du binaire est incorrecte : $($portableInfo.VersionInfo.ProductVersion)."
}
if ($portableInfo.Length -lt 1MB -or (Get-Item -LiteralPath $installerOutput).Length -lt 1MB) {
    throw "Un fichier stable généré est anormalement petit."
}

@(
    "OwlSetup $Version"
    "Canal : stable locale, non publiée"
    "Compilation : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
    "Application : $(Split-Path $portableOutput -Leaf)"
    "SHA-256 application : $portableHash"
    "Installateur : $(Split-Path $installerOutput -Leaf)"
    "SHA-256 installateur : $installerHash"
) | Set-Content -LiteralPath $infoOutput -Encoding UTF8

Write-Host ""
Write-Host "Version stable OwlSetup prête, sans publication GitHub :" -ForegroundColor Cyan
Write-Host $releaseFolder -ForegroundColor Green
Write-Host "SHA-256 application : $portableHash"
Write-Host "SHA-256 installateur : $installerHash"
