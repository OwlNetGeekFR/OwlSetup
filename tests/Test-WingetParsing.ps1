$ErrorActionPreference = "Stop"

# Garde l'analyseur unique de la sortie tabulaire de winget (4.1 / beta.12) et
# vérifie qu'il produit les bons résultats sur de vraies captures.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$fixtures = Join-Path $root "beta\test\fixtures"

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}

# 1) Marqueurs de l'analyseur centralisé
Assert-Has $native 'static List<Dictionary<string,string>> ParseWingetTable' "L'analyseur winget centralisé a disparu."
Assert-Has $native 'static string StripWingetAnsi' "Le nettoyage ANSI centralisé a disparu."
Assert-Has $native 'WingetHeaderAliases' "La table d'en-têtes localisés (Nom/ID/Disponible/Correspondance) a disparu."
Assert-Has $native 'foreach(var row in ParseWingetTable(report.ToString()))' "QueryAvailableUpdates n'utilise plus l'analyseur centralisé."
Assert-Has $native 'foreach(var row in ParseWingetTable(output))' "ParseWingetSearchResults n'utilise plus l'analyseur centralisé."
if ($native -match 'Regex\.Match\(line,@"\^\(\.\+\?\)\\s\{2,\}') {
    throw "L'ancienne regex positionnelle de QueryAvailableUpdates est de retour."
}

# 1b) Increment 2 : les vérifications d'installation/désinstallation passent par la
# colonne ID (WingetTableContainsId), plus par un IndexOf/Regex sur la sortie brute.
Assert-Has $native 'static bool WingetTableContainsId(string output,string id)' "Le contrôle par colonne ID (WingetTableContainsId) a disparu."
Assert-Has $native 'return code==0&&WingetTableContainsId(verification.ToString(),packageId);' "VerifyPackageInstallation n'utilise plus WingetTableContainsId."
Assert-Has $native 'if(listCode==0 && WingetTableContainsId(listOutput,packageId))return true;' "IsPackageStillInstalled n'utilise plus WingetTableContainsId."
Assert-Has $native 'bool exact=code==0 && WingetTableContainsId(output,id);' "PromoteVerifiedWingetPackages n'utilise plus WingetTableContainsId."
Assert-Has $native 'return WingetTableContainsId(output,packageId);' "OutputContainsExactPackageId ne délègue plus à WingetTableContainsId."
if ($native -match 'verification\.ToString\(\)\.IndexOf\(packageId,StringComparison\.OrdinalIgnoreCase\)>=0') {
    throw "L'ancien IndexOf de VerifyPackageInstallation est de retour."
}
if ($native -match 'listOutput\.IndexOf\(packageId,StringComparison\.OrdinalIgnoreCase\)>=0') {
    throw "L'ancien IndexOf de IsPackageStillInstalled est de retour."
}
if ($native -match 'Regex\.Split\(line,@"\\s\{2,\}"\)') {
    throw "L'ancienne regex \s{2,} de ParseWingetListPackageIds est de retour."
}

# 1c) Increment 3 : tout le CLI winget passe par un point d'entree unique.
Assert-Has $native 'int RunWingetCli(string arguments, StringBuilder report)' "Le point d'entree unique RunWingetCli a disparu."
Assert-Has $native 'int RunWingetCli(string arguments, StringBuilder report, Action<string> onLine)' "La surcharge streaming de RunWingetCli a disparu."
$directWinget = ([regex]::Matches($native, 'RunHiddenProcess\("winget\.exe"')).Count
if ($directWinget -ne 0) {
    throw "$directWinget appel(s) winget contournent encore RunWingetCli (RunHiddenProcess(""winget.exe"", ...) direct)."
}
$viaCli = ([regex]::Matches($native, 'RunWingetCli\(')).Count
if ($viaCli -lt 20) {
    throw "Trop peu d'appels via RunWingetCli ($viaCli) : la migration a regresse."
}

# 2) Résultats sur une vraie capture (si l'exécutable compilé et les fixtures existent)
$exe = Join-Path $root "OwlSetup.exe"
$upgradeFixture = Join-Path $fixtures "winget-upgrade-fr.txt"
if ((Test-Path $exe) -and (Test-Path $upgradeFixture)) {
    $asm = [System.Reflection.Assembly]::LoadFrom($exe)
    $method = $asm.GetType("WebAppForm").GetMethod("ParseWingetTable", [System.Reflection.BindingFlags]"NonPublic,Static")
    if (-not $method) { throw "ParseWingetTable introuvable par réflexion." }
    [string]$content = [IO.File]::ReadAllText($upgradeFixture)
    $callArgs = [object[]]::new(1); $callArgs[0] = $content
    $rows = $method.Invoke($null, $callArgs)

    if ($rows.Count -ne 5) { throw "winget upgrade : 5 lignes attendues, $($rows.Count) obtenues." }
    $ubi = $rows | Where-Object { $_["id"] -eq "Ubisoft.Connect" } | Select-Object -First 1
    if (-not $ubi) { throw "Ubisoft.Connect (version installée avec espace) n'est plus lu." }
    if ($ubi["version"] -ne "< 173.0.0.13316") { throw "Version à espace mal découpée : '$($ubi["version"])'." }
    if ($ubi["available"] -ne "173.0.0.13316") { throw "Colonne Disponible décalée : '$($ubi["available"])'." }
    $dotnet = $rows | Where-Object { $_["id"] -eq "Microsoft.DotNet.DesktopRuntime.8" } | Select-Object -First 1
    if ($dotnet["name"] -ne "Microsoft Windows Desktop Runtime - 8.0.28 (x64)") {
        throw "Nom long à espaces multiples tronqué : '$($dotnet["name"])'."
    }

    $hasId = $asm.GetType("WebAppForm").GetMethod("WingetTableContainsId", [System.Reflection.BindingFlags]"NonPublic,Static")
    if (-not $hasId) { throw "WingetTableContainsId introuvable par réflexion." }
    $yes = [object[]]::new(2); $yes[0] = $content; $yes[1] = "Blizzard.BattleNet"
    if (-not $hasId.Invoke($null, $yes)) { throw "WingetTableContainsId ne reconnaît pas un id présent (version Unknown)." }
    $no = [object[]]::new(2); $no[0] = $content; $no[1] = "Nope.Missing"
    if ($hasId.Invoke($null, $no)) { throw "WingetTableContainsId : faux positif sur un id absent." }

    Write-Host "Analyseur winget : marqueurs présents + résultats corrects sur capture réelle." -ForegroundColor Green
}
else {
    Write-Host "Analyseur winget : marqueurs présents (test sur capture ignoré, exe/fixture absents)." -ForegroundColor Green
}
