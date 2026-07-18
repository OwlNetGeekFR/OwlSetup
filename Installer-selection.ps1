param(
    [string]$PackagesFile,
    [string]$PackageList
)

$ErrorActionPreference = "Continue"
$rawPackages = if ($PackageList) {
    $PackageList -split ';'
} elseif ($PackagesFile -and (Test-Path -LiteralPath $PackagesFile)) {
    @(Get-Content -LiteralPath $PackagesFile -Raw | ConvertFrom-Json)
} else {
    @()
}
$packages = @($rawPackages) |
    ForEach-Object { [string]$_ } |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -match '^[A-Za-z0-9.+_-]+$' } |
    Select-Object -Unique
if ($PackagesFile) { Remove-Item -LiteralPath $PackagesFile -Force -ErrorAction SilentlyContinue }

if (@($packages).Count -eq 0) { Write-Host "Aucun logiciel valide." -ForegroundColor Red; Read-Host "Entree pour fermer"; exit 1 }
$logs = Join-Path $env:LOCALAPPDATA "PCSetup\Logs"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$log = Join-Path $logs ("PC-Setup-Installation-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
Start-Transcript -Path $log -Force
$Host.UI.RawUI.WindowTitle = "OwlSetup - Installation"

Write-Host "OWLSETUP - INSTALLATION" -ForegroundColor Cyan
Write-Host "$(@($packages).Count) logiciel(s) selectionne(s) :"
$packages | ForEach-Object { Write-Host " - $_" }
$confirm = Read-Host "Tapez OUI pour commencer"
if ($confirm -ne "OUI") { Stop-Transcript; exit }

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget est introuvable. Installez App Installer depuis Microsoft Store." -ForegroundColor Red
} else {
    foreach ($package in $packages) {
        Write-Host "`nInstallation : $package" -ForegroundColor Yellow
        winget install --id $package --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
        if ($LASTEXITCODE -eq 0) { Write-Host "Termine : $package" -ForegroundColor Green }
        else { Write-Host "A verifier : $package (code $LASTEXITCODE)" -ForegroundColor DarkYellow }
    }
}
Write-Host "`nOperation terminee. Rapport : $log" -ForegroundColor Cyan
Stop-Transcript
Read-Host "Appuyez sur Entree pour fermer"
