# Tests de COMPORTEMENT des scripts d'operation (lot 4).
#
# Les tests historiques de ce depot verifient surtout la presence de chaines
# dans le source. Ceux-ci executent le code : les scripts se chargent avec
# -AsModule, qui definit les fonctions sans rien lancer, puis on verifie ce
# qu'elles font vraiment.
#
# Pester 3.4 (livre avec Windows) : syntaxe `Should Be`, pas `Should -Be`.

$racine = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Describe "Installer-selection : validation des identifiants de paquet" {

    . (Join-Path $racine "Installer-selection.ps1") -AsModule

    It "accepte un identifiant WinGet normal" {
        (Get-OwlSetupPackageIds -Raw @("VideoLAN.VLC")) | Should Be "VideoLAN.VLC"
    }

    It "refuse un identifiant qui commence par un tiret" {
        # Sans cette regle, winget lirait « -Force » comme un drapeau et non
        # comme un nom de paquet.
        @(Get-OwlSetupPackageIds -Raw @("-Force")).Count | Should Be 0
        @(Get-OwlSetupPackageIds -Raw @("--source")).Count | Should Be 0
    }

    It "refuse un identifiant qui commence par un point, un underscore ou un plus" {
        @(Get-OwlSetupPackageIds -Raw @(".hidden", "_x", "+y")).Count | Should Be 0
    }

    It "refuse les caracteres hors du jeu autorise" {
        @(Get-OwlSetupPackageIds -Raw @("a b", "a;b", "a&b", "a|b", "a`"b")).Count | Should Be 0
    }

    It "garde les identifiants valides d'une liste mixte" {
        $ids = @(Get-OwlSetupPackageIds -Raw @("VideoLAN.VLC", "-Force", "7zip.7zip", "a b"))
        $ids.Count | Should Be 2
        $ids -contains "VideoLAN.VLC" | Should Be $true
        $ids -contains "7zip.7zip" | Should Be $true
    }

    It "coupe les espaces autour et deduplique" {
        $ids = @(Get-OwlSetupPackageIds -Raw @("  VideoLAN.VLC  ", "VideoLAN.VLC"))
        $ids.Count | Should Be 1
        $ids[0] | Should Be "VideoLAN.VLC"
    }

    It "lit une liste separee par des points-virgules" {
        $ids = @(Read-OwlSetupPackageSelection -PackageList "VideoLAN.VLC;7zip.7zip;-Force")
        $ids.Count | Should Be 2
    }

    It "rend une liste vide quand aucune source n'est fournie" {
        @(Read-OwlSetupPackageSelection).Count | Should Be 0
    }

    It "lit un fichier JSON de selection" {
        $fichier = Join-Path $env:TEMP ("owlsetup-pkg-" + [Guid]::NewGuid().ToString("N") + ".json")
        try {
            '["VideoLAN.VLC","--source","7zip.7zip"]' | Set-Content -LiteralPath $fichier -Encoding UTF8
            $ids = @(Read-OwlSetupPackageSelection -PackagesFile $fichier)
            $ids.Count | Should Be 2
        }
        finally { Remove-Item -LiteralPath $fichier -Force -ErrorAction SilentlyContinue }
    }
}

Describe "Liberer-espace-disque : choix de nettoyage" {

    . (Join-Path $racine "Liberer-espace-disque.ps1") -AsModule

    It "retombe sur les zones par defaut sans fichier de choix" {
        $zones = @(Get-OwlSetupCleanupChoices)
        $zones -contains "user-temp" | Should Be $true
        # Les composants Windows (DISM) sont longs : ils ne sont jamais
        # implicites, l'utilisateur doit les cocher.
        $zones -contains "components" | Should Be $false
    }

    It "ignore une zone inconnue" {
        $fichier = Join-Path $env:TEMP ("owlsetup-zones-" + [Guid]::NewGuid().ToString("N") + ".json")
        try {
            '["user-temp","c:\\windows","tout"]' | Set-Content -LiteralPath $fichier -Encoding UTF8
            $zones = @(Get-OwlSetupCleanupChoices -ChoicesFile $fichier)
            $zones.Count | Should Be 1
            $zones[0] | Should Be "user-temp"
        }
        finally { Remove-Item -LiteralPath $fichier -Force -ErrorAction SilentlyContinue }
    }
}

Describe "Liberer-espace-disque : suppression du contenu d'un dossier" {

    . (Join-Path $racine "Liberer-espace-disque.ps1") -AsModule

    $base = Join-Path $env:TEMP ("owlsetup-clean-" + [Guid]::NewGuid().ToString("N"))
    $cible = Join-Path $base "cible"
    $zone = Join-Path $base "zone"

    BeforeEach {
        New-Item -ItemType Directory -Path $cible -Force | Out-Null
        New-Item -ItemType Directory -Path $zone -Force | Out-Null
        "precieux" | Set-Content -LiteralPath (Join-Path $cible "ne-pas-supprimer.txt")
        "jetable" | Set-Content -LiteralPath (Join-Path $zone "temporaire.txt")
    }
    AfterEach {
        # La jonction doit partir avant le dossier, sinon Remove-Item suit le lien.
        $lien = Join-Path $zone "lien"
        if (Test-Path -LiteralPath $lien) { cmd /c rmdir "$lien" | Out-Null }
        Remove-Item -LiteralPath $base -Recurse -Force -ErrorAction SilentlyContinue
    }

    It "supprime les fichiers ordinaires de la zone" {
        Remove-OwlSetupFolderContent -Path $zone
        (Test-Path -LiteralPath (Join-Path $zone "temporaire.txt")) | Should Be $false
        (Test-Path -LiteralPath $zone) | Should Be $true
    }

    It "laisse intacte la cible d'une jonction presente dans la zone" {
        # Ce test verifie le CONTRAT (la cible survit), pas l'implementation.
        # Retirer le filtre sur les points d'analyse ne le fait pas echouer sur
        # PowerShell 5.1, ou Remove-Item -Recurse ne traverse pas une jonction ;
        # le filtre reste de la defense en profondeur, ce comportement ayant
        # varie selon les versions de Windows.
        $lien = Join-Path $zone "lien"
        cmd /c mklink /J "$lien" "$cible" | Out-Null
        Remove-OwlSetupFolderContent -Path $zone
        (Test-Path -LiteralPath (Join-Path $cible "ne-pas-supprimer.txt")) | Should Be $true
    }

    It "refuse de vider un dossier qui est lui-meme une jonction" {
        $lien = Join-Path $zone "lien"
        cmd /c mklink /J "$lien" "$cible" | Out-Null
        { Remove-OwlSetupFolderContent -Path $lien } | Should Throw
        (Test-Path -LiteralPath (Join-Path $cible "ne-pas-supprimer.txt")) | Should Be $true
    }

    It "ne fait rien sur un chemin inexistant" {
        { Remove-OwlSetupFolderContent -Path (Join-Path $base "absent") } | Should Not Throw
    }
}
