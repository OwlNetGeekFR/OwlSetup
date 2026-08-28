$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$catalogPath = Join-Path $repoRoot 'beta\catalog\apps.json'
$logoRoot = Join-Path $repoRoot 'assets\logos'

# Depuis 4.0.0-beta.32, chaque entree de beta/catalog/apps.json porte son champ
# `logo` (`assets/logos/<fichier>`) : c'est la seule source de verite (plus de
# table `appLogos` dans app.js). Ce test verifie que chaque logo reference
# existe, n'est pas vide et a la bonne signature.
$catalog = Get-Content -LiteralPath $catalogPath -Raw | ConvertFrom-Json
$apps = @($catalog.applications)

if ($apps.Count -lt 90) {
    throw "Le catalogue doit lister au moins 90 applications, $($apps.Count) trouvees."
}

$missing = [Collections.Generic.List[string]]::new()
$invalid = [Collections.Generic.List[string]]::new()
foreach ($app in $apps) {
    $logo = $app.logo
    if (-not $logo) { $missing.Add("$($app.id) -> (champ logo absent)"); continue }
    if ($logo -notmatch '^assets/logos/[^/]+\.(svg|png|ico)$') {
        $invalid.Add("$($app.id) -> $logo (format attendu : assets/logos/<fichier>.svg|png|ico)")
        continue
    }
    $file = $logo -replace '^assets/logos/', ''
    $path = Join-Path $logoRoot $file
    if (-not (Test-Path -LiteralPath $path)) { $missing.Add("$($app.id) -> $file"); continue }
    if ((Get-Item -LiteralPath $path).Length -lt 100) { $invalid.Add("$($app.id) -> $file (fichier vide)") }
    if ([IO.Path]::GetExtension($file) -eq '.png') {
        $bytes = [IO.File]::ReadAllBytes($path)
        $pngSignature = $bytes.Length -ge 8 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47
        if (-not $pngSignature) { $invalid.Add("$($app.id) -> $file (extension PNG incorrecte)") }
    }
}

if ($missing.Count) { throw ('Logos manquants : ' + ($missing -join '; ')) }
if ($invalid.Count) { throw ('Logos invalides : ' + ($invalid -join '; ')) }

$crystalFiles = @('crystaldiskinfo.ico', 'crystaldiskmark.ico') | ForEach-Object { Join-Path $logoRoot $_ }
$crystalHashes = $crystalFiles | ForEach-Object { (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash } | Select-Object -Unique
if ($crystalHashes.Count -ne 2) { throw 'CrystalDiskInfo et CrystalDiskMark utilisent encore la même icône.' }

Write-Host "Validation des logos réussie : $($apps.Count) applications couvertes, aucun fichier absent ou incohérent." -ForegroundColor Green
