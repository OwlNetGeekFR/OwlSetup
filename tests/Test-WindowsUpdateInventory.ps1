$ErrorActionPreference = "Stop"

# Windows Update (4.2 / beta.15-16) : inventaire lecture seule via l'API WUA,
# puis installation d'une sélection avec élévation. Vérifie les marqueurs de
# l'hôte + le câblage interface, et, si l'exécutable compilé est présent,
# exécute réellement la RECHERCHE par réflexion (jamais l'installation).

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$frontend = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$markup = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}

# 1) Hôte : recherche WUA en lecture seule, sortie ASCII, marqueurs stables
Assert-Has $native 'List<Dictionary<string,object>> SearchWindowsUpdates(' "SearchWindowsUpdates (inventaire WUA) a disparu."
Assert-Has $native 'Microsoft.Update.Session' "Le script n'utilise plus l'API WUA Microsoft.Update.Session."
Assert-Has $native 'PCSETUP_WU_ITEM|' "Le marqueur PCSETUP_WU_ITEM a disparu."
Assert-Has $native 'PCSETUP_WU_END|' "Le marqueur PCSETUP_WU_END a disparu."
Assert-Has $native 'function Out-Ascii(' "L'echappement ASCII de la sortie WUA a disparu (accents casses sur flux redirige)."
Assert-Has $native 'void ScanWindowsUpdates()' "Le gestionnaire ScanWindowsUpdates a disparu."
Assert-Has $native 'action == "scan-windows-updates"' "L'action scan-windows-updates n'est plus routee."
Assert-Has $native 'action == "open-windows-update"' "L'action open-windows-update n'est plus routee."
Assert-Has $native 'type="windows-updates"' "Le message windows-updates n'est plus emis."
# La recherche WUA ne doit rien installer : le corps de SearchWindowsUpdates
# (jusqu'a ScanWindowsUpdates) ne contient ni downloader ni installer WUA.
$searchStart = $native.IndexOf('List<Dictionary<string,object>> SearchWindowsUpdates(')
$searchEnd = $native.IndexOf('void ScanWindowsUpdates()')
if ($searchStart -lt 0 -or $searchEnd -le $searchStart) { throw "Impossible de delimiter SearchWindowsUpdates." }
$searchBody = $native.Substring($searchStart, $searchEnd - $searchStart)
if ($searchBody -match 'CreateUpdateDownloader|CreateUpdateInstaller') {
    throw "SearchWindowsUpdates ne doit rester qu'en LECTURE SEULE (aucun download/install)."
}

# 2) Interface : panneau dedie + rendu + ecouteurs
Assert-Has $markup 'id="windowsUpdatePanel"' "Le panneau Windows Update a disparu de l'onglet Mises a jour."
Assert-Has $markup 'id="scanWindowsUpdatesBtn"' "Le bouton d'analyse Windows Update a disparu."
Assert-Has $markup 'id="openWindowsUpdateBtn"' "Le bouton d'ouverture de Windows Update a disparu."
Assert-Has $frontend 'message.type === "windows-updates"' "app.js ne traite plus le message windows-updates."
Assert-Has $frontend 'function renderWindowsUpdates(' "Le rendu renderWindowsUpdates a disparu."
Assert-Has $frontend 'action: "scan-windows-updates"' "app.js n'envoie plus scan-windows-updates."
Assert-Has $frontend 'windowsUpdateCount' "La synthese Windows Update de update-complete a disparu."

# 2b) Installation elevee d'une selection (beta.16)
Assert-Has $native 'void InstallWindowsUpdates(' "InstallWindowsUpdates (installation WUA elevee) a disparu."
Assert-Has $native 'action == "install-windows-updates"' "L'action install-windows-updates n'est plus routee."
Assert-Has $native 'PCSETUP_WUI_ITEM|' "Le marqueur de resultat par mise a jour a disparu."
Assert-Has $native 'PCSETUP_WUI_END|' "Le marqueur de fin d'installation WUA a disparu."
Assert-Has $native 'RunElevatedProcess("powershell.exe"' "L'installation WUA ne passe plus par une elevation UAC."
Assert-Has $native 'CreateUpdateDownloader' "Le script d'installation ne telecharge plus via WUA."
Assert-Has $native 'CreateUpdateInstaller' "Le script d'installation n'installe plus via WUA."
Assert-Has $native 'rebootRequired' "Le drapeau de redemarrage requis n'est plus remonte."
# updateId validé comme GUID avant d'etre passe au script eleve
Assert-Has $native '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' "Les updateId ne sont plus valides comme GUID avant elevation."
Assert-Has $frontend 'function requestWindowsUpdateInstall(' "Le declenchement d'installation Windows Update a disparu de app.js."
Assert-Has $frontend 'action: "install-windows-updates"' "app.js n'envoie plus install-windows-updates."
Assert-Has $frontend 'runWithOptionalRestore' "L'installation Windows Update n'est plus protegee par un point de restauration optionnel."
Assert-Has $markup 'id="installWindowsUpdatesBtn"' "Le bouton d'installation de la selection a disparu."
Assert-Has $markup 'id="windowsUpdateRebootBar"' "La banniere de redemarrage requis a disparu."
# Les pilotes ne doivent pas etre coches par defaut.
Assert-Has $frontend 'u.kind !== "driver"' "Les pilotes ne sont plus exclus de la selection par defaut."

# 2c) Preversions / optionnelles "seeker" + verification post-installation (beta.17)
Assert-Has $native 'browseOnly=[bool]$u.BrowseOnly' "L'inventaire n'expose plus le drapeau BrowseOnly."
Assert-Has $native 'if($u.BrowseOnly){ $skipped++; continue }' "Le script d'installation n'ecarte plus les mises a jour BrowseOnly."
Assert-Has $native 'Microsoft.Update.SystemInfo' "La detection de redemarrage ne croise plus SystemInfo.RebootRequired."
Assert-Has $native 'installedNow=$done' "Le script d'installation ne remonte plus l'etat IsInstalled reel."
Assert-Has $native 'bool notApplied=resultCode==2 && !installedNow && !rebootRequired' "L'hote ne detecte plus le faux succes (non applique)."
Assert-Has $native "n'est pas appliqu" "Le message 'succes annonce mais non applique' a disparu."
Assert-Has $frontend '!u.browseOnly' "app.js ne filtre plus les mises a jour optionnelles hors de la selection."
Assert-Has $frontend 'message.notApplied' "app.js ne traite plus le cas 'non applique'."

# 3) Execution reelle si l'exe compile est present
$exe = Join-Path $root "OwlSetup.exe"
if (Test-Path $exe) {
    Add-Type -AssemblyName System.Web.Extensions
    Add-Type -TypeDefinition @"
using System;using System.Text;using System.Reflection;using System.Collections;using System.Collections.Generic;
public static class WuInvHarness {
  public static string Run(string exe) {
    var asm = Assembly.LoadFrom(exe);
    var t = asm.GetType("WebAppForm");
    var inst = System.Runtime.Serialization.FormatterServices.GetUninitializedObject(t);
    var jf = t.GetField("json", BindingFlags.NonPublic|BindingFlags.Instance);
    jf.SetValue(inst, Activator.CreateInstance(Type.GetType("System.Web.Script.Serialization.JavaScriptSerializer, System.Web.Extensions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35")));
    var m = t.GetMethod("SearchWindowsUpdates", BindingFlags.NonPublic|BindingFlags.Instance);
    var args = new object[] { new StringBuilder(), null, false };
    var res = (IList)m.Invoke(inst, args);
    var sb = new StringBuilder();
    sb.Append("completed=").Append(args[2]).Append(";warning=").Append(args[1] ?? "<null>").Append(";count=").Append(res.Count);
    foreach (var row in res) {
      var d = (IDictionary<string,object>)row;
      if (!(d.ContainsKey("title") && d.ContainsKey("kind") && d.ContainsKey("bytes"))) throw new Exception("Champ manquant sur une entree WUA.");
      var kind = Convert.ToString(d["kind"]);
      if (kind != "driver" && kind != "software") throw new Exception("kind invalide: " + kind);
    }
    return sb.ToString();
  }
}
"@ -ReferencedAssemblies System.Web.Extensions
    $summary = [WuInvHarness]::Run($exe)
    if ($summary -notmatch 'completed=True') {
        throw "La recherche WUA ne s'est pas terminee : $summary"
    }
    Write-Host "Inventaire Windows Update : marqueurs + interface OK, recherche reelle -> $summary" -ForegroundColor Green
}
else {
    Write-Host "Inventaire Windows Update : marqueurs + interface OK (recherche reelle ignoree, exe absent)." -ForegroundColor Green
}
