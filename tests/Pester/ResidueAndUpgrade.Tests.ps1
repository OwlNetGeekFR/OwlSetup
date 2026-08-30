# Tests de COMPORTEMENT : residus d'applications et mise a jour (lot 4).
#
# Deuxieme moitie des scripts d'operation. Comme la premiere, les fonctions
# sont chargees avec -AsModule, qui definit sans executer.
#
# Pester 3.4 (livre avec Windows) : syntaxe `Should Be`, pas `Should -Be`.

$racine = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Describe "Nettoyer-residus : normalisation des noms" {

    . (Join-Path $racine "Nettoyer-residus-applications.ps1") -AsModule

    It "retire la ponctuation et met en minuscules" {
        Get-OwlSetupNormalizedAppName "VideoLAN VLC 3.0" | Should Be "videolanvlc30"
    }

    It "retire aussi les caracteres accentues" {
        # Comportement assume : la comparaison est volontairement grossiere.
        Get-OwlSetupNormalizedAppName "Café" | Should Be "caf"
    }

    It "rend une chaine vide pour un nom sans caractere alphanumerique" {
        Get-OwlSetupNormalizedAppName "---" | Should Be ""
    }
}

Describe "Nettoyer-residus : selection des candidats" {

    . (Join-Path $racine "Nettoyer-residus-applications.ps1") -AsModule

    $maintenant = Get-Date "2026-08-30"
    $ancien = $maintenant.AddDays(-200)
    $recent = $maintenant.AddDays(-10)

    It "propose un dossier ancien sans application correspondante" {
        Test-OwlSetupResidueCandidate -FolderName "VieilleAppli" -LastWriteTime $ancien -InstalledNames @("videolanvlc") -Now $maintenant | Should Be $true
    }

    It "ecarte un dossier recent" {
        Test-OwlSetupResidueCandidate -FolderName "VieilleAppli" -LastWriteTime $recent -InstalledNames @() -Now $maintenant | Should Be $false
    }

    It "ecarte un lien symbolique" {
        Test-OwlSetupResidueCandidate -FolderName "VieilleAppli" -LastWriteTime $ancien -IsReparsePoint -InstalledNames @() -Now $maintenant | Should Be $false
    }

    It "ecarte un dossier protege" {
        foreach ($nom in @("Packages", "Microsoft", "Temp", "CrashDumps", "VirtualStore")) {
            Test-OwlSetupResidueCandidate -FolderName $nom -LastWriteTime $ancien -InstalledNames @() -Now $maintenant | Should Be $false
        }
    }

    It "ecarte un nom trop court" {
        Test-OwlSetupResidueCandidate -FolderName "abc" -LastWriteTime $ancien -InstalledNames @() -Now $maintenant | Should Be $false
    }

    It "ecarte un dossier cache commencant par un point" {
        Test-OwlSetupResidueCandidate -FolderName ".config" -LastWriteTime $ancien -InstalledNames @() -Now $maintenant | Should Be $false
    }

    It "ecarte un dossier dont le nom contient une application installee" {
        # « vlcmedia » contient « vlc » : l'application est probablement encore la.
        Test-OwlSetupResidueCandidate -FolderName "VlcMedia" -LastWriteTime $ancien -InstalledNames @("vlc") -Now $maintenant | Should Be $false
    }

    It "ecarte un dossier contenu dans le nom d'une application installee" {
        # Rapprochement dans l'autre sens : « vlc » est contenu dans
        # « videolanvlcmediaplayer ».
        Test-OwlSetupResidueCandidate -FolderName "Vlc" -LastWriteTime $ancien -InstalledNames @("videolanvlcmediaplayer") -Now $maintenant | Should Be $false
    }

    It "ignore les entrees vides de la liste installee" {
        Test-OwlSetupResidueCandidate -FolderName "VieilleAppli" -LastWriteTime $ancien -InstalledNames @("", $null) -Now $maintenant | Should Be $true
    }
}

Describe "Nettoyer-residus : nom de quarantaine attendu par l'hote C#" {

    . (Join-Path $racine "Nettoyer-residus-applications.ps1") -AsModule

    # RestoreQuarantine (OwlSetupWebView.cs) relit ce prefixe pour savoir ou
    # remettre le dossier. Si les deux cotes divergent, la restauration echoue
    # silencieusement : ce test tient les deux ensemble.
    It "prefixe Local- pour LOCALAPPDATA" {
        Get-OwlSetupQuarantineName -Root "C:\Users\X\AppData\Local" -FolderName "Appli" | Should Be "Local-Appli"
    }
    It "prefixe Roaming- pour APPDATA" {
        Get-OwlSetupQuarantineName -Root "C:\Users\X\AppData\Roaming" -FolderName "Appli" | Should Be "Roaming-Appli"
    }
    It "prefixe ProgramData- pour PROGRAMDATA" {
        Get-OwlSetupQuarantineName -Root "C:\ProgramData" -FolderName "Appli" | Should Be "ProgramData-Appli"
    }

    It "utilise des prefixes que l'hote C# sait restaurer" {
        $native = Get-Content -LiteralPath (Join-Path $racine "OwlSetupWebView.cs") -Raw -Encoding UTF8
        foreach ($root in @("C:\Users\X\AppData\Local", "C:\Users\X\AppData\Roaming", "C:\ProgramData")) {
            $prefixe = (Get-OwlSetupQuarantineName -Root $root -FolderName "Appli") -replace "-Appli$", ""
            $native.Contains('StartsWith("' + $prefixe + '-"') | Should Be $true
        }
    }
}

Describe "Mettre-a-jour-mon-PC : issue de la mise a jour" {

    . (Join-Path $racine "Mettre-a-jour-mon-PC.ps1") -AsModule

    It "signale l'absence de winget" {
        Get-OwlSetupUpgradeOutcome -WingetAvailable $false -ExitCode 0 | Should Be "winget-absent"
    }
    It "considere le code 0 comme une reussite" {
        Get-OwlSetupUpgradeOutcome -WingetAvailable $true -ExitCode 0 | Should Be "reussi"
    }
    It "demande une verification sur un code non nul" {
        Get-OwlSetupUpgradeOutcome -WingetAvailable $true -ExitCode 1 | Should Be "a-verifier"
        Get-OwlSetupUpgradeOutcome -WingetAvailable $true -ExitCode -1978335189 | Should Be "a-verifier"
    }
}

Describe "Mettre-a-jour-mon-PC : winget simule" {

    . (Join-Path $racine "Mettre-a-jour-mon-PC.ps1") -AsModule

    # Le flux ecrit a l ecran : on le neutralise pour garder la sortie de la
    # suite lisible.
    Mock Write-Host {}

    It "n'appelle pas winget quand il est absent" {
        Mock Test-OwlSetupWingetAvailable { return $false }
        Mock Invoke-OwlSetupWingetUpgradeAll { return 0 }
        $resultat = Invoke-OwlSetupUpgradeStep
        $resultat | Should Be "winget-absent"
        Assert-MockCalled Invoke-OwlSetupWingetUpgradeAll -Times 0
    }

    It "appelle winget une fois et rend reussi sur code 0" {
        Mock Test-OwlSetupWingetAvailable { return $true }
        Mock Invoke-OwlSetupWingetUpgradeAll { return 0 }
        $resultat = Invoke-OwlSetupUpgradeStep
        $resultat | Should Be "reussi"
        Assert-MockCalled Invoke-OwlSetupWingetUpgradeAll -Times 1
    }

    It "rend a-verifier quand winget renvoie un code non nul" {
        Mock Test-OwlSetupWingetAvailable { return $true }
        Mock Invoke-OwlSetupWingetUpgradeAll { return 1 }
        Invoke-OwlSetupUpgradeStep | Should Be "a-verifier"
    }
}
