$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "lib\CssText.ps1")
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8
# styles.css est genere et formate : on compare le contenu, pas la mise en forme.
$css = ConvertTo-CssComparable $css
$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

if ($html -match 'fonts\.(googleapis|gstatic)\.com' -or $css -match 'fonts\.(googleapis|gstatic)\.com') {
    throw "L'interface dépend encore d'une police distante."
}
if ($html -notmatch 'id="nativeErrorCard"' -or $js -notmatch 'owlsetup:native-error') {
    throw "Le diagnostic natif non bloquant est incomplet."
}
if ($js -match '\balert\s*\(' -or $native -match 'ExecuteScriptAsync\("alert\(') {
    throw "Une erreur peut encore ouvrir une alerte bloquante."
}
if ($native -notmatch 'MinimumSize\s*=\s*new Size\(900,\s*650\)') {
    throw "La fenêtre minimale auditée n'est pas configurée."
}
if ($css -notmatch '\.filters\{[^}]*flex-wrap:wrap' -or $css -notmatch 'catalog-returning') {
    throw "Les adaptations du catalogue sont absentes."
}
if ($js -notmatch 'OwlSetup-Installer\.ps1') {
    throw "Le nom du script exporté n'a pas été modernisé."
}

Write-Host "Audit beta.37 : OK"
