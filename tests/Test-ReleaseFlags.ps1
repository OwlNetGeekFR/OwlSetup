$ErrorActionPreference = "Stop"

# Drapeaux passes a `gh release` (4.0.0-beta.66).
#
# La publication de la v4.0.0 a echoue sur « no matches found for `-` ». La
# cause n'etait pas gh mais PowerShell :
#
#   $flags = if ($cond) { @("--prerelease", "--latest=false") } else { @("--latest") }
#
# La branche stable ne renvoie QU UN element. PowerShell deroule alors le
# tableau et $flags devient une CHAINE. Le splat `@flags` decoupe une chaine
# caractere par caractere : gh recoit "-", "-", "l", "a", ... et prend le
# premier "-" pour un motif de fichier.
#
# La branche preversion, elle, a deux elements : elle reste un tableau et
# fonctionne. Le defaut a donc dormi depuis son introduction et n a surgi qu a
# la PREMIERE version stable publiee par ce workflow.
#
# Ce test n examine pas le texte du workflow : il EXTRAIT la ligne reelle,
# l execute pour les deux branches, et OBSERVE ce que le splat produit.
#
# Tout se passe au niveau du script, sans fonction intermediaire : deux pieges
# de PowerShell ont ete rencontres en ecrivant ce test, et les deux venaient
# d une frontiere de fonction. `return $tableau` deroule a son tour un tableau a
# un seul element — le test devenait victime du defaut qu il surveille. Et une
# fonction auxiliaire nommee `R` etait resolue comme l alias `Invoke-History`,
# les alias primant sur les fonctions.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$workflow = Get-Content -LiteralPath (Join-Path $root ".github\workflows\release.yml") -Raw -Encoding UTF8

$correspondance = [regex]::Match($workflow, '(?m)^\s*(\[string\[\]\])?\$prereleaseFlags\s*=\s*if\s*\(.+$')
if (-not $correspondance.Success) {
    throw "L'affectation de `$prereleaseFlags est introuvable dans release.yml."
}

# Ce qui est evalue ci-dessous est notre propre fichier de workflow.
$assignation = $correspondance.Value.Trim()

$attendus = @{ "true" = @("--prerelease", "--latest=false"); "false" = @("--latest") }

foreach ($branche in @("true", "false")) {
    $nom = if ($branche -eq "true") { "preversion" } else { "stable" }
    $attendu = $attendus[$branche]

    $env:RELEASE_IS_PRERELEASE = $branche
    $prereleaseFlags = $null
    Invoke-Expression $assignation

    # `& { $args } @flags` observe le resultat REEL du splat, pas le type
    # declare : sur une chaine il rend ses caracteres, sur un tableau ses
    # elements.
    $arguments = @(& { $args } @prereleaseFlags)

    if ($arguments.Count -ne $attendu.Count) {
        throw ("Branche $nom : le splat produit $($arguments.Count) argument(s) au lieu de $($attendu.Count). " +
            "Obtenu : $($arguments -join ' ') -- un tableau a un seul element a probablement ete deroule en chaine.")
    }
    for ($i = 0; $i -lt $arguments.Count; $i++) {
        if ($arguments[$i] -ne $attendu[$i]) {
            throw "Branche $nom : argument $i vaut '$($arguments[$i])' au lieu de '$($attendu[$i])'."
        }
    }
    # Un argument d un seul caractere est la signature exacte du defaut.
    foreach ($argument in $arguments) {
        if ("$argument".Length -le 1) {
            throw "Branche $nom : le splat a produit l'argument '$argument' d'un seul caractere."
        }
    }
}

# La stable doit etre marquee "latest", la preversion ne doit jamais l'etre :
# c'est ce qui decide de la version proposee par defaut sur la page des
# releases.
$env:RELEASE_IS_PRERELEASE = "false"
$prereleaseFlags = $null
Invoke-Expression $assignation
if (@($prereleaseFlags) -notcontains "--latest") { throw "Une version stable n'est plus marquee --latest." }

$env:RELEASE_IS_PRERELEASE = "true"
$prereleaseFlags = $null
Invoke-Expression $assignation
if (@($prereleaseFlags) -notcontains "--prerelease") { throw "Une preversion n'est plus publiee en prerelease." }
if (@($prereleaseFlags) -notcontains "--latest=false") { throw "Une preversion pourrait devenir la version 'latest'." }

Remove-Item Env:\RELEASE_IS_PRERELEASE -ErrorAction SilentlyContinue

Write-Host "Drapeaux de publication : splat verifie sur les deux branches, stable en latest, preversion non." -ForegroundColor Green
