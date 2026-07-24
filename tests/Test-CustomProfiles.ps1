$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$script = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw

$required = @(
    'owlsetup-custom-packages-v1',
    'function addCustomAppDefinition',
    'storedCustomPackages.filter(isValidPackageId)',
    'profilePackages.filter(id=>!apps.some',
    'forEach(id=>addCustomAppDefinition(id))'
)

foreach ($value in $required) {
    if (-not $script.Contains($value)) {
        throw "Persistance des paquets personnalisés incomplète : $value"
    }
}

if ($script -notmatch 'profilePackages=Array\.isArray\(profiles\[name\]\).*?filter\(isValidPackageId\).*?slice\(0,100\)') {
    throw "Les identifiants restaurés depuis un profil ne sont pas suffisamment contrôlés."
}

Write-Host "Persistance des paquets personnalisés et profils : contrôle réussi." -ForegroundColor Green
