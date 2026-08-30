$ErrorActionPreference = "Stop"

# Lance la suite Pester des scripts d'operation (lot 4) et echoue si un test
# echoue, pour s'inserer dans la convention tests/Test-*.ps1 du depot.
#
# Pester 3.4 est livre avec Windows : aucune dependance a installer.

$specs = Join-Path $PSScriptRoot "Pester"
if (-not (Test-Path -LiteralPath $specs)) { throw "Dossier des specifications Pester introuvable : $specs" }

$module = Get-Module -ListAvailable Pester | Sort-Object Version -Descending | Select-Object -First 1
if (-not $module) {
    Write-Host "Pester absent : suite de comportement non executee." -ForegroundColor Yellow
    return
}
Import-Module Pester -ErrorAction Stop

$resultat = Invoke-Pester -Path $specs -PassThru -Quiet
if (-not $resultat) { throw "Invoke-Pester n'a rien renvoye." }

Write-Host ("Scripts d'operation : {0} test(s), {1} echec(s)." -f $resultat.TotalCount, $resultat.FailedCount)
if ($resultat.FailedCount -gt 0) {
    foreach ($test in $resultat.TestResult | Where-Object { -not $_.Passed }) {
        Write-Host ("  ECHEC {0} > {1}" -f $test.Describe, $test.Name) -ForegroundColor Red
        if ($test.FailureMessage) { Write-Host ("        " + $test.FailureMessage) -ForegroundColor DarkRed }
    }
    throw "$($resultat.FailedCount) test(s) de comportement en echec."
}

Write-Host "Comportement des scripts d'operation : verifie." -ForegroundColor Green
