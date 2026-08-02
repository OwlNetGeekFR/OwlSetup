$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$app = Get-Content (Join-Path $root 'app.js') -Raw -Encoding UTF8
$index = Get-Content (Join-Path $root 'index.html') -Raw -Encoding UTF8
$dashboardRoot = Join-Path $root 'OwlSetup-Dashboard'
$dashboardAvailable = Test-Path -LiteralPath (Join-Path $dashboardRoot 'Program.cs') -PathType Leaf

function Assert-Contains([string]$Text, [string]$Expected, [string]$Message) {
    if (-not $Text.Contains($Expected)) { throw $Message }
}

Assert-Contains $app 'schemaVersion: 2' 'OwlSetup doit envoyer le schéma de télémétrie v2.'
foreach ($field in 'errorCategory','failureStage','targetPackage','errorKind','resolutionStatus') {
    Assert-Contains $app $field "Le champ $field est absent du client."
}
Assert-Contains $app 'retry-succeeded' 'La résolution automatique après nouvelle tentative est absente.'
Assert-Contains $index 'inventaire complet' 'Le consentement utilisateur doit distinguer le paquet ciblé de l’inventaire complet.'

if ($dashboardAvailable) {
    $program = Get-Content (Join-Path $dashboardRoot 'Program.cs') -Raw -Encoding UTF8
    $model = Get-Content (Join-Path $dashboardRoot 'Models\DashboardModels.cs') -Raw -Encoding UTF8
    $dashboard = Get-Content (Join-Path $dashboardRoot 'Pages\Index.cshtml') -Raw -Encoding UTF8
    $dashboardCode = Get-Content (Join-Path $dashboardRoot 'Pages\Index.cshtml.cs') -Raw -Encoding UTF8

    foreach ($field in 'errorCategory','failureStage','targetPackage','errorKind','resolutionStatus') {
        $modelField = $field.Substring(0,1).ToUpperInvariant() + $field.Substring(1)
        Assert-Contains $model $modelField "Le champ $field est absent du modèle serveur."
    }
    Assert-Contains $program 'input.SchemaVersion is not (1 or 2)' 'Le serveur doit accepter les anciens rapports v1 et les rapports v2.'
    Assert-Contains $program 'payload_too_large' 'La limite de taille serveur doit rester active.'
    Assert-Contains $dashboard 'latestEvent.TargetPackage' 'Le détail du paquet concerné est absent du dashboard.'
    Assert-Contains $dashboard 'isResolved' 'Le statut de résolution automatique est absent.'
    Assert-Contains $dashboardCode 'process-lock' 'L’interprétation des processus bloquants est absente.'
} else {
    Write-Host 'INFO - dashboard absent de ce checkout : les contrôles serveur v2 restent exécutés dans le dépôt OwlSetup-Dashboard.' -ForegroundColor DarkGray
}

if ($app -match 'minimalTelemetrySample[\s\S]{0,2600}(userName|email|filePath|logContent|installedApps)\s*:') {
    throw 'Le diagnostic v2 contient une donnée personnelle ou un inventaire interdit.'
}

Write-Host 'OK - télémétrie v2 explicable, compatible et respectueuse de la vie privée.' -ForegroundColor Green
