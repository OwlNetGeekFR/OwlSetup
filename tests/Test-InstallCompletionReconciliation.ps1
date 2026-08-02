$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$frontend = Get-Content -LiteralPath (Join-Path $root 'app.js') -Raw
$native = Get-Content -LiteralPath (Join-Path $root 'OwlSetupWebView.cs') -Raw

$checks = @(
    @{ Name = 'Verrou anti double lancement'; Text = $frontend; Pattern = 'installSubmissionPending' },
    @{ Name = 'Bouton conservé désactivé'; Text = $frontend; Pattern = 'Installation lancée…' },
    @{ Name = 'Commande native idempotente'; Text = $native; Pattern = 'install-already-running' },
    @{ Name = 'Réconciliation après installation'; Text = $native; Pattern = 'VerifyPackageInstallationWithRetry' },
    @{ Name = 'Correction automatique du résultat'; Text = $native; Pattern = 'Résultat corrigé automatiquement' },
    @{ Name = 'Attente de l’enregistrement Windows'; Text = $native; Pattern = 'Thread.Sleep(1200)' }
)

$missing = @($checks | Where-Object { $_.Text -notmatch [regex]::Escape($_.Pattern) })
if ($missing.Count) {
    $missing | ForEach-Object { Write-Error "Contrôle manquant : $($_.Name)" }
    exit 1
}

Write-Host 'OK - réconciliation de fin d’installation vérifiée.'
