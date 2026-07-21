param(
    [ValidateSet('Assets', 'Verify', 'Lifecycle')]
    [string]$Mode = 'Assets',
    [string[]]$Package,
    [switch]$IUnderstandThisInstallsSoftware
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$appJs = Get-Content -LiteralPath (Join-Path $repoRoot 'app.js') -Raw
$packages = @(
    [pscustomobject]@{ Id='Google.Chrome'; Logo='googlechrome.svg'; Name='Google Chrome' },
    [pscustomobject]@{ Id='Mozilla.Firefox'; Logo='firefox.svg'; Name='Mozilla Firefox' },
    [pscustomobject]@{ Id='Brave.Brave'; Logo='brave.svg'; Name='Brave' },
    [pscustomobject]@{ Id='Vivaldi.Vivaldi'; Logo='vivaldi.svg'; Name='Vivaldi' },
    [pscustomobject]@{ Id='Opera.Opera'; Logo='opera.svg'; Name='Opera' },
    [pscustomobject]@{ Id='Opera.OperaGX'; Logo='operagx.svg'; Name='Opera GX' },
    [pscustomobject]@{ Id='LibreWolf.LibreWolf'; Logo='librewolf.svg'; Name='LibreWolf' },
    [pscustomobject]@{ Id='Ablaze.Floorp'; Logo='floorp.svg'; Name='Floorp' },
    [pscustomobject]@{ Id='TorProject.TorBrowser'; Logo='torbrowser.svg'; Name='Tor Browser' },
    [pscustomobject]@{ Id='Waterfox.Waterfox'; Logo='waterfox.svg'; Name='Waterfox' }
)

if ($Package) {
    $packages = @($packages | Where-Object { $Package -icontains $_.Id -or $Package -icontains $_.Name })
    if ($packages.Count -eq 0) { throw 'Aucun navigateur demandé ne correspond au catalogue.' }
}

$assetResults = foreach ($item in $packages) {
    $logoPath = Join-Path $repoRoot ('assets\logos\' + $item.Logo)
    [pscustomobject]@{
        Name = $item.Name
        Id = $item.Id
        CatalogEntry = $appJs.Contains(('id:"' + $item.Id + '"')) -or $appJs.Contains(('id:"' + $item.Id + '"').Replace('\"','"'))
        LogoMapping = $appJs.Contains(('"' + $item.Id + '":"' + $item.Logo + '"'))
        LogoFile = Test-Path -LiteralPath $logoPath
    }
}
$assetResults | Format-Table -AutoSize
if ($assetResults.Where({ -not $_.CatalogEntry -or -not $_.LogoMapping -or -not $_.LogoFile }).Count -gt 0) {
    throw 'Le catalogue des navigateurs ou ses logos est incomplet.'
}
Write-Host ('Validation locale réussie : {0} navigateurs et logos.' -f $assetResults.Count) -ForegroundColor Green
if ($Mode -eq 'Assets') { return }

$winget = Get-Command winget.exe -ErrorAction SilentlyContinue
if (-not $winget) { throw 'WinGet est introuvable. Exécutez ce test sur Windows 10/11 avec App Installer installé.' }

$verifyResults = foreach ($item in $packages) {
    & $winget.Source show --id $item.Id --exact --source winget --accept-source-agreements --disable-interactivity *> $null
    [pscustomobject]@{ Name=$item.Name; Id=$item.Id; Available=($LASTEXITCODE -eq 0) }
}
$verifyResults | Format-Table -AutoSize
if ($verifyResults.Where({ -not $_.Available }).Count -gt 0) { throw 'Au moins un identifiant n’est pas disponible dans WinGet.' }
if ($Mode -eq 'Verify') { return }

if (-not $IUnderstandThisInstallsSoftware) {
    throw 'Le mode Lifecycle installe réellement des logiciels. Relancez avec -IUnderstandThisInstallsSoftware sur un PC de test.'
}

$reportFolder = Join-Path $env:LOCALAPPDATA 'OwlSetup\Tests'
New-Item -ItemType Directory -Path $reportFolder -Force | Out-Null
$results = [Collections.Generic.List[object]]::new()

foreach ($item in $packages) {
    & $winget.Source list --id $item.Id --exact --disable-interactivity *> $null
    if ($LASTEXITCODE -eq 0) {
        $results.Add([pscustomobject]@{ Name=$item.Name; Id=$item.Id; Install='Ignorée'; Uninstall='Ignorée'; Detail='Déjà installé avant le test' })
        continue
    }

    $installedByTest = $false
    try {
        & $winget.Source install --id $item.Id --exact --source winget --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
        if ($LASTEXITCODE -ne 0) { throw ('Échec installation, code ' + $LASTEXITCODE) }
        $installedByTest = $true

        & $winget.Source list --id $item.Id --exact --disable-interactivity *> $null
        if ($LASTEXITCODE -ne 0) { throw 'Installation terminée mais navigateur non détecté.' }

        & $winget.Source uninstall --id $item.Id --exact --silent --disable-interactivity
        if ($LASTEXITCODE -ne 0) { throw ('Échec désinstallation, code ' + $LASTEXITCODE) }
        $installedByTest = $false
        $results.Add([pscustomobject]@{ Name=$item.Name; Id=$item.Id; Install='Réussie'; Uninstall='Réussie'; Detail='' })
    }
    catch {
        $results.Add([pscustomobject]@{ Name=$item.Name; Id=$item.Id; Install=if($installedByTest){'Réussie'}else{'Échec'}; Uninstall='À vérifier'; Detail=$_.Exception.Message })
    }
    finally {
        if ($installedByTest) { & $winget.Source uninstall --id $item.Id --exact --silent --disable-interactivity *> $null }
    }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportPath = Join-Path $reportFolder ('Browser-Lifecycle-' + $stamp + '.json')
$results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportPath -Encoding UTF8
$results | Format-Table -AutoSize
Write-Host ('Rapport : ' + $reportPath) -ForegroundColor Cyan
