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
$notes = Get-Content -LiteralPath (Join-Path $root "RELEASE-NOTES-3.7.0.md") -Raw -Encoding UTF8
$readme = Get-Content -LiteralPath (Join-Path $root "README.md") -Raw -Encoding UTF8

Assert-Match $build '\[string\]\$AppVersion\s*=\s*"3\.7\.0"' "La compilation principale ne cible pas 3.7.0 par défaut."
Assert-Match $installer '\[string\]\$Version\s*=\s*"3\.7\.0"' "L'installateur ne cible pas 3.7.0 par défaut."
Assert-Match $stable '\[string\]\$Version\s*=\s*"3\.7\.0"' "Le paquet stable ne cible pas 3.7.0 par défaut."
foreach ($asset in @('OwlSetup.exe', 'PC-Setup.exe', 'OwlSetup-Setup.exe', 'SHA256.txt')) {
    Assert-Match $stable ([regex]::Escape($asset)) "Le paquet stable ne prépare pas $asset."
    Assert-Match $workflow ([regex]::Escape($asset)) "Le workflow de publication ne publie pas $asset."
}
Assert-Match $workflow 'Test-ReleaseCandidateReadiness\.ps1' "Le workflow ne lance pas les contrôles de préparation."
Assert-Match $notes 'sign.{1,100}Windows' "Les notes n'expliquent pas l'absence de signature."
Assert-Match $notes 'quarantaine r.versible' "Les notes n'expliquent pas le nettoyage prudent du stockage."
Assert-Match $readme 'diagnostic minimal est facultatif' "Le README ne décrit pas correctement la télémétrie facultative."

Write-Host "Préparation de la version stable 3.7.0 : conforme." -ForegroundColor Green
