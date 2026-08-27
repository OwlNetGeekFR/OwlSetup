param(
    [string]$Output = "OwlSetup.exe",
    [string]$AppVersion = "3.7.0",
    [ValidateSet("stable", "beta", "alpha")]
    [string]$Channel = "stable",
    [string]$PrereleaseLabel = ""
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$webViewVersion = "1.0.4078.44"
$packageRoot = Join-Path $root "packages\Microsoft.Web.WebView2.$webViewVersion"
$nupkg = Join-Path $root "packages\Microsoft.Web.WebView2.$webViewVersion.nupkg"

if ($AppVersion -notmatch '^\d+\.\d+\.\d+$') {
    throw "La version doit utiliser le format majeur.mineur.correctif, par exemple 3.2.0."
}
if ($Channel -ne "stable" -and [string]::IsNullOrWhiteSpace($PrereleaseLabel)) {
    $PrereleaseLabel = if ($Channel -eq "alpha") { "alpha.1" } else { "beta.1" }
}
if ($PrereleaseLabel -and $PrereleaseLabel -notmatch '^[A-Za-z0-9.-]+$') {
    throw "Le libellé de préversion contient des caractères non autorisés."
}

$displayVersion = if ($Channel -ne "stable") { "$AppVersion-$PrereleaseLabel" } else { $AppVersion }
$assemblyVersion = "$AppVersion.0"
$buildInfo = Join-Path $root "obj\PCSetup.BuildInfo.cs"
$outputPath = if ([IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path $root $Output }
New-Item -ItemType Directory -Force -Path (Split-Path $buildInfo), (Split-Path $outputPath) | Out-Null

$isBetaLiteral = if ($Channel -ne "stable") { "true" } else { "false" }
@"
using System.Reflection;
[assembly: AssemblyTitle("OwlSetup")]
[assembly: AssemblyProduct("OwlSetup")]
[assembly: AssemblyDescription("Installation, mise a jour et entretien de Windows")]
[assembly: AssemblyCompany("OwlNetGeekFR")]
[assembly: AssemblyVersion("$assemblyVersion")]
[assembly: AssemblyFileVersion("$assemblyVersion")]
[assembly: AssemblyInformationalVersion("$displayVersion")]
internal static class BuildInfo
{
    public const string Channel = "$Channel";
    public const string DisplayVersion = "$displayVersion";
    public static readonly bool IsBeta = $isBetaLiteral;
}
"@ | Set-Content -LiteralPath $buildInfo -Encoding UTF8

if (-not (Test-Path (Join-Path $packageRoot "lib\net462\Microsoft.Web.WebView2.Core.dll"))) {
    New-Item -ItemType Directory -Force -Path (Split-Path $nupkg) | Out-Null
    Invoke-WebRequest "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/$webViewVersion" -OutFile $nupkg
    $zip = [IO.Path]::ChangeExtension($nupkg, ".zip")
    Copy-Item $nupkg $zip -Force
    Expand-Archive $zip -DestinationPath $packageRoot -Force
    Remove-Item $zip -Force
}

$core = Join-Path $packageRoot "lib\net462\Microsoft.Web.WebView2.Core.dll"
$forms = Join-Path $packageRoot "lib\net462\Microsoft.Web.WebView2.WinForms.dll"
$loader = Join-Path $packageRoot "runtimes\win-x64\native\WebView2Loader.dll"
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

# Catalogue externalise : regenere catalog.generated.js depuis beta/catalog/apps.json
# quand Node est disponible ; sinon le fichier deja versionne est utilise.
$catalogScript = Join-Path $root "beta\scripts\build-catalog.mjs"
$catalogOutput = Join-Path $root "catalog.generated.js"
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node -and (Test-Path $catalogScript)) {
    & $node.Source $catalogScript
    if ($LASTEXITCODE -ne 0) { throw "Generation du catalogue echouee (code $LASTEXITCODE)." }
}
if (-not (Test-Path $catalogOutput)) {
    throw "catalog.generated.js introuvable et Node absent : impossible de generer le catalogue."
}

$arguments = @(
    "/nologo", "/target:winexe", "/optimize+", "/platform:x64",
    "/out:$outputPath", "/win32manifest:OwlSetup.manifest", "/win32icon:OwlSetup.ico",
    "/reference:System.Windows.Forms.dll", "/reference:System.Drawing.dll",
    "/reference:System.Core.dll", "/reference:System.Web.Extensions.dll",
    "/reference:System.IO.Compression.dll", "/reference:System.IO.Compression.FileSystem.dll",
    "/reference:$core", "/reference:$forms",
    "/resource:index.html,index.html", "/resource:i18n.js,i18n.js", "/resource:catalog.generated.js,catalog.generated.js", "/resource:app.js,app.js", "/resource:styles.css,styles.css",
    "/resource:Mettre-a-jour-mon-PC.ps1,Mettre-a-jour-mon-PC.ps1",
    "/resource:Liberer-espace-disque.ps1,Liberer-espace-disque.ps1",
    "/resource:Nettoyer-residus-applications.ps1,Nettoyer-residus-applications.ps1",
    "/resource:Installer-selection.ps1,Installer-selection.ps1",
    "/resource:assets\branding\owlsetup-logo-512.png,app-logo.png",
    "/resource:OwlSetup.ico,app-icon.ico",
    "/resource:$core,wv2core", "/resource:$forms,wv2forms", "/resource:$loader,wv2loader"
)

Get-ChildItem (Join-Path $root "assets\logos") -File | ForEach-Object {
    $arguments += "/resource:$($_.FullName),logos.$($_.Name)"
}
$arguments += "OwlSetupWebView.cs"
$arguments += $buildInfo

Push-Location $root
try {
    & $csc $arguments
    if ($LASTEXITCODE -ne 0) { throw "La compilation a échoué avec le code $LASTEXITCODE." }
    $hash = Get-FileHash $outputPath -Algorithm SHA256
    Write-Host "Compilation terminée : $outputPath" -ForegroundColor Green
    Write-Host "Canal : $Channel | Version : $displayVersion"
    Write-Host "SHA-256 : $($hash.Hash)"

    # Shim console (.com) : « OwlSetup --install X » scriptable depuis PowerShell.
    $shimSource = Join-Path $root "OwlSetupCli.cs"
    if (Test-Path $shimSource) {
        $shimOut = [IO.Path]::ChangeExtension($outputPath, ".com")
        & $csc @("/nologo", "/target:exe", "/optimize+", "/platform:x64", "/out:$shimOut", $shimSource)
        if ($LASTEXITCODE -ne 0) { throw "Compilation du shim console (.com) a échoué avec le code $LASTEXITCODE." }
        Write-Host "Shim console : $shimOut" -ForegroundColor Green
    }
} finally {
    Pop-Location
}
