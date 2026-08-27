$ErrorActionPreference = "Stop"

# Garde les correctifs de l'onglet Sécurité + consolidation
# (4.0.0-beta.7 -> beta.9).

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$app = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$manifest = Get-Content -LiteralPath (Join-Path $root "OwlSetup.manifest") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}
function Assert-Missing([string]$Text, [string]$Token, [string]$Message) {
    if ($Text.Contains($Token)) { throw $Message }
}

# --- Détection antivirus / pare-feu : état "indéterminé" (beta.7) ---
Assert-Has $native 'static bool? ReadRegistryFlag' "La lecture registre tri-état (null si absent) a disparu."
Assert-Has $native '{"antivirusDetermined",antivirusDetermined}' "Le champ antivirusDetermined n'est plus transmis."
Assert-Has $native '{"firewallDetermined",firewallDetermined}' "Le champ firewallDetermined n'est plus transmis."
Assert-Has $native '"antivirusActive",antivirusActive' "Le champ antivirusActive attendu par l'UI a disparu."
Assert-Has $app 'message.antivirusDetermined===false' "L'interface ne gere plus l'etat antivirus indetermine."
Assert-Has $app 'const antivirusUnknown=message.antivirusDetermined===false' "Le calcul de l'etat antivirus indetermine a disparu."
Assert-Has $app 'const firewallUnknown=message.firewallDetermined===false' "Le calcul de l'etat pare-feu indetermine a disparu."

# --- Cache de la version WinGet (beta.7) ---
Assert-Has $native 'string CachedWingetVersion()' "La version WinGet n'est plus mise en cache (relancée à chaque rafraîchissement)."

# --- Quarantaine : purge, badge, tri (beta.7) ---
Assert-Has $native 'void PurgeOldQuarantine' "La purge des éléments anciens de quarantaine a disparu."
Assert-Has $native 'action == "purge-quarantine"' "L'action purge-quarantine n'est plus routée."
Assert-Has $native '{"modifiedSort",info.LastWriteTime.ToString("o")}' "Le tri chronologique fiable de la quarantaine a disparu."
Assert-Has $html 'id="purgeOldQuarantine"' "Le bouton de purge de quarantaine est absent du HTML."
Assert-Has $html 'class="new-badge hidden" id="quarantineNavCount"' "Le badge Quarantaine ne se masque plus quand elle est vide."

# --- Suppression robuste (beta.8) ---
Assert-Has $native 'static int ForceDeleteDirectory' "La suppression récursive robuste (longs chemins) a disparu."
Assert-Has $native 'static int DeleteTreeManual' "La récursion manuelle avec remise à zéro des attributs a disparu."
Assert-Has $native 'rd /s /q' "Le dernier recours rd /s /q pour les chemins profonds a disparu."
Assert-Has $native 'robocopy.exe' "La restauration de quarantaine ne bascule plus sur robocopy pour les chemins profonds."
Assert-Has $manifest 'longPathAware' "Le manifeste n'active plus longPathAware."

# --- Consolidation beta.9 : toast, RepairWinget, point de restauration ---
Assert-Has $app 'function notify(title, detail, kind' "notify() n'accepte plus de type (icône erreur/succès)."
Assert-Has $html 'id="toastIcon"' "L'icône du toast n'a pas d'identifiant : impossible de la changer selon le type."
Assert-Has $native "Write-Output 'PCSETUP_WG|updated'" "RepairWinget ne tente plus une simple actualisation avant la réinitialisation."
Assert-Has $native 'source export' "RepairWinget ne sauvegarde plus les sources personnalisées avant reset --force."
Assert-Has $native "PCSETUP_SR|recent" "Le point de restauration ne détecte plus un point récent (< 24 h)."
Assert-Missing $native "New-ItemProperty -Path `$k -Name 'SystemRestorePointCreationFrequency'" "L'écriture registre fragile pour forcer un point de restauration est de retour."

Write-Host "Durcissement de l'onglet Sécurité : marqueurs présents." -ForegroundColor Green
