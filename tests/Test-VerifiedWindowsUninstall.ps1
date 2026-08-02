$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$nativePath = Join-Path $root "OwlSetupWebView.cs"
$native = Get-Content -LiteralPath $nativePath -Raw -Encoding UTF8

$required = @(
    'PromoteVerifiedWingetPackages(wingetInstalled,registryInstalled.Concat(msixInstalled).Concat(customPackages),report);',
    'void PromoteVerifiedWingetPackages(',
    'list --id \""+id+"\" --exact --accept-source-agreements --disable-interactivity',
    'if(exact)wingetInstalled.Add(id);'
)

foreach ($token in $required) {
    if (-not $native.Contains($token)) {
        throw "Vérification de désinstallation absente : $token"
    }
}

if ($native -match 'cmd\.exe.*UninstallString') {
    throw "Une commande de registre non vérifiée ne doit pas être exécutée via cmd.exe."
}

Write-Host "Désinstallation Windows limitée aux correspondances WinGet exactes." -ForegroundColor Green
