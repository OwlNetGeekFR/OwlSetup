$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$appJsPath = Join-Path $repoRoot 'app.js'
$logoRoot = Join-Path $repoRoot 'assets\logos'
$appJs = Get-Content -LiteralPath $appJsPath -Raw

$mappingBlock = [regex]::Match($appJs, '(?s)const appLogos = \{(?<body>.*?)\};')
if (-not $mappingBlock.Success) { throw 'La table appLogos est introuvable.' }

$matches = [regex]::Matches($mappingBlock.Groups['body'].Value, '"(?<id>[^"]+)"\s*:\s*"(?<file>[^"]+)"')
if ($matches.Count -ne 93) {
    throw "Le catalogue doit associer 93 applications à un logo, mais $($matches.Count) associations ont été trouvées."
}

$missing = [Collections.Generic.List[string]]::new()
$invalid = [Collections.Generic.List[string]]::new()
foreach ($match in $matches) {
    $id = $match.Groups['id'].Value
    $file = $match.Groups['file'].Value
    $path = Join-Path $logoRoot $file
    if (-not (Test-Path -LiteralPath $path)) {
        $missing.Add("$id -> $file")
        continue
    }
    if ((Get-Item -LiteralPath $path).Length -lt 100) { $invalid.Add("$id -> $file (fichier vide)") }
    if ([IO.Path]::GetExtension($file) -eq '.png') {
        $bytes = [IO.File]::ReadAllBytes($path)
        $pngSignature = $bytes.Length -ge 8 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47
        if (-not $pngSignature) { $invalid.Add("$id -> $file (extension PNG incorrecte)") }
    }
}

if ($missing.Count) { throw ('Logos manquants : ' + ($missing -join '; ')) }
if ($invalid.Count) { throw ('Logos invalides : ' + ($invalid -join '; ')) }

$crystalFiles = @('crystaldiskinfo.ico', 'crystaldiskmark.ico') | ForEach-Object { Join-Path $logoRoot $_ }
$crystalHashes = $crystalFiles | ForEach-Object { (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash } | Select-Object -Unique
if ($crystalHashes.Count -ne 2) { throw 'CrystalDiskInfo et CrystalDiskMark utilisent encore la même icône.' }

Write-Host "Validation des logos réussie : $($matches.Count) applications couvertes, aucun fichier absent ou incohérent." -ForegroundColor Green
