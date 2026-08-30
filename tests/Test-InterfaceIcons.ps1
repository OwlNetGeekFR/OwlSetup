$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "lib\CssText.ps1")
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8
# styles.css est genere et formate : on compare le contenu, pas la mise en forme.
$css = ConvertTo-CssComparable $css

foreach ($symbol in @("nav-windows", "nav-support", "nav-download", "nav-residue", "tool-winget-diagnostic", "tool-restore-point", "tool-startup-apps", "tool-disk-usage", "tool-open-folder", "tool-safe-clean")) {
    if ($html -notmatch ('id="' + $symbol + '"')) { throw "Symbole absent : $symbol" }
}
if ($html -notmatch '<nav class="horizontal-nav"[\s\S]*class="top-support nav-support"') {
    throw "Le lien Ko-fi n'est pas dans la navigation horizontale."
}
if ($html -notmatch 'class="installed-hero-icon"[\s\S]*?<use href="#nav-installed"') {
    throw "L'illustration des applications installees n'utilise pas son SVG."
}
foreach ($toolSymbol in @("tool-winget-diagnostic", "tool-restore-point", "tool-startup-apps", "tool-disk-usage")) {
    if ($html -notmatch ('class="tool-icon [^"]+">\s*<svg[^>]*>\s*<use href="#' + $toolSymbol + '"')) {
        throw "L'outil systeme n'utilise pas son pictogramme SVG : $toolSymbol"
    }
}
foreach ($legacy in @('class="update-shield" aria-hidden="true">↥', 'class="quarantine-shield" aria-hidden="true">♲', 'class="windows-icon">⊞')) {
    if ($html.Contains($legacy)) { throw "Ancienne icone encore presente : $legacy" }
}
if ($css -notmatch '\.sidebar,.topbar,.horizontal-nav,.page-intro') {
    throw "Couleur harmonisee des separateurs absente."
}
if ($css -notmatch '\.installed-hero-icon svg') {
    throw "Style SVG de l'illustration des applications installees absent."
}
if ($css -notmatch '\.tool-icon svg') {
    throw "Style SVG des outils systeme absent."
}

Write-Host "Navigation et illustrations : OK"
