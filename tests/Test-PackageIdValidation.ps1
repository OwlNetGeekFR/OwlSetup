$ErrorActionPreference = "Stop"

# Identifiant de paquet : source unique de verite (lot 3 - 4.0.0-beta.57).
#
# Ce motif garde toutes les lignes de commande winget. Il etait recopie en
# litteral a 27 endroits, sous TROIS formes qui ne disaient pas la meme chose
# (sans borne, bornee a 128, ou exigeant au moins deux caracteres) : le meme
# identifiant pouvait etre accepte a une entree et refuse a une autre.
#
# Ce test verifie qu'il n'existe plus qu'UNE declaration, et il exerce le
# comportement reel par reflexion. La derive est exactement ce qui avait laisse
# Installer-selection.ps1 sur l'ancienne regex jusqu'a la 4.0.0-beta.53.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

# 1) Une seule declaration du motif dans tout le fichier.
$litteraux = ([regex]::Matches($native, 'A-Za-z0-9\]\[A-Za-z0-9')).Count
if ($litteraux -ne 1) {
    throw "Le motif d'identifiant est ecrit $litteraux fois : il doit rester une source unique (PackageIdPattern)."
}
if (-not $native.Contains("internal static bool IsValidPackageId(string value)")) {
    throw "IsValidPackageId a disparu : les appelants ne partagent plus la meme validation."
}

# 2) Les appels depuis Bootstrap sont qualifies : une statique de WebAppForm ne
#    s'appelle pas sans prefixe depuis une autre classe.
$frontiere = $native.IndexOf("internal static class Bootstrap")
if ($frontiere -lt 0) { throw "Classe Bootstrap introuvable." }
$apres = $native.Substring($frontiere)
if ($apres -match '(?<!WebAppForm\.)\bIsValidPackageId\(') {
    throw "Un appel non qualifie a IsValidPackageId subsiste dans Bootstrap : le code ne compilerait pas."
}

# 3) Comportement reel, via reflexion sur l'exe compile.
$exe = Join-Path $root "OwlSetup.exe"
if (-not (Test-Path $exe)) {
    Write-Host "Identifiant de paquet : source unique verifiee (exe absent, comportement non teste)." -ForegroundColor Yellow
    return
}

$asm = [System.Reflection.Assembly]::LoadFrom($exe)
$valide = $asm.GetType("WebAppForm").GetMethod("IsValidPackageId", [System.Reflection.BindingFlags]"NonPublic,Static")
if (-not $valide) { throw "IsValidPackageId introuvable via reflexion." }
function Test-Id([string]$Id) { [bool]$valide.Invoke($null, @([string]$Id)) }

$acceptes = @("VideoLAN.VLC", "7zip.7zip", "Microsoft.VisualStudioCode", "Git.Git",
              "HeroicGamesLauncher.HeroicGamesLauncher", "a1", "Node.js_LTS+x64")
foreach ($id in $acceptes) {
    if (-not (Test-Id $id)) { throw "Identifiant legitime refuse : $id" }
}

$refuses = @{
    "commence par un tiret"     = "-Force"
    "double tiret"              = "--source"
    "commence par un point"     = ".hidden"
    "commence par underscore"   = "_x"
    "espace"                    = "VideoLAN VLC"
    "guillemet"                 = 'a"b'
    "point-virgule"             = "a;b"
    "esperluette"               = "a&b"
    "barre verticale"           = "a|b"
    "vide"                      = ""
    "un seul caractere"         = "a"
}
foreach ($cas in $refuses.GetEnumerator()) {
    if (Test-Id $cas.Value) { throw "Identifiant accepte a tort ($($cas.Key)) : '$($cas.Value)'" }
}

# Longueur bornee : un identifiant demesure n'atteint pas la ligne de commande.
if (Test-Id ("A" * 200)) { throw "Un identifiant de 200 caracteres est accepte : la borne de longueur a saute." }
if (-not (Test-Id ("A" * 128))) { throw "Un identifiant de 128 caracteres devrait rester accepte." }

# 4) Tout le catalogue passe : unifier sur la variante stricte ne casse rien.
$catalogue = Get-Content -LiteralPath (Join-Path $root "beta\catalog\apps.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$apps = if ($catalogue.applications) { $catalogue.applications } else { $catalogue }
$refusesCatalogue = @($apps | Where-Object { $_.id } | Where-Object { -not (Test-Id $_.id) })
if ($refusesCatalogue.Count -gt 0) {
    throw "Applications du catalogue refusees : $(($refusesCatalogue | ForEach-Object { $_.id }) -join ', ')"
}

Write-Host ("Identifiant de paquet : source unique, comportement verifie, {0} applications du catalogue acceptees." -f @($apps).Count) -ForegroundColor Green
