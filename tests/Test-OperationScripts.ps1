$ErrorActionPreference = "Stop"

# Tests de COMPORTEMENT des quatre scripts d'operation (lot 4).
#
# Les tests historiques du depot verifient surtout la presence de chaines dans
# le source. Ceux-ci executent le code : chaque script se charge avec
# -AsModule, qui definit ses fonctions sans rien lancer, puis on verifie ce
# qu'elles font vraiment.
#
# Sans Pester, a dessein : les runners GitHub embarquent Pester 5, dont la
# syntaxe differe de celle de Pester 3.4 livre avec Windows. Voir
# tests/lib/Assert.ps1.

$racine = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "lib\Assert.ps1")

# ---------------------------------------------------------------------------
Start-TestGroup "Installer-selection : validation des identifiants"
. (Join-Path $racine "Installer-selection.ps1") -AsModule

Invoke-TestCase "accepte un identifiant WinGet normal" {
    Assert-Equal "VideoLAN.VLC" (Get-OwlSetupPackageIds -Raw @("VideoLAN.VLC"))
}

Invoke-TestCase "refuse un identifiant commencant par un tiret" {
    # Sans cette regle, winget lirait « -Force » comme un drapeau.
    Assert-Equal 0 @(Get-OwlSetupPackageIds -Raw @("-Force")).Count
    Assert-Equal 0 @(Get-OwlSetupPackageIds -Raw @("--source")).Count
}

Invoke-TestCase "refuse un identifiant commencant par un point, un underscore ou un plus" {
    Assert-Equal 0 @(Get-OwlSetupPackageIds -Raw @(".hidden", "_x", "+y")).Count
}

Invoke-TestCase "refuse les caracteres hors du jeu autorise" {
    Assert-Equal 0 @(Get-OwlSetupPackageIds -Raw @("a b", "a;b", "a&b", "a|b", 'a"b')).Count
}

Invoke-TestCase "garde les identifiants valides d'une liste mixte" {
    $ids = @(Get-OwlSetupPackageIds -Raw @("VideoLAN.VLC", "-Force", "7zip.7zip", "a b"))
    Assert-Equal 2 $ids.Count
    Assert-True ($ids -contains "VideoLAN.VLC")
    Assert-True ($ids -contains "7zip.7zip")
}

Invoke-TestCase "coupe les espaces autour et deduplique" {
    $ids = @(Get-OwlSetupPackageIds -Raw @("  VideoLAN.VLC  ", "VideoLAN.VLC"))
    Assert-Equal 1 $ids.Count
    Assert-Equal "VideoLAN.VLC" $ids[0]
}

Invoke-TestCase "lit une liste separee par des points-virgules" {
    Assert-Equal 2 @(Read-OwlSetupPackageSelection -PackageList "VideoLAN.VLC;7zip.7zip;-Force").Count
}

Invoke-TestCase "rend une liste vide quand aucune source n'est fournie" {
    Assert-Equal 0 @(Read-OwlSetupPackageSelection).Count
}

Invoke-TestCase "lit un fichier JSON de selection" {
    $fichier = Join-Path $env:TEMP ("owlsetup-pkg-" + [Guid]::NewGuid().ToString("N") + ".json")
    try {
        '["VideoLAN.VLC","--source","7zip.7zip"]' | Set-Content -LiteralPath $fichier -Encoding UTF8
        Assert-Equal 2 @(Read-OwlSetupPackageSelection -PackagesFile $fichier).Count
    }
    finally { Remove-Item -LiteralPath $fichier -Force -ErrorAction SilentlyContinue }
}

# ---------------------------------------------------------------------------
Start-TestGroup "Liberer-espace-disque : choix de nettoyage"
. (Join-Path $racine "Liberer-espace-disque.ps1") -AsModule

Invoke-TestCase "retombe sur les zones par defaut sans fichier de choix" {
    $zones = @(Get-OwlSetupCleanupChoices)
    Assert-True ($zones -contains "user-temp")
    # Les composants Windows (DISM) sont longs : jamais implicites.
    Assert-False ($zones -contains "components")
}

Invoke-TestCase "ignore une zone inconnue" {
    $fichier = Join-Path $env:TEMP ("owlsetup-zones-" + [Guid]::NewGuid().ToString("N") + ".json")
    try {
        '["user-temp","c:\\windows","tout"]' | Set-Content -LiteralPath $fichier -Encoding UTF8
        $zones = @(Get-OwlSetupCleanupChoices -ChoicesFile $fichier)
        Assert-Equal 1 $zones.Count
        Assert-Equal "user-temp" $zones[0]
    }
    finally { Remove-Item -LiteralPath $fichier -Force -ErrorAction SilentlyContinue }
}

# ---------------------------------------------------------------------------
Start-TestGroup "Liberer-espace-disque : suppression du contenu d'un dossier"

$base = Join-Path $env:TEMP ("owlsetup-clean-" + [Guid]::NewGuid().ToString("N"))
$cible = Join-Path $base "cible"
$zone = Join-Path $base "zone"

function Reset-Bac {
    $lien = Join-Path $zone "lien"
    if (Test-Path -LiteralPath $lien) { cmd /c rmdir "$lien" | Out-Null }
    if (Test-Path -LiteralPath $base) { Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Path $cible -Force | Out-Null
    New-Item -ItemType Directory -Path $zone -Force | Out-Null
    "precieux" | Set-Content -LiteralPath (Join-Path $cible "ne-pas-supprimer.txt")
    "jetable" | Set-Content -LiteralPath (Join-Path $zone "temporaire.txt")
}

try {
    Reset-Bac
    Invoke-TestCase "supprime les fichiers ordinaires de la zone" {
        Remove-OwlSetupFolderContent -Path $zone
        Assert-False (Test-Path -LiteralPath (Join-Path $zone "temporaire.txt"))
        Assert-True (Test-Path -LiteralPath $zone)
    }

    Reset-Bac
    Invoke-TestCase "laisse intacte la cible d'une jonction presente dans la zone" {
        # Verifie le CONTRAT (la cible survit), pas l'implementation : retirer le
        # filtre sur les points d'analyse ne fait pas echouer ce test sur
        # PowerShell 5.1, ou Remove-Item -Recurse ne traverse pas une jonction.
        # Le filtre reste de la defense en profondeur.
        $lien = Join-Path $zone "lien"
        cmd /c mklink /J "$lien" "$cible" | Out-Null
        Remove-OwlSetupFolderContent -Path $zone
        Assert-True (Test-Path -LiteralPath (Join-Path $cible "ne-pas-supprimer.txt"))
    }

    Reset-Bac
    Invoke-TestCase "refuse de vider un dossier qui est lui-meme une jonction" {
        $lien = Join-Path $zone "lien"
        cmd /c mklink /J "$lien" "$cible" | Out-Null
        Assert-Throws { Remove-OwlSetupFolderContent -Path $lien }
        Assert-True (Test-Path -LiteralPath (Join-Path $cible "ne-pas-supprimer.txt"))
    }

    Reset-Bac
    Invoke-TestCase "ne fait rien sur un chemin inexistant" {
        Assert-DoesNotThrow { Remove-OwlSetupFolderContent -Path (Join-Path $base "absent") }
    }
}
finally {
    $lien = Join-Path $zone "lien"
    if (Test-Path -LiteralPath $lien) { cmd /c rmdir "$lien" | Out-Null }
    if (Test-Path -LiteralPath $base) { Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue }
}

# ---------------------------------------------------------------------------
Start-TestGroup "Nettoyer-residus : normalisation des noms"
. (Join-Path $racine "Nettoyer-residus-applications.ps1") -AsModule

Invoke-TestCase "retire la ponctuation et met en minuscules" {
    Assert-Equal "videolanvlc30" (Get-OwlSetupNormalizedAppName "VideoLAN VLC 3.0")
}

Invoke-TestCase "retire aussi les caracteres accentues" {
    # Comportement assume : la comparaison est volontairement grossiere.
    Assert-Equal "caf" (Get-OwlSetupNormalizedAppName ([char]0x43 + [char]0x61 + [char]0x66 + [char]0xE9))
}

Invoke-TestCase "rend une chaine vide pour un nom sans caractere alphanumerique" {
    Assert-Equal "" (Get-OwlSetupNormalizedAppName "---")
}

# ---------------------------------------------------------------------------
Start-TestGroup "Nettoyer-residus : selection des candidats"

$maintenant = Get-Date "2026-08-30"
$ancien = $maintenant.AddDays(-200)
$recent = $maintenant.AddDays(-10)

Invoke-TestCase "propose un dossier ancien sans application correspondante" {
    Assert-True (Test-OwlSetupResidueCandidate -FolderName "VieilleAppli" -LastWriteTime $ancien -InstalledNames @("videolanvlc") -Now $maintenant)
}

Invoke-TestCase "ecarte un dossier recent" {
    Assert-False (Test-OwlSetupResidueCandidate -FolderName "VieilleAppli" -LastWriteTime $recent -InstalledNames @() -Now $maintenant)
}

Invoke-TestCase "ecarte un lien symbolique" {
    Assert-False (Test-OwlSetupResidueCandidate -FolderName "VieilleAppli" -LastWriteTime $ancien -IsReparsePoint -InstalledNames @() -Now $maintenant)
}

Invoke-TestCase "ecarte un dossier protege" {
    foreach ($nom in @("Packages", "Microsoft", "Temp", "CrashDumps", "VirtualStore")) {
        Assert-False (Test-OwlSetupResidueCandidate -FolderName $nom -LastWriteTime $ancien -InstalledNames @() -Now $maintenant) $nom
    }
}

Invoke-TestCase "ecarte un nom trop court" {
    Assert-False (Test-OwlSetupResidueCandidate -FolderName "abc" -LastWriteTime $ancien -InstalledNames @() -Now $maintenant)
}

Invoke-TestCase "ecarte un dossier cache commencant par un point" {
    Assert-False (Test-OwlSetupResidueCandidate -FolderName ".config" -LastWriteTime $ancien -InstalledNames @() -Now $maintenant)
}

Invoke-TestCase "ecarte un dossier dont le nom contient une application installee" {
    # « vlcmedia » contient « vlc » : l'application est probablement encore la.
    Assert-False (Test-OwlSetupResidueCandidate -FolderName "VlcMedia" -LastWriteTime $ancien -InstalledNames @("vlc") -Now $maintenant)
}

Invoke-TestCase "ecarte un dossier contenu dans le nom d'une application installee" {
    Assert-False (Test-OwlSetupResidueCandidate -FolderName "Vlc" -LastWriteTime $ancien -InstalledNames @("videolanvlcmediaplayer") -Now $maintenant)
}

Invoke-TestCase "ignore les entrees vides de la liste installee" {
    Assert-True (Test-OwlSetupResidueCandidate -FolderName "VieilleAppli" -LastWriteTime $ancien -InstalledNames @("", $null) -Now $maintenant)
}

# ---------------------------------------------------------------------------
Start-TestGroup "Nettoyer-residus : nom de quarantaine attendu par l'hote C#"

Invoke-TestCase "prefixe Local- pour LOCALAPPDATA" {
    Assert-Equal "Local-Appli" (Get-OwlSetupQuarantineName -Root "C:\Users\X\AppData\Local" -FolderName "Appli")
}
Invoke-TestCase "prefixe Roaming- pour APPDATA" {
    Assert-Equal "Roaming-Appli" (Get-OwlSetupQuarantineName -Root "C:\Users\X\AppData\Roaming" -FolderName "Appli")
}
Invoke-TestCase "prefixe ProgramData- pour PROGRAMDATA" {
    Assert-Equal "ProgramData-Appli" (Get-OwlSetupQuarantineName -Root "C:\ProgramData" -FolderName "Appli")
}

Invoke-TestCase "utilise des prefixes que l'hote C# sait restaurer" {
    # RestoreQuarantine (OwlSetupWebView.cs) relit ce prefixe pour savoir ou
    # remettre le dossier. Si les deux cotes divergent, la restauration echoue
    # silencieusement : ce test les tient ensemble.
    $native = Get-Content -LiteralPath (Join-Path $racine "OwlSetupWebView.cs") -Raw -Encoding UTF8
    foreach ($root in @("C:\Users\X\AppData\Local", "C:\Users\X\AppData\Roaming", "C:\ProgramData")) {
        $prefixe = (Get-OwlSetupQuarantineName -Root $root -FolderName "Appli") -replace "-Appli$", ""
        Assert-True ($native.Contains('StartsWith("' + $prefixe + '-"')) $prefixe
    }
}

# ---------------------------------------------------------------------------
Start-TestGroup "Mettre-a-jour-mon-PC : issue de la mise a jour"
. (Join-Path $racine "Mettre-a-jour-mon-PC.ps1") -AsModule

Invoke-TestCase "signale l'absence de winget" {
    Assert-Equal "winget-absent" (Get-OwlSetupUpgradeOutcome -WingetAvailable $false -ExitCode 0)
}
Invoke-TestCase "considere le code 0 comme une reussite" {
    Assert-Equal "reussi" (Get-OwlSetupUpgradeOutcome -WingetAvailable $true -ExitCode 0)
}
Invoke-TestCase "demande une verification sur un code non nul" {
    Assert-Equal "a-verifier" (Get-OwlSetupUpgradeOutcome -WingetAvailable $true -ExitCode 1)
    Assert-Equal "a-verifier" (Get-OwlSetupUpgradeOutcome -WingetAvailable $true -ExitCode -1978335189)
}

# ---------------------------------------------------------------------------
Start-TestGroup "Mettre-a-jour-mon-PC : winget simule"

# Simulation sans Pester : on redefinit les deux fonctions d'enveloppe dans la
# portee courante. Invoke-OwlSetupUpgradeStep les resout par leur nom au moment
# de l'appel, donc ce sont bien ces versions qui s'executent - winget n'est
# jamais lance.
$script:wingetAppels = 0
$script:wingetDisponible = $true
$script:wingetCode = 0
function Test-OwlSetupWingetAvailable { return $script:wingetDisponible }
function Invoke-OwlSetupWingetUpgradeAll { $script:wingetAppels++; return $script:wingetCode }

Invoke-TestCase "n'appelle pas winget quand il est absent" {
    $script:wingetAppels = 0; $script:wingetDisponible = $false
    $resultat = Invoke-OwlSetupUpgradeStep 6>$null
    Assert-Equal "winget-absent" $resultat
    Assert-Equal 0 $script:wingetAppels "winget ne doit pas etre appele"
}

Invoke-TestCase "appelle winget une fois et rend reussi sur code 0" {
    $script:wingetAppels = 0; $script:wingetDisponible = $true; $script:wingetCode = 0
    $resultat = Invoke-OwlSetupUpgradeStep 6>$null
    Assert-Equal "reussi" $resultat
    Assert-Equal 1 $script:wingetAppels
}

Invoke-TestCase "rend a-verifier quand winget renvoie un code non nul" {
    $script:wingetAppels = 0; $script:wingetDisponible = $true; $script:wingetCode = 1
    Assert-Equal "a-verifier" (Invoke-OwlSetupUpgradeStep 6>$null)
}

# ---------------------------------------------------------------------------
Complete-TestRun "Scripts d'operation"
Write-Host "Comportement des scripts d'operation : verifie." -ForegroundColor Green
