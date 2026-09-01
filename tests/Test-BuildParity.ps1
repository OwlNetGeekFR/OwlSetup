$ErrorActionPreference = "Stop"

# Parite entre les deux descriptions du build (lot 3 - 4.0.0-beta.60).
#
# `build.ps1` compile avec csc.exe : c'est le build qui PRODUIT le binaire
# livre. `beta/csharp/OwlSetup.csproj` est une seconde description du meme
# programme, et c'est la seule que les analyseurs Roslyn savent lire - csc.exe
# du .NET Framework ne connait pas les analyseurs.
#
# L'analyse de securite n'a donc de valeur que si le .csproj compile bien LA
# MEME CHOSE que build.ps1. Rien ne le garantissait : le .csproj portait meme
# la mention "a valider par un premier build cote mainteneur", et aucune CI ne
# le construisait. Deux descriptions du meme build, dont une seule verifiee.
#
# Ce test compare ce qui peut l'etre mecaniquement : les ressources embarquees
# (par leur nom logique, celui que GetManifestResourceStream utilise), les
# references non implicites, et la cible de compilation. Il verifie aussi que la
# barriere de securite du .csproj est toujours armee.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$build = Get-Content -LiteralPath (Join-Path $root "build.ps1") -Raw -Encoding UTF8
$csproj = Get-Content -LiteralPath (Join-Path $root "beta\csharp\OwlSetup.csproj") -Raw -Encoding UTF8

# --- 1) Ressources embarquees ------------------------------------------------
#
# Les logos sont ajoutes en boucle des deux cotes (Get-ChildItem ici, joker
# MSBuild la-bas) : on ramene les deux formes a un meme marqueur plutot que de
# comparer une syntaxe a l'autre.

function Get-BuildResources([string]$Text) {
    $noms = [regex]::Matches($Text, '/resource:[^",]*,([^"]+)') | ForEach-Object { $_.Groups[1].Value }
    $noms | ForEach-Object { if ($_ -like "logos.*") { "logos.*" } else { $_ } } | Sort-Object -Unique
}

function Get-CsprojResources([string]$Text) {
    $noms = [regex]::Matches($Text, '<LogicalName>([^<]+)</LogicalName>') | ForEach-Object { $_.Groups[1].Value }
    $noms | ForEach-Object { if ($_ -like "logos.*") { "logos.*" } else { $_ } } | Sort-Object -Unique
}

$aBuild = @(Get-BuildResources $build)
$aCsproj = @(Get-CsprojResources $csproj)

if ($aBuild.Count -lt 10) {
    throw "Extraction des ressources de build.ps1 cassee ($($aBuild.Count) trouvees) : le test ne prouverait rien."
}

$manquantes = @($aBuild | Where-Object { $aCsproj -notcontains $_ })
$enTrop = @($aCsproj | Where-Object { $aBuild -notcontains $_ })

if ($manquantes.Count -gt 0) {
    throw "Ressources presentes dans build.ps1 mais absentes du .csproj : $($manquantes -join ', '). L'analyse porterait sur un binaire different de celui qui est livre."
}
if ($enTrop.Count -gt 0) {
    throw "Ressources presentes dans le .csproj mais absentes de build.ps1 : $($enTrop -join ', ')."
}

# Le mecanisme des logos doit rester en place des deux cotes : sans lui, la
# comparaison ci-dessus passerait alors que les icones auraient disparu.
if ($build -notmatch 'assets\\logos') { throw "build.ps1 n'embarque plus les logos." }
if ($csproj -notmatch 'assets\\logos\\\*\.\*') { throw "Le .csproj n'embarque plus les logos." }

# --- 2) References non implicites -------------------------------------------
#
# Les references de build.ps1 ne se transposent pas une a une : le SDK apporte
# System.Core, et `UseWindowsForms` apporte System.Windows.Forms et
# System.Drawing. Seules les autres doivent apparaitre explicitement.

$implicites = @("System.Core.dll", "System.Windows.Forms.dll", "System.Drawing.dll")
$refsBuild = [regex]::Matches($build, '/reference:(System\.[^",]+\.dll)') |
    ForEach-Object { $_.Groups[1].Value } |
    Where-Object { $implicites -notcontains $_ } |
    Sort-Object -Unique

foreach ($ref in $refsBuild) {
    $nom = $ref -replace '\.dll$', ''
    if ($csproj -notmatch [regex]::Escape("<Reference Include=`"$nom`"")) {
        throw "build.ps1 reference $ref, pas le .csproj : les deux builds ne compilent pas la meme chose."
    }
}

if ($csproj -notmatch '<UseWindowsForms>true</UseWindowsForms>') {
    throw "UseWindowsForms a disparu : System.Windows.Forms et System.Drawing ne seraient plus references."
}
if ($csproj -notmatch 'Microsoft\.Web\.WebView2') {
    throw "Le .csproj ne reference plus WebView2, que build.ps1 embarque."
}

# --- 2b) Memes attributs d assembly -----------------------------------------
#
# build.ps1 genere PCSetup.BuildInfo.cs avec sept attributs ; le .csproj fait
# la meme chose dans sa cible GenerateBuildInfo. Il en avait perdu CINQ : le
# binaire qu il produit sortait en 0.0.0.0, sans societe ni produit.
#
# Personne ne l avait vu parce que ce projet ne servait qu a l analyse Roslyn,
# jamais a produire le binaire livre. Le jour ou il deviendra le chemin de
# build officiel, cette divergence aurait expedie une version sans identite.
$attributs = @("AssemblyTitle", "AssemblyProduct", "AssemblyDescription", "AssemblyCompany",
    "AssemblyVersion", "AssemblyFileVersion", "AssemblyInformationalVersion")
foreach ($attribut in $attributs) {
    $motif = [regex]::Escape("assembly: $attribut(")
    if ($build -notmatch $motif) {
        throw "build.ps1 n emet plus l attribut $attribut."
    }
    if ($csproj -notmatch $motif) {
        throw "Le .csproj n emet pas l attribut $attribut : son binaire perdrait cette metadonnee."
    }
}

# --- 3) Meme cible de compilation -------------------------------------------

if ($csproj -notmatch '<TargetFramework>net462</TargetFramework>') {
    throw "Le .csproj ne cible plus net462, alors que build.ps1 compile avec le csc de v4.0.30319."
}
if ($build -notmatch '/platform:x64') { throw "build.ps1 ne compile plus en x64." }
if ($csproj -notmatch '<PlatformTarget>x64</PlatformTarget>') {
    throw "Le .csproj ne cible plus x64, contrairement a build.ps1."
}
if ($build -notmatch '/target:winexe') { throw "build.ps1 ne produit plus un winexe." }
if ($csproj -notmatch '<OutputType>WinExe</OutputType>') {
    throw "Le .csproj ne produit plus un WinExe, contrairement a build.ps1."
}

# --- 4) La barriere de securite reste armee ---------------------------------
#
# Tout l'interet du .csproj est la : c'est le seul chemin qui fait tourner les
# analyseurs. Le desarmer sans le dire viderait la CI de sa substance.

if ($csproj -notmatch '<AnalysisModeSecurity>All</AnalysisModeSecurity>') {
    throw "AnalysisModeSecurity n'est plus a All : l'analyse de securite ne serait plus complete."
}
if ($csproj -notmatch '<EnableNETAnalyzers>true</EnableNETAnalyzers>') {
    throw "EnableNETAnalyzers a disparu : plus aucun analyseur ne tourne."
}
foreach ($regle in @("CA5392", "CA5387", "CA5388", "CA5389", "CA5390", "CA5391", "CA5393", "CA5394", "CA5395")) {
    if ($csproj -notmatch "WarningsAsErrors[^<]*$regle") {
        throw "$regle n'est plus traitee en erreur : une regression de securite passerait en simple avertissement."
    }
}

# Les deux regles ecartees doivent l'etre avec leur justification ecrite : un
# NoWarn qui s'allonge en silence est exactement ce qu'on veut voir venir.
$ecartees = [regex]::Match($csproj, '<NoWarn>\$\(NoWarn\)([^<]*)</NoWarn>')
if (-not $ecartees.Success) { throw "Le bloc NoWarn du .csproj est introuvable." }
$listeEcartees = @($ecartees.Groups[1].Value -split ';' | Where-Object { $_ -match '\S' })
if ($listeEcartees.Count -ne 2) {
    throw "Le .csproj ecarte maintenant $($listeEcartees.Count) regles au lieu de 2 ($($listeEcartees -join ', ')) : chaque exclusion demande une justification ecrite."
}

# --- 5) La CI construit bien ce projet --------------------------------------
#
# Un .csproj correct qu'aucune CI ne construit ne garde rien : c'etait l'etat
# entre la 4.0.0-beta.56 et la beta.60.

$workflow = Get-Content -LiteralPath (Join-Path $root ".github\workflows\release.yml") -Raw -Encoding UTF8
# Le motif vise la COMMANDE, pas une mention : chercher simplement le nom du
# projet laissait passer un job vide, le commentaire au-dessus de l'etape
# suffisant a satisfaire la recherche. Constate en sabotant ce test.
if ($workflow -notmatch 'run:\s*dotnet build\s+beta/csharp/OwlSetup\.csproj') {
    throw "Aucun job de la CI ne construit beta/csharp/OwlSetup.csproj : les analyseurs ne tournent nulle part."
}
if ($workflow -notmatch 'beta/csharp/\*\*') {
    throw "Les modifications du .csproj ne declenchent pas la CI de build."
}

Write-Host ("Parite de build : {0} ressources communes, references, cible et barriere de securite verifiees." -f $aBuild.Count) -ForegroundColor Green
