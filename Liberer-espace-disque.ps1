# OwlSetup - Nettoyage du disque
param(
    [string]$ChoicesFile,
    [switch]$Integrated,
    [string]$LogPath
)

$ErrorActionPreference = "Continue"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    $choiceArg = if ($ChoicesFile) { " -ChoicesFile `"$ChoicesFile`"" } else { "" }
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"$choiceArg"
    exit
}

$choices = if ($ChoicesFile -and (Test-Path -LiteralPath $ChoicesFile)) {
    @(Get-Content -LiteralPath $ChoicesFile -Raw | ConvertFrom-Json)
} else {
    @("user-temp", "windows-temp", "recycle-bin", "delivery")
}
if ($ChoicesFile) { Remove-Item -LiteralPath $ChoicesFile -Force -ErrorAction SilentlyContinue }

$Host.UI.RawUI.WindowTitle = "OwlSetup - Nettoyage du disque"
$logs = Join-Path $env:LOCALAPPDATA "PCSetup\Logs"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$log = if ($LogPath) { $LogPath } else { Join-Path $logs ("PC-Setup-Nettoyage-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log") }
Start-Transcript -Path $log -Force

function Run-Step([string]$Label, [scriptblock]$Action) {
    Write-Host "`nNettoyage : $Label" -ForegroundColor Yellow
    try {
        & $Action
        Write-Host "Termine : $Label" -ForegroundColor Green
    } catch {
        Write-Host "Ignore : $Label - certains fichiers sont peut-etre utilises." -ForegroundColor DarkYellow
    }
}

function Clear-Folder([string]$Path, [string]$Label) {
    Run-Step $Label {
        if (Test-Path -LiteralPath $Path) {
            $root = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
            if (($root.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Lien symbolique refuse : $Path" }
            Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue |
                Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0 } |
                Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

$drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$before = [math]::Round($drive.FreeSpace / 1GB, 2)
Write-Host "OWLSETUP - LIBERATION D'ESPACE" -ForegroundColor Cyan
Write-Host "Espace libre actuel : $before Go"
Write-Host "Vos documents personnels et le dossier Telechargements ne seront pas touches." -ForegroundColor Cyan
if ("recycle-bin" -in $choices) { Write-Host "Le contenu de la Corbeille sera supprime." -ForegroundColor Yellow }
$confirm = if ($Integrated) { "OUI" } else { Read-Host "Tapez OUI pour commencer" }
if ($confirm -ne "OUI") {
    Stop-Transcript
    exit
}

if ("user-temp" -in $choices) { Write-Output "PCSETUP_STAGE|user-temp|Fichiers temporaires utilisateur"; Clear-Folder -Path $env:TEMP -Label "Fichiers temporaires utilisateur" }
if ("windows-temp" -in $choices) { Write-Output "PCSETUP_STAGE|windows-temp|Fichiers temporaires Windows"; Clear-Folder -Path (Join-Path $env:WINDIR "Temp") -Label "Fichiers temporaires Windows" }
if ("recycle-bin" -in $choices) { Write-Output "PCSETUP_STAGE|recycle-bin|Corbeille"; Run-Step "Corbeille" { Clear-RecycleBin -Force -ErrorAction Stop } }
if ("delivery" -in $choices) { Write-Output "PCSETUP_STAGE|delivery|Cache d'optimisation de livraison"; Run-Step "Cache d'optimisation de livraison" {
    if (Get-Command Delete-DeliveryOptimizationCache -ErrorAction SilentlyContinue) {
        Delete-DeliveryOptimizationCache -Force
    } else {
        Write-Host "Fonction non disponible sur cette version de Windows."
    }
} }
if ("components" -in $choices) {
    Write-Output "PCSETUP_STAGE|components|Anciens composants Windows"
    Run-Step "Anciens composants Windows" {
        Start-Process dism.exe -ArgumentList "/Online", "/Cleanup-Image", "/StartComponentCleanup", "/NoRestart" -Wait -NoNewWindow
    }
}
if ("app-leftovers" -in $choices) {
    Write-Output "PCSETUP_STAGE|app-leftovers|Résidus d'applications désinstallées"
    if ($Integrated) { & (Join-Path $PSScriptRoot "Nettoyer-residus-applications.ps1") -Integrated }
    else { & (Join-Path $PSScriptRoot "Nettoyer-residus-applications.ps1") }
}

$drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$after = [math]::Round($drive.FreeSpace / 1GB, 2)
$gained = [math]::Round($after - $before, 2)
Write-Host "`nNettoyage termine. Espace recupere : $gained Go" -ForegroundColor Cyan
Write-Host "Rapport : $log"
Write-Output "PCSETUP_RESULT|$gained"
Stop-Transcript
if (-not $Integrated) { Read-Host "Appuyez sur Entree pour fermer" }
