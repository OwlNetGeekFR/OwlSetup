param(
    [string]$PackagesFile,
    [string]$PackageList,
    # Charge les fonctions sans rien executer, pour les tests.
    [switch]$AsModule
)

$ErrorActionPreference = "Continue"

# Un identifiant de paquet doit COMMENCER par un caractere alphanumerique.
# Sans cette contrainte, « -Force » ou « --source » passent la validation et
# winget les lit comme des drapeaux, pas comme un nom de paquet. Meme regle que
# app.js et OwlSetupWebView.cs (durcissement 4.0.0-beta.2).
$script:OwlSetupPackageIdPattern = '^[A-Za-z0-9][A-Za-z0-9.+_-]*$'

function Get-OwlSetupPackageIds {
    param([Parameter(ValueFromPipeline = $true)][object[]]$Raw)
    @($Raw) |
        ForEach-Object { [string]$_ } |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -match $script:OwlSetupPackageIdPattern } |
        Select-Object -Unique
}

function Read-OwlSetupPackageSelection {
    param([string]$PackagesFile, [string]$PackageList)
    $raw = if ($PackageList) {
        $PackageList -split ';'
    } elseif ($PackagesFile -and (Test-Path -LiteralPath $PackagesFile)) {
        @(Get-Content -LiteralPath $PackagesFile -Raw | ConvertFrom-Json)
    } else {
        @()
    }
    Get-OwlSetupPackageIds -Raw $raw
}

if ($AsModule) { return }

$packages = Read-OwlSetupPackageSelection -PackagesFile $PackagesFile -PackageList $PackageList
if ($PackagesFile) { Remove-Item -LiteralPath $PackagesFile -Force -ErrorAction SilentlyContinue }

if (@($packages).Count -eq 0) { Write-Host "Aucun logiciel valide." -ForegroundColor Red; Read-Host "Entree pour fermer"; exit 1 }
$logs = Join-Path $env:LOCALAPPDATA "PCSetup\Logs"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$log = Join-Path $logs ("PC-Setup-Installation-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
Start-Transcript -Path $log -Force
$Host.UI.RawUI.WindowTitle = "OwlSetup - Installation"

Write-Host "OWLSETUP - INSTALLATION" -ForegroundColor Cyan
Write-Host "$(@($packages).Count) logiciel(s) selectionne(s) :"
$packages | ForEach-Object { Write-Host " - $_" }
$confirm = Read-Host "Tapez OUI pour commencer"
if ($confirm -ne "OUI") { Stop-Transcript; exit }

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget est introuvable. Installez App Installer depuis Microsoft Store." -ForegroundColor Red
} else {
    foreach ($package in $packages) {
        Write-Host "`nInstallation : $package" -ForegroundColor Yellow
        winget install --id $package --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
        if ($LASTEXITCODE -eq 0) { Write-Host "Termine : $package" -ForegroundColor Green }
        else { Write-Host "A verifier : $package (code $LASTEXITCODE)" -ForegroundColor DarkYellow }
    }
}
Write-Host "`nOperation terminee. Rapport : $log" -ForegroundColor Cyan
Stop-Transcript
Read-Host "Appuyez sur Entree pour fermer"
