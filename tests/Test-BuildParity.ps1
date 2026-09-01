$ErrorActionPreference = "Stop"

# Une seule description du build (4.1.0-beta.4).
#
# Ce test comparait deux descriptions du meme programme : les arguments csc de
# `build.ps1` et `beta/csharp/OwlSetup.csproj`. Elles ont fusionne — `build.ps1`
# delegue desormais au projet, qui compile ici comme en CI. La duplication a
# disparu, donc la comparaison n'a plus d'objet.
#
# Ce qu'il garde maintenant est plus utile : les ressources declarees par le
# projet, comparees a celles que l'hote EXTRAIT reellement au demarrage. Ce sont
# deux cotes genuinement differents — le build et le code qui le consomme — et
# une ressource oubliee d'un cote fait echouer l'autre au lancement
# (« Ressource manquante : ... »).
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$build = Get-Content -LiteralPath (Join-Path $root "build.ps1") -Raw -Encoding UTF8
$csproj = Get-Content -LiteralPath (Join-Path $root "beta\csharp\OwlSetup.csproj") -Raw -Encoding UTF8
$natif = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

# --- 1) build.ps1 delegue bien au projet ------------------------------------
#
# Le retour en arriere serait silencieux : une liste de `/resource:` reapparait
# dans build.ps1, et le binaire livre cesse d'etre celui que les analyseurs
# examinent.
if ($build -notmatch 'dotnet build \$projet') {
    throw "build.ps1 ne compile plus via beta/csharp/OwlSetup.csproj : la duplication des descriptions de build est revenue."
}
if ($build -match '/resource:') {
    throw "build.ps1 liste a nouveau des ressources pour csc : le projet n'est plus la seule description du build."
}
if ($build -match '/target:winexe') {
    throw "build.ps1 compile a nouveau l'application avec csc au lieu du projet."
}
# Le shim .com reste compile par csc, et c'est assume.
if ($build -notmatch '/target:exe') {
    throw "Le shim console (.com) n'est plus compile."
}

# --- 2) Le projet declare ce que l'hote extrait ------------------------------
$declarees = @([regex]::Matches($csproj, '<LogicalName>([^<]+)</LogicalName>') |
        ForEach-Object { $_.Groups[1].Value } |
        ForEach-Object { if ($_ -like "logos.*") { "logos.*" } else { $_ } } |
        Sort-Object -Unique)

$extraites = @([regex]::Matches($natif, 'Extract\("([^"]+)"') |
        ForEach-Object { $_.Groups[1].Value } |
        Sort-Object -Unique)

if ($extraites.Count -lt 10) {
    throw "Extraction des appels Extract() cassee ($($extraites.Count) trouves) : le test ne prouverait rien."
}

$absentes = @($extraites | Where-Object { $declarees -notcontains $_ })
if ($absentes.Count -gt 0) {
    throw "L'hote extrait des ressources que le projet n'embarque pas : $($absentes -join ', '). L'application echouerait au demarrage sur « Ressource manquante »."
}

# Les logos sont extraits en boucle, par prefixe : les deux cotes doivent garder
# ce mecanisme, sinon la comparaison ci-dessus passerait sans que les icones
# soient embarquees.
if ($natif -notmatch 'StartsWith\("logos\.') { throw "L'hote n'extrait plus les logos par prefixe." }
if ($declarees -notcontains "logos.*") { throw "Le projet n'embarque plus les logos." }

# --- 3) Les attributs d'assembly --------------------------------------------
#
# Le projet pose GenerateAssemblyInfo=false et emet lui-meme les attributs ; il
# en avait perdu CINQ, et son binaire sortait en 0.0.0.0 sans societe. Le defaut
# est reste invisible tant que ce projet ne servait qu'a l'analyse — il aurait
# ete livre le jour de la bascule.
$attributs = @("AssemblyTitle", "AssemblyProduct", "AssemblyDescription", "AssemblyCompany",
    "AssemblyVersion", "AssemblyFileVersion", "AssemblyInformationalVersion")
foreach ($attribut in $attributs) {
    if ($csproj -notmatch [regex]::Escape("assembly: $attribut(")) {
        throw "Le projet n'emet pas l'attribut $attribut : le binaire livre perdrait cette metadonnee."
    }
}

# --- 4) Meme cible de compilation -------------------------------------------

if ($csproj -notmatch '<TargetFramework>net462</TargetFramework>') { throw "Le projet ne cible plus net462." }
if ($csproj -notmatch '<PlatformTarget>x64</PlatformTarget>') { throw "Le projet ne cible plus x64." }
if ($csproj -notmatch '<OutputType>WinExe</OutputType>') { throw "Le projet ne produit plus un WinExe." }
if ($csproj -notmatch '<UseWindowsForms>true</UseWindowsForms>') {
    throw "UseWindowsForms a disparu : System.Windows.Forms et System.Drawing ne seraient plus references."
}
if ($csproj -notmatch 'Microsoft\.Web\.WebView2') { throw "Le projet ne reference plus WebView2." }

# --- 5) La barriere de securite reste armee ---------------------------------
#
# Elle porte desormais sur le binaire REELLEMENT livre, et plus sur une copie.

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
if (-not $ecartees.Success) { throw "Le bloc NoWarn du projet est introuvable." }
$listeEcartees = @($ecartees.Groups[1].Value -split ';' | Where-Object { $_ -match '\S' })
if ($listeEcartees.Count -ne 2) {
    throw "Le projet ecarte maintenant $($listeEcartees.Count) regles au lieu de 2 ($($listeEcartees -join ', ')) : chaque exclusion demande une justification ecrite."
}

# --- 6) Modifier le projet declenche bien la CI -----------------------------
#
# Le projet est maintenant LE build : une modification qui ne declencherait
# aucun controle serait pire qu'avant.
$workflow = Get-Content -LiteralPath (Join-Path $root ".github\workflows\release.yml") -Raw -Encoding UTF8
if ($workflow -notmatch 'beta/csharp/\*\*') {
    throw "Les modifications du projet ne declenchent pas la CI de build."
}
if ($workflow -notmatch 'run:\s*\./build\.ps1') {
    throw "La CI n'appelle plus build.ps1 : les analyseurs ne tourneraient nulle part."
}

Write-Host ("Description unique du build : {0} ressources declarees couvrent les {1} extraites par l'hote, attributs et barriere de securite verifies." -f $declarees.Count, $extraites.Count) -ForegroundColor Green
