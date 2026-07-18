param([switch]$Integrated)
# OwlSetup - Residus d'applications desinstallees
# Les dossiers retenus sont deplaces en quarantaine, jamais supprimes directement.
$ErrorActionPreference = "Continue"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

$Host.UI.RawUI.WindowTitle = "OwlSetup - Residus d'applications"
$stamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$dataRoot = Join-Path $env:LOCALAPPDATA "PCSetup"
$logs = Join-Path $dataRoot "Logs"
$quarantineRoot = Join-Path $dataRoot "Quarantine"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
New-Item -ItemType Directory -Path $quarantineRoot -Force | Out-Null
$log = Join-Path $logs "PC-Setup-Residus-$stamp.log"
$quarantine = Join-Path $quarantineRoot "PC-Setup-Quarantaine-$stamp"
if (-not $Integrated) { Start-Transcript -Path $log -Force }

function Normalize-AppName([string]$Value) {
    return ($Value -replace "[^a-zA-Z0-9]", "").ToLowerInvariant()
}

$uninstallKeys = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
$installed = Get-ItemProperty $uninstallKeys -ErrorAction SilentlyContinue |
    Where-Object DisplayName |
    ForEach-Object { Normalize-AppName $_.DisplayName }

$protected = @(
    "packages", "microsoft", "temp", "crashdumps", "d3dscache", "history",
    "inetcache", "cookies", "virtualstore", "applicationdata", "localsettings",
    "connecteddevicesplatform", "comms"
)
$roots = @($env:LOCALAPPDATA, $env:APPDATA, $env:PROGRAMDATA) | Select-Object -Unique
$moved = 0

Write-Host "OWLSETUP - RESIDUS D'APPLICATIONS" -ForegroundColor Cyan
Write-Host "Seuls les dossiers vieux de plus de 90 jours sans application correspondante seront proposes."
Write-Host "Chaque deplacement demandera votre confirmation et restera reversible." -ForegroundColor Yellow

foreach ($root in $roots) {
    Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue |
        Where-Object LastWriteTime -lt (Get-Date).AddDays(-90) |
        Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0 } |
        ForEach-Object {
            $folder = $_
            $name = Normalize-AppName $folder.Name
            if ($name.Length -ge 4 -and $name -notin $protected -and -not $folder.Name.StartsWith(".")) {
                $match = $installed | Where-Object { $_ -and ($_.Contains($name) -or $name.Contains($_)) } | Select-Object -First 1
                if (-not $match) {
                    Write-Host "`nCandidat ancien : $($folder.FullName)" -ForegroundColor Cyan
                    Write-Host "Derniere modification : $($folder.LastWriteTime)"
                    $answer = if ($Integrated) { "OUI" } else { Read-Host "Deplacer en quarantaine ? Tapez OUI" }
                    if ($answer -eq "OUI") {
                        New-Item -ItemType Directory -Path $quarantine -Force | Out-Null
                        $destination = Join-Path $quarantine ((Split-Path $root -Leaf) + "-" + $folder.Name)
                        if (Test-Path -LiteralPath $destination) {
                            $destination += "-" + [guid]::NewGuid().ToString("N").Substring(0, 6)
                        }
                        Move-Item -LiteralPath $folder.FullName -Destination $destination -ErrorAction SilentlyContinue
                        $moved++
                    }
                }
            }
        }
}

Write-Host "`nAnalyse terminee : $moved dossier(s) place(s) en quarantaine." -ForegroundColor Green
if ($moved -gt 0) {
    Write-Host "Quarantaine : $quarantine" -ForegroundColor Yellow
    Write-Host "Gardez-la quelques jours. Si tout fonctionne, vous pourrez la supprimer manuellement."
}
Write-Host "Rapport : $log"
if (-not $Integrated) {
    Stop-Transcript
    Read-Host "Appuyez sur Entree pour fermer"
}
