$ErrorActionPreference = "Stop"

# Accessibilite au clavier (lot 6, 4.0.0-beta.46).
#
# Les 19 boites de dialogue declarent aria-modal="true" mais seules deux
# piegeaient le focus : ailleurs, la tabulation partait derriere la fenetre.
# Un mecanisme unique s'en charge desormais. Ce test garde ce mecanisme et les
# proprietes qui le rendent utilisable au clavier.
# Assertions en ASCII : PowerShell 5.1 decode mal les accents des .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$app = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}

# 1) Le mecanisme generique existe et couvre toutes les boites modales.
Assert-Has $app 'modalFocusableSelector' "Le selecteur des elements focusables des modales a disparu."
Assert-Has $app 'querySelectorAll(''[aria-modal="true"]'')' "Le piege de focus ne cible plus toutes les boites modales."
Assert-Has $app 'function focusInsideModal' "Le focus n'est plus place dans la boite a l'ouverture."
Assert-Has $app 'modalReturnFocus' "Le focus n'est plus rendu a l'element declencheur."
Assert-Has $app 'event.key !== "Tab"' "La tabulation n'est plus retenue dans les boites modales."
Assert-Has $app 'attributeFilter: ["class"]' "L'ouverture des boites n'est plus observee."

# 2) Echap ne ferme que les boites qui exposent un controle de fermeture : les
#    trois boites obligatoires (langue, premier demarrage, guide) n'en ont pas.
Assert-Has $app 'function modalDismissControl' "La regle de fermeture par Echap a disparu."
Assert-Has $app 'modalsWithOwnKeyboard' "Les boites a gestion clavier dediee ne sont plus exclues."

# 3) Reduced motion : la regle doit couvrir toute l'interface, pas seulement le
#    parcours d'accueil comme avant.
Assert-Has $css 'prefers-reduced-motion: reduce' "La prise en charge de prefers-reduced-motion a disparu."
Assert-Has $css 'animation-iteration-count: 1 !important' "Les animations ne sont plus neutralisees globalement."
Assert-Has $css 'transition-duration: .01ms !important' "Les transitions ne sont plus neutralisees globalement."

# 4) Un anneau de focus visible sur les fonds sombres comme clairs.
Assert-Has $css ':focus-visible' "L'anneau de focus clavier a disparu."
Assert-Has $css ':root[data-theme="light"] :focus-visible' "L'anneau de focus n'est plus adapte au theme clair."

# 5) Les boites obligatoires restent sans bouton de fermeture : c'est ce qui les
#    rend non annulables par Echap. Si l'une en gagnait un, la regle changerait
#    de sens sans que personne ne le remarque.
foreach ($id in @("languageOverlay", "firstRunConfiguration")) {
    $start = $html.IndexOf('id="' + $id + '"')
    if ($start -lt 0) { throw "Boite $id introuvable dans index.html." }
    $length = [Math]::Min(4000, $html.Length - $start)
    $chunk = $html.Substring($start, $length)
    if ($chunk -match 'class="[^"]*dialog-close') {
        throw "La boite $id a gagne un bouton de fermeture : Echap la fermerait desormais."
    }
}

# 6) Chaque boite modale doit rester etiquetee pour les lecteurs d'ecran.
$modals = [regex]::Matches($html, '<div[^>]*aria-modal="true"[^>]*>')
if ($modals.Count -lt 19) { throw "Moins de boites modales que prevu ($($modals.Count))." }
foreach ($modal in $modals) {
    if ($modal.Value -notmatch 'aria-labelledby=|aria-label=') {
        throw "Une boite modale n'a pas d'etiquette accessible : $($modal.Value.Substring(0, [Math]::Min(80, $modal.Value.Length)))"
    }
}

Write-Host "Accessibilite clavier : piege de focus generique, Echap, reduced motion et etiquettes verifies." -ForegroundColor Green
