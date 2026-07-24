[CmdletBinding()]
param(
    [string]$CatalogScript = (Join-Path $PSScriptRoot "..\app.js"),
    [switch]$InstallAndUninstall,
    [switch]$IncludeHighRisk,
    [string]$ConfirmDestructiveTest = "",
    [string[]]$Only = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-WinGet {
    $command = Get-Command winget.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $alias = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\winget.exe"
    if (Test-Path -LiteralPath $alias) { return $alias }
    throw "WinGet est introuvable. Installez ou reparez App Installer depuis Microsoft Store."
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-WinGetCommand {
    param([string[]]$Arguments)
    $lines = & $script:WinGet @Arguments 2>&1
    $code = $LASTEXITCODE
    [pscustomobject]@{ Code = $code; Output = ($lines | Out-String).Trim() }
}

function Test-PackageInstalled {
    param([string]$Id)
    $result = Invoke-WinGetCommand @("list", "--id", $Id, "--exact", "--accept-source-agreements", "--disable-interactivity")
    return $result.Code -eq 0 -and $result.Output.IndexOf($Id, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

if (-not (Test-Path -LiteralPath $CatalogScript)) { throw "Catalogue introuvable : $CatalogScript" }
if ($InstallAndUninstall) {
    if ($ConfirmDestructiveTest -cne "TEST OWLSETUP") { throw 'Ajoutez -ConfirmDestructiveTest "TEST OWLSETUP" pour autoriser les installations.' }
    if (-not (Test-IsAdministrator)) { throw "Relancez PowerShell en tant qu'administrateur pour le test d'installation/desinstallation." }
}

$script:WinGet = Resolve-WinGet
$source = Get-Content -LiteralPath $CatalogScript -Raw -Encoding UTF8
$matches = [regex]::Matches($source, '(?s)\{(?<body>[^{}]*?\bid:"(?<id>[A-Za-z0-9.+_-]+)"[^{}]*?)\}')
$seen = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$catalog = foreach ($match in $matches) {
    $id = $match.Groups['id'].Value
    if (-not $seen.Add($id)) { continue }
    $body = $match.Groups['body'].Value
    $nameMatch = [regex]::Match($body, '\bname:"(?<value>[^"]+)"')
    $categoryMatch = [regex]::Match($body, '\bcategory:"(?<value>[^"]+)"')
    [pscustomobject]@{
        Id = $id
        Name = if ($nameMatch.Success) { $nameMatch.Groups['value'].Value } else { $id }
        Category = if ($categoryMatch.Success) { $categoryMatch.Groups['value'].Value } else { "Inconnue" }
        Manual = $body -match '\bmanualInstall:true'
        Protected = $body -match '\bprotected:true'
        Portable = $body -match '\bportable:true'
    }
}

if ($Only.Count) {
    $wanted = [Collections.Generic.HashSet[string]]::new($Only, [StringComparer]::OrdinalIgnoreCase)
    $catalog = @($catalog | Where-Object { $wanted.Contains($_.Id) })
}
if (-not $catalog.Count) { throw "Aucun logiciel trouve dans le catalogue." }

$stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$reportRoot = Join-Path $env:LOCALAPPDATA "OwlSetup\CatalogTests\$stamp"
New-Item -ItemType Directory -Path $reportRoot -Force | Out-Null
$highRiskCategories = @("Composants", "Virtualisation", "Securite", "Sécurité")
$results = [Collections.Generic.List[object]]::new()

foreach ($app in $catalog) {
    Write-Host ("[{0}/{1}] {2}" -f ($results.Count + 1), $catalog.Count, $app.Name) -ForegroundColor Cyan
    $status = "Catalogue valide"
    $detail = ""
    if ($app.Manual) {
        $status = "Installation guidee"
        $detail = "Aucun paquet WinGet requis"
        Set-Content -LiteralPath (Join-Path $reportRoot ($app.Id + ".log")) -Value "CONTROLE`r`nInstallation manuelle ou service Web : aucun appel WinGet." -Encoding UTF8
    } else {
        $show = Invoke-WinGetCommand @("show", "--id", $app.Id, "--exact", "--accept-source-agreements", "--disable-interactivity")
        Set-Content -LiteralPath (Join-Path $reportRoot ($app.Id + ".log")) -Value ("SHOW`r`n" + $show.Output) -Encoding UTF8
    }
    if (-not $app.Manual -and $show.Code -ne 0) {
        $status = "Identifiant invalide"
        $detail = "WinGet show : $($show.Code)"
    } elseif (-not $app.Manual -and $InstallAndUninstall) {
        if ($app.Protected) { $status = "Ignore - protege"; $detail = "Jamais desinstalle automatiquement" }
        elseif ($app.Manual) { $status = "Ignore - manuel"; $detail = "Installation guidee" }
        elseif (-not $IncludeHighRisk -and $highRiskCategories -contains $app.Category) { $status = "Ignore - risque eleve"; $detail = "Utilisez -IncludeHighRisk uniquement dans une VM avec instantane" }
        elseif (Test-PackageInstalled $app.Id) { $status = "Ignore - deja present"; $detail = "OwlSetup ne desinstalle jamais une application presente avant le test" }
        else {
            $install = Invoke-WinGetCommand @("install", "--id", $app.Id, "--exact", "--silent", "--accept-package-agreements", "--accept-source-agreements", "--disable-interactivity")
            Add-Content -LiteralPath (Join-Path $reportRoot ($app.Id + ".log")) -Value ("`r`n`r`nINSTALL ($($install.Code))`r`n" + $install.Output) -Encoding UTF8
            if ($install.Code -notin @(0, 1641, 3010) -or -not (Test-PackageInstalled $app.Id)) {
                $status = "Echec installation"
                $detail = "Code $($install.Code)"
            } else {
                $uninstall = Invoke-WinGetCommand @("uninstall", "--id", $app.Id, "--exact", "--silent", "--accept-source-agreements", "--disable-interactivity")
                if ($uninstall.Code -notin @(0, 1641, 3010)) {
                    $uninstall = Invoke-WinGetCommand @("uninstall", "--id", $app.Id, "--exact", "--scope", "machine", "--silent", "--accept-source-agreements", "--disable-interactivity")
                }
                if ($uninstall.Code -notin @(0, 1641, 3010)) {
                    $uninstall = Invoke-WinGetCommand @("uninstall", "--id", $app.Id, "--exact", "--scope", "user", "--silent", "--accept-source-agreements", "--disable-interactivity")
                }
                Add-Content -LiteralPath (Join-Path $reportRoot ($app.Id + ".log")) -Value ("`r`n`r`nUNINSTALL ($($uninstall.Code))`r`n" + $uninstall.Output) -Encoding UTF8
                Start-Sleep -Seconds 2
                if (Test-PackageInstalled $app.Id) { $status = "Echec desinstallation"; $detail = "Code $($uninstall.Code), paquet encore detecte" }
                else { $status = "Cycle reussi"; $detail = if ($install.Code -in @(1641,3010) -or $uninstall.Code -in @(1641,3010)) { "Redemarrage demande" } else { "Installation et desinstallation verifiees" } }
            }
        }
    }
    $results.Add([pscustomobject]@{ Id=$app.Id; Name=$app.Name; Category=$app.Category; Status=$status; Detail=$detail; TestedAt=(Get-Date).ToString("o") })
}

$csv = Join-Path $reportRoot "resultats.csv"
$json = Join-Path $reportRoot "resultats.json"
$results | Export-Csv -LiteralPath $csv -NoTypeInformation -Encoding UTF8
$results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $json -Encoding UTF8

Write-Host ""
Write-Host "Test termine." -ForegroundColor Green
Write-Host "Rapport : $reportRoot"
$results | Group-Object Status | Sort-Object Name | Format-Table Count, Name -AutoSize
