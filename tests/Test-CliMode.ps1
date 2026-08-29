$ErrorActionPreference = "Stop"

# Mode ligne de commande (4.4-4.5 / beta.18-19) : --install / --uninstall /
# --apply / --list [--json] / --search / --help / --version + shim console
# OwlSetup.com. Vérifie les marqueurs source puis, si l'exécutable compilé est
# présent, exécute réellement les verbes sans effet de bord.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}

# 1) Marqueurs : point d'entrée CLI, console rattachée, verbes, garde-fous
Assert-Has $native 'static int RunCli(string[] commandLine)' "Le point d'entree CLI RunCli a disparu."
Assert-Has $native 'static bool IsCliInvocation(string value)' "La detection d'invocation CLI a disparu."
Assert-Has $native 'AttachConsole' "Le rattachement de console (winexe -> sortie CLI) a disparu."
Assert-Has $native 'if(commandLine.Length>=2 && IsCliInvocation(commandLine[1]))' "Main() ne route plus vers le mode CLI."
Assert-Has $native 'case "--install": return CliInstallOrRemove(rest,false,dryRun,silent);' "Le verbe --install a disparu."
Assert-Has $native 'case "--uninstall": return CliInstallOrRemove(rest,true,dryRun,silent);' "Le verbe --uninstall a disparu."
Assert-Has $native 'case "--list": return CliList(' "Le verbe --list a disparu."
Assert-Has $native 'case "--search": return CliSearch(rest);' "Le verbe --search a disparu."
Assert-Has $native 'case "--apply": return CliApply(rest,dryRun,silent);' "Le verbe --apply a disparu."
# --dry-run / --silent (beta.20)
Assert-Has $native 'bool dryRun=flags.Any(a=>a=="--dry-run");' "L'option --dry-run a disparu."
Assert-Has $native 'a=="--silent" || a=="--quiet"' "L'option --silent a disparu."
Assert-Has $native '[simulation] Aucune modification effectu' "Le mode simulation n'affiche plus qu'il ne change rien."
# --apply : nettoyage des zones de la config si session elevee + journal fichier
Assert-Has $native 'RunElevatedCleanupWorker(String.Join(",",cleanup),cleanupLog)' "--apply n'execute plus les zones de nettoyage."
Assert-Has $native 'CliCleanupZones.Where(zone=>raw.Contains(zone' "--apply ne filtre plus les zones de nettoyage sur la liste autorisee."
Assert-Has $native 'PC-Setup-CLI-' "--apply n'ecrit plus de journal fichier."
if ($native -match 'CliApply\(rest\)\s*;') { throw "CliApply est encore appele sans les options dryRun/silent." }
# Les identifiants CLI sont valides par la meme regex que le reste de l'hote.
Assert-Has $native '^[A-Za-z0-9][A-Za-z0-9.+_-]{0,127}$' "La validation d'identifiant du mode CLI a disparu."
# --install passe toujours les drapeaux silencieux WinGet.
Assert-Has $native '--silent --accept-package-agreements --accept-source-agreements --disable-interactivity' "Le mode CLI n'installe plus en silencieux."
# --apply n'accepte qu'une configuration exportee par l'interface.
Assert-Has $native 'Convert.ToString(root["format"])!="pc-setup-configuration"' "--apply ne valide plus le format de configuration."
Assert-Has $native 'CliConfigIds(root,"selectedPackages")' "--apply ne lit plus selectedPackages."
# Console : on ne s'abstient QUE si les deux flux vont vers un vrai tube/fichier
# (un handle nul de winexe via le shim .com doit quand meme brancher CONOUT$).
Assert-Has $native 'CliStdIsRealRedirect(STD_OUTPUT_HANDLE)' "CliAttachConsole ne distingue plus une vraie redirection d'un handle nul."
Assert-Has $native 'FileStream("CONOUT$"' "Le repli d'ecriture console CONOUT$ a disparu."

# --- Lot 7 (4.0.0-beta.41) : --update / --check-updates / --export-profile ---
Assert-Has $native 'case "--update": return CliUpdate(rest,dryRun,silent);' "Le verbe --update a disparu du dispatch CLI."
Assert-Has $native 'case "--check-updates": return CliCheckUpdates(asJson);' "Le verbe --check-updates a disparu du dispatch CLI."
Assert-Has $native 'case "--export-profile": return CliExportProfile(rest);' "Le verbe --export-profile a disparu du dispatch CLI."
Assert-Has $native 'static int CliCaptureWinget(string winget,string arguments,out List<string> lines)' "La capture de sortie winget du CLI a disparu."
Assert-Has $native 'WebAppForm.ParseWingetTable(' "--check-updates n'utilise plus l'analyseur winget centralise."
Assert-Has $native 'internal static List<Dictionary<string,string>> ParseWingetTable' "ParseWingetTable n'est plus accessible au mode CLI."
Assert-Has $native 'PackageIdentifier' "--export-profile ne lit plus l'export JSON de winget."
Assert-Has $native '{"format","pc-setup-configuration"},{"formatVersion",1}' "--export-profile n'ecrit plus le format de configuration OwlSetup."
Assert-Has $native 'if(available.Length==0)continue;' "--check-updates ne filtre plus les lignes de resume de winget."
Assert-Has $native 'CliUpgradeLoop(applyWinget,upgradable,false,silent)' "--apply ne met plus a jour les paquets deja presents."

# 1b) Shim console OwlSetup.com (4.5 / beta.19)
$shimSource = Join-Path $root "OwlSetupCli.cs"
Assert-Has (Get-Content -LiteralPath $shimSource -Raw -Encoding UTF8) 'Path.ChangeExtension(self, ".exe")' "Le shim .com ne relaie plus vers l'exe voisin."
$buildPs1 = Get-Content -LiteralPath (Join-Path $root "build.ps1") -Raw -Encoding UTF8
Assert-Has $buildPs1 'ChangeExtension($outputPath, ".com")' "build.ps1 ne compile plus le shim console (.com)."

# 2) Execution reelle des verbes sans effet de bord, si l'exe est present.
# L'exe est compile en /target:winexe : PowerShell '&' n'attend pas sa fin, on
# passe donc par Start-Process -Wait -PassThru pour lire le code de sortie.
$exe = Join-Path $root "OwlSetup.exe"
if (Test-Path $exe) {
    function Invoke-Cli([string[]]$CliArgs) {
        $outFile = New-TemporaryFile
        $errFile = New-TemporaryFile
        try {
            $proc = Start-Process -FilePath $exe -ArgumentList $CliArgs -Wait -PassThru -NoNewWindow `
                -RedirectStandardOutput $outFile -RedirectStandardError $errFile
            $text = (Get-Content -LiteralPath $outFile -Raw) + (Get-Content -LiteralPath $errFile -Raw)
            [pscustomobject]@{ Code = $proc.ExitCode; Text = [string]$text }
        }
        finally { Remove-Item -LiteralPath $outFile, $errFile -Force -ErrorAction SilentlyContinue }
    }

    $v = Invoke-Cli @('--version')
    if ($v.Code -ne 0 -or $v.Text -notmatch 'OwlSetup') { throw "--version : code $($v.Code), sortie '$($v.Text)'." }

    $h = Invoke-Cli @('--help')
    if ($h.Code -ne 0 -or $h.Text -notmatch '--install') { throw "--help : code $($h.Code), verbes absents." }

    $l = Invoke-Cli @('--list', 'navigateur')
    if ($l.Code -ne 0 -or $l.Text -notmatch 'Mozilla\.Firefox') { throw "--list navigateur : code $($l.Code), Firefox absent." }

    $b = Invoke-Cli @('--frobnicate')
    if ($b.Code -ne 2) { throw "--frobnicate devrait sortir en code 2 (obtenu $($b.Code))." }

    $n = Invoke-Cli @('--install', '../evil')
    if ($n.Code -ne 2) { throw "--install avec identifiant invalide devrait sortir en code 2 (obtenu $($n.Code))." }

    $j = Invoke-Cli @('--list', 'navigateur', '--json')
    if ($j.Code -ne 0) { throw "--list --json : code $($j.Code)." }
    try { $parsed = $j.Text.Trim() | ConvertFrom-Json } catch { throw "--list --json : JSON invalide." }
    if (-not ($parsed | Where-Object { $_.id -eq 'Mozilla.Firefox' })) { throw "--list --json : Firefox absent du JSON." }

    # --apply : fichier absent -> code 2 ; mauvais format -> code 2 (aucune install).
    $missing = Invoke-Cli @('--apply', 'Z:\nexiste-pas\config.pcsetup.json')
    if ($missing.Code -ne 2) { throw "--apply fichier absent : code attendu 2 (obtenu $($missing.Code))." }

    $badFmt = New-TemporaryFile
    Set-Content -LiteralPath $badFmt -Value '{"format":"autre-chose","selectedPackages":["VideoLAN.VLC"]}' -Encoding UTF8
    try {
        $bad = Invoke-Cli @('--apply', $badFmt)
        if ($bad.Code -ne 2) { throw "--apply format invalide : code attendu 2 (obtenu $($bad.Code))." }
        if ($bad.Text -match 'Installation de ') { throw "--apply format invalide : ne doit rien installer." }
    }
    finally { Remove-Item -LiteralPath $badFmt -Force -ErrorAction SilentlyContinue }

    # --dry-run : liste ce qui serait fait, ne lance jamais WinGet, code 0.
    $dryI = Invoke-Cli @('--install', 'VideoLAN.VLC,7zip.7zip', '--dry-run')
    if ($dryI.Code -ne 0) { throw "--install --dry-run : code attendu 0 (obtenu $($dryI.Code))." }
    if ($dryI.Text -notmatch '\[simulation\]' -or $dryI.Text -notmatch 'VideoLAN\.VLC') { throw "--install --dry-run : plan absent." }
    if ($dryI.Text -match 'Installation de VideoLAN\.VLC \.\.\.') { throw "--install --dry-run : ne doit rien installer." }

    $goodCfg = New-TemporaryFile
    Set-Content -LiteralPath $goodCfg -Value '{"format":"pc-setup-configuration","selectedPackages":["7zip.7zr","../evil"],"cleanupChoices":["recycle-bin","zone-inconnue"]}' -Encoding UTF8
    try {
        $dryA = Invoke-Cli @('--apply', $goodCfg, '--dry-run')
        if ($dryA.Code -ne 0) { throw "--apply --dry-run : code attendu 0 (obtenu $($dryA.Code))." }
        if ($dryA.Text -notmatch '7zip\.7zr') { throw "--apply --dry-run : identifiant valide absent du plan." }
        if ($dryA.Text -match '\.\./evil' -or $dryA.Text -match 'zone-inconnue') { throw "--apply --dry-run : entree non filtree dans le plan." }
        if ($dryA.Text -notmatch 'recycle-bin') { throw "--apply --dry-run : zone de nettoyage valide absente du plan." }
        if ($dryA.Text -match 'Installation de 7zip\.7zr \.\.\.') { throw "--apply --dry-run : ne doit rien installer." }
    }
    finally { Remove-Item -LiteralPath $goodCfg -Force -ErrorAction SilentlyContinue }

# Verbes lot 7 (beta.41) : lecture seule / simulation, aucun effet de bord.
    $cu = Invoke-Cli @('--check-updates', '--json')
    if ($cu.Code -notin @(0, 1, 3)) { throw "--check-updates --json : code inattendu $($cu.Code)." }
    if ($cu.Code -ne 3) {
        $payload = $null
        try { $payload = $cu.Text.Trim() | ConvertFrom-Json } catch { throw "--check-updates --json : sortie JSON invalide." }
        if ($null -eq $payload.count) { throw "--check-updates --json : champ 'count' absent." }
        if ($payload.count -gt 0 -and $cu.Code -ne 1) { throw "--check-updates : doit renvoyer 1 quand des mises a jour existent." }
        if ($payload.count -eq 0 -and $cu.Code -ne 0) { throw "--check-updates : doit renvoyer 0 sans mise a jour." }
        foreach ($item in @($payload.updates)) {
            if ([string]::IsNullOrWhiteSpace($item.available)) { throw "--check-updates : ligne sans version disponible (resume winget non filtre)." }
            if ($item.id -notmatch '^[A-Za-z0-9][A-Za-z0-9.+_-]{0,127}$') { throw "--check-updates : identifiant invalide '$($item.id)'." }
        }
    }

    $dryU = Invoke-Cli @('--update', 'VideoLAN.VLC', '--dry-run')
    if ($dryU.Code -ne 0) { throw "--update --dry-run : code attendu 0 (obtenu $($dryU.Code))." }
    if ($dryU.Text -notmatch '\[simulation\]' -or $dryU.Text -notmatch 'VideoLAN\.VLC') { throw "--update --dry-run : plan absent." }
    if ($dryU.Text -match 'Mise a jour : VideoLAN\.VLC \.\.\.') { throw "--update --dry-run : ne doit rien mettre a jour." }

    $noArg = Invoke-Cli @('--export-profile')
    if ($noArg.Code -ne 2) { throw "--export-profile sans argument : code 2 attendu (obtenu $($noArg.Code))." }

    $profile = Join-Path ([IO.Path]::GetTempPath()) ("owlsetup-profil-" + [guid]::NewGuid().ToString('N') + ".pcsetup.json")
    try {
        $exp = Invoke-Cli @('--export-profile', $profile)
        if ($exp.Code -notin @(0, 1, 3)) { throw "--export-profile : code inattendu $($exp.Code)." }
        if ($exp.Code -eq 0) {
            if (-not (Test-Path -LiteralPath $profile)) { throw "--export-profile : fichier non ecrit." }
            $cfg = Get-Content -LiteralPath $profile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($cfg.format -ne 'pc-setup-configuration') { throw "--export-profile : format de configuration incorrect." }
            if ($cfg.formatVersion -ne 1) { throw "--export-profile : formatVersion incorrect." }
            foreach ($id in @($cfg.installedPackages)) {
                if ($id -notmatch '^[A-Za-z0-9][A-Za-z0-9.+_-]{0,127}$') { throw "--export-profile : identifiant invalide '$id'." }
            }
            # Le profil doit etre relisible par --apply (boucle export -> apply).
            $back = Invoke-Cli @('--apply', $profile, '--dry-run')
            if ($back.Code -ne 0) { throw "--apply du profil exporte : code attendu 0 (obtenu $($back.Code))." }
            if ($back.Text -notmatch '\[simulation\]') { throw "--apply du profil exporte : plan absent." }
        }
    }
    finally { Remove-Item -LiteralPath $profile -Force -ErrorAction SilentlyContinue }

    # Shim console : compile a cote de l'exe, doit relayer et attendre.
    $shim = [IO.Path]::ChangeExtension($exe, ".com")
    if (Test-Path $shim) {
        $sv = & $shim --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw "OwlSetup.com --version : code $LASTEXITCODE." }
        if (($sv -join "`n") -notmatch 'OwlSetup') { throw "OwlSetup.com --version : sortie inattendue." }
        Write-Host "Mode CLI : marqueurs + verbes surs + shim .com verifies." -ForegroundColor Green
    }
    else {
        Write-Host "Mode CLI : marqueurs + verbes surs verifies (shim .com absent)." -ForegroundColor Green
    }
}
else {
    Write-Host "Mode CLI : marqueurs presents (execution ignoree, exe absent)." -ForegroundColor Green
}
