# OwlSetup - Mise a jour complete du PC
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

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

if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "`n[1/2] Mise a jour de tous les logiciels..." -ForegroundColor Yellow
    winget source update
    winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Logiciels mis a jour." -ForegroundColor Green
    } else {
        Write-Host "Certaines applications necessitent peut-etre une action manuelle." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "winget est absent. Installez App Installer depuis le Microsoft Store." -ForegroundColor Red
}

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
