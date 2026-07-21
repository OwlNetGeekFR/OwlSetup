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
    [pscustomobject]@{ Id = '9NT1R1C2HH7J'; Source = 'msstore'; Logo = 'openai.svg'; Name = 'ChatGPT' },
    [pscustomobject]@{ Id = 'Anthropic.Claude'; Source = 'winget'; Logo = 'claude.svg'; Name = 'Claude' },
    [pscustomobject]@{ Id = 'Ollama.Ollama'; Source = 'winget'; Logo = 'ollama.svg'; Name = 'Ollama' },
    [pscustomobject]@{ Id = 'ElementLabs.LMStudio'; Source = 'winget'; Logo = 'lmstudio.svg'; Name = 'LM Studio' },
    [pscustomobject]@{ Id = 'Jan.Jan'; Source = 'winget'; Logo = 'jan.svg'; Name = 'Jan' },
    [pscustomobject]@{ Id = 'Comfy.ComfyUI-Desktop'; Source = 'winget'; Logo = 'comfyui.svg'; Name = 'ComfyUI Desktop' }
)
$guidedAndWebLogos = @(
    'gemini.svg', 'copilot.svg', 'perplexity.svg', 'mistral.svg', 'anythingllm.svg',
    'gpt4all.svg', 'pinokio.svg', 'nvidia.svg', 'stabilitymatrix.svg'
)

if ($Package) {
    $wanted = [Collections.Generic.HashSet[string]]::new([string[]]$Package, [StringComparer]::OrdinalIgnoreCase)
    $packages = @($packages | Where-Object { $wanted.Contains($_.Id) -or $wanted.Contains($_.Name) })
    if ($packages.Count -eq 0) { throw 'Aucun paquet demandé ne correspond au catalogue IA.' }
}

$assetResults = foreach ($item in $packages) {
    $logoPath = Join-Path $repoRoot ('assets\logos\' + $item.Logo)
    [pscustomobject]@{
        Name = $item.Name
        Id = $item.Id
        CatalogEntry = $appJs.Contains(('id:"' + $item.Id + '"'))
        LogoMapping = $appJs.Contains(('"' + $item.Id + '":"' + $item.Logo + '"'))
        LogoFile = Test-Path -LiteralPath $logoPath
    }
}
$extraLogoResults = foreach ($logo in $guidedAndWebLogos) {
    [pscustomobject]@{ Name = $logo; LogoFile = Test-Path -LiteralPath (Join-Path $repoRoot ('assets\logos\' + $logo)) }
}

$assetResults | Format-Table -AutoSize
if ($assetResults.Where({ -not $_.CatalogEntry -or -not $_.LogoMapping -or -not $_.LogoFile }).Count -gt 0 -or
    $extraLogoResults.Where({ -not $_.LogoFile }).Count -gt 0) {
    throw 'Le catalogue IA ou ses logos est incomplet.'
}
Write-Host ('Validation locale réussie : {0} applications installables et {1} autres logos.' -f $assetResults.Count, $extraLogoResults.Count) -ForegroundColor Green

if ($Mode -eq 'Assets') { return }

$winget = Get-Command winget.exe -ErrorAction SilentlyContinue
if (-not $winget) {
    throw 'WinGet est introuvable. Exécutez ce test sur Windows 10/11 avec App Installer installé.'
}

$verifyResults = foreach ($item in $packages) {
    & $winget.Source show --id $item.Id --exact --source $item.Source --accept-source-agreements --disable-interactivity *> $null
    [pscustomobject]@{ Name = $item.Name; Id = $item.Id; Source = $item.Source; Available = ($LASTEXITCODE -eq 0) }
}
$verifyResults | Format-Table -AutoSize
if ($verifyResults.Where({ -not $_.Available }).Count -gt 0) {
    throw 'Au moins un identifiant n’est pas disponible dans sa source WinGet.'
}
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
        $results.Add([pscustomobject]@{ Name=$item.Name; Id=$item.Id; Install='Ignorée'; Uninstall='Ignorée'; Detail='Déjà installée avant le test' })
        continue
    }

    $installedByTest = $false
    try {
        & $winget.Source install --id $item.Id --exact --source $item.Source --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
        if ($LASTEXITCODE -ne 0) { throw ('Échec installation, code ' + $LASTEXITCODE) }
        $installedByTest = $true

        & $winget.Source list --id $item.Id --exact --disable-interactivity *> $null
        if ($LASTEXITCODE -ne 0) { throw 'Installation terminée mais application non détectée.' }

        & $winget.Source uninstall --id $item.Id --exact --silent --disable-interactivity
        if ($LASTEXITCODE -ne 0) { throw ('Échec désinstallation, code ' + $LASTEXITCODE) }
        $installedByTest = $false
        $results.Add([pscustomobject]@{ Name=$item.Name; Id=$item.Id; Install='Réussie'; Uninstall='Réussie'; Detail='' })
    }
    catch {
        $results.Add([pscustomobject]@{ Name=$item.Name; Id=$item.Id; Install=if($installedByTest){'Réussie'}else{'Échec'}; Uninstall='À vérifier'; Detail=$_.Exception.Message })
    }
    finally {
        if ($installedByTest) {
            & $winget.Source uninstall --id $item.Id --exact --silent --disable-interactivity *> $null
        }
    }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportPath = Join-Path $reportFolder ('AI-Lifecycle-' + $stamp + '.json')
$results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportPath -Encoding UTF8
$results | Format-Table -AutoSize
Write-Host ('Rapport : ' + $reportPath) -ForegroundColor Cyan

