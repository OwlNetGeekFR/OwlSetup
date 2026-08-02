$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$frontend = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

$checks = @(
    @{ Name = "État visible de vérification groupée"; Text = $frontend; Token = "setBatchUninstallVerificationPending" },
    @{ Name = "Delai de reponse WinGet"; Text = $frontend; Token = "batchUninstallSimulationTimer" },
    @{ Name = "Résultat vérifié après installation"; Text = $frontend; Token = "renderPostInstallVerified(message.installedPackages||[])" },
    @{ Name = "Action de désinstallation immédiate"; Text = $frontend; Token = "data-post-install-uninstall" },
    @{ Name = "Panneau de vérification rapide"; Text = $html; Token = 'id="postInstallVerified"' },
    @{ Name = "Paquets vérifiés transmis par le moteur"; Text = $native; Token = "installedPackages=verifiedPackages" },
    @{ Name = "Résolution robuste de l’identifiant WinGet"; Text = $native; Token = "OutputContainsExactPackageId" }
)

foreach ($check in $checks) {
    if (-not $check.Text.Contains($check.Token)) {
        throw "Contrôle manquant ($($check.Name)) : $($check.Token)"
    }
}

if ($frontend -notmatch 'batchUninstallSimulationPending\s*\|\|\s*managedInstalled\.size\s*===\s*0') {
    throw "Le bouton de désinstallation groupée n’est pas verrouillé pendant la vérification."
}

Write-Host "Désinstallation groupée et action post-installation vérifiées." -ForegroundColor Green
