$ErrorActionPreference = "Stop"

# Auto-elevation du mode CLI avec relais de sortie (lot 7 - 4.0.0-beta.52).
#
# L'elevation est OPT-IN : un script ou un MDM ne doit jamais voir surgir une
# invite UAC qu'il n'a pas demandee. ShellExecute + « runas » interdisant la
# redirection des flux, le processus eleve ecrit dans un fichier de relais que
# le parent recopie ensuite sur sa propre sortie.
#
# Assertions en ASCII seulement : Windows PowerShell 5.1 decode mal les
# litteraux accentues dans un .ps1 UTF-8 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}

# 1) L'elevation reste opt-in, et seulement pour les verbes qui touchent la machine.
Assert-Has $native 'if(elevate && !dryRun && !CliIsAdmin() && CliVerbCanNeedAdmin(verb))return CliRunElevated(commandLine);' "L'auto-elevation n'est plus conditionnee a --elevate / verbe / droits / dry-run."
Assert-Has $native 'return verb=="--install" || verb=="--uninstall" || verb=="--apply" || verb=="--update";' "La liste des verbes pouvant demander des droits a change."

# 2) Le processus eleve ne s'eleve jamais lui-meme et valide son relais.
Assert-Has $native 'if(!CliIsAdmin())return 740;' "CliRelayWorker ne refuse plus une invocation non elevee."
Assert-Has $native 'if(!CliIsValidRelayPath(relay))return 87;' "CliRelayWorker ne valide plus le chemin du relais."
Assert-Has $native 'if(commandLine[i]=="--elevate")continue;' "--elevate n'est plus retire des arguments relayes : l'enfant pourrait boucler."

# 3) Comportement reel, via reflexion sur l'exe compile.
$exe = Join-Path $root "OwlSetup.exe"
if (-not (Test-Path $exe)) {
    Write-Host "Auto-elevation CLI : cablage verifie (exe absent, comportement non teste)." -ForegroundColor Yellow
    return
}

$asm = [System.Reflection.Assembly]::LoadFrom($exe)
$type = $asm.GetType("Bootstrap")
$flags = [System.Reflection.BindingFlags]"NonPublic,Static"
$quote = $type.GetMethod("CliQuoteArgument", $flags)
$valid = $type.GetMethod("CliIsValidRelayPath", $flags)
$worker = $type.GetMethod("CliRelayWorker", $flags)
if (-not $quote -or -not $valid -or -not $worker) { throw "Helpers d'auto-elevation introuvables via reflexion." }

# Mise entre guillemets a la convention Windows : un antislash final doit etre
# double, sinon il echapperait le guillemet fermant et decalerait tout le reste
# de la ligne de commande.
if ($quote.Invoke($null, @([string]'avec espace')) -ne '"avec espace"') { throw "Quoting d'un argument avec espace incorrect." }
if ($quote.Invoke($null, @([string]'C:\dossier\')) -ne '"C:\dossier\\"') { throw "Un antislash final n'est pas double." }
if ($quote.Invoke($null, @([string]'gui"llemet')) -ne '"gui\"llemet"') { throw "Un guillemet interne n'est pas echappe." }

# Le relais doit rester dans le dossier des journaux, avec un nom genere.
$logs = Join-Path $env:LOCALAPPDATA "PCSetup\Logs"
$bon = Join-Path $logs "PC-Setup-Elevation-2026-08-30-120000-a1b2c3d4.log"
if (-not $valid.Invoke($null, @([string]$bon))) { throw "Un chemin de relais legitime est refuse." }

$refuses = @{
    "nom hors motif"      = Join-Path $logs "PC-Setup-Nettoyage-2026-08-30-1200.log"
    "hors du dossier"     = Join-Path $env:TEMP "PC-Setup-Elevation-2026-08-30-120000-a1b2c3d4.log"
    "remontee de chemin"  = Join-Path $logs "..\..\evil.log"
    "vide"                = ""
}
foreach ($cas in $refuses.GetEnumerator()) {
    if ($valid.Invoke($null, @([string]$cas.Value))) { throw "Chemin de relais accepte a tort ($($cas.Key)) : $($cas.Value)" }
}

# Invoque hors elevation, le worker refuse (740 = ERROR_ELEVATION_REQUIRED).
$estAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $estAdmin) {
    $code = $worker.Invoke($null, @(, [string[]]@('OwlSetup.exe', '--elevated-relay', $bon, '--version')))
    if ($code -ne 740) { throw "CliRelayWorker devrait refuser une invocation non elevee (740), obtenu $code." }
}

# 4) --elevate avec --dry-run ne declenche aucune invite : la simulation
#    s'execute directement et rend 0.
$sortie = Join-Path ([System.IO.Path]::GetTempPath()) ("owlsetup-cli-" + [Guid]::NewGuid().ToString("N") + ".txt")
try {
    $p = Start-Process -FilePath $exe -ArgumentList '--install VideoLAN.VLC --elevate --dry-run' -Wait -NoNewWindow -PassThru -RedirectStandardOutput $sortie
    if ($p.ExitCode -ne 0) { throw "--elevate --dry-run devrait rendre 0, obtenu $($p.ExitCode)." }
    $texte = Get-Content -LiteralPath $sortie -Raw -Encoding UTF8
    if ($texte -notmatch 'simulation') { throw "--elevate --dry-run n'a pas execute la simulation." }
}
finally {
    if (Test-Path $sortie) { Remove-Item $sortie -Force }
}

# 5) L'aide documente l'option et son caractere opt-in.
$aide = Join-Path ([System.IO.Path]::GetTempPath()) ("owlsetup-help-" + [Guid]::NewGuid().ToString("N") + ".txt")
try {
    Start-Process -FilePath $exe -ArgumentList '--help' -Wait -NoNewWindow -RedirectStandardOutput $aide | Out-Null
    $texte = Get-Content -LiteralPath $aide -Raw -Encoding UTF8
    if ($texte -notmatch '--elevate') { throw "--help ne documente pas --elevate." }
    if ($texte -notmatch 'UAC') { throw "--help n'explique pas qu'aucune invite UAC n'apparait sans le drapeau." }
}
finally {
    if (Test-Path $aide) { Remove-Item $aide -Force }
}

Write-Host "Auto-elevation CLI : opt-in, relais valide, quoting et aide verifies." -ForegroundColor Green
Write-Host "Le trajet UAC complet (invite + relais reel) reste a essayer sur le PC de test." -ForegroundColor Yellow
