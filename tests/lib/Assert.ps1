# Petit harnais d'assertions pour les tests de comportement.
#
# Volontairement sans Pester : les runners GitHub embarquent Pester 5, dont la
# syntaxe (`Should -Be`) differe de celle de Pester 3.4 livre avec Windows. Une
# suite ecrite pour l'un echoue silencieusement sur l'autre - c'est ce qui a
# fait echouer la publication de la 4.0.0-rc.1. Ces quelques fonctions n'ont
# aucune dependance et se comportent pareil partout.
#
# ASCII uniquement : PowerShell 5.1 decode mal les accents dans un .ps1 sans BOM.

$script:CasTotal = 0
$script:CasEchecs = New-Object System.Collections.ArrayList
$script:GroupeCourant = ""

function Start-TestGroup { param([string]$Name) $script:GroupeCourant = $Name }

function Invoke-TestCase {
    param([string]$Name, [scriptblock]$Body)
    $script:CasTotal++
    try { & $Body }
    catch {
        [void]$script:CasEchecs.Add(@{ Groupe = $script:GroupeCourant; Nom = $Name; Message = $_.Exception.Message })
    }
}

function Assert-Equal {
    param($Expected, $Actual, [string]$Message = "")
    if ($Expected -ne $Actual) {
        throw ("attendu <{0}>, obtenu <{1}>{2}" -f $Expected, $Actual, $(if ($Message) { " - $Message" } else { "" }))
    }
}

function Assert-True {
    param($Value, [string]$Message = "")
    if (-not $Value) { throw ("attendu vrai{0}" -f $(if ($Message) { " - $Message" } else { "" })) }
}

function Assert-False {
    param($Value, [string]$Message = "")
    if ($Value) { throw ("attendu faux{0}" -f $(if ($Message) { " - $Message" } else { "" })) }
}

function Assert-Throws {
    param([scriptblock]$Body, [string]$Message = "")
    $leve = $false
    try { & $Body } catch { $leve = $true }
    if (-not $leve) { throw ("une exception etait attendue{0}" -f $(if ($Message) { " - $Message" } else { "" })) }
}

function Assert-DoesNotThrow {
    param([scriptblock]$Body, [string]$Message = "")
    try { & $Body }
    catch { throw ("aucune exception attendue, obtenu : {0}{1}" -f $_.Exception.Message, $(if ($Message) { " - $Message" } else { "" })) }
}

function Complete-TestRun {
    param([string]$Label)
    Write-Host ("{0} : {1} test(s), {2} echec(s)." -f $Label, $script:CasTotal, $script:CasEchecs.Count)
    if ($script:CasEchecs.Count -gt 0) {
        foreach ($echec in $script:CasEchecs) {
            Write-Host ("  ECHEC {0} > {1}" -f $echec.Groupe, $echec.Nom) -ForegroundColor Red
            Write-Host ("        " + $echec.Message) -ForegroundColor DarkRed
        }
        throw "$($script:CasEchecs.Count) test(s) de comportement en echec."
    }
}
