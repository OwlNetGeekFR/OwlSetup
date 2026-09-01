param([switch]$Requis)

$ErrorActionPreference = "Stop"

# Garde d'instance unique (4.1.0-beta.6).
#
# WebView2 verrouille son dossier de donnees. Avant ce garde, une seconde
# instance echouait a creer son environnement et se fermait aussitot — et pas
# toujours la seconde : sur trois lancements rapproches mesures en beta.5, deux
# ont vu UNE instance sortir immediatement, parfois la premiere. L'utilisateur
# qui lancait OwlSetup une fois de trop voyait donc une fenetre disparaitre sans
# explication.
#
# Ce test verifie les trois proprietes attendues :
#   - la seconde instance rend la main rapidement et proprement ;
#   - la PREMIERE survit, avec sa fenetre — c'est elle qu'on ramene au premier
#     plan, et c'est ce que l'ancien comportement ne garantissait pas ;
#   - le mode ligne de commande reste utilisable pendant ce temps, car le garde
#     ne doit concerner que le mode graphique.
#
# -Requis fait echouer si l'executable est absent. La CI l'utilise APRES
# build.ps1.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

Add-Type -Namespace "" -Name Fenetres -MemberDefinition @"
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
[DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
"@

$root = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $root "OwlSetup.exe"

if (-not (Test-Path $exe)) {
    if ($Requis) { throw "OwlSetup.exe est absent : compilez avant de lancer ce test avec -Requis." }
    Write-Host "Instance unique : ignore (OwlSetup.exe absent)." -ForegroundColor Yellow
    return
}

# Meme precaution que Test-InterfaceStartup : une instance laissee par un test
# precedent fausserait tout.
$attente = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $attente -and @(Get-Process OwlSetup -ErrorAction SilentlyContinue).Count -gt 0) {
    Start-Sleep -Milliseconds 500
}
if (@(Get-Process OwlSetup -ErrorAction SilentlyContinue).Count -gt 0) {
    throw "Une instance d'OwlSetup tourne deja : ce test ne peut pas conclure."
}

$premier = $null
$second = $null
try {
    $premier = Start-Process -FilePath $exe -PassThru -ErrorAction Stop

    # Attendre que la premiere ait vraiment pris le verrou et ouvert sa fenetre.
    $limite = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $limite) {
        if ($premier.HasExited) { throw "La premiere instance s'est arretee pendant son demarrage (code $($premier.ExitCode))." }
        $premier.Refresh()
        if ($premier.MainWindowHandle -ne [IntPtr]::Zero) { break }
        Start-Sleep -Milliseconds 500
    }
    $premier.Refresh()
    if ($premier.MainWindowHandle -eq [IntPtr]::Zero) {
        throw "La premiere instance n'a pas ouvert de fenetre en 90 s."
    }

    # --- La fenetre existante doit revenir au premier plan ---
    #
    # C'est LA propriete qui distingue le garde de l'ancien comportement, et le
    # seul controle qui l'attrape. Sans garde, la seconde instance echouait
    # aussi a demarrer (WebView2 verrouille son dossier) et sortait aussi avec
    # le code 0 : une premiere version de ce test verifiait donc des faits que
    # le retrait du garde laissait intacts, et passait trois fois sur trois sur
    # un binaire non protege.
    #
    # On reduit d'abord la fenetre : le second lancement doit la restaurer et la
    # ramener devant, ce qui exerce aussi le chemin IsIconic / SW_RESTORE.
    $fenetrePremiere = $premier.MainWindowHandle
    [void][Fenetres]::ShowWindow($fenetrePremiere, 6) # SW_MINIMIZE
    Start-Sleep -Milliseconds 800
    if (-not [Fenetres]::IsIconic($fenetrePremiere)) {
        throw "La fenetre de la premiere instance n'a pas pu etre reduite : ce test ne peut pas conclure."
    }

    # --- Le second lancement doit rendre la main ---
    $depart = Get-Date
    $second = Start-Process -FilePath $exe -PassThru -ErrorAction Stop
    if (-not $second.WaitForExit(20000)) {
        throw "La seconde instance tourne encore apres 20 s : le garde d'instance unique ne s'applique pas."
    }
    $duree = [math]::Round(((Get-Date) - $depart).TotalSeconds, 1)
    if ($second.ExitCode -ne 0) {
        throw "La seconde instance est sortie avec le code $($second.ExitCode) au lieu de 0 : elle devrait rendre la main proprement."
    }

    # --- Et la PREMIERE doit avoir survecu ---
    #
    # C'est le coeur du defaut corrige : avant, l'instance qui mourait pouvait
    # etre l'une ou l'autre.
    $premier.Refresh()
    if ($premier.HasExited) {
        throw "La premiere instance s'est arretee alors que c'est la seconde qui devait rendre la main."
    }
    if ($premier.MainWindowHandle -eq [IntPtr]::Zero) {
        throw "La premiere instance a perdu sa fenetre apres le second lancement."
    }

    if ([Fenetres]::IsIconic($fenetrePremiere)) {
        throw "La fenetre existante est restee reduite : le second lancement ne l a pas ramenee."
    }
    Start-Sleep -Milliseconds 800
    $premierPlan = [Fenetres]::GetForegroundWindow()
    if ($premierPlan -ne $fenetrePremiere) {
        throw "Apres le second lancement, la fenetre au premier plan est $premierPlan et non celle d OwlSetup ($fenetrePremiere) : l instance existante n a pas ete rappelee."
    }

    # --- Le mode ligne de commande reste utilisable ---
    #
    # Le garde ne doit concerner que le mode graphique : les verbes CLI rendent
    # la main avant lui et ne touchent pas a WebView2. Un garde pose trop tot
    # casserait « OwlSetup --update » lance pendant que l'interface est ouverte.
    $sortie = Join-Path ([System.IO.Path]::GetTempPath()) ("owlsetup-cli-" + [Guid]::NewGuid().ToString("N").Substring(0, 8) + ".txt")
    try {
        $cli = Start-Process -FilePath $exe -ArgumentList "--version" -Wait -PassThru -NoNewWindow -RedirectStandardOutput $sortie
        if ($cli.ExitCode -ne 0) {
            throw "« --version » a rendu le code $($cli.ExitCode) alors que l'interface est ouverte : le garde bloque le mode CLI."
        }
        $texte = (Get-Content -LiteralPath $sortie -Raw -ErrorAction SilentlyContinue)
        if ([string]::IsNullOrWhiteSpace($texte)) {
            throw "« --version » n'a rien affiche alors que l'interface est ouverte."
        }
    }
    finally {
        Remove-Item -LiteralPath $sortie -Force -ErrorAction SilentlyContinue
    }
}
finally {
    foreach ($p in @($premier, $second)) {
        if ($p -and -not $p.HasExited) {
            try { $null = $p.CloseMainWindow(); $null = $p.WaitForExit(10000) } catch {}
            try { if (-not $p.HasExited) { $p.Kill(); $p.WaitForExit(5000) } } catch {}
        }
    }
}

Write-Host ("Instance unique : le second lancement rend la main en {0} s, la premiere garde sa fenetre, le mode CLI reste utilisable." -f $duree) -ForegroundColor Green
