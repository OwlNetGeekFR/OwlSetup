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
  "AnyDesk.AnyDesk":"anydesk.svg", "RARLab.WinRAR":"winrar.ico"
};
apps.forEach(app => app.logo = `assets/logos/${appLogos[app.id]}`);

const categories = ["Tout", ...new Set(apps.map(app => app.category))];
let selected = new Set(JSON.parse(localStorage.getItem("pcsetup-selection") || "[]"));
let installedApps = new Set();
let pendingUninstallId = null;
let pendingCleanupChoices = [];
let availableUpdates = [];
let selectedUpdates = new Set();
let updatesLoaded = false;
let activeCategory = "Tout";
let searchTerm = "";

const $ = selector => document.querySelector(selector);
const icon = app => `<span class="app-icon" style="--app:${app.color}"><img src="${app.logo}" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="app-icon-fallback" hidden>${app.icon}</span></span>`;
const save = () => localStorage.setItem("pcsetup-selection", JSON.stringify([...selected]));

function notify(title, detail) {
  $("#toastTitle").textContent = title;
  $("#toastText").textContent = detail;
  $("#toast").classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2600);
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
      ${installedApps.has(app.id) ? `<button class="uninstall-icon" data-uninstall="${app.id}" title="Désinstaller ${app.name}">×</button><span class="installed-badge">✓ Installé</span>` : `<span class="add-icon">${selected.has(app.id) ? "✓" : "+"}</span>`}
    </article>`).join("");
  $("#emptyState").classList.toggle("hidden", visible.length !== 0);
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
  $("#currentView").textContent = {home:"Accueil", catalog:"Installer des logiciels", updates:"Tout mettre à jour", cleanup:"Libérer de l'espace", quarantine:"Quarantaine", queue:"Ma sélection", history:"Guide d'installation"}[id];
  document.body.classList.remove("menu-open");
  if (id === "updates" && !updatesLoaded) requestUpdateScan();
  if (id === "quarantine") requestQuarantine();
  renderSelection();
  window.scrollTo({top: 0, behavior:"smooth"});
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
  const script = `# PC Setup - Installateur Windows\r\n# Généré le ${new Date().toLocaleString("fr-FR")}\r\n# Vérifiez cette liste avant exécution.\r\n\r\n$ErrorActionPreference = "Continue"\r\n$Host.UI.RawUI.WindowTitle = "PC Setup - Installation"\r\n\r\nif (-not (Get-Command winget -ErrorAction SilentlyContinue)) {\r\n  Write-Host "winget est introuvable. Installez 'App Installer' depuis le Microsoft Store." -ForegroundColor Red\r\n  Read-Host "Appuyez sur Entrée pour quitter"\r\n  exit 1\r\n}\r\n\r\n$packages = @(\r\n${ids}\r\n)\r\n\r\nWrite-Host "PC SETUP" -ForegroundColor Cyan\r\nWrite-Host "$($packages.Count) élément(s) à installer."\r\n\r\nforeach ($package in $packages) {\r\n  Write-Host "\\nInstallation de $package..." -ForegroundColor Yellow\r\n  winget install --id $package --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity\r\n  if ($LASTEXITCODE -eq 0) { Write-Host "Terminé : $package" -ForegroundColor Green }\r\n  else { Write-Host "À vérifier : $package (code $LASTEXITCODE)" -ForegroundColor DarkYellow }\r\n}\r\n\r\nWrite-Host "\\nInstallation terminée. Un redémarrage peut être nécessaire." -ForegroundColor Cyan\r\nRead-Host "Appuyez sur Entrée pour fermer"\r\n`;
  const blob = new Blob(["\ufeff", script], {type:"text/plain;charset=utf-8"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "PC-Setup-Installer.ps1";
  link.click();
  URL.revokeObjectURL(link.href);
}

function generateUpdateScript() {
  const script = `# PC Setup - Mise a jour complete du PC
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\""
  exit
}

$Host.UI.RawUI.WindowTitle = "PC Setup - Mise a jour complete"
$desktop = [Environment]::GetFolderPath("Desktop")
$log = Join-Path $desktop ("PC-Setup-Update-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
Start-Transcript -Path $log -Force

Write-Host "PC SETUP - MISE A JOUR COMPLETE" -ForegroundColor Cyan
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

  const script = `# PC Setup - Liberation d'espace disque
$ErrorActionPreference = "Continue"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\""
  exit
}

$Host.UI.RawUI.WindowTitle = "PC Setup - Nettoyage du disque"
$desktop = [Environment]::GetFolderPath("Desktop")
$log = Join-Path $desktop ("PC-Setup-Nettoyage-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".log")
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
  $quarantine = Join-Path $desktop ("PC-Setup-Quarantaine-" + (Get-Date -Format "yyyy-MM-dd-HHmm"))
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
Write-Host "PC SETUP - LIBERATION D'ESPACE" -ForegroundColor Cyan
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
    alert("Pour exécuter cette action directement, ouvrez PC Setup avec le fichier Ouvrir-PC-Setup.cmd. Le mode fichier ne peut pas lancer PowerShell pour des raisons de sécurité.");
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
  $("#progressSummary").textContent = "Ne fermez pas PC Setup pendant l'installation.";
  executeWithButton($("#confirmInstall"), "install", {packages:[...selected]});
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
  $("#updateSummary").textContent = "Ne fermez pas PC Setup pendant la mise à jour.";
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
  const advanced = pendingCleanupChoices.includes("components") || pendingCleanupChoices.includes("app-leftovers");
  $("#cleanupModalDetail").textContent = advanced ? "Nettoyage standard et options avancées sélectionnées" : "Fichiers temporaires et caches sélectionnés";
  $("#cleanupConfirmView").classList.remove("hidden");
  $("#cleanupProgressView").classList.add("hidden");
  $("#cleanupResultCard").classList.add("hidden");
  $("#cleanupCurrentZone").closest(".cleanup-current-zone").classList.remove("hidden");
  $("#finishCleanup").classList.add("hidden");
  $("#closeCleanupModal").disabled = false;
  $("#cleanupModal").dataset.running = "false";
  $("#cleanupModal").classList.remove("hidden");
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
  $("#cleanupSummaryText").textContent = "Ne fermez pas PC Setup pendant le nettoyage.";
  window.chrome.webview.postMessage({action:"cleanup", payload:{choices:pendingCleanupChoices}});
}

function openUninstallModal(id) {
  const app = apps.find(item => item.id === id);
  if (!app) return;
  pendingUninstallId = id;
  $("#uninstallAppName").textContent = app.name;
  $("#uninstallConfirmView").classList.remove("hidden");
  $("#uninstallProgressView").classList.add("hidden");
  $("#finishUninstall").classList.add("hidden");
  $("#closeUninstallModal").disabled = false;
  $("#uninstallModal").dataset.running = "false";
  $("#uninstallModal").classList.remove("hidden");
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

function handleInstallMessage(message) {
  if (!message) return;
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
    $("#cleanupSummaryText").textContent = `Rapport enregistré sur le Bureau : ${message.logName}`;
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
    $("#updateProgressDetail").textContent = message.appsSuccess ? "Applications traitées avec succès" : `Certaines applications sont à vérifier (code ${message.code})`;
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
    return;
  }
  if (message.type === "uninstall-start") {
    $("#uninstallProgressBar").style.width = "55%";
    $("#uninstallProgressDetail").textContent = `Suppression de ${message.id}`;
    return;
  }
  if (message.type === "uninstall-complete") {
    $("#uninstallModal").dataset.running = "false";
    $("#closeUninstallModal").disabled = false;
    $("#uninstallProgressBar").style.width = "100%";
    $("#uninstallProgressTitle").textContent = message.success ? "Logiciel désinstallé" : "Désinstallation à vérifier";
    $("#uninstallProgressDetail").textContent = message.success ? "L'application a été supprimée." : `Code de sortie : ${message.code}`;
    $("#uninstallSummary").textContent = message.success ? "La carte a été actualisée automatiquement." : "Consultez le rapport créé sur le Bureau.";
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
  if (message.type === "install-item") {
    const percent = Math.round((message.index / message.total) * 100);
    $("#progressPercent").textContent = `${percent}%`;
    $("#progressBar").style.width = `${percent}%`;
    $("#packageResult").textContent = message.success ? "TERMINÉ ✓" : "À VÉRIFIER";
    if (message.success) { installedApps.add(message.id); selected.delete(message.id); renderApps(); renderSelection(); }
  }
  if (message.type === "install-complete") {
    $("#installModal").dataset.running = "false";
    $("#closeInstallModal").disabled = false;
    $("#progressTitle").textContent = message.failed ? "Installation terminée avec avertissement" : "Installation terminée";
    $("#progressDetail").textContent = `${message.success} réussi(s), ${message.failed} à vérifier`;
    $("#progressPercent").textContent = "100%";
    $("#progressBar").style.width = "100%";
    $("#progressSummary").textContent = `Rapport enregistré sur le Bureau : ${message.logName}`;
    $("#finishInstall").classList.remove("hidden");
    requestHealth();
  }
}

if (window.chrome && window.chrome.webview) {
  window.chrome.webview.addEventListener("message", event => handleInstallMessage(event.data));
  window.chrome.webview.postMessage({action:"scan-installed", payload:{ids:apps.map(app => app.id)}});
  requestHealth();
  requestQuarantine();
}

document.addEventListener("click", event => {
  const card = event.target.closest("[data-app]");
  const uninstall = event.target.closest("[data-uninstall]");
  const nav = event.target.closest("[data-view]");
  const category = event.target.closest("[data-category]");
  const preset = event.target.closest("[data-preset]");
  const remove = event.target.closest("[data-remove]");
  const quarantineAction = event.target.closest("[data-quarantine-action]");
  if (uninstall) openUninstallModal(uninstall.dataset.uninstall);
  if (card && !uninstall) toggleApp(card.dataset.app);
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
$("#updateAllBtn").addEventListener("click", openUpdateModal);
$("#scanUpdatesBtn").addEventListener("click", requestUpdateScan);
$("#refreshHealth").addEventListener("click", requestHealth);
$("#refreshQuarantine").addEventListener("click", requestQuarantine);
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

renderFilters(); renderApps(); renderSelection();
