param([switch]$Requis)

$ErrorActionPreference = "Stop"

# Demarrage reel de l'interface (lot 4 - 4.0.0-beta.62).
#
# Tous les autres tests lisent des sources ou exercent le mode CLI, qui rend la
# main avant meme d'extraire les ressources. Le chemin GRAPHIQUE n'etait couvert
# par rien : Bootstrap.Main, l'extraction des ressources embarquees, la
# resolution des assemblies WebView2, l'initialisation de CoreWebView2, le
# controle d'integrite, la creation de la fenetre. C'est precisement le chemin
# qu'un mainteneur ne peut valider qu'en cliquant.
#
# Ce test lance le binaire, attend sa fenetre, verifie que le processus tient,
# compare les ressources extraites aux fichiers du depot, puis le ferme.
#
# -Requis fait echouer si l'executable est absent. La CI l'utilise APRES
# build.ps1 ; sans cela le test se contenterait de passer en silence, ce qui ne
# garderait rien.
#
# Assertions en ASCII seulement : PowerShell 5.1 decode mal les accents dans un
# .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $root "OwlSetup.exe"

if (-not (Test-Path $exe)) {
    if ($Requis) { throw "OwlSetup.exe est absent : compilez avant de lancer ce test avec -Requis." }
    Write-Host "Demarrage de l'interface : ignore (OwlSetup.exe absent)." -ForegroundColor Yellow
    return
}

$appRoot = Join-Path $env:LOCALAPPDATA "PCSetup\App2"

# Les ressources que Bootstrap extrait et que l'hote verifie ensuite par
# SHA-256. Les memes que VerifyInterfaceIntegrity.
$ressources = @("index.html", "i18n.js", "catalog.generated.js", "app.js", "styles.css")

function Get-Sha256([string]$Path) {
    (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

# WebView2 verrouille son dossier de donnees (%LOCALAPPDATA%\PCSetup\WebView2Data)
# : une seconde instance lancee pendant qu une premiere tourne echoue a creer son
# environnement, et sort immediatement avec le code 0.
#
# Ce n est pas theorique. Ce test a echoue une fois sans explication ; la cause
# est celle-la. Test-ReleaseCandidateReadiness.ps1 rejoue TOUS les tests, donc
# celui-ci s execute deux fois de suite lors d une passe complete, et la seconde
# tombe si la premiere instance n a pas fini de rendre le verrou. Mesure : sur
# trois lancements rapproches, deux ont vu une instance sortir aussitot.
#
# On attend donc que la place soit libre. Ce n est pas une reprise deguisee :
# la cause est connue et l attente porte sur elle.
$attente = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $attente -and @(Get-Process OwlSetup -ErrorAction SilentlyContinue).Count -gt 0) {
    Start-Sleep -Milliseconds 500
}
if (@(Get-Process OwlSetup -ErrorAction SilentlyContinue).Count -gt 0) {
    throw "Une instance d'OwlSetup tourne encore apres 30 s : le verrou WebView2 ferait echouer ce test pour une raison etrangere au binaire."
}

$process = $null
try {
    $process = Start-Process -FilePath $exe -PassThru -ErrorAction Stop

    # Le signal d'un demarrage REUSSI est le processus enfant msedgewebview2 :
    # c'est le moteur d'interface, et il n'existe que si CoreWebView2 s'est
    # initialise.
    #
    # Attendre une fenetre ne suffirait pas : quand le demarrage echoue, l'hote
    # affiche une MessageBox, qui EST une fenetre — et comme aucune Form n'existe
    # encore, elle devient la fenetre principale du processus. Le test aurait
    # donc reussi sur un demarrage rate. Constate en le sabotant.
    $depart = Get-Date
    $limite = $depart.AddSeconds(90)
    $moteur = 0
    while ((Get-Date) -lt $limite) {
        if ($process.HasExited) { break }
        $moteur = @(Get-CimInstance Win32_Process -Filter "Name='msedgewebview2.exe'" |
            Where-Object { $_.ParentProcessId -eq $process.Id }).Count
        if ($moteur -gt 0) { break }
        Start-Sleep -Milliseconds 500
    }

    if ($process.HasExited) {
        # InitializeWebView affiche une MessageBox puis appelle Close() : une
        # sortie pendant le demarrage est le symptome d'un echec.
        #
        # CAUSE IDENTIFIEE (4.1.0-beta.5) : deux instances lancees coup sur
        # coup se disputent le dossier de donnees de WebView2, et l'une sort
        # aussitot avec le code 0. L'attente placee avant le lancement l'evite.
        # Si le symptome revient malgre elle, il vient d'ailleurs — le message
        # ci-dessous porte de quoi le dire.
        $duree = [math]::Round(((Get-Date) - $depart).TotalSeconds, 1)
        $voisins = @(Get-Process OwlSetup -ErrorAction SilentlyContinue).Count
        $moteurs = @(Get-Process msedgewebview2 -ErrorAction SilentlyContinue).Count
        throw ("OwlSetup s'est arrete pendant le demarrage apres $duree s (code $($process.ExitCode)). " +
            "Autres processus OwlSetup a cet instant : $voisins ; processus msedgewebview2 sur la machine : $moteurs. " +
            "Une sortie en moins d'une seconde avec le code 0 designe le lancement lui-meme, pas l'initialisation de WebView2.")
    }
    if ($moteur -eq 0) {
        $process.Refresh()
        $titre = $process.MainWindowTitle
        throw "Aucun processus WebView2 apres 90 s : l'interface ne s'est pas chargee (fenetre au premier plan : '$titre')."
    }

    $process.Refresh()
    if ($process.MainWindowHandle -eq [IntPtr]::Zero) {
        throw "Le moteur WebView2 tourne mais aucune fenetre principale n'existe."
    }

    # --- Les ressources extraites sont bien celles du depot ---
    #
    # Extract() reecrit ces fichiers depuis les ressources embarquees a CHAQUE
    # lancement (FileMode.Create). Les comparer au depot verifie donc que le
    # binaire embarque l'interface courante : si build.ps1 avait echoue a
    # regenerer app.js ou styles.css, l'executable servirait une interface
    # perimee sans que rien ne le signale.
    $perimees = @()
    foreach ($nom in $ressources) {
        $extrait = Join-Path $appRoot $nom
        $source = Join-Path $root $nom
        if (-not (Test-Path $extrait)) { throw "Ressource non extraite : $nom" }
        if (-not (Test-Path $source)) { throw "Fichier absent du depot : $nom" }
        if ((Get-Sha256 $extrait) -ne (Get-Sha256 $source)) { $perimees += $nom }
    }
    if ($perimees.Count -gt 0) {
        throw ("Le binaire embarque une interface differente du depot : {0}. Recompilez avec build.ps1." -f ($perimees -join ", "))
    }

    # --- Fermeture propre ---
    $null = $process.CloseMainWindow()
    if (-not $process.WaitForExit(20000)) {
        throw "OwlSetup n'a pas repondu a la demande de fermeture en 20 s."
    }
}
finally {
    if ($process -and -not $process.HasExited) {
        try { $process.Kill(); $process.WaitForExit(5000) } catch {}
    }
}

Write-Host ("Demarrage de l'interface : fenetre obtenue, {0} ressources conformes au depot, fermeture propre." -f $ressources.Count) -ForegroundColor Green
