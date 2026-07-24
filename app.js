const apps = [
  { id:"Google.Chrome", name:"Google Chrome", category:"Navigateurs", desc:"Navigateur rapide et sécurisé", icon:"CH", color:"#4285f4", site:"https://www.google.com/chrome/", tags:["essentiel"] },
  { id:"Mozilla.Firefox", name:"Mozilla Firefox", category:"Navigateurs", desc:"Navigateur libre et respectueux", icon:"FF", color:"#ff7139", site:"https://www.mozilla.org/firefox/new/" },
  { id:"Brave.Brave", name:"Brave", category:"Navigateurs", desc:"Navigation privée avec bloqueur intégré", icon:"BR", color:"#fb542b", site:"https://brave.com/download/" },
  { id:"Vivaldi.Vivaldi", name:"Vivaldi", category:"Navigateurs", desc:"Navigateur personnalisable avec outils intégrés", icon:"VI", color:"#ef3939", site:"https://vivaldi.com/download/", repairMode:"reinstall" },
  { id:"Opera.Opera", name:"Opera", category:"Navigateurs", desc:"Navigateur moderne avec VPN et outils intégrés", icon:"OP", color:"#e51d5f", site:"https://www.opera.com/download", repairMode:"reinstall" },
  { id:"Opera.OperaGX", name:"Opera GX", category:"Navigateurs", desc:"Navigateur conçu pour le gaming et le contrôle des ressources", icon:"GX", color:"#c728f2", site:"https://www.opera.com/gx", repairMode:"reinstall", tags:["gaming"] },
  { id:"LibreWolf.LibreWolf", name:"LibreWolf", category:"Navigateurs", desc:"Version renforcée de Firefox orientée confidentialité", icon:"LW", color:"#546f91", site:"https://librewolf.net/installation/windows/", repairMode:"reinstall" },
  { id:"Ablaze.Floorp", name:"Floorp", category:"Navigateurs", desc:"Navigateur Firefox personnalisable et respectueux de la vie privée", icon:"FL", color:"#4e7ce2", site:"https://floorp.app/download/", repairMode:"reinstall" },
  { id:"TorProject.TorBrowser", name:"Tor Browser", category:"Navigateurs", desc:"Navigation privée via le réseau Tor", icon:"TOR", color:"#7d4698", site:"https://www.torproject.org/download/", repairMode:"reinstall" },
  { id:"Waterfox.Waterfox", name:"Waterfox", category:"Navigateurs", desc:"Navigateur indépendant basé sur Firefox", icon:"WF", color:"#3d8fe7", site:"https://www.waterfox.net/download/", repairMode:"reinstall" },
  { id:"7zip.7zip", name:"7-Zip", category:"Utilitaires", desc:"Compression et extraction de fichiers", icon:"7z", color:"#596477", site:"https://www.7-zip.org/download.html", tags:["essentiel"] },
  { id:"VideoLAN.VLC", name:"VLC media player", category:"Multimédia", desc:"Lecteur audio et vidéo universel", icon:"▶", color:"#f08a24", site:"https://www.videolan.org/vlc/", tags:["essentiel"] },
  { id:"Notepad++.Notepad++", name:"Notepad++", category:"Utilitaires", desc:"Éditeur de texte rapide et léger", icon:"N+", color:"#72a13e", site:"https://notepad-plus-plus.org/downloads/", tags:["essentiel"] },
  { id:"SumatraPDF.SumatraPDF", name:"Sumatra PDF", category:"Bureautique", desc:"Lecteur PDF simple et très rapide", icon:"PDF", color:"#e8b536", site:"https://www.sumatrapdfreader.org/download-free-pdf-viewer", tags:["essentiel"] },
  { id:"TheDocumentFoundation.LibreOffice", name:"LibreOffice", category:"Bureautique", desc:"Suite bureautique complète et libre", icon:"LO", color:"#18a05e", site:"https://www.libreoffice.org/download/download-libreoffice/", tags:["essentiel"] },
  { id:"voidtools.Everything", name:"Everything", category:"Utilitaires", desc:"Recherche instantanée de fichiers", icon:"E", color:"#f2c94c", site:"https://www.voidtools.com/downloads/", tags:["essentiel"] },
  { id:"Microsoft.PowerToys", name:"Microsoft PowerToys", category:"Utilitaires", desc:"Outils avancés pour Windows", icon:"PT", color:"#4b7bec", site:"https://learn.microsoft.com/windows/powertoys/install", tags:["essentiel","dev"] },
  { id:"Discord.Discord", name:"Discord", category:"Communication", desc:"Messages, appels et communautés", icon:"DC", color:"#5865f2", site:"https://discord.com/download", tags:["gaming"] },
  { id:"Valve.Steam", name:"Steam", category:"Gaming", desc:"Bibliothèque et plateforme de jeux", icon:"ST", color:"#2775a8", site:"https://store.steampowered.com/about/", tags:["gaming"] },
  { id:"EpicGames.EpicGamesLauncher", name:"Epic Games", category:"Gaming", desc:"Launcher et boutique Epic Games", icon:"EP", color:"#3a3a3a", site:"https://store.epicgames.com/download", tags:["gaming"] },
  { id:"GOG.Galaxy", name:"GOG Galaxy", category:"Gaming", desc:"Bibliothèque de jeux sans DRM", icon:"GG", color:"#883edb", site:"https://www.gog.com/galaxy", tags:["gaming"] },
  { id:"Ubisoft.Connect", name:"Ubisoft Connect", category:"Gaming", desc:"Launcher des jeux Ubisoft", icon:"UC", color:"#149dda", site:"https://www.ubisoft.com/en-gb/ubisoft-connect/download", tags:["gaming"] },
  { id:"OBSProject.OBSStudio", name:"OBS Studio", category:"Multimédia", desc:"Enregistrement et streaming vidéo", icon:"OB", color:"#7e6bf2", site:"https://obsproject.com/download", tags:["gaming"] },
  { id:"Microsoft.VisualStudioCode", name:"Visual Studio Code", category:"Développement", desc:"Éditeur de code extensible", icon:"VS", color:"#168bd2", site:"https://code.visualstudio.com/download", tags:["dev"] },
  { id:"Git.Git", name:"Git", category:"Développement", desc:"Gestion de versions distribuée", icon:"G", color:"#f05032", site:"https://git-scm.com/download/win", tags:["dev"] },
  { id:"OpenJS.NodeJS.LTS", name:"Node.js LTS", category:"Composants", desc:"Runtime JavaScript longue durée", icon:"JS", color:"#68a063", site:"https://nodejs.org/en/download", tags:["dev"] },
  { id:"Python.Python.3.13", name:"Python 3", category:"Composants", desc:"Langage et environnement Python", icon:"PY", color:"#3776ab", site:"https://www.python.org/downloads/windows/", tags:["dev"] },
  { id:"Microsoft.DotNet.DesktopRuntime.8", name:".NET Desktop Runtime 8", category:"Composants", desc:"Composant pour applications .NET", icon:".N", color:"#6e4bc5", site:"https://dotnet.microsoft.com/en-us/download/dotnet/8.0", tags:["dev"] },
  { id:"Microsoft.VCRedist.2015+.x64", name:"Visual C++ Runtime", category:"Composants", desc:"Bibliothèques requises par de nombreux logiciels", icon:"C+", color:"#3675b5", site:"https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist", tags:["dev"] },
  { id:"Docker.DockerDesktop", name:"Docker Desktop", category:"Développement", desc:"Conteneurs et environnements isolés", icon:"DK", color:"#2496ed", site:"https://docs.docker.com/desktop/setup/install/windows-install/", tags:["dev"] },
  { id:"Postman.Postman", name:"Postman", category:"Développement", desc:"Conception et test d'API", icon:"PM", color:"#ff6c37", site:"https://www.postman.com/downloads/", tags:["dev"] },
  { id:"Microsoft.WindowsTerminal", name:"Windows Terminal", category:"Développement", desc:"Terminal moderne pour Windows", icon:">_", color:"#454d55", site:"https://learn.microsoft.com/windows/terminal/install", tags:["dev"] },
  { id:"Spotify.Spotify", name:"Spotify", category:"Multimédia", desc:"Musique, podcasts et playlists", icon:"SP", color:"#1db954", site:"https://www.spotify.com/download/windows/" },
  { id:"Zoom.Zoom", name:"Zoom", category:"Communication", desc:"Réunions et visioconférences", icon:"ZM", color:"#2d8cff", site:"https://zoom.us/download" },
  { id:"Bitwarden.Bitwarden", name:"Bitwarden", category:"Sécurité", desc:"Gestionnaire de mots de passe", icon:"BW", color:"#175ddc", site:"https://bitwarden.com/download/" },
  { id:"Malwarebytes.Malwarebytes", name:"Malwarebytes", category:"Sécurité", desc:"Analyse et suppression de menaces", icon:"MW", color:"#1675e0", site:"https://www.malwarebytes.com/mwb-download" },
  { id:"AnyDesk.AnyDesk", name:"AnyDesk", category:"Utilitaires", desc:"Accès à distance simple et sécurisé", icon:"AD", color:"#ef443b", site:"https://anydesk.com/en/downloads/windows" },
  { id:"RARLab.WinRAR", name:"WinRAR", category:"Utilitaires", desc:"Gestion d'archives compressées", icon:"WR", color:"#8a5db1", site:"https://www.win-rar.com/download.html" }
];

apps.push(
  {id:"qBittorrent.qBittorrent",name:"qBittorrent",category:"Internet",desc:"Client BitTorrent libre et sans publicité",icon:"qB",color:"#2f72b8",site:"https://www.qbittorrent.org/download",repairMode:"reinstall"},
  {id:"Rufus.Rufus",name:"Rufus",category:"Utilitaires",desc:"Création de clés USB démarrables · application portable",icon:"RF",color:"#e2c152",site:"https://rufus.ie/",repairMode:"reinstall",portable:true,launchable:true},
  {id:"CrystalDewWorld.CrystalDiskInfo",name:"CrystalDiskInfo",category:"Utilitaires",desc:"Santé et température des disques",icon:"DI",color:"#447ed0",site:"https://crystalmark.info/en/software/crystaldiskinfo/",repairMode:"reinstall"},
  {id:"CrystalDewWorld.CrystalDiskMark",name:"CrystalDiskMark",category:"Utilitaires",desc:"Mesure des performances des disques",icon:"DM",color:"#567bd4",site:"https://crystalmark.info/en/software/crystaldiskmark/",repairMode:"reinstall"},
  {id:"ShareX.ShareX",name:"ShareX",category:"Utilitaires",desc:"Captures d'écran et outils de partage",icon:"SX",color:"#2f9ca8",site:"https://getsharex.com/",repairMode:"reinstall"},
  {id:"M2Team.NanaZip",name:"NanaZip",category:"Utilitaires",desc:"Gestion moderne des archives Windows",icon:"NZ",color:"#526fc4",site:"https://github.com/M2Team/NanaZip",repairMode:"reinstall"},
  {id:"JAMSoftware.TreeSize.Free",name:"TreeSize Free",category:"Utilitaires",desc:"Analyse visuelle de l'espace disque",icon:"TS",color:"#50a05a",site:"https://www.jam-software.com/treesize_free",repairMode:"reinstall"},
  {id:"Klocman.BulkCrapUninstaller",name:"Bulk Crap Uninstaller",category:"Utilitaires",desc:"Désinstallation avancée et groupée",icon:"BC",color:"#8b68c9",site:"https://www.bcuninstaller.com/",repairMode:"reinstall"},
  {id:"KeePassXCTeam.KeePassXC",name:"KeePassXC",category:"Sécurité",desc:"Gestionnaire de mots de passe local",icon:"KX",color:"#6a9e3d",site:"https://keepassxc.org/download/",repairMode:"reinstall"},
  {id:"GIMP.GIMP.3",name:"GIMP",category:"Création",desc:"Retouche et création d'images",icon:"GI",color:"#786753",site:"https://www.gimp.org/downloads/",repairMode:"reinstall"},
  {id:"KDE.Krita",name:"Krita",category:"Création",desc:"Dessin et peinture numérique",icon:"KR",color:"#8d56c7",site:"https://krita.org/en/download/",repairMode:"reinstall"},
  {id:"Audacity.Audacity",name:"Audacity",category:"Multimédia",desc:"Enregistrement et montage audio",icon:"AU",color:"#3158c7",site:"https://www.audacityteam.org/download/windows/",repairMode:"reinstall"},
  {id:"HandBrake.HandBrake",name:"HandBrake",category:"Multimédia",desc:"Conversion et compression vidéo",icon:"HB",color:"#67a33f",site:"https://handbrake.fr/downloads.php",repairMode:"reinstall"},
  {id:"KDE.Kdenlive",name:"Kdenlive",category:"Création",desc:"Montage vidéo libre et complet",icon:"KD",color:"#4e83b8",site:"https://kdenlive.org/download/",repairMode:"reinstall"},
  {id:"BlenderFoundation.Blender",name:"Blender",category:"Création",desc:"Création 3D, animation et rendu",icon:"BL",color:"#e57932",site:"https://www.blender.org/download/",repairMode:"reinstall"},
  {id:"calibre.calibre",name:"Calibre",category:"Bureautique",desc:"Bibliothèque et conversion de livres numériques",icon:"CA",color:"#66a950",site:"https://calibre-ebook.com/download_windows",repairMode:"reinstall"},
  {id:"Mozilla.Thunderbird",name:"Mozilla Thunderbird",category:"Communication",desc:"Messagerie électronique libre",icon:"TB",color:"#4b73d0",site:"https://www.thunderbird.net/",repairMode:"reinstall"},
  {id:"Nextcloud.NextcloudDesktop",name:"Nextcloud",category:"Communication",desc:"Synchronisation avec un cloud personnel",icon:"NC",color:"#0082c9",site:"https://nextcloud.com/install/#install-clients",repairMode:"reinstall"},
  {id:"Tailscale.Tailscale",name:"Tailscale",category:"Sécurité",desc:"Réseau privé simple basé sur WireGuard",icon:"TL",color:"#626b78",site:"https://tailscale.com/download/windows",repairMode:"reinstall"},
  {id:"WireGuard.WireGuard",name:"WireGuard",category:"Sécurité",desc:"Client VPN moderne et léger",icon:"WG",color:"#a43b42",site:"https://www.wireguard.com/install/",repairMode:"reinstall"},
  {id:"guided.RustDesk",name:"RustDesk",category:"Communication",desc:"Contrôle à distance libre · installation guidée",icon:"RD",color:"#e34a50",site:"https://rustdesk.com/",manualInstallUrl:"https://github.com/rustdesk/rustdesk/releases/latest",manualInstall:true,repairMode:"reinstall"},
  {id:"TeamViewer.TeamViewer",name:"TeamViewer",category:"Communication",desc:"Assistance et contrôle à distance",icon:"TV",color:"#1677d2",site:"https://www.teamviewer.com/download/windows/",repairMode:"reinstall"},
  {id:"GitHub.GitHubDesktop",name:"GitHub Desktop",category:"Développement",desc:"Client graphique officiel pour GitHub",icon:"GH",color:"#6d5ac5",site:"https://desktop.github.com/download/",tags:["dev"],repairMode:"reinstall"},
  {id:"DBeaver.DBeaver.Community",name:"DBeaver Community",category:"Développement",desc:"Gestion universelle de bases de données",icon:"DB",color:"#70533e",site:"https://dbeaver.io/download/",tags:["dev"],repairMode:"reinstall"},
  {id:"JetBrains.Toolbox",name:"JetBrains Toolbox",category:"Développement",desc:"Gestionnaire des outils JetBrains",icon:"JB",color:"#e34d80",site:"https://www.jetbrains.com/toolbox-app/",tags:["dev"],repairMode:"reinstall"},
  {id:"WinSCP.WinSCP",name:"WinSCP",category:"Développement",desc:"Transfert sécurisé de fichiers SFTP",icon:"WS",color:"#61a841",site:"https://winscp.net/eng/download.php",tags:["dev"],repairMode:"reinstall"},
  {id:"PuTTY.PuTTY",name:"PuTTY",category:"Développement",desc:"Client SSH et terminal distant",icon:"PT",color:"#4d8bc3",site:"https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html",tags:["dev"],repairMode:"reinstall"},
  {id:"guided.FileZillaClient",name:"FileZilla Client",category:"Internet",desc:"Transfert de fichiers FTP et SFTP · installation guidée",icon:"FZ",color:"#b93434",site:"https://filezilla-project.org/download.php",manualInstallUrl:"https://filezilla-project.org/download.php?type=client",manualInstall:true,repairMode:"reinstall"},
  {id:"EclipseAdoptium.Temurin.21.JDK",name:"Java Temurin 21 JDK",category:"Composants",desc:"Environnement Java libre et maintenu",icon:"JV",color:"#e07235",site:"https://adoptium.net/temurin/releases/",tags:["dev"],repairMode:"reinstall"},
  {id:"GoLang.Go",name:"Go",category:"Développement",desc:"Langage Go et ses outils",icon:"GO",color:"#18a8c5",site:"https://go.dev/dl/",tags:["dev"],repairMode:"reinstall"},
  {id:"Rustlang.Rustup",name:"Rustup",category:"Développement",desc:"Installation et gestion du langage Rust",icon:"RS",color:"#b35f38",site:"https://rustup.rs/",tags:["dev"],repairMode:"reinstall"},
  {id:"ElectronicArts.EADesktop",name:"EA app",category:"Gaming",desc:"Bibliothèque et jeux Electronic Arts",icon:"EA",color:"#db3939",site:"https://www.ea.com/ea-app",tags:["gaming"],repairMode:"reinstall"},
  {id:"Blizzard.BattleNet",name:"Battle.net",category:"Gaming",desc:"Lanceur des jeux Blizzard",icon:"BN",color:"#228bd2",site:"https://download.battle.net/",tags:["gaming"],repairMode:"reinstall"},
  {id:"Playnite.Playnite",name:"Playnite",category:"Gaming",desc:"Bibliothèque unifiée de jeux vidéo",icon:"PN",color:"#36a0d5",site:"https://playnite.link/download.html",tags:["gaming"],repairMode:"reinstall"},
  {id:"HeroicGamesLauncher.HeroicGamesLauncher",name:"Heroic Games Launcher",category:"Gaming",desc:"Lanceur libre pour Epic et GOG",icon:"HG",color:"#7757d8",site:"https://heroicgameslauncher.com/",tags:["gaming"],repairMode:"reinstall"},
  {id:"Amazon.Games",name:"Amazon Games",category:"Gaming",desc:"Lanceur de jeux Amazon",icon:"AG",color:"#4b83c3",site:"https://www.amazongames.com/en-us/support/prime-gaming/articles/download-and-install-the-amazon-games-app",tags:["gaming"],repairMode:"reinstall"},
  {id:"Overwolf.CurseForge",name:"CurseForge",category:"Gaming",desc:"Gestion des mods de jeux",icon:"CF",color:"#ef6c35",site:"https://www.curseforge.com/download/app",tags:["gaming"],repairMode:"reinstall"},
  {id:"Oracle.VirtualBox",name:"Oracle VirtualBox",category:"Virtualisation",desc:"Machines virtuelles multiplateformes",icon:"VB",color:"#3276a8",site:"https://www.virtualbox.org/wiki/Downloads",repairMode:"reinstall"},
  {id:"VMware.WorkstationPro",name:"VMware Workstation Pro",category:"Virtualisation",desc:"Compte Broadcom gratuit requis · installation guidée",icon:"VM",color:"#e38b35",site:"https://knowledge.broadcom.com/external/article/368667/download-and-license-vmware-desktop-hype.html",manualInstallUrl:"https://support.broadcom.com/group/ecx/productdownloads?subfamily=VMware%20Workstation%20Pro&freeDownloads=true",manualInstall:true,repairMode:"reinstall"},
  {id:"Microsoft.WSL",name:"Windows Subsystem for Linux",category:"Virtualisation",desc:"Environnement Linux intégré à Windows",icon:"WSL",color:"#5c7894",site:"https://learn.microsoft.com/windows/wsl/install",repairMode:"reinstall"},
  {id:"9NT1R1C2HH7J",name:"ChatGPT",category:"Intelligence artificielle",desc:"Application officielle OpenAI · compte en ligne requis",icon:"AI",color:"#10a37f",site:"https://openai.com/chatgpt/desktop/",source:"msstore",repairMode:"reinstall"},
  {id:"Anthropic.Claude",name:"Claude",category:"Intelligence artificielle",desc:"Assistant IA officiel d’Anthropic · compte en ligne requis",icon:"CL",color:"#d97757",site:"https://claude.ai/download",repairMode:"reinstall"},
  {id:"Ollama.Ollama",name:"Ollama",category:"Intelligence artificielle",desc:"Exécute des modèles d’IA localement sur votre PC",icon:"OL",color:"#4d5562",site:"https://ollama.com/download/windows",repairMode:"reinstall"},
  {id:"ElementLabs.LMStudio",name:"LM Studio",category:"Intelligence artificielle",desc:"Télécharge et utilise des modèles d’IA locaux avec une interface graphique",icon:"LM",color:"#6c63ff",site:"https://lmstudio.ai/download",repairMode:"reinstall"},
  {id:"Jan.Jan",name:"Jan",category:"Intelligence artificielle",desc:"Assistant IA local et open source respectueux de la vie privée",icon:"JN",color:"#4f8cff",site:"https://jan.ai/",repairMode:"reinstall"},
  {id:"web.GoogleGemini",name:"Google Gemini",category:"Intelligence artificielle",desc:"Assistant IA de Google · service Web",icon:"GE",color:"#4f7df3",site:"https://gemini.google.com/",manualInstallUrl:"https://gemini.google.com/",manualInstall:true,webService:true},
  {id:"web.MicrosoftCopilot",name:"Microsoft Copilot",category:"Intelligence artificielle",desc:"Assistant IA de Microsoft · service Web",icon:"CO",color:"#27a8a5",site:"https://copilot.microsoft.com/",manualInstallUrl:"https://copilot.microsoft.com/",manualInstall:true,webService:true},
  {id:"web.Perplexity",name:"Perplexity",category:"Intelligence artificielle",desc:"Moteur de réponse et de recherche assisté par IA · service Web",icon:"PX",color:"#218f8c",site:"https://www.perplexity.ai/",manualInstallUrl:"https://www.perplexity.ai/",manualInstall:true,webService:true},
  {id:"web.MistralLeChat",name:"Mistral Le Chat",category:"Intelligence artificielle",desc:"Assistant conversationnel de Mistral AI · service Web",icon:"MI",color:"#ff7b22",site:"https://chat.mistral.ai/",manualInstallUrl:"https://chat.mistral.ai/",manualInstall:true,webService:true},
  {id:"guided.AnythingLLM",name:"AnythingLLM",category:"Intelligence artificielle",desc:"Espace de travail IA local avec documents et agents · installation guidée",icon:"AL",color:"#2f6fed",site:"https://anythingllm.com/desktop",manualInstallUrl:"https://anythingllm.com/desktop",manualInstall:true},
  {id:"guided.GPT4All",name:"GPT4All",category:"Intelligence artificielle",desc:"Assistant privé utilisant des modèles locaux · installation guidée",icon:"G4",color:"#6e5bd5",site:"https://www.nomic.ai/gpt4all",manualInstallUrl:"https://www.nomic.ai/gpt4all",manualInstall:true},
  {id:"guided.Pinokio",name:"Pinokio",category:"Intelligence artificielle",desc:"Installe et lance des projets IA locaux · installation guidée",icon:"PI",color:"#e34b51",site:"https://pinokio.computer/",manualInstallUrl:"https://pinokio.computer/",manualInstall:true},
  {id:"guided.NVIDIAChatRTX",name:"NVIDIA ChatRTX",category:"Intelligence artificielle",desc:"Assistant local optimisé pour les cartes NVIDIA RTX · compatibilité à vérifier",icon:"NV",color:"#76b900",site:"https://www.nvidia.com/en-us/ai-on-rtx/chatrtx/",manualInstallUrl:"https://www.nvidia.com/en-us/ai-on-rtx/chatrtx/",manualInstall:true},
  {id:"guided.StabilityMatrix",name:"Stability Matrix",category:"Intelligence artificielle",desc:"Gestionnaire d’outils de génération d’images locale · installation guidée",icon:"SM",color:"#8547d6",site:"https://lykos.ai/",manualInstallUrl:"https://github.com/LykosAI/StabilityMatrix/releases/latest",manualInstall:true},
  {id:"Comfy.ComfyUI-Desktop",name:"ComfyUI Desktop",category:"Intelligence artificielle",desc:"Création d’images par IA avec workflows visuels",icon:"CU",color:"#2672d9",site:"https://www.comfy.org/download",repairMode:"reinstall"}
);

if (Array.isArray(window.PC_SETUP_CATALOG) && window.PC_SETUP_CATALOG.length) {
  apps.splice(0, apps.length, ...window.PC_SETUP_CATALOG);
}

const appLogos = {
  "Google.Chrome":"googlechrome.svg", "Mozilla.Firefox":"firefox.svg", "Brave.Brave":"brave.svg",
  "Vivaldi.Vivaldi":"vivaldi.svg", "Opera.Opera":"opera.svg", "Opera.OperaGX":"operagx.svg",
  "LibreWolf.LibreWolf":"librewolf.svg", "Ablaze.Floorp":"floorp.svg",
  "TorProject.TorBrowser":"torbrowser.svg", "Waterfox.Waterfox":"waterfox.svg",
  "7zip.7zip":"sevenzip.svg", "VideoLAN.VLC":"vlc.svg", "Notepad++.Notepad++":"notepadpp.svg",
  "SumatraPDF.SumatraPDF":"sumatrapdf.ico", "TheDocumentFoundation.LibreOffice":"libreoffice.svg",
  "voidtools.Everything":"everything.ico", "Microsoft.PowerToys":"powertoys.png", "Discord.Discord":"discord.svg",
  "Valve.Steam":"steam.svg", "EpicGames.EpicGamesLauncher":"epicgames.svg", "GOG.Galaxy":"gog.svg",
  "Ubisoft.Connect":"ubisoft.svg", "OBSProject.OBSStudio":"obs.svg",
  "Microsoft.VisualStudioCode":"vscode.svg", "Git.Git":"git.svg", "OpenJS.NodeJS.LTS":"nodejs.svg",
  "Python.Python.3.13":"python.svg", "Microsoft.DotNet.DesktopRuntime.8":"dotnet.svg",
  "Microsoft.VCRedist.2015+.x64":"cplusplus.svg", "Docker.DockerDesktop":"docker.svg",
  "Postman.Postman":"postman.svg", "Microsoft.WindowsTerminal":"terminal.svg", "Spotify.Spotify":"spotify.svg",
  "Zoom.Zoom":"zoom.svg", "Bitwarden.Bitwarden":"bitwarden.svg", "Malwarebytes.Malwarebytes":"malwarebytes.svg",
  "AnyDesk.AnyDesk":"anydesk.svg", "RARLab.WinRAR":"winrar.ico",
  "qBittorrent.qBittorrent":"qbittorrent.svg", "Rufus.Rufus":"rufus.png",
  "CrystalDewWorld.CrystalDiskInfo":"crystaldiskinfo.png", "CrystalDewWorld.CrystalDiskMark":"crystaldiskmark.png",
  "ShareX.ShareX":"sharex.svg", "M2Team.NanaZip":"nanazip.png", "JAMSoftware.TreeSize.Free":"treesize.png",
  "Klocman.BulkCrapUninstaller":"bcu.ico", "KeePassXCTeam.KeePassXC":"keepassxc.svg",
  "GIMP.GIMP.3":"gimp.svg", "KDE.Krita":"krita.svg", "Audacity.Audacity":"audacity.svg",
  "HandBrake.HandBrake":"handbrake.png", "KDE.Kdenlive":"kdenlive.svg",
  "BlenderFoundation.Blender":"blender.svg", "calibre.calibre":"calibre.png",
  "Mozilla.Thunderbird":"thunderbird.svg", "Nextcloud.NextcloudDesktop":"nextcloud.svg",
  "Tailscale.Tailscale":"tailscale.svg", "WireGuard.WireGuard":"wireguard.svg",
  "guided.RustDesk":"rustdesk.svg", "TeamViewer.TeamViewer":"teamviewer.svg",
  "GitHub.GitHubDesktop":"githubdesktop.svg", "DBeaver.DBeaver.Community":"dbeaver.svg",
  "JetBrains.Toolbox":"jetbrains.svg", "WinSCP.WinSCP":"winscp.png", "PuTTY.PuTTY":"putty.svg",
  "guided.FileZillaClient":"filezilla.svg", "EclipseAdoptium.Temurin.21.JDK":"temurin.svg",
  "GoLang.Go":"golang.svg", "Rustlang.Rustup":"rustup.svg", "ElectronicArts.EADesktop":"ea.svg",
  "Blizzard.BattleNet":"battlenet.svg", "Playnite.Playnite":"playnite.svg",
  "HeroicGamesLauncher.HeroicGamesLauncher":"heroic.svg", "Amazon.Games":"amazongames.png",
  "Overwolf.CurseForge":"curseforge.svg", "Oracle.VirtualBox":"virtualbox.svg",
  "VMware.WorkstationPro":"vmware.svg", "Microsoft.WSL":"wsl.svg",
  "9NT1R1C2HH7J":"openai.svg", "Anthropic.Claude":"claude.svg",
  "Ollama.Ollama":"ollama.svg", "ElementLabs.LMStudio":"lmstudio.svg", "Jan.Jan":"jan.svg",
  "web.GoogleGemini":"gemini.svg", "web.MicrosoftCopilot":"copilot.svg", "web.Perplexity":"perplexity.svg",
  "web.MistralLeChat":"mistral.svg", "guided.AnythingLLM":"anythingllm.svg", "guided.GPT4All":"gpt4all.svg",
  "guided.Pinokio":"pinokio.svg", "guided.NVIDIAChatRTX":"nvidia.svg",
  "guided.StabilityMatrix":"stabilitymatrix.svg", "Comfy.ComfyUI-Desktop":"comfyui.svg"
};
apps.forEach(app => app.logo = app.logo || (appLogos[app.id] ? `assets/logos/${appLogos[app.id]}` : ""));

const customPackagesStorageKey = "owlsetup-custom-packages-v1";
const isValidPackageId = id => typeof id === "string" && /^[A-Za-z0-9.+_-]+$/.test(id);

function addCustomAppDefinition(id, persist = true) {
  if (!isValidPackageId(id)) return false;
  if (!apps.some(app => app.id.toLocaleLowerCase() === id.toLocaleLowerCase())) {
    apps.push({id,name:id,category:"Personnalisé",desc:"Paquet ajouté manuellement par identifiant WinGet",icon:"+",color:"#4677c9",site:"https://learn.microsoft.com/windows/package-manager/winget/search",repairMode:"reinstall",custom:true});
  }
  if (persist) {
    const ids = apps.filter(app => app.custom && isValidPackageId(app.id)).map(app => app.id);
    localStorage.setItem(customPackagesStorageKey, JSON.stringify([...new Set(ids)]));
  }
  return true;
}

try {
  const storedCustomPackages = JSON.parse(localStorage.getItem(customPackagesStorageKey) || "[]");
  if (Array.isArray(storedCustomPackages)) storedCustomPackages.filter(isValidPackageId).slice(0, 100).forEach(id => addCustomAppDefinition(id, false));
} catch {
  localStorage.removeItem(customPackagesStorageKey);
}

const categories = ["Tout", "Installés", ...new Set(apps.map(app => app.category))];
document.querySelector("#homeCatalogCount").textContent = apps.length;
let selected;
try {
  const storedSelection = JSON.parse(localStorage.getItem("pcsetup-selection") || "[]");
  selected = new Set((Array.isArray(storedSelection) ? storedSelection : []).filter(id => typeof id === "string" && /^[A-Za-z0-9.+_-]+$/.test(id)));
} catch {
  selected = new Set();
  localStorage.removeItem("pcsetup-selection");
}
apps.filter(app => app.manualInstall).forEach(app => selected.delete(app.id));
let installedApps = new Set();
let managedInstalled = new Set();
let pendingUninstallId = null;
let pendingUninstallResidueToken = "";
let pendingRepairId = null;
let pendingBatchUninstall = [];
let pendingBatchResidueToken = "";
let pendingCleanupChoices = [];
let lastFailedInstallPackages = [];
let lastInstallReportName = "";
let installPreflightRequestId = 0;
let availableUpdates = [];
let selectedUpdates = new Set();
let appUpdateReleasePage = "https://github.com/OwlNetGeekFR/OwlSetup/releases/latest";
let currentBuildVersion = "inconnue";
let currentBuildChannel = "stable";
let feedbackDiagnostics = "Non généré";
let updatesLoaded = false;
let activeCategory = "Tout";
let searchTerm = "";
let installedSearchTerm = "";
let installedSortMode = "name";
const onboardingStorageKey = "owlsetup-onboarding-completed-v1";
let onboardingStep = 0;
let onboardingPreviousFocus = null;
const notificationStorageKey = "owlsetup-notifications-v2";
let notificationFeed = [];
let currentInstallRun = "";
let currentUninstallRun = "";
let activeUninstallMode = "";
let currentReportName = "";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);

const icon = app => `<span class="app-icon" style="--app:${escapeHtml(app.color)}">${app.logo ? `<img src="${escapeHtml(app.logo)}" alt="" loading="lazy" data-image-fallback="${escapeHtml(app.icon)}"><span class="app-icon-fallback" hidden>${escapeHtml(app.icon)}</span>` : `<span class="app-icon-fallback">${escapeHtml(app.icon)}</span>`}</span>`;
const save = () => localStorage.setItem("pcsetup-selection", JSON.stringify([...selected]));

function setNavAlert(selector, value, warning = false) {
  const badge = $(selector);
  if (!badge) return;
  const visible = value !== null && value !== undefined && value !== "" && Number(value) !== 0;
  badge.classList.toggle("hidden", !visible);
  badge.classList.toggle("warning", visible && warning);
  if (visible) badge.textContent = String(value);
}

function notify(title, detail) {
  $("#toastTitle").textContent = title;
  $("#toastText").textContent = detail;
  $("#toast").classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2600);
}

function loadNotificationFeed() {
  try {
    const stored = JSON.parse(localStorage.getItem(notificationStorageKey) || "[]");
    notificationFeed = Array.isArray(stored) ? stored.slice(0, 40) : [];
  } catch { notificationFeed = []; }
  renderNotificationFeed();
}

function saveNotificationFeed() {
  localStorage.setItem(notificationStorageKey, JSON.stringify(notificationFeed.slice(0, 40)));
}

function addNotification({key, title, detail, kind = "info", action = "", symbol = "i"}) {
  const id = key || `${Date.now()}-${Math.random()}`;
  const previous = notificationFeed.find(item => item.key === id);
  const item = {key:id, title, detail, kind, action, symbol, unread:true, createdAt:new Date().toISOString()};
  notificationFeed = [item, ...notificationFeed.filter(entry => entry.key !== id)].slice(0, 40);
  if (previous && previous.title === title && previous.detail === detail && previous.unread) item.createdAt = previous.createdAt;
  saveNotificationFeed();
  renderNotificationFeed();
}

function renderNotificationFeed() {
  const list = $("#notificationList");
  if (!list) return;
  const unread = notificationFeed.filter(item => item.unread).length;
  const count = $("#notificationCount");
  const clearButton = $("#clearNotifications");
  count.textContent = unread > 99 ? "99+" : String(unread);
  count.classList.toggle("hidden", unread === 0);
  clearButton.disabled = unread === 0;
  clearButton.textContent = unread === 0 ? "Tout est lu" : "Tout marquer comme lu";
  $("#appUpdateNotification").classList.toggle("available", unread > 0);
  setNavAlert("#troubleshootingNavBadge", notificationFeed.filter(item => item.unread && item.kind === "warning").length, true);
  if (!notificationFeed.length) {
    list.innerHTML = `<div class="notification-empty"><span>✓</span><strong>Tout est calme</strong><small>Les mises à jour et installations apparaîtront ici.</small></div>`;
    return;
  }
  list.innerHTML = notificationFeed.map(item => {
    const date = new Date(item.createdAt);
    const time = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("fr-FR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"});
    const kind = ["info", "success", "warning", "error"].includes(item.kind) ? item.kind : "info";
    return `<article class="notification-item ${kind} ${item.unread ? "unread" : ""}" data-notification-key="${escapeHtml(item.key)}" data-notification-action="${escapeHtml(item.action)}"><span class="notification-symbol">${escapeHtml(item.symbol)}</span><span class="notification-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small><time>${time}</time></span>${item.unread ? `<i class="notification-dot"></i>` : ""}</article>`;
  }).join("");
}

function toggleNotificationCenter(force) {
  const center = $("#notificationCenter");
  const open = typeof force === "boolean" ? force : center.classList.contains("hidden");
  center.classList.toggle("hidden", !open);
}

function setBackgroundInstall(title, detail, percent, state = "running") {
  const dock = $("#backgroundInstall");
  dock.classList.remove("hidden", "complete", "warning");
  if (state !== "running") dock.classList.add(state);
  $("#backgroundInstallTitle").textContent = title;
  $("#backgroundInstallDetail").textContent = detail;
  $("#backgroundInstallPercent").textContent = `${percent}%`;
  $("#backgroundInstallBar").style.width = `${percent}%`;
  $("#showInstallProgress").textContent = state === "running" ? "Afficher" : "Voir le résultat";
}

function minimizeInstallProgress() {
  if ($("#installModal").dataset.running !== "true") return;
  $("#installModal").classList.add("hidden");
  notify("Installation en arrière-plan", "Vous pouvez continuer à utiliser OwlSetup et rouvrir la progression à tout moment.");
}

function setBackgroundUninstall(title, detail, percent, state = "running") {
  const dock = $("#backgroundUninstall");
  dock.classList.remove("hidden", "complete", "warning");
  if (state !== "running") dock.classList.add(state);
  $("#backgroundUninstallTitle").textContent = title;
  $("#backgroundUninstallDetail").textContent = detail;
  $("#backgroundUninstallPercent").textContent = `${percent}%`;
  $("#backgroundUninstallBar").style.width = `${percent}%`;
  $("#showUninstallProgress").textContent = state === "running" ? "Afficher" : "Voir le résultat";
}

function activeUninstallModal() {
  return activeUninstallMode === "batch" ? $("#batchUninstallModal") : $("#uninstallModal");
}

function minimizeUninstallProgress(mode = activeUninstallMode) {
  const modal = mode === "batch" ? $("#batchUninstallModal") : $("#uninstallModal");
  if (modal.dataset.running !== "true") return;
  activeUninstallMode = mode;
  modal.classList.add("hidden");
  notify("Désinstallation en arrière-plan", "Vous pouvez continuer à utiliser OwlSetup et rouvrir la progression à tout moment.");
}

function showUninstallProgress() {
  if (!activeUninstallMode) return;
  activeUninstallModal().classList.remove("hidden");
}

function openReportViewer(name) {
  if (!window.chrome?.webview || !name) return;
  currentReportName = name;
  $("#reportViewerTitle").textContent = "Chargement du rapport...";
  $("#reportItems").innerHTML = `<div class="notification-empty"><span>↻</span><strong>Lecture du rapport</strong><small>Préparation de la présentation...</small></div>`;
  $("#reportModal").classList.remove("hidden");
  window.chrome.webview.postMessage({action:"open-report", payload:{name}});
}

function closeReportViewer() {
  $("#reportModal").classList.add("hidden");
}

function renderReportViewer(message) {
  const report = message.report || {};
  const summary = report.summary || {};
  const items = Array.isArray(report.items) ? report.items : [];
  const success = Number(summary.success || 0);
  const failed = Number(summary.failed || 0);
  const total = Number(summary.total ?? items.length);
  const operationNames = {installation:"Installation", desinstallation:"Désinstallation", reparation:"Réparation", nettoyage:"Nettoyage", update:"Mise à jour"};
  const operation = operationNames[report.operation] || "Opération";
  const date = new Date(report.createdAtUtc);
  currentReportName = message.name || currentReportName;
  $("#reportViewerTitle").textContent = `Rapport d’${operation.toLocaleLowerCase("fr-FR")}`;
  $("#reportHero").classList.toggle("warning", failed > 0);
  $("#reportHeroIcon").textContent = failed > 0 ? "!" : "✓";
  $("#reportHeroTitle").textContent = failed > 0 ? `${operation} terminée avec vérifications` : `${operation} réussie`;
  $("#reportHeroDetail").textContent = failed > 0 ? `${failed} élément(s) nécessitent votre attention.` : "Tous les éléments ont été traités correctement.";
  $("#reportSuccessCount").textContent = String(success);
  $("#reportFailedCount").textContent = String(failed);
  $("#reportTotalCount").textContent = String(total);
  $("#reportFileName").textContent = currentReportName;
  const environment = report.environment || {};
  $("#reportMeta").innerHTML = `<span>Date <b>${Number.isNaN(date.getTime()) ? "Inconnue" : date.toLocaleString("fr-FR")}</b></span><span>Version <b>${escapeHtml(report.owlSetupVersion || "—")}</b></span><span>Canal <b>${escapeHtml(report.channel || "—")}</b></span><span>Windows <b>${escapeHtml(environment.architecture || "—")}</b></span>`;
  $("#reportItems").innerHTML = items.length ? items.map(item => {
    const app = apps.find(entry => entry.id === item.id);
    const appVisual = app?.logo ? `<img src="${escapeHtml(app.logo)}" alt="" data-image-fallback="${escapeHtml(app.icon || "APP")}">` : escapeHtml(app?.icon || "APP");
    const ok = item.success === true;
    return `<article class="report-item"><span class="report-item-icon" style="${app ? `background:${escapeHtml(app.color)}22;color:${escapeHtml(app.color)}` : ""}">${appVisual}</span><span><strong>${escapeHtml(item.name || app?.name || item.id || "Application")}</strong><small>${escapeHtml(item.message || (ok ? "Opération réussie" : `Code de sortie : ${item.code ?? "inconnu"}`))}</small></span><b class="report-result ${ok ? "" : "failed"}">${ok ? "RÉUSSI" : "À VÉRIFIER"}</b></article>`;
  }).join("") : `<div class="notification-empty"><span>i</span><strong>Aucun détail disponible</strong><small>Le résumé général reste valide.</small></div>`;
}

function renderFilters() {
  $("#filters").innerHTML = categories.map(c => `<button class="filter ${c === activeCategory ? "active" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
}

function renderApps() {
  const query = searchTerm.toLocaleLowerCase("fr");
  const visible = apps.filter(app => (activeCategory === "Tout" || (activeCategory === "Installés" ? installedApps.has(app.id) : app.category === activeCategory)) && `${app.name} ${app.desc} ${app.category}`.toLocaleLowerCase("fr").includes(query));
  $("#resultCount").textContent = `${visible.length} logiciel${visible.length > 1 ? "s" : ""}`;
  $("#appGrid").innerHTML = visible.map(app => `
    <article class="app-card ${selected.has(app.id) ? "selected" : ""} ${installedApps.has(app.id) ? "installed" : ""} ${managedInstalled.has(app.id) ? "managed-selected" : ""} ${app.manualInstall ? "manual-install" : ""}" data-app="${escapeHtml(app.id)}" tabindex="0" aria-label="${escapeHtml(app.name)}${managedInstalled.has(app.id) ? ", sélectionné pour désinstallation" : ""}">
      ${icon(app)}<span class="app-copy"><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.desc)}</small><span class="app-footer"><em>${escapeHtml(app.category)}</em><a class="official-link" href="${escapeHtml(app.site)}" target="_blank" rel="noopener" title="Ouvrir le site officiel de ${escapeHtml(app.name)}">Site officiel ↗</a></span></span>
      ${installedApps.has(app.id) ? `<span class="installed-actions"><button class="manage-icon ${managedInstalled.has(app.id) ? "active" : ""}" data-manage-installed="${escapeHtml(app.id)}" aria-pressed="${managedInstalled.has(app.id)}" title="Sélectionner pour une désinstallation groupée">${managedInstalled.has(app.id) ? "✓" : "□"}</button><button class="repair-icon" data-repair="${escapeHtml(app.id)}" title="Réparer ${escapeHtml(app.name)}">⚙</button><button class="uninstall-icon" data-uninstall="${escapeHtml(app.id)}" title="Désinstaller ${escapeHtml(app.name)}">×</button></span><span class="repair-capability">${app.repairMode === "native" ? "Réparation native" : "Réinstallation réparatrice"}</span><span class="installed-badge">✓ Installé</span>` : app.manualInstall ? `<span class="manual-install-badge">${app.webService ? "Service Web" : "Installation guidée"}</span><span class="add-icon">↗</span>` : `<span class="add-icon">${selected.has(app.id) ? "✓" : "+"}</span>`}
    </article>`).join("");
  $("#emptyState").classList.toggle("hidden", visible.length !== 0);
  $("#installedManager").classList.toggle("hidden", installedApps.size === 0);
  $("#managedCount").textContent = `${managedInstalled.size} logiciel${managedInstalled.size > 1 ? "s" : ""} sélectionné${managedInstalled.size > 1 ? "s" : ""}`;
  $("#batchUninstallBtn").disabled = managedInstalled.size === 0;
  $("#clearInstalledSelection").disabled = managedInstalled.size === 0;
  $(".results-line span:last-child").textContent = activeCategory === "Installés" ? "Cliquez sur une carte pour la sélectionner à désinstaller" : "Cliquez sur une carte pour l'ajouter";
  renderInstalledPage();
}

function renderOnboarding() {
  const slides = [...document.querySelectorAll("[data-onboarding-step]")];
  slides.forEach((slide,index) => slide.classList.toggle("active", index === onboardingStep));
  $("#onboardingDots").innerHTML = slides.map((_,index) => `<button class="${index === onboardingStep ? "active" : ""}" data-onboarding-dot="${index}" aria-label="Étape ${index + 1}" aria-current="${index === onboardingStep ? "step" : "false"}"></button>`).join("");
  $("#onboardingProgress").style.width = `${(onboardingStep + 1) / slides.length * 100}%`;
  $("#previousOnboarding").disabled = onboardingStep === 0;
  $("#nextOnboarding").innerHTML = onboardingStep === slides.length - 1 ? `Découvrir OwlSetup <span>✓</span>` : `${onboardingStep === 0 ? "Commencer" : "Suivant"} <span>→</span>`;
}

function openOnboarding(force = false) {
  if (!force && localStorage.getItem(onboardingStorageKey) === "true") return;
  onboardingPreviousFocus = document.activeElement;
  onboardingStep = 0;
  renderOnboarding();
  $("#onboardingOverlay").classList.remove("hidden");
  document.body.classList.add("onboarding-open");
  window.setTimeout(() => $("#skipOnboarding").focus(), 80);
}

function closeOnboarding(skipped = false) {
  localStorage.setItem(onboardingStorageKey, "true");
  $("#onboardingOverlay").classList.add("hidden");
  document.body.classList.remove("onboarding-open");
  if (!skipped) showView("home");
  onboardingPreviousFocus?.focus?.();
  notify(skipped ? "Prise en main ignorée" : "Bienvenue dans OwlSetup", skipped ? "Vous pourrez la relancer depuis le guide d'installation." : "Votre application est prête à être utilisée.");
}

function moveOnboarding(direction) {
  const last = document.querySelectorAll("[data-onboarding-step]").length - 1;
  if (direction > 0 && onboardingStep === last) { closeOnboarding(false); return; }
  onboardingStep = Math.max(0, Math.min(last, onboardingStep + direction));
  renderOnboarding();
}

function renderInstalledPage() {
  const query = installedSearchTerm.toLocaleLowerCase("fr");
  const detected = apps.filter(app => installedApps.has(app.id));
  const visible = detected.filter(app => `${app.name} ${app.id} ${app.category} ${app.desc}`.toLocaleLowerCase("fr").includes(query));
  visible.sort((a,b) => {
    if (installedSortMode === "selected") {
      const selectedOrder = Number(managedInstalled.has(b.id)) - Number(managedInstalled.has(a.id));
      if (selectedOrder) return selectedOrder;
    }
    const left = installedSortMode === "category" ? `${a.category} ${a.name}` : a.name;
    const right = installedSortMode === "category" ? `${b.category} ${b.name}` : b.name;
    return left.localeCompare(right, "fr", {sensitivity:"base"});
  });
  $("#installedNavCount").textContent = detected.length;
  $("#installedPageCount").textContent = `${detected.length} application${detected.length > 1 ? "s" : ""}`;
  $("#installedManagedCount").textContent = `${managedInstalled.size} application${managedInstalled.size > 1 ? "s" : ""} sélectionnée${managedInstalled.size > 1 ? "s" : ""}`;
  $("#installedClearSelection").disabled = managedInstalled.size === 0;
  $("#installedBatchUninstall").disabled = managedInstalled.size === 0;
  $("#installedAppGrid").innerHTML = visible.map(app => `
    <article class="installed-page-card ${managedInstalled.has(app.id) ? "selected" : ""}" data-installed-app="${escapeHtml(app.id)}" tabindex="0" aria-label="${escapeHtml(app.name)}${managedInstalled.has(app.id) ? ", sélectionné pour désinstallation" : ""}">
      <span class="installed-select-box" aria-hidden="true">${managedInstalled.has(app.id) ? "✓" : ""}</span>
      ${icon(app)}
      <span class="installed-page-copy"><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.desc)}</small><code>${escapeHtml(app.id)}</code></span>
      <span class="installed-page-meta"><b>${escapeHtml(app.category)}</b><small>${app.repairMode === "native" ? "Réparation native" : "Réinstallation réparatrice"}</small></span>
      <span class="installed-page-actions"><a class="official-link" href="${escapeHtml(app.site)}" target="_blank" rel="noopener" title="Site officiel de ${escapeHtml(app.name)}">Site officiel ↗</a><button class="repair-icon" data-repair="${escapeHtml(app.id)}" title="Réparer ${escapeHtml(app.name)}">⚙</button><button class="uninstall-icon" data-uninstall="${escapeHtml(app.id)}" title="Désinstaller ${escapeHtml(app.name)}">×</button></span>
    </article>`).join("");
  $("#installedEmpty").classList.toggle("hidden", visible.length !== 0);
}

function renderSelection() {
  const picked = apps.filter(app => selected.has(app.id));
  const count = picked.length;
  $("#navCount").textContent = count;
  $("#barCount").textContent = count;
  $("#summaryCount").textContent = count;
  $("#selectionBar").classList.toggle("hidden", count === 0 || $("#queue").classList.contains("active"));
  $("#selectionStack").innerHTML = picked.slice(0, 4).map(icon).join("") + (count > 4 ? `<span class="more">+${count - 4}</span>` : "");
  $("#queueList").innerHTML = count ? picked.map(app => `<article class="queue-item">${icon(app)}<div><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.id)}</small></div><span>${escapeHtml(app.category)}</span><button data-remove="${escapeHtml(app.id)}" aria-label="Retirer ${escapeHtml(app.name)}">×</button></article>`).join("") : `<div class="queue-empty"><span>＋</span><h3>Votre sélection est vide</h3><p>Ajoutez des logiciels depuis le catalogue.</p><button data-go-catalog>Parcourir le catalogue</button></div>`;
  $("#installBtn").disabled = count === 0;
  save();
}

function toggleApp(id) {
  const app = apps.find(item => item.id === id);
  if (installedApps.has(id)) {
    if (managedInstalled.has(id)) managedInstalled.delete(id); else managedInstalled.add(id);
    renderApps();
    return;
  }
  if (app?.manualInstall) {
    openGuidedInstall(app);
    return;
  }
  if (selected.has(id)) selected.delete(id); else {
    selected.add(id);
    notify("Ajouté à la sélection", app.name);
  }
  renderApps(); renderSelection();
}

let guidedInstallApp = null;
function openGuidedInstall(app) {
  guidedInstallApp = app;
  const isVmware = app.id === "VMware.WorkstationPro";
  const isWeb = app.webService === true;
  $("#guidedInstallLogo").textContent = app.icon;
  $("#guidedInstallLabel").textContent = isWeb ? "SERVICE WEB" : "INSTALLATION GUIDÉE";
  $("#guidedInstallTitle").textContent = isWeb ? `Ouvrir ${app.name}` : `Installer ${app.name}`;
  $("#guidedInstallIntro").textContent = isVmware
    ? "Broadcom ne permet plus le téléchargement automatique par WinGet. Un compte gratuit et l’acceptation des conditions sont nécessaires sur son portail officiel."
    : isWeb
      ? `${app.name} s’utilise dans votre navigateur. OwlSetup ouvrira uniquement le site officiel et ne transmettra aucune donnée.`
      : `${app.name} utilise son propre installateur. OwlSetup vous conduit vers la source officielle afin que vous puissiez vérifier les options avant l’installation.`;
  $("#guidedInstallSteps").innerHTML = isVmware
    ? `<li><b>1</b><span><strong>Créer ou ouvrir votre compte Broadcom</strong><small>Aucun identifiant n’est demandé ni enregistré par OwlSetup.</small></span></li><li><b>2</b><span><strong>Compléter le profil gratuit</strong><small>Broadcom peut demander votre pays et les informations de conformité commerciale.</small></span></li><li><b>3</b><span><strong>Choisir VMware Workstation Pro pour Windows</strong><small>Sélectionnez la version puis acceptez les conditions.</small></span></li><li><b>4</b><span><strong>Lancer l’installateur téléchargé</strong><small>Redémarrez ensuite OwlSetup pour afficher « Installé ».</small></span></li>`
    : isWeb
      ? `<li><b>1</b><span><strong>Ouvrir le service officiel</strong><small>L’adresse du site est vérifiée dans le catalogue OwlSetup.</small></span></li><li><b>2</b><span><strong>Se connecter si nécessaire</strong><small>Vos identifiants restent dans votre navigateur et ne sont jamais accessibles à OwlSetup.</small></span></li>`
      : `<li><b>1</b><span><strong>Ouvrir la page officielle</strong><small>Vérifiez la compatibilité et la configuration requise.</small></span></li><li><b>2</b><span><strong>Télécharger la version Windows</strong><small>Choisissez uniquement l’installateur proposé par l’éditeur.</small></span></li><li><b>3</b><span><strong>Contrôler les options</strong><small>Lisez chaque écran avant de valider l’installation.</small></span></li><li><b>4</b><span><strong>Relancer OwlSetup</strong><small>L’application installée pourra ensuite être détectée si elle est enregistrée dans Windows.</small></span></li>`;
  $("#guidedInstallNoteTitle").textContent = isWeb ? "Aucune installation nécessaire" : isVmware ? "VMware Workstation Pro est gratuit" : "Téléchargement depuis l’éditeur";
  $("#guidedInstallNoteText").textContent = isWeb ? "Ce bouton ouvre un nouvel onglet vers le service officiel." : isVmware ? "Les versions récentes sont gratuites. Aucun abonnement payant n’est nécessaire." : "OwlSetup ne télécharge pas silencieusement ce logiciel et vous laisse contrôler l’installateur.";
  $("#openVmwareGuide").textContent = isWeb ? "Voir le site officiel" : "Lire les informations officielles";
  $("#continueVmwareDownload").innerHTML = `<span>↗</span> ${isWeb ? "Ouvrir le service" : "Télécharger"}`;
  $("#guidedInstallModal").classList.remove("hidden");
}
function closeGuidedInstall() {
  $("#guidedInstallModal").classList.add("hidden");
  guidedInstallApp = null;
}
function openGuidedInstallLink(kind) {
  if (!guidedInstallApp) return;
  const url = kind === "download" ? guidedInstallApp.manualInstallUrl : guidedInstallApp.site;
  window.open(url, "_blank", "noopener");
}

function showView(id) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === id));
  $("#currentView").textContent = {home:"Accueil", catalog:"Installer des logiciels", installed:"Applications installées", updates:"Tout mettre à jour", cleanup:"Libérer de l'espace", quarantine:"Quarantaine", tools:"Outils système", security:"Centre de sécurité", troubleshooting:"Dépannage", queue:"Ma sélection", history:"Guide d'installation"}[id];
  document.body.classList.remove("menu-open");
  if (id === "updates" && !updatesLoaded) requestUpdateScan();
  if (id === "quarantine") requestQuarantine();
  if (id === "tools") { requestHistory(); diagnoseWinget(); }
  if (id === "security") requestSecurityStatus();
  if (id === "installed") renderInstalledPage();
  renderSelection();
  window.scrollTo({top: 0, behavior:"smooth"});
}

function addCustomPackage() {
  const id = $("#customPackageId").value.trim();
  if (!isValidPackageId(id)) {
    notify("Identifiant invalide", "Utilisez uniquement l'identifiant exact affiché par WinGet.");
    return;
  }
  addCustomAppDefinition(id);
  const canonicalId = apps.find(app => app.id.toLocaleLowerCase() === id.toLocaleLowerCase())?.id || id;
  if (!categories.includes("Personnalisé")) categories.push("Personnalisé");
  renderFilters();
  selected.add(canonicalId); $("#customPackageId").value=""; renderApps(); renderSelection();
  notify("Paquet ajouté", canonicalId);
}

function composeFeedbackReport() {
  const category = $("#feedbackCategory").value;
  const title = $("#feedbackTitle").value.trim();
  const description = $("#feedbackDescription").value.trim();
  const steps = $("#feedbackSteps").value.trim() || "Non renseignées";
  return {category, title, description, body:`## Problème rencontré\n\n${description}\n\n## Étapes pour reproduire\n\n${steps}\n\n## Informations\n\n- OwlSetup : ${currentBuildVersion}\n- Canal : ${currentBuildChannel}\n- Catégorie : ${category}\n\n## Diagnostic technique\n\n${feedbackDiagnostics}\n\n> Rapport préparé localement par OwlSetup. Aucun journal n'est joint automatiquement.`};
}

function validFeedback(report) {
  if (report.title && report.description) return true;
  notify("Commentaire incomplet", "Ajoutez un titre et une description du problème.");
  (report.title ? $("#feedbackDescription") : $("#feedbackTitle")).focus();
  return false;
}

async function copyFeedbackReport() {
  const report = composeFeedbackReport();
  if (!validFeedback(report)) return;
  const text = `${report.title}\n\n${report.body}`;
  try { await navigator.clipboard.writeText(text); }
  catch {
    const area=document.createElement("textarea"); area.value=text; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
  }
  notify("Rapport copié", "Relisez-le avant de le partager.");
}

function openGitHubFeedback() {
  const report = composeFeedbackReport();
  if (!validFeedback(report)) return;
  const prefix=currentBuildChannel === "beta" ? "[Bêta]" : "[OwlSetup]";
  const url=`https://github.com/OwlNetGeekFR/OwlSetup/issues/new?title=${encodeURIComponent(`${prefix} ${report.title}`)}&body=${encodeURIComponent(report.body)}&labels=bug`;
  window.open(url,"_blank","noopener");
}

function collectFeedbackDiagnostics() {
  if (!window.chrome?.webview) return notify("Diagnostic indisponible", "Cette fonction nécessite l'application Windows.");
  $("#collectFeedbackDiagnostics").disabled=true;
  $("#collectFeedbackDiagnostics").textContent="Analyse en cours...";
  window.chrome.webview.postMessage({action:"feedback-diagnostics",payload:{}});
}

function refreshProfiles() {
  const profiles = readProfiles();
  $("#savedProfiles").innerHTML = `<option value="">Choisir un profil</option>${Object.keys(profiles).sort().map(name => `<option value="${encodeURIComponent(name)}">${escapeHtml(name)}</option>`).join("")}`;
}

function readProfiles() {
  try {
    const value = JSON.parse(localStorage.getItem("pcsetup-profiles") || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function saveProfile() {
  const name=$("#profileName").value.trim();
  if (!name || name.length > 60 || ["__proto__","prototype","constructor"].includes(name.toLocaleLowerCase())) { notify("Nom de profil invalide","Utilisez un nom de 1 à 60 caractères."); return; }
  if (!selected.size) { notify("Profil incomplet","Sélectionnez au moins un logiciel."); return; }
  const profiles=readProfiles();
  profiles[name]=[...selected];
  localStorage.setItem("pcsetup-profiles",JSON.stringify(profiles));
  $("#profileName").value="";refreshProfiles();notify("Profil enregistré",name);
}

function loadProfile() {
  const value=$("#savedProfiles").value;if(!value)return;
  const name=decodeURIComponent(value),profiles=readProfiles();
  const profilePackages=Array.isArray(profiles[name]) ? profiles[name].filter(isValidPackageId).slice(0,100) : [];
  profilePackages.filter(id=>!apps.some(app=>app.id.toLocaleLowerCase()===id.toLocaleLowerCase())).forEach(id=>addCustomAppDefinition(id));
  const canonicalPackages=profilePackages.map(id=>apps.find(app=>app.id.toLocaleLowerCase()===id.toLocaleLowerCase())?.id || id);
  if (canonicalPackages.some(id=>apps.some(app=>app.id===id && app.custom)) && !categories.includes("Personnalisé")) categories.push("Personnalisé");
  selected=new Set(canonicalPackages.filter(id=>!installedApps.has(id) && !apps.some(app=>app.id===id && app.manualInstall)));
  renderFilters();
  renderApps();renderSelection();notify("Profil chargé",name);
}

function requestHistory(){if(window.chrome?.webview)window.chrome.webview.postMessage({action:"load-history",payload:{}});}
function requestSecurityStatus(){if(window.chrome?.webview)window.chrome.webview.postMessage({action:"security-status",payload:{}});}
function diagnoseWinget(){if(window.chrome?.webview){$("#wingetDiagnosticText").textContent="Diagnostic en cours...";window.chrome.webview.postMessage({action:"diagnose-winget",payload:{}});}}

const toolProgressIds={winget:"wingetToolProgress",restore:"restoreToolProgress",startup:"startupToolProgress",disk:"diskToolProgress"};
function setToolProgress(tool,percent,status=""){
  const progress=document.getElementById(toolProgressIds[tool]);if(!progress)return;
  const value=Math.max(0,Math.min(100,Number(percent)||0));
  progress.classList.remove("hidden");
  progress.querySelector("i").style.width=`${value}%`;
  progress.querySelector("b").textContent=`${Math.round(value)}%`;
  if(status)progress.title=status;
}

function requestUpdateScan() {
  if (!window.chrome?.webview) return;
  updatesLoaded = false;
  $("#updateScanState").classList.remove("hidden");
  $("#availableUpdates").classList.add("hidden");
  $("#noUpdates").classList.add("hidden");
  $("#scanUpdatesBtn").disabled = true;
  $("#updateAllBtn").disabled = true;
  window.chrome.webview.postMessage({action:"scan-updates", payload:{}});
}

function requestInstalledScan() {
  if (!window.chrome?.webview) {
    notify("Détection locale", "Cette fonction est disponible dans l'application Windows.");
    return;
  }
  $("#installedPageCount").textContent = "Analyse en cours...";
  window.chrome.webview.postMessage({action:"scan-installed", payload:{ids:apps.map(app => app.id), apps:apps.map(app => ({id:app.id,name:app.name,portable:!!app.portable}))}});
}

function requestBatchUninstall() {
  if (!managedInstalled.size || !window.chrome?.webview) return;
  window.chrome.webview.postMessage({action:"simulate-batch-uninstall",payload:{packages:[...managedInstalled]}});
}

function openBatchUninstallModal(packages) {
  pendingBatchUninstall = [...(packages || [])];
  const selectedApps = pendingBatchUninstall.map(id => apps.find(app => app.id === id) || {id,name:id,icon:"APP",color:"#536174",logo:""});
  $("#batchUninstallCount").textContent = `${selectedApps.length} logiciel${selectedApps.length > 1 ? "s" : ""}`;
  $("#batchUninstallList").innerHTML = selectedApps.map(app => `<article data-batch-package="${escapeHtml(app.id)}">${icon(app)}<span><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.id)}</small></span><b class="batch-item-state">Prêt</b></article>`).join("");
  $("#batchUninstallConfirmView").classList.remove("hidden");
  $("#batchUninstallProgressView").classList.add("hidden");
  $("#batchResiduePanel").classList.add("hidden");
  $("#batchCleanupResidues").checked=true;
  $("#quarantineBatchResidues").disabled=false;
  pendingBatchResidueToken="";
  $("#confirmBatchUninstall").disabled = selectedApps.length === 0;
  $("#batchUninstallModal").dataset.running = "false";
  $("#batchUninstallModal").dataset.success = "0";
  $("#batchUninstallModal").dataset.failed = "0";
  $("#batchUninstallModal").classList.remove("hidden");
}

function closeBatchUninstallModal() {
  if ($("#batchUninstallModal").dataset.running === "true") { minimizeUninstallProgress("batch"); return; }
  $("#batchUninstallModal").classList.add("hidden");
  $("#backgroundUninstall").classList.add("hidden");
  pendingBatchUninstall = [];
  pendingBatchResidueToken = "";
  if (activeUninstallMode === "batch") activeUninstallMode = "";
}

function beginBatchUninstall() {
  if (!pendingBatchUninstall.length || !window.chrome?.webview) return;
  $("#batchUninstallConfirmView").classList.add("hidden");
  $("#batchUninstallProgressView").classList.remove("hidden");
  $("#batchUninstallModal").dataset.running = "true";
  $("#batchUninstallProgressBar").style.width = "4%";
  $("#batchUninstallProgressPercent").textContent = "4%";
  $("#batchUninstallProgressTitle").textContent = "Préparation de la désinstallation";
  $("#batchUninstallProgressDetail").textContent = `${pendingBatchUninstall.length} logiciel(s) dans la file`;
  $("#batchUninstallCurrent").textContent = "Initialisation de WinGet...";
  $("#batchUninstallPosition").textContent = `0/${pendingBatchUninstall.length}`;
  $("#batchUninstallResult").textContent = "0 réussi · 0 à vérifier";
  $("#finishBatchUninstall").classList.add("hidden");
  $("#batchUninstallBackgroundActions").classList.remove("hidden");
  activeUninstallMode = "batch";
  currentUninstallRun = `batch-uninstall-${Date.now()}`;
  setBackgroundUninstall("Préparation de la désinstallation", `${pendingBatchUninstall.length} logiciel(s) dans la file`, 4);
  window.chrome.webview.postMessage({action:"batch-uninstall",payload:{packages:pendingBatchUninstall,apps:apps.filter(app=>pendingBatchUninstall.includes(app.id)).map(app=>({id:app.id,name:app.name})),scanResidues:$("#batchCleanupResidues").checked}});
  window.setTimeout(() => minimizeUninstallProgress("batch"), 450);
}

function appForUpdate(id) { return apps.find(app => app.id.toLocaleLowerCase() === String(id).toLocaleLowerCase()); }

function renderAvailableUpdates() {
  $("#updateScanState").classList.add("hidden");
  $("#scanUpdatesBtn").disabled = false;
  const hasUpdates = availableUpdates.length > 0;
  setNavAlert("#updatesNavBadge", availableUpdates.length, availableUpdates.length > 0);
  $("#availableUpdates").classList.toggle("hidden", !hasUpdates);
  $("#noUpdates").classList.toggle("hidden", hasUpdates);
  $("#availableUpdates").innerHTML = availableUpdates.map(update => {
    const app = appForUpdate(update.id);
    const appIcon = app?.logo ? `<img src="${escapeHtml(app.logo)}" alt="" data-image-fallback="APP">` : `<span>APP</span>`;
    return `<label class="available-update"><input type="checkbox" data-update-id="${escapeHtml(update.id)}" ${selectedUpdates.has(update.id) ? "checked" : ""}><span class="update-check">✓</span><span class="update-app-icon" style="${app ? `background:${escapeHtml(app.color)}` : ""}">${appIcon}</span><span><strong>${escapeHtml(update.name)}</strong><small>${escapeHtml(update.id)}</small></span><span class="version-flow">${escapeHtml(update.current)}<i>→</i><b>${escapeHtml(update.available)}</b></span></label>`;
  }).join("");
  const count = selectedUpdates.size;
  $("#updateAllBtn").disabled = count === 0;
  $("#updateReadyTitle").textContent = hasUpdates ? `${count} mise${count > 1 ? "s" : ""} à jour sélectionnée${count > 1 ? "s" : ""}` : "Applications à jour";
  $("#updateReadyDetail").textContent = hasUpdates ? "Vérifiez les versions puis lancez uniquement votre sélection." : "Vous pouvez relancer une recherche à tout moment.";
}

function renderHealth(message) {
  $("#refreshHealth").classList.remove("scanning");
  $("#healthScore").textContent = message.score;
  $("#healthStatus").textContent = message.score >= 85 ? "Excellent état" : message.score >= 65 ? "Quelques actions conseillées" : "Entretien recommandé";
  $("#healthRing").classList.remove("good", "warning", "critical");
  $("#healthRing").classList.add(message.score >= 85 ? "good" : message.score >= 65 ? "warning" : "critical");
  $("#healthUpdates").textContent = message.error ? "Indisponible" : `${message.updateCount} disponible${message.updateCount > 1 ? "s" : ""}`;
  $("#healthUpdatesDetail").textContent = message.error ? "WinGet doit être vérifié" : message.updateCount ? "Nouvelles versions détectées" : "Applications à jour";
  $("#healthDisk").textContent = `${message.freeGb} Go libres`;
  $("#healthDiskDetail").textContent = `${message.freePercent} % de ${message.totalGb} Go`;
  $("#healthRestart").textContent = message.pendingRestart ? "Nécessaire" : "Non requis";
  $("#healthQuarantine").textContent = `${message.quarantineCount} élément${message.quarantineCount > 1 ? "s" : ""}`;
  $("#quarantineNavCount").textContent = message.quarantineCount;
  setNavAlert("#updatesNavBadge", message.error ? "!" : message.updateCount, message.error || message.updateCount > 0);
  setNavAlert("#toolsNavBadge", message.error ? "!" : 0, true);
}

function requestHealth() {
  if (!window.chrome?.webview) return;
  $("#refreshHealth").classList.add("scanning");
  window.chrome.webview.postMessage({action:"scan-health", payload:{}});
}

function requestQuarantine() {
  if (!window.chrome?.webview) return;
  $("#quarantineList").innerHTML = `<div class="quarantine-loading"><span>↻</span> Analyse de la quarantaine...</div>`;
  $("#quarantineEmpty").classList.add("hidden");
  window.chrome.webview.postMessage({action:"scan-quarantine", payload:{}});
}

function renderQuarantine(items) {
  const list = items || [];
  $("#quarantineCount").textContent = `${list.length} élément${list.length > 1 ? "s" : ""}`;
  $("#quarantineNavCount").textContent = list.length;
  $("#quarantineList").classList.toggle("hidden", list.length === 0);
  $("#quarantineEmpty").classList.toggle("hidden", list.length !== 0);
  $("#quarantineList").innerHTML = list.map(entry => `<article class="quarantine-item"><span>♲</span><div><strong>${escapeHtml(entry.item)}</strong><small>${escapeHtml(entry.batch)} · Modifié le ${escapeHtml(entry.modified)}</small></div><div class="quarantine-actions"><button class="restore-quarantine" data-quarantine-action="restore" data-batch="${encodeURIComponent(entry.batch)}" data-item="${encodeURIComponent(entry.item)}">↶ Restaurer</button><button class="delete-quarantine" data-quarantine-action="delete" data-batch="${encodeURIComponent(entry.batch)}" data-item="${encodeURIComponent(entry.item)}">× Supprimer</button></div></article>`).join("");
}

function confirmQuarantineAction(action, batch, item) {
  const deleting = action === "delete";
  const overlay = document.createElement("div");
  overlay.className = "quarantine-confirm";
  overlay.innerHTML = `<div><h3>${deleting ? "Supprimer définitivement ?" : "Restaurer ce dossier ?"}</h3><p><strong>${escapeHtml(item)}</strong><br>${deleting ? "Cette suppression ne pourra pas être annulée." : "Le dossier sera remis dans son emplacement AppData d'origine."}</p><div class="dialog-actions"><button class="secondary-dialog-button" data-confirm-no>Annuler</button><button class="${deleting ? "danger-dialog-button" : "primary-dialog-button"}" data-confirm-yes>${deleting ? "Supprimer" : "Restaurer"}</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("[data-confirm-no]").onclick = () => overlay.remove();
  overlay.querySelector("[data-confirm-yes]").onclick = () => {
    overlay.remove();
    window.chrome.webview.postMessage({action:`${action}-quarantine`, payload:{batch,item}});
  };
}

function generateScript() {
  const picked = apps.filter(app => selected.has(app.id));
  const ids = picked.map(app => `  @{ Id = "${app.id}"; Source = "${app.source || "winget"}" }`).join(",\r\n");
  const script = `# OwlSetup - Installateur Windows\r\n# Généré le ${new Date().toLocaleString("fr-FR")}\r\n# Vérifiez cette liste avant exécution.\r\n\r\n$ErrorActionPreference = "Continue"\r\n$Host.UI.RawUI.WindowTitle = "OwlSetup - Installation"\r\n\r\nif (-not (Get-Command winget -ErrorAction SilentlyContinue)) {\r\n  Write-Host "winget est introuvable. Installez 'App Installer' depuis le Microsoft Store." -ForegroundColor Red\r\n  Read-Host "Appuyez sur Entrée pour quitter"\r\n  exit 1\r\n}\r\n\r\n$packages = @(\r\n${ids}\r\n)\r\n\r\nWrite-Host "OWLSETUP" -ForegroundColor Cyan\r\nWrite-Host "$($packages.Count) élément(s) à installer."\r\n\r\nforeach ($package in $packages) {\r\n  Write-Host "\\nInstallation de $($package.Id)..." -ForegroundColor Yellow\r\n  winget install --id $package.Id --source $package.Source --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity\r\n  if ($LASTEXITCODE -eq 0) { Write-Host "Terminé : $($package.Id)" -ForegroundColor Green }\r\n  else { Write-Host "À vérifier : $($package.Id) (code $LASTEXITCODE)" -ForegroundColor DarkYellow }\r\n}\r\n\r\nWrite-Host "\\nInstallation terminée. Un redémarrage peut être nécessaire." -ForegroundColor Cyan\r\nRead-Host "Appuyez sur Entrée pour fermer"\r\n`;
  const blob = new Blob(["\ufeff", script], {type:"text/plain;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "PC-Setup-Installer.ps1";
  link.click();
  URL.revokeObjectURL(link.href);
}

function generateUpdateScript() {
  const script = `# OwlSetup - Mise a jour complete du PC
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\""
  exit
}

$Host.UI.RawUI.WindowTitle = "OwlSetup - Mise a jour complete"
$logs = Join-Path $env:LOCALAPPDATA "PCSetup\Logs"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$log = Join-Path $logs ("PC-Setup-Update-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
Start-Transcript -Path $log -Force

Write-Host "OWLSETUP - MISE A JOUR COMPLETE" -ForegroundColor Cyan
Write-Host "Ne fermez pas cette fenetre pendant l'operation."

if (Get-Command winget -ErrorAction SilentlyContinue) {
  Write-Host "\\n[1/2] Mise a jour de tous les logiciels..." -ForegroundColor Yellow
  winget source update
  winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements --disable-interactivity
  if ($LASTEXITCODE -eq 0) { Write-Host "Logiciels mis a jour." -ForegroundColor Green }
  else { Write-Host "Certaines applications necessitent peut-etre une action manuelle." -ForegroundColor DarkYellow }
} else {
  Write-Host "winget est absent. Installez App Installer depuis le Microsoft Store." -ForegroundColor Red
}

Write-Host "\\n[2/2] Lancement de Windows Update..." -ForegroundColor Yellow
try {
  $autoUpdate = New-Object -ComObject Microsoft.Update.AutoUpdate
  $autoUpdate.DetectNow()
  Start-Process "ms-settings:windowsupdate"
  Write-Host "Validez les mises a jour et pilotes proposes dans les Parametres." -ForegroundColor Cyan
} catch {
  Write-Host "Impossible de lancer Windows Update." -ForegroundColor Red
}

Write-Host "\\nOperation terminee. Rapport : $log" -ForegroundColor Cyan
Write-Host "Redemarrez le PC si Windows le demande." -ForegroundColor Yellow
Stop-Transcript
Read-Host "Appuyez sur Entree pour fermer"
`;
  const blob = new Blob(["\ufeff", script], {type:"text/plain;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Mettre-a-jour-mon-PC.ps1";
  link.click();
  URL.revokeObjectURL(link.href);
}

function updateCleanupCount() {
  const count = document.querySelectorAll("[data-cleanup]:checked").length;
  $("#cleanupCount").textContent = count;
  $("#cleanupBtn").disabled = count === 0;
}

function generateCleanupScript() {
  const choices = new Set([...document.querySelectorAll("[data-cleanup]:checked")].map(input => input.dataset.cleanup));
  const actions = [];
  if (choices.has("user-temp")) actions.push(`Clear-Folder -Path $env:TEMP -Label "Fichiers temporaires utilisateur"`);
  if (choices.has("windows-temp")) actions.push(`Clear-Folder -Path (Join-Path $env:WINDIR "Temp") -Label "Fichiers temporaires Windows"`);
  if (choices.has("recycle-bin")) actions.push(`Run-Step "Corbeille" { Clear-RecycleBin -Force -ErrorAction Stop }`);
  if (choices.has("delivery")) actions.push(`Run-Step "Cache d'optimisation de livraison" { if (Get-Command Delete-DeliveryOptimizationCache -ErrorAction SilentlyContinue) { Delete-DeliveryOptimizationCache -Force } else { Write-Host "Fonction non disponible sur cette version de Windows." } }`);
  if (choices.has("components")) actions.push(`Run-Step "Anciens composants Windows" { Start-Process dism.exe -ArgumentList "/Online","/Cleanup-Image","/StartComponentCleanup","/NoRestart" -Wait -NoNewWindow }`);
  if (choices.has("app-leftovers")) actions.push(`Find-AppLeftovers`);

  const script = `# OwlSetup - Liberation d'espace disque
$ErrorActionPreference = "Continue"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\""
  exit
}

$Host.UI.RawUI.WindowTitle = "OwlSetup - Nettoyage du disque"
$dataRoot = Join-Path $env:LOCALAPPDATA "PCSetup"
$logs = Join-Path $dataRoot "Logs"
$quarantineRoot = Join-Path $dataRoot "Quarantine"
New-Item -ItemType Directory -Path $logs -Force | Out-Null
New-Item -ItemType Directory -Path $quarantineRoot -Force | Out-Null
$log = Join-Path $logs ("PC-Setup-Nettoyage-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
Start-Transcript -Path $log -Force

function Run-Step([string]$Label, [scriptblock]$Action) {
  Write-Host "\\nNettoyage : $Label" -ForegroundColor Yellow
  try { & $Action; Write-Host "Termine : $Label" -ForegroundColor Green }
  catch { Write-Host "Ignore : $Label - certains fichiers sont peut-etre utilises." -ForegroundColor DarkYellow }
}

function Clear-Folder([string]$Path, [string]$Label) {
  Run-Step $Label {
    if (Test-Path -LiteralPath $Path) {
      Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Normalize-AppName([string]$Value) {
  return ($Value -replace "[^a-zA-Z0-9]", "").ToLowerInvariant()
}

function Find-AppLeftovers {
  Write-Host "\\nAnalyse des residus d'applications..." -ForegroundColor Yellow
  $uninstallKeys = @(
    "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
    "HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
    "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
  )
  $installed = Get-ItemProperty $uninstallKeys -ErrorAction SilentlyContinue | Where-Object DisplayName | ForEach-Object { Normalize-AppName $_.DisplayName }
  $protected = @("packages","microsoft","temp","crashdumps","d3dscache","history","inetcache","cookies","virtualstore","applicationdata","localsettings","connecteddevicesplatform","comms")
  $roots = @($env:LOCALAPPDATA, $env:APPDATA, $env:PROGRAMDATA) | Select-Object -Unique
  $quarantine = Join-Path $quarantineRoot ("PC-Setup-Quarantaine-" + (Get-Date -Format "yyyy-MM-dd-HHmm"))
  $moved = 0

  foreach ($root in $roots) {
    Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue | Where-Object LastWriteTime -lt (Get-Date).AddDays(-90) | ForEach-Object {
      $folder = $_
      $name = Normalize-AppName $folder.Name
      if ($name.Length -ge 4 -and $name -notin $protected -and -not $folder.Name.StartsWith(".")) {
        $match = $installed | Where-Object { $_ -and ($_.Contains($name) -or $name.Contains($_)) } | Select-Object -First 1
        if (-not $match) {
          Write-Host "\\nCandidat ancien : $($folder.FullName)" -ForegroundColor Cyan
          Write-Host "Derniere modification : $($folder.LastWriteTime)"
          $answer = Read-Host "Deplacer en quarantaine ? Tapez OUI"
          if ($answer -eq "OUI") {
            New-Item -ItemType Directory -Path $quarantine -Force | Out-Null
            $destination = Join-Path $quarantine ((Split-Path $root -Leaf) + "-" + $folder.Name)
            if (Test-Path -LiteralPath $destination) { $destination += "-" + [guid]::NewGuid().ToString("N").Substring(0,6) }
            Move-Item -LiteralPath $folder.FullName -Destination $destination -ErrorAction SilentlyContinue
            $moved++
          }
        }
      }
    }
  }
  Write-Host "Analyse terminee : $moved dossier(s) place(s) en quarantaine." -ForegroundColor Green
  if ($moved -gt 0) { Write-Host "Quarantaine : $quarantine. Gardez-la quelques jours avant de la supprimer." -ForegroundColor Yellow }
}

$drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$before = [math]::Round($drive.FreeSpace / 1GB, 2)
Write-Host "OWLSETUP - LIBERATION D'ESPACE" -ForegroundColor Cyan
Write-Host "Espace libre actuel : $before Go"
Write-Host "Vos documents personnels et le dossier Telechargements ne seront pas touches." -ForegroundColor Cyan
$confirm = Read-Host "Tapez OUI pour commencer"
if ($confirm -ne "OUI") { Stop-Transcript; exit }

${actions.join("\n")}

$drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$after = [math]::Round($drive.FreeSpace / 1GB, 2)
$gained = [math]::Round($after - $before, 2)
Write-Host "\\nNettoyage termine. Espace recupere : $gained Go" -ForegroundColor Cyan
Write-Host "Rapport : $log"
Stop-Transcript
Read-Host "Appuyez sur Entree pour fermer"
`;
  const blob = new Blob(["\ufeff", script], {type:"text/plain;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Liberer-espace-disque.ps1";
  link.click();
  URL.revokeObjectURL(link.href);
}

function notifyAction(title, detail) {
  const toast = $("#toast");
  toast.querySelector("strong").textContent = title;
  $("#toastText").textContent = detail;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

async function runLocalAction(action, payload = {}) {
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.postMessage({action, payload});
    notifyAction("Action lancée", "Suivez la progression dans la fenêtre PowerShell.");
    return true;
  }
  const token = new URLSearchParams(location.search).get("token");
  if (!token || !/^https?:$/.test(location.protocol)) {
    alert("Pour exécuter cette action directement, ouvrez OwlSetup avec le fichier Ouvrir-PC-Setup.cmd. Le mode fichier ne peut pas lancer PowerShell pour des raisons de sécurité.");
    return false;
  }
  const response = await fetch(`/api/run/${action}`, {
    method: "POST",
    headers: {"Content-Type":"application/json", "X-PCSetup-Token":token},
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Le service local n'a pas pu lancer l'action.");
  notifyAction("Action lancée", result.message || "Suivez la progression dans la fenêtre PowerShell.");
  return true;
}

async function executeWithButton(button, action, payload) {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "<span>◌</span> Lancement...";
  try { await runLocalAction(action, payload); }
  catch (error) { alert(error.message); }
  finally { button.disabled = false; button.innerHTML = original; }
}

function openInstallModal() {
  if (!selected.size) return;
  $("#modalAppCount").textContent = `${selected.size} logiciel${selected.size > 1 ? "s" : ""}`;
  const portableCount=apps.filter(app=>selected.has(app.id)&&app.portable).length;
  const launchable=selected.size===1&&apps.some(app=>selected.has(app.id)&&app.launchable);
  $("#launchAfterOption").classList.toggle("hidden",!launchable);
  $("#launchAfterInstall").checked=false;
  $("#portableInstallNotice").textContent=portableCount
    ? `${portableCount} application(s) portable(s) détectée(s). Le raccourci sera placé selon votre choix, sans déplacer les fichiers gérés par WinGet.`
    : "Les fichiers restent dans le dossier sécurisé choisi par WinGet ou l’éditeur. Certains installateurs peuvent conserver leur propre raccourci.";
  $("#installConfirmView").classList.remove("hidden");
  $("#installProgressView").classList.add("hidden");
  $("#finishInstall").classList.add("hidden");
  $("#installResultActions").classList.add("hidden");
  $("#closeInstallModal").disabled = false;
  $("#installModal").dataset.running = "false";
  $("#installModal").classList.remove("hidden");
  requestInstallPreflight();
}

function setPreflightState(key, state, detail) {
  const item=document.querySelector(`[data-preflight="${key}"]`);
  if(!item)return;
  item.classList.remove("checking","success","warning","failed");
  item.classList.add(state);
  item.querySelector("i").textContent=state==="success"?"✓":state==="failed"?"×":state==="warning"?"!":"…";
  item.querySelector("small").textContent=detail||"Vérification...";
}

function requestInstallPreflight() {
  const requestId=++installPreflightRequestId;
  const packages=[...selected];
  const button=$("#confirmInstall");
  button.disabled=true;
  $("#preflightTitle").textContent="Analyse de la sélection...";
  ["winget","disk","system","packages"].forEach(key=>setPreflightState(key,"checking","Vérification..."));
  if(!packages.length){$("#preflightTitle").textContent="Aucun logiciel sélectionné";return;}
  if(!window.chrome?.webview){
    $("#preflightTitle").textContent="Diagnostic disponible dans l’application Windows";
    ["winget","disk","system","packages"].forEach(key=>setPreflightState(key,"warning","Mode aperçu"));
    return;
  }
  window.chrome.webview.postMessage({action:"preflight-install",payload:{requestId,packages,apps:apps.filter(app=>selected.has(app.id)).map(app=>({id:app.id,name:app.name,portable:!!app.portable}))}});
}

function closeInstallModal() {
  if ($("#installModal").dataset.running === "true") { minimizeInstallProgress(); return; }
  $("#installModal").classList.add("hidden");
  $("#backgroundInstall").classList.add("hidden");
}

function beginInstall() {
  if ($("#confirmInstall").disabled) return;
  $("#installConfirmView").classList.add("hidden");
  $("#installProgressView").classList.remove("hidden");
  $("#closeInstallModal").disabled = false;
  $("#installModal").dataset.running = "true";
  $("#progressTitle").textContent = "Préparation de l'installation";
  $("#progressDetail").textContent = "Connexion au gestionnaire winget";
  $("#progressPercent").textContent = "0%";
  $("#progressBar").style.width = "0%";
  $("#currentPackage").textContent = "Initialisation...";
  $("#packageResult").textContent = "EN ATTENTE";
  $("#progressSummary").textContent = "Ne fermez pas OwlSetup pendant l'installation.";
  $("#installResultActions").classList.add("hidden");
  $("#installBackgroundActions").classList.remove("hidden");
  lastFailedInstallPackages=[];
  currentInstallRun = `install-${Date.now()}`;
  setBackgroundInstall("Préparation de l'installation", `${selected.size} logiciel(s) dans la file`, 0);
  const selectedApps=apps.filter(app=>selected.has(app.id)).map(app=>({id:app.id,name:app.name,portable:!!app.portable}));
  executeWithButton($("#confirmInstall"), "install", {packages:[...selected],apps:selectedApps,shortcut:$("#installShortcutLocation").value,launchAfter:$("#launchAfterInstall").checked});
  window.setTimeout(minimizeInstallProgress, 450);
}

function openUpdateModal() {
  if (!selectedUpdates.size) return;
  $("#updateModalCount").textContent = `${selectedUpdates.size} application${selectedUpdates.size > 1 ? "s" : ""}`;
  $("#updateConfirmView").classList.remove("hidden");
  $("#updateProgressView").classList.add("hidden");
  $("#finishUpdate").classList.add("hidden");
  $("#closeUpdateModal").disabled = false;
  $("#updateModal").dataset.running = "false";
  $("#updateModal").classList.remove("hidden");
}

function closeUpdateModal() {
  if ($("#updateModal").dataset.running === "true") return;
  $("#updateModal").classList.add("hidden");
}

function beginUpdate() {
  if (!window.chrome?.webview) return;
  $("#updateConfirmView").classList.add("hidden");
  $("#updateProgressView").classList.remove("hidden");
  $("#finishUpdate").classList.add("hidden");
  $("#closeUpdateModal").disabled = true;
  $("#updateModal").dataset.running = "true";
  $("#updateProgressTitle").textContent = "Préparation de la mise à jour";
  $("#updateProgressDetail").textContent = "Connexion aux services Windows";
  $("#updateProgressPercent").textContent = "0%";
  $("#updateProgressBar").style.width = "0%";
  $("#updateSummary").textContent = "Ne fermez pas OwlSetup pendant la mise à jour.";
  document.querySelectorAll("[data-update-step]").forEach(step => step.classList.remove("active", "done"));
  window.chrome.webview.postMessage({action:"update", payload:{packages:[...selectedUpdates]}});
}

function showUpdateStage(stage) {
  const order = ["sources", "applications", "windows"];
  const current = order.indexOf(stage);
  document.querySelectorAll("[data-update-step]").forEach(step => {
    const index = order.indexOf(step.dataset.updateStep);
    step.classList.toggle("active", index === current);
    step.classList.toggle("done", index < current);
  });
}

function openCleanupModal() {
  pendingCleanupChoices = [...document.querySelectorAll("[data-cleanup]:checked")].map(input => input.dataset.cleanup);
  if (!pendingCleanupChoices.length) return;
  const count = pendingCleanupChoices.length;
  $("#cleanupModalCount").textContent = `${count} zone${count > 1 ? "s" : ""}`;
  $("#cleanupAnalysisTitle").textContent = "Analyse en cours...";
  $("#cleanupModalDetail").textContent = "Calcul de l'espace récupérable sans suppression";
  $("#cleanupAnalysisList").innerHTML = `<div class="analysis-loading"><span>↻</span> Analyse des dossiers sélectionnés...</div>`;
  $("#protectedFolders").classList.add("hidden");
  $("#confirmCleanup").disabled = true;
  $("#cleanupConfirmView").classList.remove("hidden");
  $("#cleanupProgressView").classList.add("hidden");
  $("#cleanupResultCard").classList.add("hidden");
  $("#cleanupCurrentZone").closest(".cleanup-current-zone").classList.remove("hidden");
  $("#finishCleanup").classList.add("hidden");
  $("#closeCleanupModal").disabled = false;
  $("#cleanupModal").dataset.running = "false";
  $("#cleanupModal").classList.remove("hidden");
  if (window.chrome?.webview) window.chrome.webview.postMessage({action:"analyze-cleanup", payload:{choices:pendingCleanupChoices}});
}

function openRepairModal(id) {
  const app = apps.find(item => item.id === id);
  if (!app) return;
  pendingRepairId = id;
  $("#repairAppName").textContent = app.name;
  $("#repairConfirmView").classList.remove("hidden");
  $("#repairProgressView").classList.add("hidden");
  $("#finishRepair").classList.add("hidden");
  $("#closeRepairModal").disabled = false;
  $("#repairModal").dataset.running = "false";
  $("#repairModal").classList.remove("hidden");
}

function closeRepairModal() {
  if ($("#repairModal").dataset.running === "true") return;
  $("#repairModal").classList.add("hidden");
  pendingRepairId = null;
}

function beginRepair() {
  if (!pendingRepairId || !window.chrome?.webview) return;
  $("#repairConfirmView").classList.add("hidden");
  $("#repairProgressView").classList.remove("hidden");
  $("#closeRepairModal").disabled = true;
  $("#repairModal").dataset.running = "true";
  $("#repairProgressBar").style.width = "35%";
  window.chrome.webview.postMessage({action:"repair", payload:{id:pendingRepairId}});
}

function exportConfiguration() {
  if (!window.chrome?.webview) return;
  const cleanup = [...document.querySelectorAll("[data-cleanup]:checked")].map(input => input.dataset.cleanup);
  window.chrome.webview.postMessage({action:"export-config", payload:{selected:[...selected], cleanup}});
}

function importConfiguration() {
  if (!window.chrome?.webview) return;
  window.chrome.webview.postMessage({action:"import-config", payload:{}});
}

function closeCleanupModal() {
  if ($("#cleanupModal").dataset.running === "true") return;
  $("#cleanupModal").classList.add("hidden");
  pendingCleanupChoices = [];
}

function beginCleanup() {
  if (!pendingCleanupChoices.length || !window.chrome?.webview) return;
  $("#cleanupConfirmView").classList.add("hidden");
  $("#cleanupProgressView").classList.remove("hidden");
  $("#closeCleanupModal").disabled = true;
  $("#cleanupModal").dataset.running = "true";
  $("#cleanupProgressTitle").textContent = "Préparation du nettoyage";
  $("#cleanupProgressDetail").textContent = `${pendingCleanupChoices.length} zone(s) dans la file`;
  $("#cleanupProgressPercent").textContent = "0%";
  $("#cleanupProgressBar").style.width = "0%";
  $("#cleanupCurrentZone").textContent = "Initialisation...";
  $("#cleanupZonePosition").textContent = "—";
  $("#cleanupSummaryText").textContent = "Ne fermez pas OwlSetup pendant le nettoyage.";
  window.chrome.webview.postMessage({action:"cleanup", payload:{choices:pendingCleanupChoices}});
}

function openUninstallModal(id) {
  const app = apps.find(item => item.id === id);
  if (!app) return;
  pendingUninstallId = id;
  $("#uninstallAppName").textContent = app.name;
  $("#uninstallSimulationStatus").textContent = "Vérification du paquet et de ses accès...";
  $("#uninstallPreviewPackage").textContent = id;
  $("#uninstallPreviewScope").textContent = "Analyse en cours";
  $("#uninstallPreviewShortcuts").textContent = "Analyse en cours";
  $("#confirmUninstall").disabled = true;
  $("#uninstallConfirmView").classList.remove("hidden");
  $("#uninstallProgressView").classList.add("hidden");
  $("#finishUninstall").classList.add("hidden");
  $("#uninstallResiduePanel").classList.add("hidden");
  $("#uninstallCleanupResidues").checked=true;
  $("#quarantineUninstallResidues").disabled=false;
  pendingUninstallResidueToken="";
  $("#closeUninstallModal").disabled = false;
  $("#uninstallModal").dataset.running = "false";
  $("#uninstallModal").classList.remove("hidden");
  if(window.chrome?.webview)window.chrome.webview.postMessage({action:"simulate-uninstall",payload:{id}});
}

function closeUninstallModal() {
  if ($("#uninstallModal").dataset.running === "true") { minimizeUninstallProgress("single"); return; }
  $("#uninstallModal").classList.add("hidden");
  $("#backgroundUninstall").classList.add("hidden");
  pendingUninstallId = null;
  pendingUninstallResidueToken = "";
  if (activeUninstallMode === "single") activeUninstallMode = "";
}

function beginUninstall() {
  if (!pendingUninstallId || !window.chrome?.webview) return;
  $("#uninstallConfirmView").classList.add("hidden");
  $("#uninstallProgressView").classList.remove("hidden");
  $("#closeUninstallModal").disabled = false;
  $("#uninstallModal").dataset.running = "true";
  $("#uninstallProgressBar").style.width = "25%";
  const app=apps.find(item=>item.id===pendingUninstallId);
  $("#uninstallProgressTitle").textContent = "Préparation de la désinstallation";
  $("#uninstallProgressDetail").textContent = app?.name || pendingUninstallId;
  $("#uninstallBackgroundActions").classList.remove("hidden");
  activeUninstallMode = "single";
  currentUninstallRun = `uninstall-${Date.now()}`;
  setBackgroundUninstall(`Préparation de ${app?.name || pendingUninstallId}`, "Connexion à WinGet", 25);
  window.chrome.webview.postMessage({action:"uninstall", payload:{id:pendingUninstallId,name:app?.name||pendingUninstallId,scanResidues:$("#uninstallCleanupResidues").checked}});
  window.setTimeout(() => minimizeUninstallProgress("single"), 450);
}

function openAppUpdateModal() {
  const modal = $("#appUpdateModal");
  modal.dataset.running = "false";
  modal.classList.remove("hidden");
  $("#installAppUpdate").classList.add("hidden");
  $("#appUpdateStateIcon").textContent = "↻";
  $("#appUpdateStateIcon").classList.add("spinning");
  $("#appUpdateStateTitle").textContent = "Recherche d'une nouvelle version";
  $("#appUpdateStateDetail").textContent = "Connexion aux Releases GitHub officielles...";
  $("#appCurrentVersion").textContent = "—";
  $("#appLatestVersion").textContent = "—";
  if (window.chrome?.webview) window.chrome.webview.postMessage({action:"check-app-update", payload:{}});
  else {
    $("#appUpdateStateIcon").classList.remove("spinning");
    $("#appUpdateStateTitle").textContent = "Disponible dans l'application Windows";
    $("#appUpdateStateDetail").textContent = "La démonstration web ne peut pas mettre à jour l'exécutable.";
  }
}

function closeAppUpdateModal() {
  if ($("#appUpdateModal").dataset.running === "true") return;
  $("#appUpdateModal").classList.add("hidden");
}

function beginAppUpdate() {
  window.open(appUpdateReleasePage, "_blank", "noopener");
}

function renderAppUpdateState(message) {
  const icon = $("#appUpdateStateIcon");
  const install = $("#installAppUpdate");
  const notification = $("#appUpdateNotification");
  $("#appCurrentVersion").textContent = message.current || "—";
  if (message.latest) $("#appLatestVersion").textContent = message.latest;
  icon.classList.toggle("spinning", ["checking", "downloading"].includes(message.status));
  install.classList.add("hidden");
  if (message.status === "checking") {
    $("#appUpdateStateTitle").textContent = "Recherche d'une nouvelle version";
    $("#appUpdateStateDetail").textContent = "Lecture de la dernière Release GitHub...";
  } else if (message.status === "available") {
    const officialRelease = "https://github.com/OwlNetGeekFR/OwlSetup/releases/";
    appUpdateReleasePage = typeof message.page === "string" && message.page.startsWith(officialRelease) ? message.page : `${officialRelease}latest`;
    notification.title = `${message.latest} disponible · ouvrir les notifications`;
    notification.setAttribute("aria-label", `Mise à jour OwlSetup ${message.latest} disponible`);
    if (notification.dataset.notified !== message.latest) {
      notification.dataset.notified = message.latest;
      notifyAction("Mise à jour disponible", `OwlSetup ${message.latest} est disponible sur GitHub.`);
      addNotification({key:`owlsetup-update-${message.latest}`, title:`OwlSetup ${message.latest} est disponible`, detail:"Téléchargez la nouvelle version depuis la Release GitHub officielle.", kind:"warning", action:"self-update", symbol:"↻"});
    }
    icon.textContent = "↓";
    $("#appUpdateStateTitle").textContent = `OwlSetup ${message.latest} est disponible`;
    $("#appUpdateStateDetail").textContent = "Ouvrez la Release officielle GitHub pour télécharger cette version.";
    install.classList.remove("hidden"); install.disabled = false;
  } else if (message.status === "current") {
    notification.title = "Notifications";
    notification.setAttribute("aria-label", "Ouvrir les notifications");
    icon.textContent = "✓";
    $("#appLatestVersion").textContent = message.latest || message.current;
    $("#appUpdateStateTitle").textContent = "OwlSetup est à jour";
    $("#appUpdateStateDetail").textContent = "Vous utilisez déjà la dernière version disponible.";
  } else if (message.status === "beta") {
    $("#appUpdateModal").dataset.running = "false";
    $("#closeAppUpdate").disabled = false;
    $("#cancelAppUpdate").disabled = false;
    install.disabled = true;
    notification.title = "Version bêta locale";
    notification.setAttribute("aria-label", "Version bêta locale");
    icon.classList.remove("spinning");
    icon.textContent = "β";
    $("#appLatestVersion").textContent = "Publication désactivée";
    $("#appUpdateStateTitle").textContent = "Version bêta locale";
    $("#appUpdateStateDetail").textContent = "Cette construction sert aux tests et ne sera pas remplacée automatiquement.";
  } else if (message.status === "downloading") {
    icon.textContent = "↻";
    $("#appUpdateStateTitle").textContent = "Téléchargement sécurisé";
    $("#appUpdateStateDetail").textContent = "Téléchargement puis vérification de l'empreinte SHA-256...";
  } else if (message.status === "restarting") {
    icon.classList.remove("spinning"); icon.textContent = "✓";
    $("#appLatestVersion").textContent = message.latest || "—";
    $("#appUpdateStateTitle").textContent = "Mise à jour vérifiée";
    $("#appUpdateStateDetail").textContent = "OwlSetup va redémarrer avec la nouvelle version.";
  } else if (message.status === "error") {
    $("#appUpdateModal").dataset.running = "false";
    $("#closeAppUpdate").disabled = false;
    $("#cancelAppUpdate").disabled = false;
    icon.classList.remove("spinning"); icon.textContent = "!";
    $("#appUpdateStateTitle").textContent = "Mise à jour impossible";
    $("#appUpdateStateDetail").textContent = message.message || "Vérifiez votre connexion Internet.";
  }
}

function handleInstallMessage(message) {
  if (!message) return;
  if (message.type === "tool-progress") {
    setToolProgress(message.tool,message.percent,message.status);
    return;
  }
  if (message.type === "portable-access-ready") {
    notify(`${message.name} est prêt`,"Un raccourci a été ajouté au menu Démarrer.");
    return;
  }
  if (message.type === "security-status") {
    const mark=(selector,ok,good,bad)=>{const element=$(selector);element.textContent=ok?good:bad;element.classList.toggle("security-good",!!ok);element.classList.toggle("security-warning",!ok);};
    const protectedCore=message.integrity&&message.originLocked&&message.standardUser;
    $("#securityHeadline").textContent=protectedCore?"Protections principales actives":"Une protection demande votre attention";
    $("#securityVersion").textContent=`OwlSetup ${message.version}`;
    $("#securityElevation").textContent=message.standardUser?message.elevation:"Interface actuellement administrateur";
    mark("#securityIntegrity",message.integrity,"Intégrité vérifiée","Interface modifiée");
    mark("#securityOrigin",message.originLocked,"Origine verrouillée","Origine non verrouillée");
    mark("#securitySignature",message.signed&&message.trusted,"Signature approuvée",message.signed?"Signature non approuvée":"Bêta locale non signée");
    $("#securitySigner").textContent=message.signer;
    mark("#securityWinget",message.winget!=="Indisponible",message.winget,"WinGet indisponible");
    mark("#securityWebView",message.webview!=="Indisponible",message.webview,"WebView2 indisponible");
    mark("#securityWorker",message.secureRuntime,"Dossier protégé actif","Créé au premier nettoyage");
    $("#securityLogs").textContent=`${message.logs} rapport(s) conservé(s) dans ${message.logFolder}`;
    const securityWarnings=[
      !message.integrity,
      !message.originLocked,
      !message.standardUser,
      !(message.signed&&message.trusted),
      message.winget==="Indisponible",
      message.webview==="Indisponible",
      !message.secureRuntime
    ].filter(Boolean).length;
    setNavAlert("#securityNavBadge", securityWarnings, securityWarnings > 0);
    return;
  }
  if (message.type === "uninstall-simulation") {
    if(message.id!==pendingUninstallId)return;
    $("#uninstallSimulationStatus").textContent=message.installed?"Aperçu terminé · valable 5 minutes":"Paquet non détecté par WinGet";
    $("#uninstallPreviewPackage").textContent=message.version?`${message.id} · ${message.version}`:message.id;
    $("#uninstallPreviewScope").textContent=message.scope;
    $("#uninstallPreviewShortcuts").textContent=`${message.shortcuts} raccourci(s)`;
    $("#confirmUninstall").disabled=!message.installed;
    return;
  }
  if (message.type === "uninstall-simulation-error") {
    if(message.id!==pendingUninstallId)return;
    $("#uninstallSimulationStatus").textContent=`Simulation impossible : ${message.message}`;
    $("#uninstallPreviewScope").textContent="À vérifier";
    $("#uninstallPreviewShortcuts").textContent="—";
    $("#confirmUninstall").disabled=true;
    return;
  }
  if (message.type === "batch-uninstall-simulation") {
    openBatchUninstallModal(message.packages || []);
    return;
  }
  if (message.type === "winget-diagnostic") {
    $("#wingetDiagnosticText").textContent = `${message.message}${message.version ? ` (${message.version})` : ""}`;
    $("#wingetDiagnosticText").classList.toggle("tool-success", message.available && message.sources);
    setNavAlert("#toolsNavBadge", message.available && message.sources ? 0 : "!", true);
    return;
  }
  if (message.type === "winget-repair-start") {
    $("#wingetDiagnosticText").textContent = "Réenregistrement d'App Installer et actualisation des sources...";
    return;
  }
  if (message.type === "winget-repair-complete") {
    $("#wingetDiagnosticText").textContent = message.success ? "WinGet a été réparé et ses sources ont été actualisées." : `Réparation incomplète (code ${message.code}). Consultez ${message.logName}.`;
    notify(message.success ? "WinGet réparé" : "Réparation à vérifier", $("#wingetDiagnosticText").textContent);
    setNavAlert("#toolsNavBadge", message.success ? 0 : "!", true);
    return;
  }
  if (message.type === "restore-point-start") {
    $("#restorePointText").textContent = "Création du point de restauration...";
    return;
  }
  if (message.type === "restore-point-complete") {
    $("#restorePointText").textContent = message.success ? "Point de restauration créé avec succès." : `Création impossible (code ${message.code}). La protection du système peut être désactivée.`;
    notify(message.success ? "Point créé" : "Point non créé", $("#restorePointText").textContent);
    return;
  }
  if (message.type === "history-state") {
    $("#operationHistory").innerHTML = (message.items || []).length ? message.items.map(item => {
      const resultClass = ["success","failed"].includes(item.result) ? item.result : "";
      return `<article><span class="history-type ${resultClass}">${escapeHtml(item.type)}</span><div><strong>${escapeHtml(item.title||item.name)}</strong><small>${escapeHtml(item.date)} · ${escapeHtml(item.size)}${item.summary?` · ${escapeHtml(item.summary)}`:""}</small></div><span class="history-actions"><button data-open-log="${encodeURIComponent(item.name)}">Journal</button>${item.reportName?`<button data-open-report="${encodeURIComponent(item.reportName)}">Rapport visuel</button>`:""}</span></article>`;
    }).join("") : `<p class="tool-empty">Aucun rapport enregistré.</p>`;
    return;
  }
  if (message.type === "report-data") {
    renderReportViewer(message);
    return;
  }
  if (message.type === "history-error") {
    $("#operationHistory").innerHTML = `<p class="tool-empty">${escapeHtml(message.message)}</p>`; return;
  }
  if (message.type === "startup-state") {
    $("#startupList").innerHTML = (message.items || []).length ? message.items.map(item => `<article><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.source)} · ${escapeHtml(item.command)}</small></div></article>`).join("") : `<p class="tool-empty">Aucun élément de démarrage détecté.</p>`;
    return;
  }
  if (message.type === "disk-scan-start") {
    setToolProgress("disk",5,"Préparation de l'analyse...");
    $("#diskList").innerHTML = `<p class="tool-empty">Analyse en cours, cela peut prendre quelques instants...</p>`; return;
  }
  if (message.type === "disk-scan-state") {
    const max=Math.max(...(message.items || []).map(item=>Number(item.bytes)),1);
    $("#diskList").innerHTML = (message.items || []).map(item => `<article class="disk-item"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.path)} · ${Number(item.files)||0} fichiers</small><i style="width:${Math.min(100,Math.max(2,Number(item.bytes)/max*100))}%"></i></div><b>${escapeHtml(item.size)}</b></article>`).join("");
    return;
  }
  if (message.type === "disk-scan-error") {
    $("#diskList").innerHTML = `<p class="tool-empty">${escapeHtml(message.message)}</p>`; return;
  }
  if (message.type === "batch-uninstall-start") {
    $("#batchUninstallProgressTitle").textContent="Désinstallation en cours";
    $("#batchUninstallProgressDetail").textContent=`${message.total} logiciel(s) dans la file`;
    setBackgroundUninstall("Désinstallation en cours", `${message.total} logiciel(s) dans la file`, 4);
    return;
  }
  if (message.type === "batch-uninstall-progress") {
    const percent=Math.max(5,Math.round(((message.index-1)/Math.max(message.total,1))*100));
    const app=apps.find(item=>item.id===message.id);
    $("#batchUninstallProgressBar").style.width=`${percent}%`;
    $("#batchUninstallProgressPercent").textContent=`${percent}%`;
    $("#batchUninstallCurrent").textContent=app?.name||message.id;
    $("#batchUninstallPosition").textContent=`${message.index}/${message.total}`;
    setBackgroundUninstall(`Désinstallation de ${app?.name||message.id}`, `${message.index} sur ${message.total}`, percent);
    return;
  }
  if (message.type === "batch-uninstall-item") {
    const modal=$("#batchUninstallModal");
    const key=message.success?"success":"failed";
    modal.dataset[key]=String(Number(modal.dataset[key]||0)+1);
    const row=[...document.querySelectorAll("[data-batch-package]")].find(item=>item.dataset.batchPackage===message.id);
    if(row){const state=row.querySelector(".batch-item-state");state.textContent=message.success?"Désinstallé":"À vérifier";state.className=`batch-item-state ${message.success?"success":"failed"}`;}
    if(message.success){installedApps.delete(message.id);managedInstalled.delete(message.id);renderApps();}
    $("#batchUninstallResult").textContent=`${modal.dataset.success} réussi · ${modal.dataset.failed} à vérifier`;
    const app=apps.find(item=>item.id===message.id);
    const percent=Math.round((message.index/Math.max(message.total,1))*100);
    setBackgroundUninstall(message.success?`${app?.name||message.id} désinstallé`:`${app?.name||message.id} à vérifier`,`${message.index} sur ${message.total} traité(s)`,percent,message.success?"running":"warning");
    addNotification({key:`${currentUninstallRun}-${message.id}`,title:message.success?`${app?.name||message.id} est désinstallé`:`${app?.name||message.id} est à vérifier`,detail:message.success?"L'application a été retirée du PC.":(message.errorMessage||`Code de sortie ${message.code}`),kind:message.success?"success":"warning",action:"installed",symbol:message.success?"✓":"!"});
    return;
  }
  if (message.type === "batch-uninstall-complete") {
    $("#batchUninstallModal").dataset.running="false";
    $("#batchUninstallProgressBar").style.width="100%";
    $("#batchUninstallProgressPercent").textContent="100%";
    $("#batchUninstallProgressTitle").textContent=message.failed?"Désinstallation terminée avec vérifications":"Désinstallation terminée";
    $("#batchUninstallProgressDetail").textContent=`${message.success} réussi(s) · ${message.failed} à vérifier`;
    $("#batchUninstallCurrent").textContent=`Rapport : ${message.logName}`;
    $("#batchUninstallResult").textContent=`${message.success} réussi · ${message.failed} à vérifier`;
    $("#batchUninstallBackgroundActions").classList.add("hidden");
    const residues=message.residues||[];
    if(residues.length){
      pendingBatchResidueToken=message.residueToken||"";
      $("#batchResidueTitle").textContent=`${residues.length} dossier${residues.length>1?"s":""} · ${message.residueSize||"taille inconnue"}`;
      $("#batchResidueList").innerHTML=residues.map(item=>`<article><span>▣</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.display)}</small></div><b>${escapeHtml(item.size)}</b></article>`).join("");
      $("#batchResiduePanel").classList.remove("hidden");
      $("#finishBatchUninstall").classList.add("hidden");
      $("#batchUninstallModal").classList.remove("hidden");
      setBackgroundUninstall("Décision requise", `${residues.length} dossier(s) résiduel(s) à vérifier`, 100, "warning");
      notify("Dossiers résiduels détectés", "Vérifiez-les avant de les conserver ou de les placer en quarantaine.");
    }else $("#finishBatchUninstall").classList.remove("hidden");
    if(!residues.length)setBackgroundUninstall(message.failed?"Désinstallation terminée avec vérifications":"Désinstallation terminée",`${message.success} réussi(s) · ${message.failed} à vérifier`,100,message.failed?"warning":"complete");
    addNotification({key:`${currentUninstallRun}-summary`,title:residues.length?"Désinstallation terminée · décision requise":message.failed?"Désinstallation terminée avec avertissement":"Désinstallation terminée",detail:residues.length?`${residues.length} dossier(s) résiduel(s) à vérifier`:`${message.success} application(s) retirée(s) · ${message.failed} à vérifier`,kind:(residues.length||message.failed)?"warning":"success",action:"installed",symbol:(residues.length||message.failed)?"!":"✓"});
    requestHistory(); requestInstalledScan();
    return;
  }
  if (message.type === "app-info") {
    currentBuildVersion = message.version || "inconnue";
    currentBuildChannel = message.channel || (message.beta ? "beta" : "stable");
    if (message.beta) {
      $("#buildBadge").classList.remove("hidden");
      $("#buildBadge").textContent = "BÊTA";
      $("#buildSubtitle").textContent = message.version;
      document.title = `OwlSetup BÊTA ${message.version}`;
      document.body.classList.add("beta-build");
      document.querySelectorAll(".beta-only").forEach(element=>element.classList.remove("hidden"));
    }
    return;
  }
  if (message.type === "feedback-diagnostics") {
    feedbackDiagnostics=`- Windows : ${message.windows || "Indisponible"}\n- Architecture : ${message.architecture || "Indisponible"}\n- WinGet : ${message.winget || "Indisponible"}\n- WebView2 : ${message.webview || "Indisponible"}\n- OwlSetup : ${message.version || currentBuildVersion}`;
    $("#feedbackDiagnostics").textContent=feedbackDiagnostics;
    $("#feedbackDiagnostics").classList.remove("hidden");
    $("#collectFeedbackDiagnostics").disabled=false;
    $("#collectFeedbackDiagnostics").textContent="Actualiser le diagnostic →";
    notify("Diagnostic terminé", "Vérifiez son aperçu avant de le joindre.");
    return;
  }
  if (message.type === "config-export-start") {
    notify("Sauvegarde en cours", "Lecture des logiciels installés avec WinGet...");
    return;
  }
  if (message.type === "config-export-complete") {
    notify(message.success ? "Configuration sauvegardée" : "Sauvegarde impossible", message.success ? `${message.count} logiciel(s) enregistrés dans ${message.file}.` : message.message);
    return;
  }
  if (message.type === "config-imported") {
    const known = new Set(apps.map(app => app.id.toLocaleLowerCase()));
    const restored = (message.packages || []).filter(id => known.has(String(id).toLocaleLowerCase()) && !installedApps.has(id) && !apps.some(app=>app.id===id && app.manualInstall));
    selected = new Set(restored);
    document.querySelectorAll("[data-cleanup]").forEach(input => { input.checked = (message.cleanup || []).includes(input.dataset.cleanup); });
    updateCleanupCount(); renderApps(); renderSelection(); showView("queue");
    notify("Configuration restaurée", `${restored.length} logiciel(s) disponible(s) ajouté(s) à la sélection depuis ${message.file}.`);
    return;
  }
  if (message.type === "config-import-error") {
    notify("Restauration impossible", message.message);
    return;
  }
  if (message.type === "cleanup-analysis-start") {
    $("#cleanupAnalysisTitle").textContent = "Analyse en cours...";
    return;
  }
  if (message.type === "cleanup-analysis") {
    $("#cleanupAnalysisTitle").textContent = `${message.size} récupérables estimés`;
    $("#cleanupModalDetail").textContent = `${(message.items || []).reduce((sum, item) => sum + Number(item.files || 0), 0)} fichier(s) mesurés avant suppression`;
    $("#cleanupAnalysisList").innerHTML = (message.items || []).map(item => `<article><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.path)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</small></div><b>${item.bytes ? escapeHtml(item.size) : "À calculer"}</b></article>`).join("");
    $("#protectedFoldersList").textContent = (message.protectedFolders || []).join(" · ");
    $("#protectedFolders").classList.remove("hidden");
    $("#confirmCleanup").disabled = false;
    return;
  }
  if (message.type === "cleanup-analysis-error") {
    $("#cleanupAnalysisTitle").textContent = "Analyse incomplète";
    $("#cleanupModalDetail").textContent = message.message;
    $("#confirmCleanup").disabled = true;
    return;
  }
  if (message.type === "app-update-state") {
    renderAppUpdateState(message);
    return;
  }
  if (message.type === "health-scanning") {
    $("#refreshHealth").classList.add("scanning");
    return;
  }
  if (message.type === "health-state") {
    renderHealth(message);
    return;
  }
  if (message.type === "updates-scanning") {
    $("#updateScanState").classList.remove("hidden");
    $("#scanUpdatesBtn").disabled = true;
    return;
  }
  if (message.type === "updates-found") {
    availableUpdates = message.updates || [];
    selectedUpdates = new Set(availableUpdates.map(update => update.id));
    updatesLoaded = true;
    renderAvailableUpdates();
    if (availableUpdates.length) {
      addNotification({
        key:"application-updates",
        title:`${availableUpdates.length} mise${availableUpdates.length > 1 ? "s" : ""} à jour disponible${availableUpdates.length > 1 ? "s" : ""}`,
        detail:availableUpdates.slice(0, 3).map(update => update.name).join(", ") + (availableUpdates.length > 3 ? ` et ${availableUpdates.length - 3} autre(s)` : ""),
        kind:"warning", action:"updates", symbol:"↥"
      });
    } else {
      notificationFeed = notificationFeed.filter(item => item.key !== "application-updates");
      saveNotificationFeed(); renderNotificationFeed();
    }
    if (message.error) notify("Analyse partielle", message.error);
    return;
  }
  if (message.type === "quarantine-state") {
    renderQuarantine(message.items);
    return;
  }
  if (message.type === "quarantine-error") {
    renderQuarantine([]);
    notify("Quarantaine inaccessible", message.error);
    return;
  }
  if (message.type === "quarantine-action") {
    notify(message.success ? "Action terminée" : "Action impossible", message.message);
    requestHealth();
    return;
  }
  if (message.type === "cleanup-start") {
    $("#cleanupProgressBar").style.width = "6%";
    $("#cleanupProgressPercent").textContent = "6%";
    return;
  }
  if (message.type === "cleanup-stage") {
    $("#cleanupProgressTitle").textContent = "Nettoyage en cours";
    $("#cleanupProgressDetail").textContent = message.label;
    $("#cleanupProgressPercent").textContent = `${message.percent}%`;
    $("#cleanupProgressBar").style.width = `${message.percent}%`;
    $("#cleanupCurrentZone").textContent = message.label;
    $("#cleanupZonePosition").textContent = `${message.index}/${message.total}`;
    return;
  }
  if (message.type === "cleanup-complete") {
    $("#cleanupModal").dataset.running = "false";
    $("#closeCleanupModal").disabled = false;
    $("#cleanupProgressBar").style.width = "100%";
    $("#cleanupProgressPercent").textContent = "100%";
    $("#cleanupProgressTitle").textContent = message.success ? "Nettoyage terminé" : "Nettoyage terminé avec avertissement";
    $("#cleanupProgressDetail").textContent = message.success ? "Les zones sélectionnées ont été traitées" : `Certaines zones sont à vérifier (code ${message.code})`;
    $("#cleanupCurrentZone").closest(".cleanup-current-zone").classList.add("hidden");
    $("#cleanupResultCard").classList.remove("hidden");
    $("#cleanupRecovered").textContent = `${message.recovered || "0"} Go`;
    $("#cleanupSummaryText").textContent = `Rapport rangé dans OwlSetup : ${message.logName}`;
    $("#finishCleanup").classList.remove("hidden");
    requestHealth(); requestQuarantine();
    return;
  }
  if (message.type === "update-start") {
    $("#updateProgressBar").style.width = "5%";
    $("#updateProgressPercent").textContent = "5%";
    return;
  }
  if (message.type === "update-stage") {
    $("#updateProgressTitle").textContent = message.title;
    $("#updateProgressDetail").textContent = message.detail;
    $("#updateProgressPercent").textContent = `${message.percent}%`;
    $("#updateProgressBar").style.width = `${message.percent}%`;
    showUpdateStage(message.stage);
    return;
  }
  if (message.type === "update-complete") {
    $("#updateModal").dataset.running = "false";
    $("#closeUpdateModal").disabled = false;
    $("#updateProgressBar").style.width = "100%";
    $("#updateProgressPercent").textContent = "100%";
    $("#updateProgressTitle").textContent = message.success ? "Votre PC est à jour" : "Mise à jour terminée avec avertissement";
    $("#updateProgressDetail").textContent = message.appsSuccess ? "Applications traitées avec succès" : (message.errorMessage || `Certaines applications sont à vérifier (code ${message.code})`);
    $("#updateSummary").textContent = `${message.windowsStarted ? "Recherche Windows Update lancée." : "Windows Update n'a pas pu être lancé."} Rapport : ${message.logName}`;
    document.querySelectorAll("[data-update-step]").forEach(step => { step.classList.remove("active"); step.classList.add("done"); });
    $("#finishUpdate").classList.remove("hidden");
    addNotification({
      key:`system-update-${Date.now()}`,
      title:message.success ? "Mises à jour terminées" : "Mises à jour à vérifier",
      detail:message.appsSuccess ? "Les applications sélectionnées ont été traitées." : (message.errorMessage || "Consultez le rapport OwlSetup."),
      kind:message.success ? "success" : "warning", action:"updates", symbol:message.success ? "✓" : "!"
    });
    updatesLoaded = false; requestHealth();
    return;
  }
  if (message.type === "installed-state") {
    installedApps = new Set(message.ids || []);
    managedInstalled = new Set([...managedInstalled].filter(id => installedApps.has(id)));
    installedApps.forEach(id => selected.delete(id));
    renderApps(); renderSelection();
    if (message.warning && message.method === "registre") {
      notify("Détection de secours active", `${message.count || 0} logiciel(s) reconnu(s) grâce au registre Windows.`);
    }
    return;
  }
  if (message.type === "uninstall-start") {
    $("#uninstallProgressBar").style.width = "55%";
    $("#uninstallProgressDetail").textContent = `Suppression de ${message.id}`;
    const app=apps.find(item=>item.id===message.id);
    setBackgroundUninstall(`Désinstallation de ${app?.name||message.id}`, "Suppression avec WinGet", 55);
    return;
  }
  if (message.type === "repair-start") {
    $("#repairProgressBar").style.width = "55%";
    $("#repairProgressDetail").textContent = `Réparation de ${message.id}`;
    return;
  }
  if (message.type === "repair-fallback") {
    $("#repairProgressBar").style.width = "72%";
    $("#repairProgressTitle").textContent = "Réinstallation réparatrice";
    $("#repairProgressDetail").textContent = "La réparation native n'est pas disponible. OwlSetup réinstalle l'application sans la désinstaller.";
    return;
  }
  if (message.type === "repair-complete") {
    $("#repairModal").dataset.running = "false";
    $("#closeRepairModal").disabled = false;
    $("#repairProgressBar").style.width = "100%";
    $("#repairProgressTitle").textContent = message.success ? "Logiciel réparé" : "Réparation impossible";
    $("#repairProgressDetail").textContent = message.success
      ? (message.mode === "reinstall" ? "L'application a été réinstallée par-dessus sa version actuelle afin de réparer ses fichiers." : "WinGet a terminé la réparation native.")
      : (message.errorMessage || `La réparation native et la réinstallation ont échoué (code ${message.code}).`);
    $("#repairSummary").textContent = `Rapport : ${message.logName}`;
    $("#finishRepair").classList.remove("hidden");
    return;
  }
  if (message.type === "uninstall-complete") {
    $("#uninstallModal").dataset.running = "false";
    $("#closeUninstallModal").disabled = false;
    $("#uninstallProgressBar").style.width = "100%";
    $("#uninstallProgressTitle").textContent = message.success ? "Logiciel désinstallé" : "Désinstallation à vérifier";
    $("#uninstallProgressDetail").textContent = message.success ? "L'application a été supprimée." : (message.errorMessage || `Code de sortie : ${message.code}`);
    const residues=message.residues||[];
    $("#uninstallBackgroundActions").classList.add("hidden");
    $("#uninstallSummary").textContent = message.success ? (residues.length?`${residues.length} dossier(s) résiduel(s) trouvé(s). Vérifiez-les ci-dessous.`:"La carte a été actualisée automatiquement. Aucun dossier résiduel ciblé n’a été trouvé.") : "Consultez le rapport rangé dans OwlSetup.";
    if(message.success&&residues.length){
      pendingUninstallResidueToken=message.residueToken||"";
      $("#uninstallResidueTitle").textContent=`${residues.length} dossier${residues.length>1?"s":""} · ${message.residueSize||"taille inconnue"}`;
      $("#uninstallResidueList").innerHTML=residues.map(item=>`<article><span>▣</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.display)}</small></div><b>${escapeHtml(item.size)}</b></article>`).join("");
      $("#uninstallResiduePanel").classList.remove("hidden");
      $("#finishUninstall").classList.add("hidden");
      $("#uninstallModal").classList.remove("hidden");
      setBackgroundUninstall("Décision requise", `${residues.length} dossier(s) résiduel(s) à vérifier`, 100, "warning");
      notify("Dossiers résiduels détectés", "Vérifiez-les avant de les conserver ou de les placer en quarantaine.");
    }else $("#finishUninstall").classList.remove("hidden");
    if(!residues.length)setBackgroundUninstall(message.success?"Désinstallation terminée":"Désinstallation à vérifier",message.success?"L'application a été retirée du PC.":(message.errorMessage||`Code de sortie ${message.code}`),100,message.success?"complete":"warning");
    const app=apps.find(item=>item.id===message.id);
    addNotification({key:`${currentUninstallRun}-summary`,title:residues.length?"Désinstallation terminée · décision requise":message.success?`${app?.name||message.id} est désinstallé`:`${app?.name||message.id} est à vérifier`,detail:residues.length?`${residues.length} dossier(s) résiduel(s) à vérifier`:message.success?"L'application a été retirée du PC.":(message.errorMessage||`Code de sortie ${message.code}`),kind:(residues.length||!message.success)?"warning":"success",action:"installed",symbol:(residues.length||!message.success)?"!":"✓"});
    if (message.success) { installedApps.delete(message.id); managedInstalled.delete(message.id); renderApps(); }
    requestHealth();
    return;
  }
  if(message.type==="uninstall-residues-complete"&&message.context!=="batch"){
    $("#quarantineUninstallResidues").disabled=false;
    $("#uninstallResiduePanel").classList.add("hidden");
    $("#finishUninstall").classList.remove("hidden");
    $("#uninstallSummary").textContent=message.failed?`${message.moved} dossier(s) placé(s) en quarantaine · ${message.failed} à vérifier.`:`${message.moved} dossier(s) placé(s) en quarantaine réversible.`;
    pendingUninstallResidueToken="";
    setBackgroundUninstall(message.failed?"Nettoyage terminé avec vérifications":"Nettoyage terminé",message.failed?`${message.failed} dossier(s) à vérifier`:`${message.moved} dossier(s) en quarantaine réversible`,100,message.failed?"warning":"complete");
    requestHealth();requestQuarantine();requestHistory();
    return;
  }
  if(message.type==="uninstall-residues-complete"&&message.context==="batch"){
    $("#quarantineBatchResidues").disabled=false;
    $("#batchResiduePanel").classList.add("hidden");
    $("#finishBatchUninstall").classList.remove("hidden");
    $("#batchUninstallResult").textContent=message.failed?`${message.moved} dossier(s) en quarantaine · ${message.failed} à vérifier`:`${message.moved} dossier(s) en quarantaine réversible`;
    pendingBatchResidueToken="";
    setBackgroundUninstall(message.failed?"Nettoyage terminé avec vérifications":"Nettoyage terminé",message.failed?`${message.failed} dossier(s) à vérifier`:`${message.moved} dossier(s) en quarantaine réversible`,100,message.failed?"warning":"complete");
    requestHealth();requestQuarantine();requestHistory();return;
  }
  if (message.type === "install-preflight-progress") {
    if(Number(message.requestId)!==installPreflightRequestId)return;
    setPreflightState(message.key,message.state||"checking",message.detail);
    $("#preflightTitle").textContent=message.title||"Diagnostic en cours...";
    return;
  }
  if (message.type === "install-preflight-complete") {
    if(Number(message.requestId)!==installPreflightRequestId)return;
    $("#preflightTitle").textContent=message.ready?"Votre PC est prêt":"Action requise avant installation";
    $("#confirmInstall").disabled=!message.ready;
    if(message.ready) $("#confirmInstall").focus();
    else if(message.message) notify("Diagnostic d’installation",message.message);
    return;
  }
  if (!message.type?.startsWith("install-")) return;
  if (message.type === "install-start") {
    $("#progressTitle").textContent = "Installation en cours";
    $("#progressDetail").textContent = `${message.total} logiciel(s) dans la file`;
    setBackgroundInstall("Installation en cours", `${message.total} logiciel(s) dans la file`, 2);
  }
  if (message.type === "install-progress") {
    const percent = Math.round(((message.index - 1) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#currentPackage").textContent = message.id;
    $("#packageResult").textContent = "INSTALLATION";
    const app = apps.find(item => item.id === message.id);
    setBackgroundInstall(`Installation de ${app?.name || message.id}`, `${message.index} sur ${message.total}`, percent);
  }
  if (message.type === "install-security") {
    const percent = Math.round(((message.index - 1 + .25) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#packageResult").textContent = message.success ? "SOURCE VÉRIFIÉE" : "SOURCE INTROUVABLE";
    const app = apps.find(item => item.id === message.id);
    setBackgroundInstall(`Vérification de ${app?.name || message.id}`, message.success ? "Source officielle vérifiée" : "Source à vérifier", percent, message.success ? "running" : "warning");
  }
  if (message.type === "install-execution") {
    const percent = Math.round(((message.index - 1 + .45) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#progressDetail").textContent = `Installation de ${message.id} avec WinGet`;
    $("#packageResult").textContent = "INSTALLATION EN COURS";
    const app = apps.find(item => item.id === message.id);
    setBackgroundInstall(`Installation de ${app?.name || message.id}`, "Téléchargement et installation avec WinGet", percent);
  }
  if (message.type === "install-item") {
    const percent = Math.round((message.index / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#packageResult").textContent = message.success ? "TERMINÉ ✓" : "À VÉRIFIER";
    const app = apps.find(item => item.id === message.id);
    if (!message.success && message.errorMessage) $("#progressDetail").textContent = message.errorMessage;
    if (message.success) {
      installedApps.add(message.id); selected.delete(message.id); renderApps(); renderSelection();
      addNotification({key:`${currentInstallRun}-${message.id}`, title:`${app?.name || message.id} est installé`, detail:"L'application est maintenant disponible sur votre PC.", kind:"success", action:"installed", symbol:"✓"});
    } else {
      addNotification({key:`${currentInstallRun}-${message.id}`, title:`${app?.name || message.id} est à vérifier`, detail:message.errorMessage || `Code de sortie ${message.code}`, kind:"warning", action:"history", symbol:"!"});
    }
    setBackgroundInstall(message.success ? `${app?.name || message.id} installé` : `${app?.name || message.id} à vérifier`, `${message.index} sur ${message.total} traité(s)`, percent, message.success ? "running" : "warning");
  }
  if (message.type === "install-complete") {
    $("#installModal").dataset.running = "false";
    $("#closeInstallModal").disabled = false;
    $("#progressTitle").textContent = message.failed ? "Installation terminée avec avertissement" : "Installation terminée";
    $("#progressDetail").textContent = `${message.success} réussi(s), ${message.failed} à vérifier`;
    $("#progressPercent").textContent = "100%";
    $("#progressBar").style.width = "100%";
    $("#progressSummary").textContent = `Rapport rangé dans OwlSetup : ${message.logName}`;
    lastFailedInstallPackages=[...(message.failedPackages||[])];
    lastInstallReportName=message.reportName||"";
    $("#openInstallReport").classList.toggle("hidden",!lastInstallReportName);
    $("#retryFailedInstall").classList.toggle("hidden",lastFailedInstallPackages.length===0);
    $("#installResultActions").classList.remove("hidden");
    $("#installBackgroundActions").classList.add("hidden");
    $("#finishInstall").classList.remove("hidden");
    setBackgroundInstall(message.failed ? "Installation terminée avec vérifications" : "Installation terminée", `${message.success} réussi(s) · ${message.failed} à vérifier`, 100, message.failed ? "warning" : "complete");
    addNotification({
      key:`${currentInstallRun}-summary`,
      title:message.failed ? "Installation terminée avec avertissement" : "Installation terminée",
      detail:`${message.success} application(s) installée(s) · ${message.failed} à vérifier`,
      kind:message.failed ? "warning" : "success", action:"install-result", symbol:message.failed ? "!" : "✓"
    });
    requestHistory();
    requestHealth();
  }
}

if (window.chrome && window.chrome.webview) {
  window.chrome.webview.addEventListener("message", event => handleInstallMessage(event.data));
  window.chrome.webview.postMessage({action:"get-app-info", payload:{}});
  window.chrome.webview.postMessage({action:"scan-installed", payload:{ids:apps.map(app => app.id), apps:apps.map(app => ({id:app.id,name:app.name,portable:!!app.portable}))}});
  window.chrome.webview.postMessage({action:"check-app-update", payload:{}});
  requestHealth();
  requestQuarantine();
  requestSecurityStatus();
}

document.addEventListener("click", event => {
  const card = event.target.closest("[data-app]");
  const installedCard = event.target.closest("[data-installed-app]");
  const officialLink = event.target.closest(".official-link");
  const uninstall = event.target.closest("[data-uninstall]");
  const repair = event.target.closest("[data-repair]");
  const manageInstalled = event.target.closest("[data-manage-installed]");
  const nav = event.target.closest("[data-view]");
  const category = event.target.closest("[data-category]");
  const preset = event.target.closest("[data-preset]");
  const remove = event.target.closest("[data-remove]");
  const quarantineAction = event.target.closest("[data-quarantine-action]");
  const openLog = event.target.closest("[data-open-log]");
  const openReport = event.target.closest("[data-open-report]");
  if (uninstall) openUninstallModal(uninstall.dataset.uninstall);
  if (repair) openRepairModal(repair.dataset.repair);
  if (manageInstalled) {
    const id=manageInstalled.dataset.manageInstalled;
    if(managedInstalled.has(id))managedInstalled.delete(id);else managedInstalled.add(id);
    renderApps();
  }
  if (installedCard && !uninstall && !repair && !manageInstalled && !officialLink) {
    const id=installedCard.dataset.installedApp;
    if(managedInstalled.has(id))managedInstalled.delete(id);else managedInstalled.add(id);
    renderApps();
  }
  if (openLog && window.chrome?.webview) window.chrome.webview.postMessage({action:"open-log",payload:{name:decodeURIComponent(openLog.dataset.openLog)}});
  if (openReport) openReportViewer(decodeURIComponent(openReport.dataset.openReport));
  if (card && !uninstall && !repair && !manageInstalled && !officialLink) toggleApp(card.dataset.app);
  if (nav) showView(nav.dataset.view);
  if (event.target.closest("[data-focus-cleanup]")) {
    const target = event.target.closest("[data-focus-cleanup]").dataset.focusCleanup;
    const input = document.querySelector(`[data-cleanup="${target}"]`);
    if (input) { input.checked = true; updateCleanupCount(); input.closest(".cleanup-option").scrollIntoView({behavior:"smooth", block:"center"}); }
  }
  if (category) { activeCategory = category.dataset.category; renderFilters(); renderApps(); }
  if (preset) { apps.filter(app => app.tags?.includes(preset.dataset.preset)).forEach(app => selected.add(app.id)); renderApps(); renderSelection(); showView("queue"); }
  if (remove) { selected.delete(remove.dataset.remove); renderApps(); renderSelection(); }
  if (quarantineAction) confirmQuarantineAction(quarantineAction.dataset.quarantineAction, decodeURIComponent(quarantineAction.dataset.batch), decodeURIComponent(quarantineAction.dataset.item));
  if (event.target.closest("[data-go-catalog]")) showView("catalog");
});

document.addEventListener("error", event => {
  const image = event.target?.closest?.("img[data-image-fallback]");
  if (!image) return;
  const fallback = image.dataset.imageFallback || "APP";
  const sibling = image.nextElementSibling;
  image.hidden = true;
  if (sibling?.classList.contains("app-icon-fallback")) {
    sibling.textContent = fallback;
    sibling.hidden = false;
  } else if (image.parentElement) {
    image.parentElement.textContent = fallback;
  }
}, true);

document.addEventListener("change", event => {
  const update = event.target.closest("[data-update-id]");
  if (!update) return;
  if (update.checked) selectedUpdates.add(update.dataset.updateId); else selectedUpdates.delete(update.dataset.updateId);
  renderAvailableUpdates();
});

$("#searchInput").addEventListener("input", event => { searchTerm = event.target.value; renderApps(); });
$("#clearAll").addEventListener("click", () => { selected.clear(); renderApps(); renderSelection(); });
$("#viewSelection").addEventListener("click", () => showView("queue"));
$("#installBtn").addEventListener("click", openInstallModal);
$("#confirmInstall").addEventListener("click", beginInstall);
$("#cancelInstall").addEventListener("click", closeInstallModal);
$("#closeInstallModal").addEventListener("click", closeInstallModal);
$("#finishInstall").addEventListener("click", closeInstallModal);
$("#refreshInstallPreflight").addEventListener("click", requestInstallPreflight);
$("#openInstallReport").addEventListener("click", () => openReportViewer(lastInstallReportName));
$("#closeReportModal").addEventListener("click", closeReportViewer);
$("#finishReport").addEventListener("click", closeReportViewer);
$("#exportTechnicalReport").addEventListener("click", () => {
  if (window.chrome?.webview && currentReportName) window.chrome.webview.postMessage({action:"export-report", payload:{name:currentReportName}});
});
$("#retryFailedInstall").addEventListener("click", () => {
  if(!lastFailedInstallPackages.length)return;
  selected=new Set(lastFailedInstallPackages);
  save();renderApps();renderSelection();
  $("#installProgressView").classList.add("hidden");
  $("#installConfirmView").classList.remove("hidden");
  $("#closeInstallModal").disabled=false;
  requestInstallPreflight();
});
$("#closeGuidedInstall").addEventListener("click", closeGuidedInstall);
$("#openVmwareGuide").addEventListener("click", () => openGuidedInstallLink("guide"));
$("#continueVmwareDownload").addEventListener("click", () => openGuidedInstallLink("download"));
$("#confirmUninstall").addEventListener("click", beginUninstall);
$("#cancelUninstall").addEventListener("click", closeUninstallModal);
$("#closeUninstallModal").addEventListener("click", closeUninstallModal);
$("#finishUninstall").addEventListener("click", closeUninstallModal);
$("#keepUninstallResidues").addEventListener("click",()=>{$("#uninstallResiduePanel").classList.add("hidden");$("#finishUninstall").classList.remove("hidden");$("#uninstallSummary").textContent="Les dossiers résiduels ont été conservés.";pendingUninstallResidueToken="";setBackgroundUninstall("Désinstallation terminée","Les dossiers résiduels ont été conservés.",100,"complete");});
$("#quarantineUninstallResidues").addEventListener("click",()=>{if(!pendingUninstallResidueToken||!window.chrome?.webview)return;$("#quarantineUninstallResidues").disabled=true;window.chrome.webview.postMessage({action:"quarantine-uninstall-residues",payload:{token:pendingUninstallResidueToken,context:"single"}});});
$("#keepBatchResidues").addEventListener("click",()=>{$("#batchResiduePanel").classList.add("hidden");$("#finishBatchUninstall").classList.remove("hidden");$("#batchUninstallResult").textContent="Les dossiers résiduels ont été conservés.";pendingBatchResidueToken="";setBackgroundUninstall("Désinstallation terminée","Les dossiers résiduels ont été conservés.",100,"complete");});
$("#quarantineBatchResidues").addEventListener("click",()=>{if(!pendingBatchResidueToken||!window.chrome?.webview)return;$("#quarantineBatchResidues").disabled=true;window.chrome.webview.postMessage({action:"quarantine-uninstall-residues",payload:{token:pendingBatchResidueToken,context:"batch"}});});
$("#confirmRepair").addEventListener("click", beginRepair);
$("#cancelRepair").addEventListener("click", closeRepairModal);
$("#closeRepairModal").addEventListener("click", closeRepairModal);
$("#finishRepair").addEventListener("click", closeRepairModal);
$("#installCustomPackage").addEventListener("click", addCustomPackage);
$("#customPackageId").addEventListener("keydown", event => {if(event.key==="Enter")addCustomPackage();});
$("#saveProfile").addEventListener("click", saveProfile);
$("#loadProfile").addEventListener("click", loadProfile);
$("#batchUninstallBtn").addEventListener("click", () => {
  requestBatchUninstall();
});
$("#cancelBatchUninstall").addEventListener("click", closeBatchUninstallModal);
$("#closeBatchUninstallModal").addEventListener("click", closeBatchUninstallModal);
$("#finishBatchUninstall").addEventListener("click", closeBatchUninstallModal);
$("#confirmBatchUninstall").addEventListener("click", beginBatchUninstall);

document.addEventListener("keydown", event => {
  const card = event.target.closest?.("[data-app],[data-installed-app]");
  if (!card || event.target !== card || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  if (card.dataset.installedApp) {
    const id=card.dataset.installedApp;
    if(managedInstalled.has(id))managedInstalled.delete(id);else managedInstalled.add(id);
    renderApps();
  } else toggleApp(card.dataset.app);
});

document.addEventListener("keydown", event => {
  const overlay = $("#onboardingOverlay");
  if (overlay.classList.contains("hidden")) return;
  if (event.key === "Escape") { event.preventDefault(); closeOnboarding(true); return; }
  if (event.key === "ArrowRight") { event.preventDefault(); moveOnboarding(1); return; }
  if (event.key === "ArrowLeft") { event.preventDefault(); moveOnboarding(-1); return; }
  if (event.key !== "Tab") return;
  const focusable = [...overlay.querySelectorAll("button:not([disabled])")];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$("#selectAllInstalled").addEventListener("click", () => { managedInstalled = new Set(installedApps); activeCategory = "Installés"; renderFilters(); renderApps(); });
$("#clearInstalledSelection").addEventListener("click", () => { managedInstalled.clear(); renderApps(); });
$("#installedSearchInput").addEventListener("input", event => { installedSearchTerm = event.target.value; renderInstalledPage(); });
$("#installedSort").addEventListener("change", event => { installedSortMode = event.target.value; renderInstalledPage(); });
$("#refreshInstalledApps").addEventListener("click", requestInstalledScan);
$("#installedSelectAll").addEventListener("click", () => { managedInstalled = new Set(installedApps); renderApps(); });
$("#installedClearSelection").addEventListener("click", () => { managedInstalled.clear(); renderApps(); });
$("#installedBatchUninstall").addEventListener("click", requestBatchUninstall);
$("#skipOnboarding").addEventListener("click", () => closeOnboarding(true));
$("#previousOnboarding").addEventListener("click", () => moveOnboarding(-1));
$("#nextOnboarding").addEventListener("click", () => moveOnboarding(1));
$("#replayOnboarding").addEventListener("click", () => openOnboarding(true));
$("#onboardingDots").addEventListener("click", event => { const dot=event.target.closest("[data-onboarding-dot]"); if(!dot)return; onboardingStep=Number(dot.dataset.onboardingDot); renderOnboarding(); });
$("#exportConfig").addEventListener("click", exportConfiguration);
$("#importConfig").addEventListener("click", importConfiguration);
$("#appUpdateBtn").addEventListener("click", openAppUpdateModal);
$("#appUpdateNotification").addEventListener("click", event => { event.stopPropagation(); toggleNotificationCenter(); });
$("#clearNotifications").addEventListener("click", () => {
  notificationFeed.forEach(item => { item.unread = false; });
  saveNotificationFeed(); renderNotificationFeed();
});
$("#notificationList").addEventListener("click", event => {
  const item = event.target.closest("[data-notification-key]");
  if (!item) return;
  const notification = notificationFeed.find(entry => entry.key === item.dataset.notificationKey);
  if (notification) {
    notification.unread = false;
    saveNotificationFeed();
    renderNotificationFeed();
  }
  const action = item.dataset.notificationAction;
  toggleNotificationCenter(false);
  if (action === "self-update") openAppUpdateModal();
  else if (action === "updates") showView("updates");
  else if (action === "installed") showView("installed");
  else if (action === "history") showView("history");
  else if (action === "install-result") $("#installModal").classList.remove("hidden");
});
document.addEventListener("click", event => {
  if (!event.target.closest("#notificationCenter") && !event.target.closest("#appUpdateNotification")) toggleNotificationCenter(false);
});
$("#hideInstallProgress").addEventListener("click", minimizeInstallProgress);
$("#showInstallProgress").addEventListener("click", () => $("#installModal").classList.remove("hidden"));
$("#hideUninstallProgress").addEventListener("click", () => minimizeUninstallProgress("single"));
$("#hideBatchUninstallProgress").addEventListener("click", () => minimizeUninstallProgress("batch"));
$("#showUninstallProgress").addEventListener("click", showUninstallProgress);
$("#installAppUpdate").addEventListener("click", beginAppUpdate);
$("#cancelAppUpdate").addEventListener("click", closeAppUpdateModal);
$("#closeAppUpdate").addEventListener("click", closeAppUpdateModal);
$("#copyFeedback").addEventListener("click", copyFeedbackReport);
$("#openGitHubFeedback").addEventListener("click", openGitHubFeedback);
$("#collectFeedbackDiagnostics").addEventListener("click", collectFeedbackDiagnostics);
$("#openFeedbackLogs").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"open-log-folder",payload:{}}));
$("#updateAllBtn").addEventListener("click", openUpdateModal);
$("#scanUpdatesBtn").addEventListener("click", requestUpdateScan);
$("#refreshHealth").addEventListener("click", requestHealth);
$("#refreshSecurity").addEventListener("click", requestSecurityStatus);
$("#refreshQuarantine").addEventListener("click", requestQuarantine);
$("#diagnoseWinget").addEventListener("click", diagnoseWinget);
$("#repairWinget").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"repair-winget",payload:{}}));
$("#createRestorePoint").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"create-restore-point",payload:{}}));
$("#openSystemRestore").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"open-system-restore",payload:{}}));
$("#scanStartup").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"scan-startup",payload:{}}));
$("#openStartupSettings").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"open-startup-settings",payload:{}}));
$("#scanDisk").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"scan-disk",payload:{}}));
$("#refreshHistory").addEventListener("click", requestHistory);
$("#confirmUpdate").addEventListener("click", beginUpdate);
$("#cancelUpdate").addEventListener("click", closeUpdateModal);
$("#closeUpdateModal").addEventListener("click", closeUpdateModal);
$("#finishUpdate").addEventListener("click", closeUpdateModal);
$("#cleanupBtn").addEventListener("click", openCleanupModal);
$("#confirmCleanup").addEventListener("click", beginCleanup);
$("#cancelCleanup").addEventListener("click", closeCleanupModal);
$("#closeCleanupModal").addEventListener("click", closeCleanupModal);
$("#finishCleanup").addEventListener("click", closeCleanupModal);
document.querySelectorAll("[data-cleanup]").forEach(input => input.addEventListener("change", updateCleanupCount));
$("#recommendedCleanup").addEventListener("click", () => {
  document.querySelectorAll("[data-cleanup]").forEach(input => { input.checked = !["components", "app-leftovers"].includes(input.dataset.cleanup); });
  updateCleanupCount();
});
$("#mobileMenu").addEventListener("click", () => document.body.classList.toggle("menu-open"));
refreshProfiles(); renderFilters(); renderApps(); renderSelection();
loadNotificationFeed();
window.setTimeout(() => openOnboarding(false), 650);
