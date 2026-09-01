$ErrorActionPreference = "Stop"

# Durcissement des appels natifs (lot 3 - 4.0.0-beta.56).
#
# Sans DefaultDllImportSearchPaths, un P/Invoke suit l'ordre de recherche par
# defaut de Windows, qui inclut le dossier de l'application et le repertoire
# courant. Une DLL deposee a cote de l'executable peut alors etre chargee a la
# place de celle du systeme.
#
# kernel32 et advapi32 sont des KnownDLLs, que Windows protege deja de ce
# detournement. userenv, wscapi et dwmapi ne le sont PAS : ce sont elles qui
# rendent l'attribut necessaire. On l'exige partout, pour ne pas avoir a
# maintenir la liste des DLL protegees.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$lignes = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Encoding UTF8

# 1) Chaque declaration P/Invoke est precedee de l'attribut.
$attribut = "[DefaultDllImportSearchPaths(DllImportSearchPath.System32)]"
$sansAttribut = @()
for ($i = 0; $i -lt $lignes.Count; $i++) {
    if ($lignes[$i] -notmatch '^\s*\[DllImport\(') { continue }
    if ($i -eq 0 -or $lignes[$i - 1] -notmatch [regex]::Escape($attribut)) {
        $sansAttribut += ("ligne " + ($i + 1) + " : " + $lignes[$i].Trim())
    }
}
if ($sansAttribut.Count -gt 0) {
    throw "P/Invoke sans DefaultDllImportSearchPaths :`n" + ($sansAttribut -join "`n")
}

$nbPInvoke = ([regex]::Matches($native, '(?m)^\s*\[DllImport\(')).Count
if ($nbPInvoke -lt 10) { throw "Trop peu de P/Invoke detectes ($nbPInvoke) : le test ne verifie plus rien." }

# 2) Les DLL hors KnownDLLs sont bien celles qu'on croit : si une nouvelle
#    apparait, on veut le savoir plutot que de la couvrir par inadvertance.
$dlls = [regex]::Matches($native, 'DllImport\("([^"]+)"') | ForEach-Object { $_.Groups[1].Value.ToLowerInvariant() -replace '\.dll$', '' } | Sort-Object -Unique
#
#    user32 rejoint la liste en 4.1.0-beta.6, pour le garde d'instance unique :
#    SetForegroundWindow, ShowWindow et IsIconic ramenent au premier plan la
#    fenetre deja ouverte. C'est une KnownDLL, donc protegee du detournement,
#    et l'attribut est pose malgre tout comme sur toutes les autres.
$attendues = @("advapi32", "dwmapi", "kernel32", "user32", "userenv", "wscapi")
$inconnues = $dlls | Where-Object { $attendues -notcontains $_ }
if ($inconnues) { throw "Nouvelle DLL importee, a revoir : $($inconnues -join ', ')" }

# 3) TLS : le choix explicite est conserve, et n'est plus un nombre magique.
if ($native.Contains("(SecurityProtocolType)3072")) {
    throw "Le protocole TLS est de nouveau code en dur sous forme numerique."
}
if (-not $native.Contains("SecurityProtocolType.Tls12")) {
    throw "Le forcage explicite de TLS 1.2 a disparu : sur .NET 4.6.2 le defaut systeme peut autoriser TLS 1.0."
}

# 4) Le projet MSBuild traite la categorie securite en erreur.
$csproj = Get-Content -LiteralPath (Join-Path $root "beta\csharp\OwlSetup.csproj") -Raw -Encoding UTF8
if (-not $csproj.Contains("<AnalysisModeSecurity>All</AnalysisModeSecurity>")) {
    throw "L'analyse de securite n'est plus activee dans OwlSetup.csproj."
}
if ($csproj -notmatch '<WarningsAsErrors>[^<]*CA5392') {
    throw "CA5392 (chemin de recherche des DLL) n'est plus traite en erreur."
}

Write-Host ("Durcissement natif : {0} P/Invoke confines a System32, TLS explicite, analyse securite en erreur." -f $nbPInvoke) -ForegroundColor Green
