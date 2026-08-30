# OwlSetup - Mise a jour complete du PC
param(
    # Charge les fonctions sans rien executer, pour les tests.
    [switch]$AsModule
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

function Test-OwlSetupWingetAvailable {
    return [bool](Get-Command winget -ErrorAction SilentlyContinue)
}

# Enveloppe l'appel reel : c'est le point que les tests remplacent pour ne pas
# lancer winget sur la machine.
function Invoke-OwlSetupWingetUpgradeAll {
    winget source update
    winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
    return $LASTEXITCODE
}

function Get-OwlSetupUpgradeOutcome {
    <#
        Traduit (winget present ?, code de sortie) en un etat stable.
        Fonction pure : c'est elle qui porte la decision, pas le flux.
    #>
    param([bool]$WingetAvailable, [int]$ExitCode)
    if (-not $WingetAvailable) { return "winget-absent" }
    if ($ExitCode -eq 0) { return "reussi" }
    return "a-verifier"
}

function Invoke-OwlSetupUpgradeStep {
    $available = Test-OwlSetupWingetAvailable
    if (-not $available) {
        $outcome = Get-OwlSetupUpgradeOutcome -WingetAvailable $false -ExitCode 0
    }
    else {
        Write-Host "`n[1/2] Mise a jour de tous les logiciels..." -ForegroundColor Yellow
        $code = Invoke-OwlSetupWingetUpgradeAll
        $outcome = Get-OwlSetupUpgradeOutcome -WingetAvailable $true -ExitCode $code
    }
    switch ($outcome) {
        "reussi"        { Write-Host "Logiciels mis a jour." -ForegroundColor Green }
        "a-verifier"    { Write-Host "Certaines applications necessitent peut-etre une action manuelle." -ForegroundColor DarkYellow }
        "winget-absent" { Write-Host "winget est absent. Installez App Installer depuis le Microsoft Store." -ForegroundColor Red }
    }
    return $outcome
}

if ($AsModule) { return }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

$Host.UI.RawUI.WindowTitle = "OwlSetup - Mise a jour complete"
$logs = Join-Path $env:LOCALAPPDATA "PCSetup\Logs"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$log = Join-Path $logs ("PC-Setup-Update-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
Start-Transcript -Path $log -Force

Write-Host "OWLSETUP - MISE A JOUR COMPLETE" -ForegroundColor Cyan
Write-Host "Ne fermez pas cette fenetre pendant l'operation."

Invoke-OwlSetupUpgradeStep | Out-Null

Write-Host "`n[2/2] Lancement de Windows Update..." -ForegroundColor Yellow
try {
    $autoUpdate = New-Object -ComObject Microsoft.Update.AutoUpdate
    $autoUpdate.DetectNow()
    Start-Process "ms-settings:windowsupdate"
    Write-Host "Validez les mises a jour et pilotes proposes dans les Parametres." -ForegroundColor Cyan
} catch {
    Write-Host "Impossible de lancer Windows Update : $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nOperation terminee. Rapport : $log" -ForegroundColor Cyan
Write-Host "Redemarrez le PC si Windows le demande." -ForegroundColor Yellow
Stop-Transcript
Read-Host "Appuyez sur Entree pour fermer"
