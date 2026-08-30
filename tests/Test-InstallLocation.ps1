$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot "lib\CssText.ps1")
$frontend = Get-Content -LiteralPath (Join-Path $root 'app.js') -Raw
$interface = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw
$native = Get-Content -LiteralPath (Join-Path $root 'OwlSetupWebView.cs') -Raw
$styles = Get-Content -LiteralPath (Join-Path $root 'styles.css') -Raw
# styles.css est genere et formate : on compare le contenu, pas la mise en forme.
$styles = ConvertTo-CssComparable $styles

$checks = @(
    @{ Name = 'Choix automatique ou personnalisé'; Text = $interface; Pattern = 'installLocationMode' },
    @{ Name = 'Sélecteur natif de dossier'; Text = $native; Pattern = 'FolderBrowserDialog' },
    @{ Name = 'Commande de sélection'; Text = $native; Pattern = 'choose-install-location' },
    @{ Name = 'Transmission du chemin'; Text = $frontend; Pattern = 'locationPath' },
    @{ Name = 'Validation du chemin local'; Text = $native; Pattern = 'ValidateInstallBasePath' },
    @{ Name = 'Emplacement transmis à WinGet'; Text = $native; Pattern = '--location' },
    @{ Name = 'Sous-dossier par application'; Text = $native; Pattern = 'Path.Combine(installBase,SafeShortcutName(appName))' },
    @{ Name = 'Avertissement de compatibilité'; Text = $frontend; Pattern = 'Certains installateurs' },
    @{ Name = 'Fenêtre d’installation centrée'; Text = $styles; Pattern = '#installModal{place-items:center' },
    @{ Name = 'Typographie d’installation agrandie'; Text = $styles; Pattern = '#installModal .dialog-header h2{font-size:21px}' }
)

$missing = @($checks | Where-Object { $_.Text -notmatch [regex]::Escape($_.Pattern) })
if ($missing.Count) {
    $missing | ForEach-Object { Write-Error "Contrôle manquant : $($_.Name)" }
    exit 1
}

Write-Host 'OK - choix du dossier d’installation vérifié.'
