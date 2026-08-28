$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw
$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw
$cleanup = Get-Content -LiteralPath (Join-Path $root "Nettoyer-residus-applications.ps1") -Raw
$cleanupLauncher = Get-Content -LiteralPath (Join-Path $root "Liberer-espace-disque.ps1") -Raw
$workflow = Get-Content -LiteralPath (Join-Path $root ".github\workflows\release.yml") -Raw

function Assert-Contains([string]$Text, [string]$Pattern, [string]$Message) {
    if ($Text -notmatch $Pattern) { throw $Message }
}

function Assert-NotContains([string]$Text, [string]$Pattern, [string]$Message) {
    if ($Text -match $Pattern) { throw $Message }
}

Assert-Contains $html 'Content-Security-Policy' "La politique CSP est absente."
Assert-Contains $html "script-src 'self'" "La CSP autorise une source de script inattendue."
Assert-NotContains $html 'on(click|error|load)\s*=' "Un gestionnaire HTML intégré contourne la CSP."
Assert-NotContains $js '<[^>]+\son(click|error|load)\s*=' "Un modèle JavaScript recrée un gestionnaire HTML intégré."
Assert-Contains $js '(const escapeHtml\s*=|function escapeHtml\s*\()' "La neutralisation HTML est absente."
Assert-Contains $js 'data-image-fallback' "Le remplacement sécurisé des logos est absent."
Assert-Contains $native 'e\.WebMessageAsJson\.Length>1024\*1024' "La taille des commandes WebView2 n'est pas limitée."
Assert-Contains $native 'CoreWebView2PermissionState\.Deny' "Les permissions WebView2 ne sont pas refusées par défaut."
Assert-Contains $native 'uri\.Scheme != Uri\.UriSchemeHttps' "Les liens externes non chiffrés sont encore autorisés."
Assert-NotContains $native 'GetEnvironmentVariable\("PATH"\)' "WinGet peut encore être détourné via PATH."
Assert-Contains $native 'Microsoft\.DesktopAppInstaller_' "L'emplacement officiel d'App Installer n'est pas contrôlé."
Assert-Contains $native 'mise à jour automatique est désactivée' "La mise à jour automatique non signée est encore active."
Assert-Contains $native 'sourceInfo\.Length>1024\*1024' "La taille d'une configuration importée n'est pas limitée."
Assert-Contains $cleanup 'nettoyage intégré sans validation individuelle est désactivé' "Le nettoyage large intégré reste autorisé."
Assert-Contains $cleanupLauncher 'balayage automatique large des dossiers AppData est désactivé' "Le lanceur peut encore déclencher le balayage AppData automatique."
Assert-Contains $workflow '(?ms)^permissions:\s*\r?\n\s+contents:\s+read' "Les permissions globales GitHub Actions sont trop larges."
Assert-Contains $workflow '(?ms)^\s{2}release:.*?^\s{4}permissions:\s*\r?\n\s{6}contents:\s+write' "Le droit de publication n'est pas limité au job Release."

Write-Host "Contrôles de sécurité statiques réussis." -ForegroundColor Green
