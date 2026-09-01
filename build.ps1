param(
    [string]$Output = "OwlSetup.exe",
    [string]$AppVersion = "4.0.0",
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
$outputPath = if ([IO.Path]::IsPathRooted($Output)) { $Output } else { Join-Path $root $Output }
New-Item -ItemType Directory -Force -Path (Split-Path $outputPath) | Out-Null

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

# Interface : regenere app.js depuis beta/src/app/ (concatenation deterministe)
# quand Node est disponible ; sinon le fichier deja versionne est utilise.
$jsScript = Join-Path $root "beta\scripts\build-js.mjs"
$jsOutput = Join-Path $root "app.js"
if ($node -and (Test-Path $jsScript)) {
    & $node.Source $jsScript
    if ($LASTEXITCODE -ne 0) { throw "Generation de app.js echouee (code $LASTEXITCODE)." }
}
if (-not (Test-Path $jsOutput)) {
    throw "app.js introuvable et Node absent : impossible de generer l'interface."
}

# Feuille de style : regenere styles.css depuis beta/src/styles/ (concatenation
# deterministe des partiels, ordre significatif) quand Node est disponible ;
# sinon le fichier deja versionne est utilise.
$cssScript = Join-Path $root "beta\scripts\build-css.mjs"
$cssOutput = Join-Path $root "styles.css"
if ($node -and (Test-Path $cssScript)) {
    & $node.Source $cssScript
    if ($LASTEXITCODE -ne 0) { throw "Generation de styles.css echouee (code $LASTEXITCODE)." }
}
if (-not (Test-Path $cssOutput)) {
    throw "styles.css introuvable et Node absent : impossible de generer l'interface."
}

# Anti-cache : WebView2 sert l'interface via https://pcsetup.local/ et met en
# cache les ressources par URL. Le jeton "?v=" doit donc changer a chaque
# version, sinon une ancienne feuille de style ou un ancien app.js peut rester
# affiche apres une mise a jour.
$indexPath = Join-Path $root "index.html"
$indexHtml = [IO.File]::ReadAllText($indexPath)
$stampedHtml = [regex]::Replace($indexHtml, '(?<file>(?:styles\.css|app\.js|i18n\.js|catalog\.generated\.js))\?v=[^"]*', ('${file}?v=' + $displayVersion))
if ($stampedHtml -ne $indexHtml) {
    [IO.File]::WriteAllText($indexPath, $stampedHtml)
    Write-Host "index.html : jeton anti-cache mis a jour (?v=$displayVersion)"
}

# Compilation : UNE SEULE description du build.
#
# Jusqu'a la 4.1.0-beta.4, ce script listait lui-meme les references et les
# ressources a passer a csc.exe, et beta/csharp/OwlSetup.csproj repetait la meme
# chose pour les analyseurs Roslyn. Deux descriptions du meme programme, tenues
# en phase a la main : le .csproj avait deja perdu cinq attributs d'assembly
# sans que personne le voie.
#
# C'est desormais le .csproj qui compile, ici comme en CI. Le SDK .NET devient
# donc necessaire pour construire l'application.
$projet = Join-Path $root "beta\csharp\OwlSetup.csproj"
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw "Le SDK .NET est requis pour compiler OwlSetup. Installez-le avec : winget install Microsoft.DotNet.SDK.8"
}

Push-Location $root
try {
    & dotnet build $projet -c Release --nologo -v minimal `
        -p:AppVersion=$AppVersion -p:Channel=$Channel -p:PrereleaseLabel=$PrereleaseLabel -p:DisplayVersion=$displayVersion
    if ($LASTEXITCODE -ne 0) { throw "La compilation a echoue avec le code $LASTEXITCODE." }

    $produit = Join-Path $root "beta\csharp\bin\Release\OwlSetup.exe"
    if (-not (Test-Path -LiteralPath $produit)) { throw "Le projet n'a pas produit OwlSetup.exe." }
    Copy-Item -LiteralPath $produit -Destination $outputPath -Force

    $hash = Get-FileHash $outputPath -Algorithm SHA256
    Write-Host "Compilation terminée : $outputPath" -ForegroundColor Green
    Write-Host "Canal : $Channel | Version : $displayVersion"
    Write-Host "SHA-256 : $($hash.Hash)"

    # Shim console (.com) : « OwlSetup --install X » scriptable depuis PowerShell.
    #
    # Celui-ci reste compile par csc.exe : c'est un executable console d'une
    # seule page, sans ressource ni dependance. Lui donner son propre projet
    # couterait plus que cela ne rapporterait.
    $csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
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
