$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Get-Content -LiteralPath (Join-Path $root 'OwlSetupWebView.cs') -Raw
$frontend = Get-Content -LiteralPath (Join-Path $root 'app.js') -Raw
$interface = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw

$checks = @(
    @{ Name = 'Code application utilisée'; Text = $backend; Pattern = '0x8A150111' },
    @{ Name = 'Aucune mise à jour applicable'; Text = $backend; Pattern = '0x8A15002B' },
    @{ Name = 'Code non applicable accepté'; Text = $backend; Pattern = 'IsNoApplicableUpdateCode(lastCode)' },
    @{ Name = 'Classification fichiers utilisés'; Text = $backend; Pattern = 'files-in-use' },
    @{ Name = 'Détails des paquets en échec'; Text = $backend; Pattern = 'failedItems=failedItems.ToArray' },
    @{ Name = 'Décodage UTF-8 de WinGet'; Text = $backend; Pattern = 'StandardOutputEncoding=Encoding.UTF8' },
    @{ Name = 'Relance ciblée'; Text = $frontend; Pattern = 'Préparer la relance' },
    @{ Name = 'Liste stricte des processus connus'; Text = $backend; Pattern = 'KnownPackageProcesses' },
    @{ Name = 'Protection des processus Windows'; Text = $backend; Pattern = 'IsProtectedProcess' },
    @{ Name = 'Confirmation de fermeture forcée'; Text = $backend; Pattern = 'force&&!confirmed' },
    @{ Name = 'Fermeture normale prioritaire'; Text = $backend; Pattern = 'CloseMainWindow' },
    @{ Name = 'Détection du module OBS Virtual Camera'; Text = $backend; Pattern = 'obs-virtualcam' },
    @{ Name = 'Détection des modules chargés'; Text = $backend; Pattern = 'ProcessUsesPackageModule' },
    @{ Name = 'Interface de fermeture normale'; Text = $interface; Pattern = 'Fermer proprement et réessayer' },
    @{ Name = 'Bouton direct dans le résultat'; Text = $interface; Pattern = 'closeUpdateBlocker' },
    @{ Name = 'Fermeture directe contextualisée'; Text = $frontend; Pattern = 'closeUpdateBlockingProcesses' },
    @{ Name = 'Nouvelle tentative après fermeture'; Text = $frontend; Pattern = 'Réessayer la mise à jour' },
    @{ Name = 'Relance silencieuse après fermeture'; Text = $frontend; Pattern = 'Relance silencieuse de la mise à jour' },
    @{ Name = 'Relance limitée aux paquets bloqués'; Text = $frontend; Pattern = 'operationProcessPackages.filter(isValidPackageId)' },
    @{ Name = 'Rapprochement automatique des opérations'; Text = $frontend; Pattern = 'reconcileOperationHistory' },
    @{ Name = 'Normalisation des anciens alias'; Text = $frontend; Pattern = 'canonicalOperationPackageId' },
    @{ Name = 'Migration des fausses erreurs historiques'; Text = $frontend; Pattern = 'Number(item.code)===-1978335189' },
    @{ Name = 'Comparaison avec le suffixe WinGet'; Text = $frontend; Pattern = 'suffix===value' },
    @{ Name = 'Ancienne erreur classée résolue'; Text = $frontend; Pattern = 'status:"resolved"' },
    @{ Name = 'Notifications résolues automatiquement'; Text = $frontend; Pattern = 'reconcileResolvedNotifications' }
)

$missing = @($checks | Where-Object { $_.Text -notmatch [regex]::Escape($_.Pattern) })
if ($missing.Count -gt 0) {
    $missing | ForEach-Object { Write-Error "Contrôle manquant : $($_.Name)" }
    exit 1
}

Write-Host 'OK - récupération contextuelle des mises à jour WinGet vérifiée.'
