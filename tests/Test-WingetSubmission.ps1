$ErrorActionPreference = "Stop"

# Soumission automatique du manifeste a winget (4.1.0-beta.7).
#
# Le job « winget » de release.yml ouvre une PR dans microsoft/winget-pkgs a
# chaque version stable. Impossible de le verifier en le lancant : le resultat
# serait une vraie soumission publique. Ce test verifie donc les quatre choses
# qui, si elles cassent, cassent EN SILENCE — sans job rouge, sans message.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$workflow = Get-Content -LiteralPath (Join-Path $root ".github\workflows\release.yml") -Raw -Encoding UTF8

if ($workflow -notmatch '(?ms)^  winget:\r?\n(.*?)(?=^  \S|\z)') {
    throw "Le job winget a disparu de release.yml."
}
$job = $Matches[1]

if ($job -notmatch 'needs:\s*release') {
    throw "Le job winget ne depend plus du job release : il tournerait en parallele, avant meme que la Release et ses fichiers existent."
}

# 1) Jamais sur une preversion. winget ne distribue que des stables ; une beta
#    poussee la-bas serait proposee a tous ses utilisateurs.
if ($job -notmatch "if:\s*needs\.release\.outputs\.is-prerelease\s*==\s*'false'") {
    throw "Le job winget n'est plus limite aux versions stables."
}

# 2) Les sorties comparees doivent EXISTER. Une sortie absente vaut la chaine
#    vide, `'' == 'false'` est faux, et le job ne tourne plus jamais — sans
#    erreur et sans trace. C'est la panne silencieuse la plus probable.
if ($workflow -notmatch '(?m)^      - name: Valider la version et la branche\r?\n        id: version\r?\n') {
    throw "L'etape de validation n'a plus l'identifiant « version » : les sorties du job release ne referencent plus rien."
}
foreach ($sortie in @("full-version", "tag", "is-prerelease")) {
    $declaration = '(?m)^      ' + [regex]::Escape($sortie) + ':\s*\$\{\{\s*steps\.version\.outputs\.' + [regex]::Escape($sortie) + '\s*\}\}'
    if ($workflow -notmatch $declaration) {
        throw "Le job release ne publie plus la sortie $sortie."
    }
    $ecriture = '(?m)^\s+"' + [regex]::Escape($sortie) + '=.*GITHUB_OUTPUT'
    if ($workflow -notmatch $ecriture) {
        throw "L'etape de validation n'ecrit plus $sortie dans GITHUB_OUTPUT : la sortie du job resterait vide."
    }
}

# 3) Le motif des installateurs. C'est le piege reel : le motif par defaut de
#    l'action n'est pas ancre, et la Release publie TROIS executables. winget
#    prendrait OwlSetup.exe et PC-Setup.exe pour des installateurs.
if ($job -notmatch "installers-regex:\s*'([^']+)'") {
    throw "Le motif installers-regex est absent du job winget : l'action utiliserait son defaut, non ancre."
}
$motif = $Matches[1]

if ($workflow -notmatch '\$assets\s*=\s*@\(([^)]*)\)') {
    throw "La liste des fichiers publies est introuvable dans release.yml."
}
$publies = @([regex]::Matches($Matches[1], '"([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
if ($publies.Count -lt 3) {
    throw ("Seulement {0} fichier(s) publie(s) detecte(s) : le test ne verifie plus rien." -f $publies.Count)
}

if ($workflow -notmatch 'artifacts/installer/(\S+\.exe)') {
    throw "Le nom de l'installateur est introuvable dans release.yml."
}
$installateur = $Matches[1]

# Meme semantique que l'action : un -match PowerShell sur le nom de l'asset.
$captures = @($publies | Where-Object { $_ -match $motif })
if ($captures.Count -ne 1) {
    throw ("Le motif '{0}' capture {1} fichier(s) parmi {2}. Seul {3} est un installateur." -f $motif, $captures.Count, ($publies -join ", "), $installateur)
}
if ($captures[0] -ne $installateur) {
    throw ("Le motif '{0}' capture {1} au lieu de {2}." -f $motif, $captures[0], $installateur)
}

# 4) L'identifiant winget doit suivre l'identite declaree par l'installateur.
#    C'est par lui que winget correle une mise a jour a l'installation
#    existante : s'ils divergent, les utilisateurs cessent d'etre mis a jour.
if ($job -notmatch '(?m)^\s+identifier:\s*(\S+)') {
    throw "L'identifiant winget est absent du job."
}
$identifiant = $Matches[1]

$iss = Get-Content -LiteralPath (Join-Path $root "installer\OwlSetup.iss") -Raw -Encoding UTF8
if ($iss -notmatch '#define MyAppName "([^"]+)"') { throw "MyAppName introuvable dans OwlSetup.iss." }
$nom = $Matches[1]
if ($iss -notmatch '#define MyAppPublisher "([^"]+)"') { throw "MyAppPublisher introuvable dans OwlSetup.iss." }
$editeur = $Matches[1]
$attendu = "$editeur.$nom"

if ($identifiant -ne $attendu) {
    throw ("L'identifiant winget est '{0}' alors que l'installateur declare '{1}'." -f $identifiant, $attendu)
}

# La version transmise doit venir du job release, pas du tag : sinon l'action
# la deduit de github.ref_name, qui vaut « main » lors d'une publication
# manuelle.
if ($job -notmatch '(?m)^\s+version:\s*\$\{\{\s*needs\.release\.outputs\.full-version\s*\}\}') {
    throw "Le job winget ne transmet plus full-version a l'action."
}

# Le jeton doit rester un secret du depot.
if ($job -notmatch '(?m)^\s+token:\s*\$\{\{\s*secrets\.\w+\s*\}\}') {
    throw "Le jeton winget ne vient plus des secrets du depot."
}

Write-Host ("Soumission winget : {0}, motif '{1}' -> {2}, limitee aux stables." -f $identifiant, $motif, $captures[0]) -ForegroundColor Green
