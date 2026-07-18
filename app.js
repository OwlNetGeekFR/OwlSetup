const apps = [
  { id:"Google.Chrome", name:"Google Chrome", category:"Navigateurs", desc:"Navigateur rapide et sécurisé", icon:"CH", color:"#4285f4", site:"https://www.google.com/chrome/", tags:["essentiel"] },
  { id:"Mozilla.Firefox", name:"Mozilla Firefox", category:"Navigateurs", desc:"Navigateur libre et respectueux", icon:"FF", color:"#ff7139", site:"https://www.mozilla.org/firefox/new/" },
  { id:"Brave.Brave", name:"Brave", category:"Navigateurs", desc:"Navigation privée avec bloqueur intégré", icon:"BR", color:"#fb542b", site:"https://brave.com/download/" },
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
  {id:"RustDesk.RustDesk",name:"RustDesk",category:"Communication",desc:"Contrôle à distance libre",icon:"RD",color:"#e34a50",site:"https://rustdesk.com/",repairMode:"reinstall"},
  {id:"TeamViewer.TeamViewer",name:"TeamViewer",category:"Communication",desc:"Assistance et contrôle à distance",icon:"TV",color:"#1677d2",site:"https://www.teamviewer.com/download/windows/",repairMode:"reinstall"},
  {id:"GitHub.GitHubDesktop",name:"GitHub Desktop",category:"Développement",desc:"Client graphique officiel pour GitHub",icon:"GH",color:"#6d5ac5",site:"https://desktop.github.com/download/",tags:["dev"],repairMode:"reinstall"},
  {id:"dbeaver.dbeaver",name:"DBeaver Community",category:"Développement",desc:"Gestion universelle de bases de données",icon:"DB",color:"#70533e",site:"https://dbeaver.io/download/",tags:["dev"],repairMode:"reinstall"},
  {id:"JetBrains.Toolbox",name:"JetBrains Toolbox",category:"Développement",desc:"Gestionnaire des outils JetBrains",icon:"JB",color:"#e34d80",site:"https://www.jetbrains.com/toolbox-app/",tags:["dev"],repairMode:"reinstall"},
  {id:"WinSCP.WinSCP",name:"WinSCP",category:"Développement",desc:"Transfert sécurisé de fichiers SFTP",icon:"WS",color:"#61a841",site:"https://winscp.net/eng/download.php",tags:["dev"],repairMode:"reinstall"},
  {id:"PuTTY.PuTTY",name:"PuTTY",category:"Développement",desc:"Client SSH et terminal distant",icon:"PT",color:"#4d8bc3",site:"https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html",tags:["dev"],repairMode:"reinstall"},
  {id:"FileZilla.Client",name:"FileZilla Client",category:"Internet",desc:"Transfert de fichiers FTP et SFTP",icon:"FZ",color:"#b93434",site:"https://filezilla-project.org/download.php",repairMode:"reinstall"},
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
  {id:"VMware.WorkstationPro",name:"VMware Workstation Pro",category:"Virtualisation",desc:"Machines virtuelles professionnelles",icon:"VM",color:"#e38b35",site:"https://www.vmware.com/products/desktop-hypervisor/workstation-and-fusion",repairMode:"reinstall"},
  {id:"Microsoft.WSL",name:"Windows Subsystem for Linux",category:"Virtualisation",desc:"Environnement Linux intégré à Windows",icon:"WSL",color:"#5c7894",site:"https://learn.microsoft.com/windows/wsl/install",repairMode:"reinstall"}
);

if (Array.isArray(window.PC_SETUP_CATALOG) && window.PC_SETUP_CATALOG.length) {
  apps.splice(0, apps.length, ...window.PC_SETUP_CATALOG);
}

const appLogos = {
  "Google.Chrome":"googlechrome.svg", "Mozilla.Firefox":"firefox.svg", "Brave.Brave":"brave.svg",
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
  "RustDesk.RustDesk":"rustdesk.svg", "TeamViewer.TeamViewer":"teamviewer.svg",
  "GitHub.GitHubDesktop":"githubdesktop.svg", "dbeaver.dbeaver":"dbeaver.svg",
  "JetBrains.Toolbox":"jetbrains.svg", "WinSCP.WinSCP":"winscp.png", "PuTTY.PuTTY":"putty.svg",
  "FileZilla.Client":"filezilla.svg", "EclipseAdoptium.Temurin.21.JDK":"temurin.svg",
  "GoLang.Go":"golang.svg", "Rustlang.Rustup":"rustup.svg", "ElectronicArts.EADesktop":"ea.svg",
  "Blizzard.BattleNet":"battlenet.svg", "Playnite.Playnite":"playnite.svg",
  "HeroicGamesLauncher.HeroicGamesLauncher":"heroic.svg", "Amazon.Games":"amazongames.png",
  "Overwolf.CurseForge":"curseforge.svg", "Oracle.VirtualBox":"virtualbox.svg",
  "VMware.WorkstationPro":"vmware.svg", "Microsoft.WSL":"wsl.svg"
};
apps.forEach(app => app.logo = app.logo || (appLogos[app.id] ? `assets/logos/${appLogos[app.id]}` : ""));

const categories = ["Tout", ...new Set(apps.map(app => app.category))];
let selected = new Set(JSON.parse(localStorage.getItem("pcsetup-selection") || "[]"));
let installedApps = new Set();
let managedInstalled = new Set();
let pendingUninstallId = null;
let pendingRepairId = null;
let pendingCleanupChoices = [];
let availableUpdates = [];
let selectedUpdates = new Set();
let appUpdateReleasePage = "https://github.com/OwlNetGeekFR/OwlSetup/releases/latest";
let currentBuildVersion = "inconnue";
let currentBuildChannel = "stable";
const dashboardAnnouncementEndpoint = "https://owlsetup-dashboard-owlnetgeekfr.onrender.com/api/announcements/latest";
let feedbackDiagnostics = "Non généré";
let updatesLoaded = false;
let activeCategory = "Tout";
let searchTerm = "";

const $ = selector => document.querySelector(selector);
const icon = app => `<span class="app-icon" style="--app:${app.color}">${app.logo ? `<img src="${app.logo}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="app-icon-fallback" hidden>${app.icon}</span>` : `<span class="app-icon-fallback">${app.icon}</span>`}</span>`;
const save = () => localStorage.setItem("pcsetup-selection", JSON.stringify([...selected]));

function notify(title, detail) {
  $("#toastTitle").textContent = title;
  $("#toastText").textContent = detail;
  $("#toast").classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2600);
}

async function loadDashboardAnnouncement() {
  const panel = $("#dashboardAnnouncement");
  try {
    const response = await fetch(dashboardAnnouncementEndpoint, {cache:"no-store", credentials:"omit"});
    if (response.status === 204) { panel.classList.add("hidden"); return; }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const announcement = await response.json();
    if (!announcement?.title || !announcement?.message || !announcement?.updatedAt) return;
    const key = `${announcement.updatedAt}|${announcement.title}`;
    if (localStorage.getItem("owlsetup-dismissed-announcement") === key) return;
    const severity = ["info","warning","critical"].includes(announcement.severity) ? announcement.severity : "info";
    panel.dataset.announcementKey = key;
    panel.className = `dashboard-announcement ${severity}`;
    $("#announcementSymbol").textContent = severity === "critical" ? "!" : severity === "warning" ? "⚠" : "i";
    $("#announcementTitle").textContent = announcement.title;
    $("#announcementMessage").textContent = announcement.message;
    $("#announcementDate").textContent = `Publié le ${new Date(announcement.updatedAt).toLocaleString("fr-FR", {dateStyle:"short", timeStyle:"short"})}`;
  } catch {
    panel.classList.add("hidden");
  }
}

function dismissDashboardAnnouncement() {
  const panel = $("#dashboardAnnouncement");
  if (panel.dataset.announcementKey) localStorage.setItem("owlsetup-dismissed-announcement", panel.dataset.announcementKey);
  panel.classList.add("hidden");
}

function renderFilters() {
  $("#filters").innerHTML = categories.map(c => `<button class="filter ${c === activeCategory ? "active" : ""}" data-category="${c}">${c}</button>`).join("");
}

function renderApps() {
  const query = searchTerm.toLocaleLowerCase("fr");
  const visible = apps.filter(app => (activeCategory === "Tout" || app.category === activeCategory) && `${app.name} ${app.desc} ${app.category}`.toLocaleLowerCase("fr").includes(query));
  $("#resultCount").textContent = `${visible.length} logiciel${visible.length > 1 ? "s" : ""}`;
  $("#appGrid").innerHTML = visible.map(app => `
    <article class="app-card ${selected.has(app.id) ? "selected" : ""} ${installedApps.has(app.id) ? "installed" : ""}" data-app="${app.id}" tabindex="0" aria-label="${app.name}">
      ${icon(app)}<span class="app-copy"><strong>${app.name}</strong><small>${app.desc}</small><span class="app-footer"><em>${app.category}</em><a class="official-link" href="${app.site}" target="_blank" rel="noopener" title="Ouvrir le site officiel de ${app.name}" onclick="event.stopPropagation()">Site officiel ↗</a></span></span>
      ${installedApps.has(app.id) ? `<span class="installed-actions"><button class="manage-icon ${managedInstalled.has(app.id) ? "active" : ""}" data-manage-installed="${app.id}" title="Sélectionner pour une désinstallation groupée">${managedInstalled.has(app.id) ? "✓" : "□"}</button><button class="repair-icon" data-repair="${app.id}" title="Réparer ${app.name}">⚙</button><button class="uninstall-icon" data-uninstall="${app.id}" title="Désinstaller ${app.name}">×</button></span><span class="repair-capability">${app.repairMode === "native" ? "Réparation native" : "Réinstallation réparatrice"}</span><span class="installed-badge">✓ Installé</span>` : `<span class="add-icon">${selected.has(app.id) ? "✓" : "+"}</span>`}
    </article>`).join("");
  $("#emptyState").classList.toggle("hidden", visible.length !== 0);
  $("#installedManager").classList.toggle("hidden", installedApps.size === 0);
  $("#managedCount").textContent = `${managedInstalled.size} logiciel${managedInstalled.size > 1 ? "s" : ""} sélectionné${managedInstalled.size > 1 ? "s" : ""}`;
  $("#batchUninstallBtn").disabled = managedInstalled.size === 0;
}

function renderSelection() {
  const picked = apps.filter(app => selected.has(app.id));
  const count = picked.length;
  $("#navCount").textContent = count;
  $("#barCount").textContent = count;
  $("#summaryCount").textContent = count;
  $("#selectionBar").classList.toggle("hidden", count === 0 || $("#queue").classList.contains("active"));
  $("#selectionStack").innerHTML = picked.slice(0, 4).map(icon).join("") + (count > 4 ? `<span class="more">+${count - 4}</span>` : "");
  $("#queueList").innerHTML = count ? picked.map(app => `<article class="queue-item">${icon(app)}<div><strong>${app.name}</strong><small>${app.id}</small></div><span>${app.category}</span><button data-remove="${app.id}" aria-label="Retirer ${app.name}">×</button></article>`).join("") : `<div class="queue-empty"><span>＋</span><h3>Votre sélection est vide</h3><p>Ajoutez des logiciels depuis le catalogue.</p><button data-go-catalog>Parcourir le catalogue</button></div>`;
  $("#installBtn").disabled = count === 0;
  save();
}

function toggleApp(id) {
  const app = apps.find(item => item.id === id);
  if (installedApps.has(id)) return;
  if (selected.has(id)) selected.delete(id); else {
    selected.add(id);
    notify("Ajouté à la sélection", app.name);
  }
  renderApps(); renderSelection();
}

function showView(id) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === id));
  $("#currentView").textContent = {home:"Accueil", catalog:"Installer des logiciels", updates:"Tout mettre à jour", cleanup:"Libérer de l'espace", quarantine:"Quarantaine", tools:"Outils système", security:"Centre de sécurité", troubleshooting:"Dépannage", queue:"Ma sélection", history:"Guide d'installation"}[id];
  document.body.classList.remove("menu-open");
  if (id === "updates" && !updatesLoaded) requestUpdateScan();
  if (id === "home") loadDashboardAnnouncement();
  if (id === "quarantine") requestQuarantine();
  if (id === "tools") { requestHistory(); diagnoseWinget(); }
  if (id === "security") requestSecurityStatus();
  renderSelection();
  window.scrollTo({top: 0, behavior:"smooth"});
}

function addCustomPackage() {
  const id = $("#customPackageId").value.trim();
  if (!/^[A-Za-z0-9.+_-]+$/.test(id)) {
    notify("Identifiant invalide", "Utilisez uniquement l'identifiant exact affiché par WinGet.");
    return;
  }
  if (!apps.some(app => app.id.toLocaleLowerCase() === id.toLocaleLowerCase())) {
    apps.push({id,name:id,category:"Personnalisé",desc:"Paquet ajouté manuellement par identifiant WinGet",icon:"+",color:"#4677c9",site:"https://learn.microsoft.com/windows/package-manager/winget/search",repairMode:"reinstall"});
    categories.push("Personnalisé");
    renderFilters();
  }
  selected.add(id); $("#customPackageId").value=""; renderApps(); renderSelection();
  notify("Paquet ajouté", id);
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
  const profiles = JSON.parse(localStorage.getItem("pcsetup-profiles") || "{}");
  $("#savedProfiles").innerHTML = `<option value="">Profils enregistrés</option>${Object.keys(profiles).sort().map(name => `<option value="${encodeURIComponent(name)}">${name}</option>`).join("")}`;
}

function saveProfile() {
  const name=$("#profileName").value.trim();
  if (!name || !selected.size) { notify("Profil incomplet","Donnez un nom et sélectionnez au moins un logiciel."); return; }
  const profiles=JSON.parse(localStorage.getItem("pcsetup-profiles") || "{}");
  profiles[name]=[...selected];
  localStorage.setItem("pcsetup-profiles",JSON.stringify(profiles));
  $("#profileName").value="";refreshProfiles();notify("Profil enregistré",name);
}

function loadProfile() {
  const value=$("#savedProfiles").value;if(!value)return;
  const name=decodeURIComponent(value),profiles=JSON.parse(localStorage.getItem("pcsetup-profiles") || "{}");
  selected=new Set((profiles[name]||[]).filter(id=>!installedApps.has(id)));
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

function appForUpdate(id) { return apps.find(app => app.id.toLocaleLowerCase() === String(id).toLocaleLowerCase()); }

function renderAvailableUpdates() {
  $("#updateScanState").classList.add("hidden");
  $("#scanUpdatesBtn").disabled = false;
  const hasUpdates = availableUpdates.length > 0;
  $("#availableUpdates").classList.toggle("hidden", !hasUpdates);
  $("#noUpdates").classList.toggle("hidden", hasUpdates);
  $("#availableUpdates").innerHTML = availableUpdates.map(update => {
    const app = appForUpdate(update.id);
    const appIcon = app ? `<img src="${app.logo}" alt="">` : `<span>APP</span>`;
    return `<label class="available-update"><input type="checkbox" data-update-id="${update.id}" ${selectedUpdates.has(update.id) ? "checked" : ""}><span class="update-check">✓</span><span class="update-app-icon" style="${app ? `background:${app.color}` : ""}">${appIcon}</span><span><strong>${update.name}</strong><small>${update.id}</small></span><span class="version-flow">${update.current}<i>→</i><b>${update.available}</b></span></label>`;
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
  $("#quarantineList").innerHTML = list.map(entry => `<article class="quarantine-item"><span>♲</span><div><strong>${entry.item}</strong><small>${entry.batch} · Modifié le ${entry.modified}</small></div><div class="quarantine-actions"><button class="restore-quarantine" data-quarantine-action="restore" data-batch="${encodeURIComponent(entry.batch)}" data-item="${encodeURIComponent(entry.item)}">↶ Restaurer</button><button class="delete-quarantine" data-quarantine-action="delete" data-batch="${encodeURIComponent(entry.batch)}" data-item="${encodeURIComponent(entry.item)}">× Supprimer</button></div></article>`).join("");
}

function confirmQuarantineAction(action, batch, item) {
  const deleting = action === "delete";
  const overlay = document.createElement("div");
  overlay.className = "quarantine-confirm";
  overlay.innerHTML = `<div><h3>${deleting ? "Supprimer définitivement ?" : "Restaurer ce dossier ?"}</h3><p><strong>${item}</strong><br>${deleting ? "Cette suppression ne pourra pas être annulée." : "Le dossier sera remis dans son emplacement AppData d'origine."}</p><div class="dialog-actions"><button class="secondary-dialog-button" data-confirm-no>Annuler</button><button class="${deleting ? "danger-dialog-button" : "primary-dialog-button"}" data-confirm-yes>${deleting ? "Supprimer" : "Restaurer"}</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("[data-confirm-no]").onclick = () => overlay.remove();
  overlay.querySelector("[data-confirm-yes]").onclick = () => {
    overlay.remove();
    window.chrome.webview.postMessage({action:`${action}-quarantine`, payload:{batch,item}});
  };
}

function generateScript() {
  const picked = apps.filter(app => selected.has(app.id));
  const ids = picked.map(app => `  "${app.id}"`).join(",\r\n");
  const script = `# OwlSetup - Installateur Windows\r\n# Généré le ${new Date().toLocaleString("fr-FR")}\r\n# Vérifiez cette liste avant exécution.\r\n\r\n$ErrorActionPreference = "Continue"\r\n$Host.UI.RawUI.WindowTitle = "OwlSetup - Installation"\r\n\r\nif (-not (Get-Command winget -ErrorAction SilentlyContinue)) {\r\n  Write-Host "winget est introuvable. Installez 'App Installer' depuis le Microsoft Store." -ForegroundColor Red\r\n  Read-Host "Appuyez sur Entrée pour quitter"\r\n  exit 1\r\n}\r\n\r\n$packages = @(\r\n${ids}\r\n)\r\n\r\nWrite-Host "OWLSETUP" -ForegroundColor Cyan\r\nWrite-Host "$($packages.Count) élément(s) à installer."\r\n\r\nforeach ($package in $packages) {\r\n  Write-Host "\\nInstallation de $package..." -ForegroundColor Yellow\r\n  winget install --id $package --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity\r\n  if ($LASTEXITCODE -eq 0) { Write-Host "Terminé : $package" -ForegroundColor Green }\r\n  else { Write-Host "À vérifier : $package (code $LASTEXITCODE)" -ForegroundColor DarkYellow }\r\n}\r\n\r\nWrite-Host "\\nInstallation terminée. Un redémarrage peut être nécessaire." -ForegroundColor Cyan\r\nRead-Host "Appuyez sur Entrée pour fermer"\r\n`;
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
  $("#closeInstallModal").disabled = false;
  $("#installModal").dataset.running = "false";
  $("#installModal").classList.remove("hidden");
}

function closeInstallModal() {
  if ($("#installModal").dataset.running === "true") return;
  $("#installModal").classList.add("hidden");
}

function beginInstall() {
  $("#installConfirmView").classList.add("hidden");
  $("#installProgressView").classList.remove("hidden");
  $("#closeInstallModal").disabled = true;
  $("#installModal").dataset.running = "true";
  $("#progressTitle").textContent = "Préparation de l'installation";
  $("#progressDetail").textContent = "Connexion au gestionnaire winget";
  $("#progressPercent").textContent = "0%";
  $("#progressBar").style.width = "0%";
  $("#currentPackage").textContent = "Initialisation...";
  $("#packageResult").textContent = "EN ATTENTE";
  $("#progressSummary").textContent = "Ne fermez pas OwlSetup pendant l'installation.";
  const selectedApps=apps.filter(app=>selected.has(app.id)).map(app=>({id:app.id,name:app.name,portable:!!app.portable}));
  executeWithButton($("#confirmInstall"), "install", {packages:[...selected],apps:selectedApps,shortcut:$("#installShortcutLocation").value,launchAfter:$("#launchAfterInstall").checked});
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
  $("#closeUninstallModal").disabled = false;
  $("#uninstallModal").dataset.running = "false";
  $("#uninstallModal").classList.remove("hidden");
  if(window.chrome?.webview)window.chrome.webview.postMessage({action:"simulate-uninstall",payload:{id}});
}

function closeUninstallModal() {
  if ($("#uninstallModal").dataset.running === "true") return;
  $("#uninstallModal").classList.add("hidden");
  pendingUninstallId = null;
}

function beginUninstall() {
  if (!pendingUninstallId || !window.chrome?.webview) return;
  $("#uninstallConfirmView").classList.add("hidden");
  $("#uninstallProgressView").classList.remove("hidden");
  $("#closeUninstallModal").disabled = true;
  $("#uninstallModal").dataset.running = "true";
  $("#uninstallProgressBar").style.width = "25%";
  window.chrome.webview.postMessage({action:"uninstall", payload:{id:pendingUninstallId}});
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
    notification.classList.add("available");
    notification.title = `OwlSetup ${message.latest} est disponible`;
    notification.setAttribute("aria-label", `Mise à jour OwlSetup ${message.latest} disponible`);
    if (notification.dataset.notified !== message.latest) {
      notification.dataset.notified = message.latest;
      notifyAction("Mise à jour disponible", `OwlSetup ${message.latest} est disponible sur GitHub.`);
    }
    icon.textContent = "↓";
    $("#appUpdateStateTitle").textContent = `OwlSetup ${message.latest} est disponible`;
    $("#appUpdateStateDetail").textContent = "Ouvrez la Release officielle GitHub pour télécharger cette version.";
    install.classList.remove("hidden"); install.disabled = false;
  } else if (message.status === "current") {
    notification.classList.remove("available");
    notification.title = "OwlSetup est à jour";
    notification.setAttribute("aria-label", "OwlSetup est à jour");
    icon.textContent = "✓";
    $("#appLatestVersion").textContent = message.latest || message.current;
    $("#appUpdateStateTitle").textContent = "OwlSetup est à jour";
    $("#appUpdateStateDetail").textContent = "Vous utilisez déjà la dernière version disponible.";
  } else if (message.status === "beta") {
    $("#appUpdateModal").dataset.running = "false";
    $("#closeAppUpdate").disabled = false;
    $("#cancelAppUpdate").disabled = false;
    install.disabled = true;
    notification.classList.remove("available");
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
    notification.classList.remove("available");
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
    const names=(message.packages||[]).map(id=>apps.find(app=>app.id===id)?.name||id);
    const preview=`MODE SIMULATION — aucun logiciel n'a encore été supprimé.\n\n${names.map(name=>`• ${name}`).join("\n")}\n\nConfirmer la désinstallation de ces ${names.length} logiciel(s) ?`;
    if(confirm(preview))window.chrome?.webview?.postMessage({action:"batch-uninstall",payload:{packages:message.packages}});
    return;
  }
  if (message.type === "winget-diagnostic") {
    $("#wingetDiagnosticText").textContent = `${message.message}${message.version ? ` (${message.version})` : ""}`;
    $("#wingetDiagnosticText").classList.toggle("tool-success", message.available && message.sources);
    return;
  }
  if (message.type === "winget-repair-start") {
    $("#wingetDiagnosticText").textContent = "Réenregistrement d'App Installer et actualisation des sources...";
    return;
  }
  if (message.type === "winget-repair-complete") {
    $("#wingetDiagnosticText").textContent = message.success ? "WinGet a été réparé et ses sources ont été actualisées." : `Réparation incomplète (code ${message.code}). Consultez ${message.logName}.`;
    notify(message.success ? "WinGet réparé" : "Réparation à vérifier", $("#wingetDiagnosticText").textContent);
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
    $("#operationHistory").innerHTML = (message.items || []).length ? message.items.map(item => `<article><span class="history-type">${item.type}</span><div><strong>${item.name}</strong><small>${item.date} · ${item.size}</small></div><button data-open-log="${encodeURIComponent(item.name)}">Ouvrir</button></article>`).join("") : `<p class="tool-empty">Aucun rapport enregistré.</p>`;
    return;
  }
  if (message.type === "history-error") {
    $("#operationHistory").innerHTML = `<p class="tool-empty">${message.message}</p>`; return;
  }
  if (message.type === "startup-state") {
    $("#startupList").innerHTML = (message.items || []).length ? message.items.map(item => `<article><div><strong>${item.name}</strong><small>${item.source} · ${item.command}</small></div></article>`).join("") : `<p class="tool-empty">Aucun élément de démarrage détecté.</p>`;
    return;
  }
  if (message.type === "disk-scan-start") {
    setToolProgress("disk",5,"Préparation de l'analyse...");
    $("#diskList").innerHTML = `<p class="tool-empty">Analyse en cours, cela peut prendre quelques instants...</p>`; return;
  }
  if (message.type === "disk-scan-state") {
    const max=Math.max(...(message.items || []).map(item=>Number(item.bytes)),1);
    $("#diskList").innerHTML = (message.items || []).map(item => `<article class="disk-item"><div><strong>${item.name}</strong><small>${item.path} · ${item.files} fichiers</small><i style="width:${Math.max(2,Number(item.bytes)/max*100)}%"></i></div><b>${item.size}</b></article>`).join("");
    return;
  }
  if (message.type === "disk-scan-error") {
    $("#diskList").innerHTML = `<p class="tool-empty">${message.message}</p>`; return;
  }
  if (message.type === "batch-uninstall-start") {
    notify("Désinstallation groupée", `${message.total} logiciel(s) dans la file.`); return;
  }
  if (message.type === "batch-uninstall-progress") {
    notify("Désinstallation en cours", `${message.index}/${message.total} · ${message.id}`); return;
  }
  if (message.type === "batch-uninstall-item") {
    if(message.success){installedApps.delete(message.id);managedInstalled.delete(message.id);renderApps();}
    else notify("Désinstallation à vérifier", message.errorMessage || `WinGet a renvoyé le code ${message.code}.`);
    return;
  }
  if (message.type === "batch-uninstall-complete") {
    notify("Désinstallation terminée", `${message.success} réussi(s), ${message.failed} à vérifier. Rapport : ${message.logName}`); requestHistory(); return;
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
    const restored = (message.packages || []).filter(id => known.has(String(id).toLocaleLowerCase()) && !installedApps.has(id));
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
    $("#cleanupAnalysisList").innerHTML = (message.items || []).map(item => `<article><div><strong>${item.label}</strong><small>${item.path}${item.note ? ` · ${item.note}` : ""}</small></div><b>${item.bytes ? item.size : "À calculer"}</b></article>`).join("");
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
    updatesLoaded = false; requestHealth();
    return;
  }
  if (message.type === "installed-state") {
    installedApps = new Set(message.ids || []);
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
    $("#uninstallSummary").textContent = message.success ? "La carte a été actualisée automatiquement." : "Consultez le rapport rangé dans OwlSetup.";
    $("#finishUninstall").classList.remove("hidden");
    if (message.success) { installedApps.delete(message.id); renderApps(); }
    requestHealth();
    return;
  }
  if (!message.type?.startsWith("install-")) return;
  if (message.type === "install-start") {
    $("#progressTitle").textContent = "Installation en cours";
    $("#progressDetail").textContent = `${message.total} logiciel(s) dans la file`;
  }
  if (message.type === "install-progress") {
    const percent = Math.round(((message.index - 1) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#currentPackage").textContent = message.id;
    $("#packageResult").textContent = "INSTALLATION";
  }
  if (message.type === "install-security") {
    const percent = Math.round(((message.index - 1 + .25) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#packageResult").textContent = message.success ? "SOURCE VÉRIFIÉE" : "SOURCE INTROUVABLE";
  }
  if (message.type === "install-execution") {
    const percent = Math.round(((message.index - 1 + .45) / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#progressDetail").textContent = `Installation de ${message.id} avec WinGet`;
    $("#packageResult").textContent = "INSTALLATION EN COURS";
  }
  if (message.type === "install-item") {
    const percent = Math.round((message.index / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#packageResult").textContent = message.success ? "TERMINÉ ✓" : "À VÉRIFIER";
    if (!message.success && message.errorMessage) $("#progressDetail").textContent = message.errorMessage;
    if (message.success) { installedApps.add(message.id); selected.delete(message.id); renderApps(); renderSelection(); }
  }
  if (message.type === "install-complete") {
    $("#installModal").dataset.running = "false";
    $("#closeInstallModal").disabled = false;
    $("#progressTitle").textContent = message.failed ? "Installation terminée avec avertissement" : "Installation terminée";
    $("#progressDetail").textContent = `${message.success} réussi(s), ${message.failed} à vérifier`;
    $("#progressPercent").textContent = "100%";
    $("#progressBar").style.width = "100%";
    $("#progressSummary").textContent = `Rapport rangé dans OwlSetup : ${message.logName}`;
    $("#finishInstall").classList.remove("hidden");
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
}

loadDashboardAnnouncement();

document.addEventListener("click", event => {
  const card = event.target.closest("[data-app]");
  const uninstall = event.target.closest("[data-uninstall]");
  const repair = event.target.closest("[data-repair]");
  const manageInstalled = event.target.closest("[data-manage-installed]");
  const nav = event.target.closest("[data-view]");
  const category = event.target.closest("[data-category]");
  const preset = event.target.closest("[data-preset]");
  const remove = event.target.closest("[data-remove]");
  const quarantineAction = event.target.closest("[data-quarantine-action]");
  const openLog = event.target.closest("[data-open-log]");
  if (uninstall) openUninstallModal(uninstall.dataset.uninstall);
  if (repair) openRepairModal(repair.dataset.repair);
  if (manageInstalled) {
    const id=manageInstalled.dataset.manageInstalled;
    if(managedInstalled.has(id))managedInstalled.delete(id);else managedInstalled.add(id);
    renderApps();
  }
  if (openLog && window.chrome?.webview) window.chrome.webview.postMessage({action:"open-log",payload:{name:decodeURIComponent(openLog.dataset.openLog)}});
  if (card && !uninstall && !repair && !manageInstalled) toggleApp(card.dataset.app);
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
$("#confirmUninstall").addEventListener("click", beginUninstall);
$("#cancelUninstall").addEventListener("click", closeUninstallModal);
$("#closeUninstallModal").addEventListener("click", closeUninstallModal);
$("#finishUninstall").addEventListener("click", closeUninstallModal);
$("#confirmRepair").addEventListener("click", beginRepair);
$("#cancelRepair").addEventListener("click", closeRepairModal);
$("#closeRepairModal").addEventListener("click", closeRepairModal);
$("#finishRepair").addEventListener("click", closeRepairModal);
$("#installCustomPackage").addEventListener("click", addCustomPackage);
$("#customPackageId").addEventListener("keydown", event => {if(event.key==="Enter")addCustomPackage();});
$("#saveProfile").addEventListener("click", saveProfile);
$("#loadProfile").addEventListener("click", loadProfile);
$("#batchUninstallBtn").addEventListener("click", () => {
  if(!managedInstalled.size || !window.chrome?.webview)return;
  window.chrome.webview.postMessage({action:"simulate-batch-uninstall",payload:{packages:[...managedInstalled]}});
});
$("#exportConfig").addEventListener("click", exportConfiguration);
$("#importConfig").addEventListener("click", importConfiguration);
$("#appUpdateBtn").addEventListener("click", openAppUpdateModal);
$("#appUpdateNotification").addEventListener("click", openAppUpdateModal);
$("#installAppUpdate").addEventListener("click", beginAppUpdate);
$("#cancelAppUpdate").addEventListener("click", closeAppUpdateModal);
$("#closeAppUpdate").addEventListener("click", closeAppUpdateModal);
$("#copyFeedback").addEventListener("click", copyFeedbackReport);
$("#openGitHubFeedback").addEventListener("click", openGitHubFeedback);
$("#collectFeedbackDiagnostics").addEventListener("click", collectFeedbackDiagnostics);
$("#openFeedbackLogs").addEventListener("click", () => window.chrome?.webview?.postMessage({action:"open-log-folder",payload:{}}));
$("#dismissAnnouncement").addEventListener("click", dismissDashboardAnnouncement);
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
