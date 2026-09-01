$ErrorActionPreference = "Stop"

# L'assistant d'installation (4.1.0-beta.1).
#
# C'est le PREMIER ecran que voit un nouvel utilisateur, et rien ne le
# verifiait : la CI se contentait de controler que le fichier produit pesait
# plus d'un mega-octet.
#
# Ce test couvre ce qui peut l'etre sans compiler : les deux langues, l'absence
# de libelle en dur, le BOM, et la version par defaut.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$chemin = Join-Path $root "installer\OwlSetup.iss"
$iss = Get-Content -LiteralPath $chemin -Raw -Encoding UTF8

# --- 1) BOM UTF-8 ------------------------------------------------------------
#
# La documentation d'Inno Setup demande un BOM pour un .iss en UTF-8 : sans lui,
# le fichier est cense etre lu dans la page de codes de la machine qui COMPILE,
# et « Créer » deviendrait « CrÃ©er ».
#
# MESURE FAITE (4.1.0-beta.2) : ce n'est PAS le comportement d'Inno 6.7.3. Un
# installateur recompile sans BOM pose un raccourci francais aux accents
# corrects — l'assistant de la 4.0.0 etait donc intact. Le BOM reste par
# conformite a la documentation, et parce que rien ne garantit la version d'Inno
# sur un autre poste ; il ne corrige aucun defaut observe.
#
# Le vrai controle des accents est dans Test-InstallerRoundTrip.ps1, qui lit le
# commentaire du raccourci REELLEMENT pose.
$octets = [System.IO.File]::ReadAllBytes($chemin)
if ($octets.Length -lt 3 -or $octets[0] -ne 0xEF -or $octets[1] -ne 0xBB -or $octets[2] -ne 0xBF) {
    throw "OwlSetup.iss n'a pas de BOM UTF-8 : Inno Setup le lirait en ANSI et abimerait les accents francais."
}

# --- 2) Les deux langues -----------------------------------------------------
#
# L'interface de l'application est traduite depuis la 4.0.0 ; l'assistant ne
# parlait que francais.
foreach ($langue in @("english", "french")) {
    if ($iss -notmatch "(?m)^Name:\s*`"$langue`";\s*MessagesFile:") {
        throw "L'assistant ne declare plus la langue '$langue'."
    }
}
if ($iss -notmatch '(?m)^ShowLanguageDialog=auto') {
    throw "ShowLanguageDialog n'est plus 'auto' : l'assistant imposerait un choix de langue a chaque installation."
}

# --- 3) Aucun libelle en dur -------------------------------------------------
#
# Un libelle ecrit directement dans [Tasks], [Icons] ou [Run] resterait francais
# dans un assistant anglais : le meme defaut de traduction partielle que l'on
# evite ailleurs. Ils doivent passer par {cm:...}.
$sections = [regex]::Match($iss, '(?ms)^\[(?:Tasks|Icons|Run)\].*?(?=^\[|\z)')
$libelles = [regex]::Matches($iss, '(?m)^(?:Name|Filename):.*?(?:Description|GroupDescription|Comment):\s*"([^"]*)"')
foreach ($libelle in $libelles) {
    $texte = $libelle.Groups[1].Value
    if ($texte -notmatch '^\{cm:') {
        throw "Libelle ecrit en dur dans l'assistant : '$texte'. Passez par [CustomMessages] et {cm:...}."
    }
}

# --- 4) Chaque message existe dans les deux langues --------------------------
$messages = @{}
foreach ($m in [regex]::Matches($iss, '(?m)^(english|french)\.(\w+)=')) {
    $cle = $m.Groups[2].Value
    if (-not $messages.ContainsKey($cle)) { $messages[$cle] = @() }
    $messages[$cle] += $m.Groups[1].Value
}
if ($messages.Count -lt 1) { throw "Aucun message personnalise trouve : l'extraction est cassee." }
foreach ($cle in $messages.Keys) {
    foreach ($langue in @("english", "french")) {
        if ($messages[$cle] -notcontains $langue) {
            throw "Le message '$cle' n'existe pas en '$langue' : l'assistant afficherait la cle brute."
        }
    }
}

# Et chaque {cm:X} reference doit exister.
foreach ($m in [regex]::Matches($iss, '\{cm:(\w+)')) {
    $cle = $m.Groups[1].Value
    if (-not $messages.ContainsKey($cle)) {
        throw "L'assistant reference {cm:$cle} qui n'est defini dans aucune langue."
    }
}

# --- 5) La version par defaut n'est pas perimee ------------------------------
#
# build.ps1, build-installer.ps1 et build-stable.ps1 sont restes sur "3.7.0"
# jusqu'apres la sortie de la 4.0.0 : compiler sans argument produisait un
# binaire qui se declarait 3.7.0. La verite vient du CHANGELOG.
$changelog = Get-Content -LiteralPath (Join-Path $root "CHANGELOG.md") -Raw -Encoding UTF8
$stable = [regex]::Match($changelog, '(?m)^## \[(\d+\.\d+\.\d+)\]')
if (-not $stable.Success) { throw "Aucune version stable trouvee dans CHANGELOG.md." }
$attendue = $stable.Groups[1].Value

$defauts = @{
    "installer\OwlSetup.iss"  = '#define MyAppVersion "(\d+\.\d+\.\d+)"'
    "build.ps1"               = '\[string\]\$AppVersion\s*=\s*"(\d+\.\d+\.\d+)"'
    "build-installer.ps1"     = '\[string\]\$Version\s*=\s*"(\d+\.\d+\.\d+)"'
    "build-stable.ps1"        = '\[string\]\$Version\s*=\s*"(\d+\.\d+\.\d+)"'
}
foreach ($entree in $defauts.GetEnumerator()) {
    $contenu = Get-Content -LiteralPath (Join-Path $root $entree.Key) -Raw -Encoding UTF8
    $trouve = [regex]::Match($contenu, $entree.Value)
    if (-not $trouve.Success) { throw "Version par defaut introuvable dans $($entree.Key)." }
    if ($trouve.Groups[1].Value -ne $attendue) {
        throw "$($entree.Key) cible $($trouve.Groups[1].Value) par defaut alors que la derniere stable est $attendue."
    }
}

Write-Host ("Assistant d'installation : BOM, 2 langues, {0} message(s) traduit(s), aucun libelle en dur, versions par defaut a {1}." -f $messages.Count, $attendue) -ForegroundColor Green
