$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content (Join-Path $root 'index.html') -Raw
$js = Get-Content (Join-Path $root 'app.js') -Raw
$css = Get-Content (Join-Path $root 'styles.css') -Raw

$checks = @(
  @{ Name = 'Icône de maintenance définie'; Ok = $html -match 'id="guide-maintenance"' },
  @{ Name = 'Onboarding utilise l’icône valide'; Ok = $html -match 'href="#guide-maintenance"' -and $html -notmatch 'href="#nav-updates"' },
  @{ Name = 'Dock de mise à jour présent'; Ok = $html -match 'id="backgroundUpdate"' -and $html -match 'id="showUpdateProgress"' },
  @{ Name = 'Mise à jour minimisable'; Ok = $js -match 'function minimizeUpdateProgress' -and $js -match 'setTimeout\(minimizeUpdateProgress' },
  @{ Name = 'Progression synchronisée'; Ok = $js -match 'setBackgroundUpdate\(message\.title, message\.detail, message\.percent\)' },
  @{ Name = 'Icônes du dock stylées'; Ok = $css -match '\.background-operation-icon svg' }
)

$failed = @($checks | Where-Object { -not $_.Ok })
$checks | ForEach-Object { if ($_.Ok) { Write-Host "[OK] $($_.Name)" } else { Write-Host "[ERREUR] $($_.Name)" } }
if ($failed.Count) { throw "$($failed.Count) contrôle(s) en échec." }
