$ErrorActionPreference = "Stop"

# Inventaire Windows Update (4.2 / beta.15) : lecture seule via l'API WUA.
# Vérifie les marqueurs de l'hôte + le câblage interface, et, si l'exécutable
# compilé est présent, exécute réellement la recherche par réflexion.

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
# La recherche WUA ne doit rien installer : pas de Download/Install dans ce module.
if ($native -match 'SearchWindowsUpdates[\s\S]{0,4000}?(CreateUpdateDownloader|CreateUpdateInstaller|\.Install\(\))') {
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
