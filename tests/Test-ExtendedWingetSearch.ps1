$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

function Assert-Match {
    param(
        [string]$Content,
        [string]$Pattern,
        [string]$Message
    )

    if ($Content -notmatch $Pattern) {
        throw $Message
    }
}

Assert-Match $html 'id="searchWingetBtn"' "Le bouton de recherche WinGet est absent."
if ($html -match 'id="searchWingetBtn"[^>]*\sdisabled(?:\s|>|=)') {
    throw "Le bouton de recherche WinGet ne doit pas etre bloque avant la saisie."
}
Assert-Match $html 'id="wingetSearchResults"' "La zone de resultats WinGet est absente."
Assert-Match $js 'action:\s*"search-winget"' "La requete de recherche WinGet n'est pas envoyee au moteur natif."
Assert-Match $js 'HORS CATALOGUE' "Les paquets externes ne sont pas identifies comme hors catalogue."
Assert-Match $js 'winget-search-complete' "La reponse native de recherche WinGet n'est pas traitee."
Assert-Match $js 'input\?\.focus\(\)' "Le bouton ne guide pas vers la barre de recherche lorsque le mot-cle manque."
Assert-Match $js 'resolveWingetBrand' "La reconnaissance locale des logos WinGet est absente."
Assert-Match $js 'wingetFallbackColor' "Le visuel de secours des paquets inconnus est absent."
Assert-Match $js 'function\s+scheduleExtendedWingetSearch' "La recherche WinGet automatique apres saisie est absente."
Assert-Match $js 'setTimeout\(\(\)=>\{' "Le delai anti-rebond de la recherche automatique est absent."
Assert-Match $js 'responseQuery!==searchTerm\.trim\(\)' "Les anciennes reponses WinGet ne sont pas ignorees."
Assert-Match $native 'void\s+SearchWinget\s*\(' "Le moteur natif de recherche WinGet est absent."
Assert-Match $native '--source winget --count 15' "La recherche n'est pas limitee a la source officielle WinGet."
Assert-Match $native 'ParseWingetSearchResults' "Le parseur de resultats WinGet est absent."
Assert-Match $native '\[A-Za-z0-9\]\[A-Za-z0-9\._\+\\-\]' "La validation des identifiants WinGet est absente."

Write-Host "Recherche etendue WinGet : OK"
