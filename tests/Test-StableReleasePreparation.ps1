$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Assert-Match {
    param([string]$Content, [string]$Pattern, [string]$Message)
    if ($Content -notmatch $Pattern) { throw $Message }
}

$build = Get-Content -LiteralPath (Join-Path $root "build.ps1") -Raw -Encoding UTF8
$installer = Get-Content -LiteralPath (Join-Path $root "build-installer.ps1") -Raw -Encoding UTF8
$stable = Get-Content -LiteralPath (Join-Path $root "build-stable.ps1") -Raw -Encoding UTF8
$workflow = Get-Content -LiteralPath (Join-Path $root ".github\workflows\release.yml") -Raw -Encoding UTF8
$readme = Get-Content -LiteralPath (Join-Path $root "README.md") -Raw -Encoding UTF8

# La version courante vient du CHANGELOG, pas d'une constante ecrite ici.
#
# Ce test exigeait "3.7.0" en dur dans les trois scripts de build. Il a donc
# FIGE leurs valeurs par defaut sur une version publiee deux fois auparavant :
# apres la sortie de la 4.0.0, compiler sans argument produisait encore un
# binaire qui se declarait 3.7.0, et le test protegeait cette erreur.
$changelog = Get-Content -LiteralPath (Join-Path $root "CHANGELOG.md") -Raw -Encoding UTF8
$stableMatch = [regex]::Match($changelog, '(?m)^## \[(\d+\.\d+\.\d+)\]')
if (-not $stableMatch.Success) { throw "Aucune version stable trouvee dans CHANGELOG.md." }
$versionStable = $stableMatch.Groups[1].Value

$notesPath = Join-Path $root "RELEASE-NOTES-$versionStable.md"
if (-not (Test-Path -LiteralPath $notesPath)) {
    throw "Les notes de la version $versionStable sont absentes : RELEASE-NOTES-$versionStable.md."
}
$notes = Get-Content -LiteralPath $notesPath -Raw -Encoding UTF8

$versionEchappee = [regex]::Escape($versionStable)
Assert-Match $build ('\[string\]\$AppVersion\s*=\s*"' + $versionEchappee + '"') "La compilation principale ne cible pas $versionStable par défaut."
Assert-Match $installer ('\[string\]\$Version\s*=\s*"' + $versionEchappee + '"') "L'installateur ne cible pas $versionStable par défaut."
Assert-Match $stable ('\[string\]\$Version\s*=\s*"' + $versionEchappee + '"') "Le paquet stable ne cible pas $versionStable par défaut."
foreach ($asset in @('OwlSetup.exe', 'PC-Setup.exe', 'OwlSetup-Setup.exe', 'SHA256.txt')) {
    Assert-Match $stable ([regex]::Escape($asset)) "Le paquet stable ne prépare pas $asset."
    Assert-Match $workflow ([regex]::Escape($asset)) "Le workflow de publication ne publie pas $asset."
}
Assert-Match $workflow 'Test-ReleaseCandidateReadiness\.ps1' "Le workflow ne lance pas les contrôles de préparation."
Assert-Match $notes 'sign.{1,100}Windows' "Les notes n'expliquent pas l'absence de signature."
Assert-Match $notes 'quarantaine r.versible' "Les notes n'expliquent pas le nettoyage prudent du stockage."
Assert-Match $readme '(diagnostic minimal est facultatif|Optional minimal diagnostic reporting)' "Le README ne décrit pas correctement la télémétrie facultative."

Write-Host "Préparation de la version stable $versionStable : conforme." -ForegroundColor Green
