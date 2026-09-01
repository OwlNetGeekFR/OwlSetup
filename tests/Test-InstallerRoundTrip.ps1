param([switch]$Requis)

$ErrorActionPreference = "Stop"

# Installation puis desinstallation reelles (4.1.0-beta.2).
#
# Rien ne verifiait que l'installateur INSTALLE : la CI controlait seulement
# qu'il pesait plus d'un mega-octet. C'est pourtant le fichier que telecharge un
# nouvel utilisateur, et un installateur casse est le pire defaut possible
# juste apres une publication.
#
# Ce test installe en silence dans un dossier temporaire, verifie ce qui a ete
# pose, puis desinstalle et verifie que tout est parti.
#
# Il verifie aussi les ACCENTS du raccourci francais. Le commentaire vient de
# {cm:AppComment}, donc il traverse l'analyseur de OwlSetup.iss : si le BOM
# UTF-8 disparaissait, Inno lirait le fichier en ANSI et le raccourci afficherait
# « Installer, mettre Ã  jour ». C'est la seule facon observable de controler
# cet encodage — Inno compresse ces libelles dans l'executable.
#
# -Requis fait echouer si l'installateur est absent. La CI l'utilise APRES
# build-installer.ps1 ; sans cela le test passerait en silence.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$installateur = Join-Path $root "artifacts\installer\OwlSetup-Setup.exe"

if (-not (Test-Path -LiteralPath $installateur)) {
    if ($Requis) { throw "OwlSetup-Setup.exe est absent : lancez build-installer.ps1 avant ce test avec -Requis." }
    Write-Host "Aller-retour d'installation : ignore (installateur absent)." -ForegroundColor Yellow
    return
}

$appId = "{1D90DDA3-3A2E-41E7-84A8-AF8E8F90F9F7}"
$cleDesinstallation = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\${appId}_is1"
$raccourciMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\OwlSetup.lnk"

# Ne pas tourner si une VRAIE installation existe : l'AppId etant partage, le
# test en ecraserait l'entree de desinstallation.
#
# C'est une raison de S ABSTENIR, pas d'echouer. La premiere version levait une
# exception ici, et mettait donc toute la suite au rouge chez quiconque utilise
# OwlSetup sur sa machine de developpement — ce qui est le cas normal, et ce qui
# est arrive des la premiere fois. Le trou reste ferme la ou il compte : la CI
# passe -Requis, et son runner n a jamais d installation.
if (Test-Path $cleDesinstallation) {
    $installee = (Get-ItemProperty $cleDesinstallation).DisplayVersion
    if ($Requis) {
        throw "OwlSetup $installee est installe sur cette machine, alors que -Requis exige un environnement vierge."
    }
    Write-Host ("Aller-retour d'installation : ignore (OwlSetup {0} est installe ici ; le test ecraserait son entree de desinstallation)." -f $installee) -ForegroundColor Yellow
    return
}

$cible = Join-Path ([System.IO.Path]::GetTempPath()) ("OwlSetup-essai-" + [Guid]::NewGuid().ToString("N").Substring(0, 8))

function Get-CommentaireRaccourci([string]$Chemin) {
    $shell = New-Object -ComObject WScript.Shell
    try { return $shell.CreateShortcut($Chemin).Description }
    finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
}

# Libelles attendus, par langue. Ce sont les valeurs de [CustomMessages].
$commentaires = @{
    "french"  = "Installer, mettre " + [char]0xE0 + " jour et entretenir Windows"
    "english" = "Install, update and maintain Windows"
}

foreach ($langue in @("french", "english")) {
    try {
        $processus = Start-Process -FilePath $installateur -Wait -PassThru -ArgumentList @(
            "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/LANG=$langue", "/DIR=`"$cible`""
        )
        if ($processus.ExitCode -ne 0) {
            throw "L'installation ($langue) a rendu le code $($processus.ExitCode)."
        }

        # --- Ce qui doit avoir ete pose ---
        $exe = Join-Path $cible "OwlSetup.exe"
        if (-not (Test-Path -LiteralPath $exe)) { throw "OwlSetup.exe n'a pas ete installe dans $cible." }
        if ((Get-Item $exe).Length -lt 1MB) { throw "L'executable installe fait moins d'un mega-octet." }

        $desinstalleur = Join-Path $cible "unins000.exe"
        if (-not (Test-Path -LiteralPath $desinstalleur)) { throw "Aucun desinstalleur n'a ete depose." }

        if (-not (Test-Path $cleDesinstallation)) { throw "L'entree de desinstallation n'a pas ete enregistree." }
        $entree = Get-ItemProperty $cleDesinstallation
        if ($entree.InstallLocation.TrimEnd('\') -ne $cible.TrimEnd('\')) {
            throw "L'entree de desinstallation pointe vers $($entree.InstallLocation) au lieu de $cible."
        }

        # --- Le raccourci, et ses accents ---
        if (-not (Test-Path -LiteralPath $raccourciMenu)) { throw "Le raccourci du menu Demarrer est absent." }
        $commentaire = Get-CommentaireRaccourci $raccourciMenu
        if ($commentaire -ne $commentaires[$langue]) {
            throw ("Commentaire du raccourci en '$langue' : '$commentaire' au lieu de '$($commentaires[$langue])'. " +
                "Des caracteres abimes signalent un OwlSetup.iss lu en ANSI (BOM UTF-8 manquant).")
        }
    }
    finally {
        # --- Desinstallation ---
        $desinstalleur = Join-Path $cible "unins000.exe"
        if (Test-Path -LiteralPath $desinstalleur) {
            $sortie = Start-Process -FilePath $desinstalleur -Wait -PassThru -ArgumentList @("/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART")
            if ($sortie.ExitCode -ne 0) { throw "La desinstallation a rendu le code $($sortie.ExitCode)." }
        }
    }

    # --- Ce qui doit avoir disparu ---
    # Inno rend la main avant d'avoir fini de s'effacer lui-meme : on laisse un
    # court delai avant de conclure.
    $limite = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $limite -and (Test-Path -LiteralPath (Join-Path $cible "OwlSetup.exe"))) {
        Start-Sleep -Milliseconds 500
    }
    if (Test-Path -LiteralPath (Join-Path $cible "OwlSetup.exe")) {
        throw "OwlSetup.exe est encore present apres la desinstallation ($langue)."
    }
    if (Test-Path $cleDesinstallation) { throw "L'entree de desinstallation subsiste apres la desinstallation ($langue)." }
    if (Test-Path -LiteralPath $raccourciMenu) { throw "Le raccourci du menu Demarrer subsiste apres la desinstallation ($langue)." }

    Remove-Item -LiteralPath $cible -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Aller-retour d'installation : pose et retire proprement en francais et en anglais, accents du raccourci verifies." -ForegroundColor Green
