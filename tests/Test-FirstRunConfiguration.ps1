$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$frontend = Get-Content -LiteralPath (Join-Path $root 'app.js') -Raw
$interface = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw
$styles = Get-Content -LiteralPath (Join-Path $root 'styles.css') -Raw

$checks = @(
    @{ Name = 'Clé de configuration initiale'; Text = $frontend; Pattern = 'owlsetup-first-run-configuration-v1' },
    @{ Name = 'Ouverture de la configuration'; Text = $frontend; Pattern = 'openFirstRunConfiguration' },
    @{ Name = 'Enregistrement des préférences'; Text = $frontend; Pattern = 'completeFirstRunConfiguration' },
    @{ Name = 'Guide après configuration'; Text = $frontend; Pattern = 'openOnboarding(true)' },
    @{ Name = 'Page de configuration'; Text = $interface; Pattern = 'firstRunConfiguration' },
    @{ Name = 'Choix de restauration'; Text = $interface; Pattern = 'firstRunRestorePoint' },
    @{ Name = 'Présentation plein écran'; Text = $styles; Pattern = '.first-run-overlay' }
)

$missing = @($checks | Where-Object { $_.Text -notmatch [regex]::Escape($_.Pattern) })
if ($missing.Count) {
    $missing | ForEach-Object { Write-Error "Contrôle manquant : $($_.Name)" }
    exit 1
}

Write-Host 'OK - parcours de configuration initiale vérifié.'
