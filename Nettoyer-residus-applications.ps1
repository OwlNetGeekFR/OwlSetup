param(
    [switch]$Integrated,
    # Charge les fonctions sans rien executer, pour les tests.
    [switch]$AsModule
)

# OwlSetup - Residus d'applications desinstallees
# Les dossiers retenus sont deplaces en quarantaine, jamais supprimes directement.
$ErrorActionPreference = "Continue"

# Dossiers systeme ou partages : jamais proposes, meme anciens et sans
# application correspondante.
$script:OwlSetupProtectedFolders = @(
    "packages", "microsoft", "temp", "crashdumps", "d3dscache", "history",
    "inetcache", "cookies", "virtualstore", "applicationdata", "localsettings",
    "connecteddevicesplatform", "comms"
)
$script:OwlSetupResidueMinimumAgeDays = 90
$script:OwlSetupResidueMinimumNameLength = 4

function Get-OwlSetupNormalizedAppName {
    param([string]$Value)
    # Les caracteres accentues disparaissent (« Café » -> « caf ») : la
    # comparaison reste volontairement grossiere, elle sert a rapprocher un nom
    # de dossier d'un nom affiche dans la base de desinstallation.
    return ($Value -replace "[^a-zA-Z0-9]", "").ToLowerInvariant()
}

function Test-OwlSetupResidueCandidate {
    <#
        Un dossier n'est propose que s'il est ancien, ordinaire, assez long,
        hors liste protegee, et qu'AUCUNE application installee ne lui
        ressemble. Le rapprochement se fait dans les deux sens : « vlcmedia »
        correspond a « vlc » comme l'inverse.
    #>
    param(
        [string]$FolderName,
        [datetime]$LastWriteTime,
        [switch]$IsReparsePoint,
        [string[]]$InstalledNames,
        [datetime]$Now = (Get-Date)
    )
    if ($IsReparsePoint) { return $false }
    if ($LastWriteTime -ge $Now.AddDays(-$script:OwlSetupResidueMinimumAgeDays)) { return $false }
    if ($FolderName.StartsWith(".")) { return $false }
    $name = Get-OwlSetupNormalizedAppName $FolderName
    if ($name.Length -lt $script:OwlSetupResidueMinimumNameLength) { return $false }
    if ($script:OwlSetupProtectedFolders -contains $name) { return $false }
    foreach ($installed in @($InstalledNames)) {
        if (-not $installed) { continue }
        if ($installed.Contains($name) -or $name.Contains($installed)) { return $false }
    }
    return $true
}

function Get-OwlSetupQuarantineName {
    <#
        Le nom porte l'emplacement d'origine en prefixe : c'est ce prefixe que
        RestoreQuarantine (OwlSetupWebView.cs) relit pour savoir ou remettre le
        dossier. Local- / Roaming- / ProgramData- doivent donc rester alignes
        entre les deux cotes.
    #>
    param([string]$Root, [string]$FolderName)
    return ((Split-Path $Root -Leaf) + "-" + $FolderName)
}

if ($AsModule) { return }

if ($Integrated) {
    throw "Le nettoyage intégré sans validation individuelle est désactivé. Utilisez la désinstallation ciblée d'OwlSetup."
}

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
Start-Transcript -Path $log -Force

$uninstallKeys = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
$installed = Get-ItemProperty $uninstallKeys -ErrorAction SilentlyContinue |
    Where-Object DisplayName |
    ForEach-Object { Get-OwlSetupNormalizedAppName $_.DisplayName }

$roots = @($env:LOCALAPPDATA, $env:APPDATA, $env:PROGRAMDATA) | Select-Object -Unique
$moved = 0

Write-Host "OWLSETUP - RESIDUS D'APPLICATIONS" -ForegroundColor Cyan
Write-Host "Seuls les dossiers vieux de plus de 90 jours sans application correspondante seront proposes."
Write-Host "Chaque deplacement demandera votre confirmation et restera reversible." -ForegroundColor Yellow

foreach ($root in $roots) {
    Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue |
        ForEach-Object {
            $folder = $_
            $isLink = ($folder.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
            if (Test-OwlSetupResidueCandidate -FolderName $folder.Name -LastWriteTime $folder.LastWriteTime -IsReparsePoint:$isLink -InstalledNames $installed) {
                Write-Host "`nCandidat ancien : $($folder.FullName)" -ForegroundColor Cyan
                Write-Host "Derniere modification : $($folder.LastWriteTime)"
                $answer = Read-Host "Deplacer en quarantaine ? Tapez OUI"
                if ($answer -eq "OUI") {
                    New-Item -ItemType Directory -Path $quarantine -Force | Out-Null
                    $destination = Join-Path $quarantine (Get-OwlSetupQuarantineName -Root $root -FolderName $folder.Name)
                    if (Test-Path -LiteralPath $destination) {
                        $destination += "-" + [guid]::NewGuid().ToString("N").Substring(0, 6)
                    }
                    Move-Item -LiteralPath $folder.FullName -Destination $destination -ErrorAction SilentlyContinue
                    $moved++
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
Stop-Transcript
Read-Host "Appuyez sur Entree pour fermer"
