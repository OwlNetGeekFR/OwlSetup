$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "lib\CssText.ps1")
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw
# styles.css est genere et formate : on compare le contenu, pas la mise en forme.
$css = ConvertTo-CssComparable $css

$checks = @(
    @{ Name = "seuil principal"; Pattern = '@media\(max-width:1750px\)' },
    @{ Name = "grille sur une colonne"; Pattern = '\.settings-layout\{grid-template-columns:minmax\(0,1fr\)\}' },
    @{ Name = "navigation opaque"; Pattern = '\.horizontal-nav\{background:#0a0e15' },
    @{ Name = "commandes intermediaires"; Pattern = '@media\(max-width:1180px\)' },
    @{ Name = "commandes etroites"; Pattern = '@media\(max-width:920px\)' },
    @{ Name = "accessibilite empilee"; Pattern = '\.accessibility-settings\{grid-template-columns:1fr\}' }
)

foreach ($check in $checks) {
    if ($css -notmatch $check.Pattern) {
        throw "Responsive settings incomplet : $($check.Name)"
    }
}

Write-Host "Responsive settings : OK"

$css = Get-Content (Join-Path $root 'styles.css') -Raw
# styles.css est genere et formate : on compare le contenu, pas la mise en forme.
$css = ConvertTo-CssComparable $css
if ($css -notmatch 'installed-app-grid\{[^}]*container-type:inline-size' -or $css -notmatch '@container\(max-width:1050px\)') {
    throw 'Les cartes des applications installées ne sont pas adaptées à la largeur de leur conteneur.'
}
if ($css -notmatch 'installed-page-tools select\{[^}]*color-scheme:dark') {
    throw 'Le menu de tri installé ne possède pas de thème sombre.'
}
