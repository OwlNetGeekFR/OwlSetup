$ErrorActionPreference = "Stop"

# Mode ligne de commande (4.4 / beta.18) : --install / --uninstall / --list /
# --search / --help / --version. Vérifie les marqueurs source puis, si
# l'exécutable compilé est présent, exécute réellement les verbes sûrs.

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
Assert-Has $native 'case "--install": return CliInstallOrRemove(rest,false);' "Le verbe --install a disparu."
Assert-Has $native 'case "--uninstall": return CliInstallOrRemove(rest,true);' "Le verbe --uninstall a disparu."
Assert-Has $native 'case "--list": return CliList(' "Le verbe --list a disparu."
Assert-Has $native 'case "--search": return CliSearch(rest);' "Le verbe --search a disparu."
# Les identifiants CLI sont valides par la meme regex que le reste de l'hote.
Assert-Has $native '^[A-Za-z0-9][A-Za-z0-9.+_-]{0,127}$' "La validation d'identifiant du mode CLI a disparu."
# --install passe toujours les drapeaux silencieux WinGet.
Assert-Has $native '--silent --accept-package-agreements --accept-source-agreements --disable-interactivity' "Le mode CLI n'installe plus en silencieux."

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

    Write-Host "Mode CLI : marqueurs presents + verbes surs verifies sur l'executable." -ForegroundColor Green
}
else {
    Write-Host "Mode CLI : marqueurs presents (execution ignoree, exe absent)." -ForegroundColor Green
}
