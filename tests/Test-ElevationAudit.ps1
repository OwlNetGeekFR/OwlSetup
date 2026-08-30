$ErrorActionPreference = "Stop"

# Journal d'audit des operations elevees (lot 3 - 4.0.0-beta.51).
#
# Toute elevation laisse une trace ecrite par RunElevatedProcess lui-meme :
# aucun appelant ne peut la contourner. Ce test verifie le cablage dans le
# source, puis le COMPORTEMENT reel des helpers via reflexion sur l'exe compile.
#
# Assertions en ASCII seulement : Windows PowerShell 5.1 decode mal les
# litteraux accentues dans un .ps1 UTF-8 sans BOM.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}

# 1) La trace est ecrite par RunElevatedProcess, pas par ses appelants.
Assert-Has $native 'LogElevation(fileName,arguments,"demande");' "La demande d'elevation n'est plus tracee avant le lancement."
Assert-Has $native 'LogElevation(fileName,arguments,"code="+process.ExitCode);' "Le code de sortie d'une elevation n'est plus trace."
Assert-Has $native 'LogElevation(fileName,arguments,"refus UAC");' "Le refus de l'invite UAC n'est plus trace."
Assert-Has $native 'const string ElevationLogName="PC-Setup-Elevations.log";' "Le journal d'audit a change de nom : il ne suivrait plus la convention PC-Setup-*.log."

# 2) Le journal reste lisible depuis l'interface : nomme comme les autres
#    journaux, donc liste dans l'historique et ouvrable par OpenLog.
Assert-Has $native 'if(name.IndexOf("Elevations",StringComparison.OrdinalIgnoreCase)>=0)return "' "L'historique ne classe plus le journal d'elevation."

# 3) Un dossier d'installation personnalise ne peut pas etre une jonction vers
#    une zone protegee : les controles textuels ne le verraient pas.
Assert-Has $native 'EnsureNoReparsePoints(full,Path.GetPathRoot(full));' "ValidateInstallBasePath ne verifie plus les points de jonction."

# 4) Comportement reel des helpers, via reflexion sur l'exe compile.
$exe = Join-Path $root "OwlSetup.exe"
if (Test-Path $exe) {
    $asm = [System.Reflection.Assembly]::LoadFrom($exe)
    $type = $asm.GetType("WebAppForm")
    $flags = [System.Reflection.BindingFlags]"NonPublic,Static"
    $summarize = $type.GetMethod("SummarizeElevationArguments", $flags)
    $trim = $type.GetMethod("TrimElevationLog", $flags)
    if (-not $summarize -or -not $trim) { throw "Helpers du journal d'audit introuvables via reflexion." }

    # Un argument vide reste explicite plutot que vide dans le journal.
    if ($summarize.Invoke($null, @([string]"")) -ne "(sans argument)") {
        throw "SummarizeElevationArguments devrait signaler l'absence d'argument."
    }

    # Les sauts de ligne d'un script PowerShell sont aplatis : une entree de
    # journal doit tenir sur une ligne, sinon la relecture devient impossible.
    $flat = $summarize.Invoke($null, @([string]"-Command `"Get-Item`r`n  C:\temp`""))
    if ($flat -match "[\r\n]") { throw "SummarizeElevationArguments laisse passer des sauts de ligne." }
    if (-not $flat.Contains("Get-Item C:\temp")) { throw "SummarizeElevationArguments a deforme l'argument : $flat" }

    # Un argument tres long est tronque : le journal reste lisible.
    $long = $summarize.Invoke($null, @([string]("x" * 900)))
    if ($long.Length -gt 320) { throw "SummarizeElevationArguments ne tronque plus les arguments longs ($($long.Length))." }

    # La rotation garde la moitie la plus recente au-dela du seuil.
    $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("owlsetup-audit-" + [Guid]::NewGuid().ToString("N") + ".log")
    try {
        $ligne = "2026-08-30 12:00:00 | powershell.exe | -Command Get-Item | code=0"
        $repetitions = [int](600KB / ($ligne.Length + 2)) + 10
        [System.IO.File]::WriteAllLines($temp, (1..$repetitions | ForEach-Object { "$ligne #$_" }), [System.Text.Encoding]::UTF8)
        $avant = (Get-Item $temp).Length
        $trim.Invoke($null, @([string]$temp))
        $apres = (Get-Item $temp).Length
        if ($apres -ge $avant) { throw "TrimElevationLog n'a pas reduit un journal au-dela du seuil." }
        $restantes = [System.IO.File]::ReadAllLines($temp)
        # On garde la fin : la derniere ligne ecrite doit survivre.
        if ($restantes[-1] -ne "$ligne #$repetitions") {
            throw "TrimElevationLog a garde le debut du journal au lieu des entrees recentes."
        }
        # Sous le seuil, le fichier ne doit plus bouger.
        $tailleStable = (Get-Item $temp).Length
        $trim.Invoke($null, @([string]$temp))
        if ((Get-Item $temp).Length -ne $tailleStable) { throw "TrimElevationLog tronque un journal deja sous le seuil." }
    }
    finally {
        if (Test-Path $temp) { Remove-Item $temp -Force }
    }

    Write-Host "Journal d'audit des elevations : cablage + comportement verifies." -ForegroundColor Green
}
else {
    Write-Host "Journal d'audit des elevations : cablage verifie (exe absent, comportement non teste)." -ForegroundColor Yellow
}
