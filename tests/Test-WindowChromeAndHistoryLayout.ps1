$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "lib\CssText.ps1")
$css = Get-Content (Join-Path $root 'styles.css') -Raw
# styles.css est genere et formate : on compare le contenu, pas la mise en forme.
$css = ConvertTo-CssComparable $css
$hostSource = Get-Content (Join-Path $root 'OwlSetupWebView.cs') -Raw

if ($css -notmatch '\.history-toolbar\{[^}]*align-items:end') {
    throw 'La barre d historique ne force pas l alignement inférieur des contrôles.'
}
if ($css -notmatch '\.history-toolbar>button\{[^}]*height:44px') {
    if ($css -notmatch '\.history-toolbar>button\{[^}]*height:46px') {
        throw 'Les boutons de l historique ne partagent pas une hauteur fixe.'
    }
}
if ($hostSource -notmatch 'DwmSetWindowAttribute' -or $hostSource -notmatch 'DwmwaCaptionColor') {
    throw 'Le thème sombre de la barre de titre Windows est absent.'
}
if ($css -notmatch '\.help-hint\{[^}]*#d79c2d' -or $css -notmatch '\.security-gauge em\{[^}]*opacity:1') {
    throw 'Le contraste des aides ou la lisibilite du calcul de securite est insuffisant.'
}

Write-Host 'OK - alignement de l historique et barre de titre sombre vérifiés.'
