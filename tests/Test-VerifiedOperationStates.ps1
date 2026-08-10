$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$app = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw

$required = @(
    'function operationFailureFingerprint(operation)',
    'function reconcileOperationsWithDetectedState',
    'occurrences:(Number(duplicate.occurrences)||1)+1',
    'Résultat vérifié automatiquement sur ce PC',
    'Résultat confirmé après contrôle',
    'const applicationsVerified=message.appsSuccess===true',
    'verified:applicationsVerified',
    'verified:!message.failed',
    'updateScanReliable:true'
)

foreach ($token in $required) {
    if (-not $app.Contains($token)) {
        throw "État d'opération vérifié incomplet : $token"
    }
}

Write-Host "OK - états d'opération vérifiés, dédupliqués et réconciliés"
