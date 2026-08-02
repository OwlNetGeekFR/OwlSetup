$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -Raw -LiteralPath (Join-Path $root 'index.html')
$build = Get-Content -Raw -LiteralPath (Join-Path $root 'build.ps1')
$hostSource = Get-Content -Raw -LiteralPath (Join-Path $root 'OwlSetupWebView.cs')

$expectedWebPath = 'assets/branding/owlsetup-logo.png'
$references = @([regex]::Matches($index, 'assets/branding/owlsetup-logo[^"'']*') |
    ForEach-Object { $_.Value } |
    Select-Object -Unique)

if ($references.Count -ne 1 -or $references[0] -ne $expectedWebPath) {
    throw "Les vues OwlSetup ne ciblent pas toutes $expectedWebPath. Références: $($references -join ', ')"
}

if ($build -notmatch [regex]::Escape('/resource:assets\branding\owlsetup-logo-512.png,app-logo.png')) {
    throw 'Le logo source OwlSetup n’est pas embarqué sous la ressource app-logo.png.'
}

if ($hostSource -notmatch [regex]::Escape('Extract("app-logo.png", Path.Combine(AppRoot, "assets", "branding", "owlsetup-logo.png"))')) {
    throw 'La ressource app-logo.png n’est pas extraite vers le chemin attendu par l’interface.'
}

Write-Host 'Ressource de marque OwlSetup : chemin embarqué et extraction cohérents.' -ForegroundColor Green
