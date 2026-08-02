$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Get-Content (Join-Path $root 'OwlSetupWebView.cs') -Raw

if ($source -notmatch 'bool PortableShortcutExists\(') {
    throw 'La détection des raccourcis portables existants est absente.'
}
if ($source -notmatch 'EnsurePortableShortcut\(id,name,preference,report\) && !shortcutAlreadyPresent') {
    throw 'La notification portable peut encore être envoyée pour un raccourci déjà présent.'
}
if ($source -notmatch 'preference!="none"') {
    throw 'Le mode sans raccourci peut encore déclencher une notification incorrecte.'
}

Write-Host 'OK - notification de raccourci portable non répétée au démarrage.'
