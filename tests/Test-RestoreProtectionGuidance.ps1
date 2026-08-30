$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "lib\CssText.ps1")
$html = Get-Content (Join-Path $root 'index.html') -Raw -Encoding UTF8
$css = Get-Content (Join-Path $root 'styles.css') -Raw -Encoding UTF8
# styles.css est genere et formate : on compare le contenu, pas la mise en forme.
$css = ConvertTo-CssComparable $css
$js = Get-Content (Join-Path $root 'app.js') -Raw -Encoding UTF8
$hostCode = Get-Content (Join-Path $root 'OwlSetupWebView.cs') -Raw -Encoding UTF8

$checks = [ordered]@{
  'dialogue de protection présent' = $html.Contains('id="restoreProtectionOverlay"')
  'choix de désactivation présent' = $html.Contains('id="disableAutomaticRestore"')
  'ouverture des propriétés Windows présente' = $html.Contains('id="openSystemProtection"')
  'annulation UAC distinguée' = $js.Contains('uac-cancelled')
  'échec de protection guidé' = $js.Contains('openRestoreProtectionDialog')
  'action native routée' = $hostCode.Contains('open-system-protection')
  'panneau Windows officiel utilisé' = $hostCode.Contains('SystemPropertiesProtection.exe')
  'mise en page paramètres empilée à 1750px' = $css.Contains('@media(max-width:1750px)')
  'icônes vectorielles du guide présentes' = $html.Contains('href="#guide-select"') -and $html.Contains('href="#guide-log"')
  'choix initial explicite et facultatif' = $html.Contains('name="firstRunRestoreChoice" value="false" checked') -and $html.Contains('name="firstRunRestoreChoice" value="true"')
  'icônes vectorielles du parcours animé' = $html.Contains('onboarding-visual catalog') -and $html.Contains('<use href="#guide-select"/>') -and $html.Contains('<use href="#nav-shield"/>')
}

$failed = @($checks.GetEnumerator() | Where-Object { -not $_.Value })
foreach ($check in $checks.GetEnumerator()) {
  $prefix = if ($check.Value) { '[OK]' } else { '[ECHEC]' }
  Write-Host "$prefix $($check.Key)"
}

if ($failed.Count -gt 0) {
  throw "$($failed.Count) vérification(s) ont échoué."
}

Write-Host 'Guidage de protection et responsive : conforme.' -ForegroundColor Green
