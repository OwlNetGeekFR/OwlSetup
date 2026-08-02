$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw -Encoding UTF8
$script = Get-Content -LiteralPath (Join-Path $root 'app.js') -Raw -Encoding UTF8
$styles = Get-Content -LiteralPath (Join-Path $root 'styles.css') -Raw -Encoding UTF8
$translations = Get-Content -LiteralPath (Join-Path $root 'i18n.js') -Raw -Encoding UTF8

function Assert-Contains([string]$Content, [string]$Expected, [string]$Message) {
    if (-not $Content.Contains($Expected)) { throw $Message }
}

Assert-Contains $index 'id="appTheme"' 'Le sélecteur de thème manque dans Paramètres.'
Assert-Contains $index 'id="firstRunTheme"' 'Le choix du thème manque dans la configuration initiale.'
Assert-Contains $index '<option value="system">Selon Windows</option>' 'Le mode automatique Windows manque.'
Assert-Contains $script 'const themeStorageKey = "owlsetup-theme-v1";' 'La préférence locale de thème manque.'
Assert-Contains $script 'document.documentElement.dataset.theme=resolved;' 'Le thème résolu n’est pas appliqué au document.'
Assert-Contains $script 'systemThemeQuery?.addEventListener?.("change"' 'Les changements du thème Windows ne sont pas suivis.'
Assert-Contains $script 'saveThemePreference($("#firstRunTheme").value);' 'Le guide initial ne conserve pas le thème.'
Assert-Contains $script '"owlsetup-language-v1",themeStorageKey' 'La sauvegarde complète n’exporte pas le thème.'
Assert-Contains $styles ':root[data-theme="light"]' 'Les styles du thème clair manquent.'
Assert-Contains $styles ':root[data-theme="light"] .dialog' 'Les fenêtres ne sont pas adaptées au thème clair.'
Assert-Contains $translations '"Selon Windows": "Use Windows setting"' 'La traduction anglaise du choix automatique manque.'

Write-Host 'Theme preference checks passed.' -ForegroundColor Green
