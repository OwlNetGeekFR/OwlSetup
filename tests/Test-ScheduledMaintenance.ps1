$ErrorActionPreference = "Stop"

# Entretien planifie (lot 6, 4.0.0-beta.42) : OwlSetup cree une VRAIE tache
# planifiee Windows qui rappelle le mode CLI. Ce test garde les proprietes de
# securite (pas d elevation, pas de mot de passe, compte courant) et verifie
# que le cycle creation -> relecture -> suppression fonctionne sur cette
# machine, sur une tache de test dediee (jamais celle de l utilisateur).
# Assertions en ASCII : PowerShell 5.1 decode mal les accents des .ps1 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$app = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}
function Assert-Missing([string]$Text, [string]$Token, [string]$Message) {
    if ($Text.Contains($Token)) { throw $Message }
}

# 1) Hote : actions, nom de tache et garde-fous de securite.
Assert-Has $native 'action == "schedule-state"' "L'action schedule-state a disparu du dispatch."
Assert-Has $native 'action == "schedule-configure"' "L'action schedule-configure a disparu du dispatch."
Assert-Has $native 'action == "schedule-remove"' "L'action schedule-remove a disparu du dispatch."
Assert-Has $native 'ScheduleTaskName = "OwlSetup-Entretien"' "Le nom de la tache planifiee a change sans migration."

# La tache ne doit jamais etre privilegiee ni porter un mot de passe.
Assert-Has $native '-LogonType Interactive -RunLevel Limited' "La tache planifiee n'est plus limitee au compte courant sans elevation."
Assert-Missing $native '-RunLevel Highest' "Une tache planifiee elevee est apparue."
Assert-Missing $native '-Password' "Un mot de passe est passe au planificateur de taches."

# 2) La tache rappelle bien le mode CLI (lot 7), pas un chemin parallele.
Assert-Has $native 'action=="update" ? "--update --silent" : "--check-updates"' "La tache planifiee n'appelle plus les verbes CLI."
Assert-Has $native 'New-ScheduledTaskAction -Execute $exe' "La tache planifiee ne lance plus l'executable OwlSetup."

# 3) Validation stricte de ce qui vient de l'interface (injection PowerShell).
Assert-Has $native 'if(action!="check" && action!="update")action="check";' "L'action planifiee n'est plus validee."
Assert-Has $native 'if(frequency!="weekly" && frequency!="monthly")frequency="weekly";' "La frequence planifiee n'est plus validee."
Assert-Has $native '^([01][0-9]|2[0-3]):[0-5][0-9]$' "L'heure planifiee n'est plus validee."
Assert-Has $native 'if(day<0||day>6)day=5;' "Le jour planifie n'est plus valide comme jour de semaine."

# 4) Relecture : jour de semaine depuis le masque de bits, pas le jour du mois.
Assert-Has $native '$mask=[int]$tr.DaysOfWeek' "La relecture n'utilise plus le masque DaysOfWeek."
Assert-Missing $native "+`$start.Day+" "La relecture utilise a nouveau le jour du mois au lieu du jour de semaine."

# 5) Interface.
Assert-Has $html 'id="scheduleEnabled"' "Le panneau d'entretien planifie a disparu des Parametres."
Assert-Has $html 'id="scheduleAction"' "Le choix d'action planifiee a disparu."
Assert-Has $html 'id="scheduleFrequency"' "Le choix de frequence a disparu."
Assert-Has $app 'action:"schedule-configure"' "L'interface n'envoie plus la configuration de planification."
Assert-Has $app 'action:"schedule-remove"' "L'interface ne peut plus supprimer la tache planifiee."
Assert-Has $app 'if (id === "settings") requestScheduleState();' "L'etat de la tache n'est plus relu a l'ouverture des Parametres."

# 6) Cycle reel sur une tache de test dediee (jamais celle de l utilisateur).
$testName = "OwlSetup-Entretien-AutoTest"
$exe = Join-Path $root "OwlSetup.exe"
if (Get-Command Register-ScheduledTask -ErrorAction SilentlyContinue) {
    try {
        $trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 4 -DaysOfWeek Wednesday -At "07:30"
        $action = New-ScheduledTaskAction -Execute $exe -Argument "--update --silent"
        $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
        Unregister-ScheduledTask -TaskName $testName -Confirm:$false -ErrorAction SilentlyContinue
        Register-ScheduledTask -TaskName $testName -Action $action -Trigger $trigger -Principal $principal -Description "test automatise OwlSetup" | Out-Null

        $task = Get-ScheduledTask -TaskName $testName -ErrorAction Stop
        $tr = $task.Triggers | Select-Object -First 1
        $mask = [int]$tr.DaysOfWeek
        $weekday = if ($mask -gt 0) { [int][Math]::Round([Math]::Log($mask, 2)) } else { -1 }
        if ($weekday -ne 3) { throw "Relecture du jour : 3 (mercredi) attendu, obtenu $weekday." }
        if ([int]$tr.WeeksInterval -lt 4) { throw "Relecture de la frequence : intervalle de 4 semaines attendu." }
        $arguments = ($task.Actions | Select-Object -First 1).Arguments
        if ($arguments -notmatch '--update') { throw "La tache ne rappelle pas le verbe CLI attendu." }
        if ($task.Principal.RunLevel -ne 'Limited') { throw "La tache de test n'est pas limitee (elevation inattendue)." }
    }
    finally {
        Unregister-ScheduledTask -TaskName $testName -Confirm:$false -ErrorAction SilentlyContinue
    }
    if (Get-ScheduledTask -TaskName $testName -ErrorAction SilentlyContinue) {
        throw "La tache de test n'a pas ete supprimee."
    }
    Write-Host "Entretien planifie : marqueurs + cycle reel (creation, relecture, suppression) verifies." -ForegroundColor Green
}
else {
    Write-Host "Entretien planifie : marqueurs verifies (module ScheduledTasks absent)." -ForegroundColor Yellow
}
