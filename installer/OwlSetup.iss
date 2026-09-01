#ifndef MyAppVersion
  #define MyAppVersion "4.0.0"
#endif

#define MyAppName "OwlSetup"
#define MyAppPublisher "OwlNetGeekFR"
#define MyAppURL "https://github.com/OwlNetGeekFR/OwlSetup"
#define MyAppExeName "OwlSetup.exe"

[Setup]
AppId={{1D90DDA3-3A2E-41E7-84A8-AF8E8F90F9F7}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases/latest
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
MinVersion=10.0.17763
OutputDir=..\artifacts\installer
OutputBaseFilename=OwlSetup-Setup
SetupIconFile=..\OwlSetup.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
LicenseFile=..\LICENSE
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ShowLanguageDialog=auto
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
ChangesEnvironment=no
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=Installateur officiel de {#MyAppName}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoCopyright=Copyright (C) 2026 {#MyAppPublisher}

; L'interface de l'application est traduite en anglais depuis la 4.0.0 ;
; l'assistant d'installation, lui, ne parlait que francais — c'est pourtant le
; PREMIER ecran que voit un nouvel utilisateur.
;
; ShowLanguageDialog=auto n'affiche le choix que si la langue du systeme ne
; correspond a aucune des deux. L'anglais est en tete : il sert alors de repli,
; ce qui vaut mieux que du francais pour un systeme allemand ou espagnol.
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

; Libelles propres a OwlSetup, dans les deux langues. Ecrits en dur, ils
; restaient francais meme pour un assistant anglais : un installateur a moitie
; traduit, ce que l'on evite partout ailleurs dans l'application.
[CustomMessages]
english.DesktopIcon=Create a desktop shortcut
french.DesktopIcon=Créer un raccourci sur le Bureau
english.ExtraShortcuts=Additional shortcuts:
french.ExtraShortcuts=Raccourcis supplémentaires :
english.AppComment=Install, update and maintain Windows
french.AppComment=Installer, mettre à jour et entretenir Windows
english.LaunchApp=Launch %1
french.LaunchApp=Lancer %1

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"; GroupDescription: "{cm:ExtraShortcuts}"; Flags: unchecked

[Files]
Source: "..\OwlSetup.exe"; DestDir: "{app}"; Flags: ignoreversion restartreplace

[Icons]
Name: "{userprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Comment: "{cm:AppComment}"
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon; Comment: "{cm:AppComment}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchApp,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
