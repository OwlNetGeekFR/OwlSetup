using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text.RegularExpressions;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal sealed class WebAppForm : Form
{
    const int DwmwaUseImmersiveDarkMode = 20;
    const int DwmwaUseImmersiveDarkModeLegacy = 19;
    const int DwmwaBorderColor = 34;
    const int DwmwaCaptionColor = 35;
    const int DwmwaTextColor = 36;

    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("dwmapi.dll")]
    static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int valueSize);

    // Windows Security Center agrège les produits Microsoft et les suites de sécurité tierces.
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("wscapi.dll")]
    static extern int WscGetSecurityProviderHealth(uint providers, out int health);

    const uint WscSecurityProviderFirewall = 0x1;
    const uint WscSecurityProviderAntivirus = 0x4;
    const int WscSecurityProviderHealthGood = 0;

    // --- Identifiant de paquet : source unique de verite ---------------------
    //
    // Ce motif garde toutes les lignes de commande winget : un identifiant qui
    // ne commence pas par un caractere alphanumerique serait lu par winget
    // comme un drapeau, pas comme un nom de paquet.
    //
    // Il etait recopie en litteral a 27 endroits, sous TROIS formes qui ne
    // disaient pas la meme chose : sans borne de longueur, bornee a 128, ou
    // exigeant au moins deux caracteres. Le meme identifiant pouvait donc etre
    // accepte a une entree et refuse a une autre. La forme retenue ici est la
    // plus stricte des trois ; les 93 applications du catalogue mesurent entre
    // 7 et 39 caracteres, aucune n'est concernee.
    //
    // Le nommer une seule fois est aussi ce qui evite la derive qui avait
    // laisse Installer-selection.ps1 sur l'ancienne regex (cf. 4.0.0-beta.53).
    static readonly Regex PackageIdPattern =
        new Regex(@"^[A-Za-z0-9][A-Za-z0-9._+\-]{1,127}$", RegexOptions.CultureInvariant);

    internal static bool IsValidPackageId(string value)
    {
        return !String.IsNullOrEmpty(value) && PackageIdPattern.IsMatch(value);
    }

    readonly WebView2 webView;
    readonly string appRoot;
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    bool installationRunning;
    bool uninstallRunning;
    bool repairRunning;
    bool scanRunning;
    bool updateRunning;
    bool cleanupRunning;
    bool browserCleanupRunning;
    bool healthScanning;
    bool updatesScanning;
    bool windowsUpdatesScanning;
    bool windowsUpdateInstalling;
    bool selfUpdateRunning;
    readonly Dictionary<string,DateTime> cleanupSimulations=new Dictionary<string,DateTime>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,DateTime> uninstallSimulations=new Dictionary<string,DateTime>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,DateTime> batchUninstallSimulations=new Dictionary<string,DateTime>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,string> resolvedUninstallPackages=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,Dictionary<string,string>> resolvedBatchUninstallPackages=new Dictionary<string,Dictionary<string,string>>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,List<ResidueCandidate>> uninstallResidueSimulations=new Dictionary<string,List<ResidueCandidate>>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,DateTime> uninstallResidueExpirations=new Dictionary<string,DateTime>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,bool> diskScanTargets=new Dictionary<string,bool>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,BrowserCleanupPlan> browserCleanupPlans=new Dictionary<string,BrowserCleanupPlan>(StringComparer.OrdinalIgnoreCase);

    sealed class ResidueCandidate
    {
        public string Path;
        public string RootType;
        public string Name;
        public string Display;
        public long Bytes;
        public long Files;
    }

    sealed class BrowserDefinition
    {
        public string Id,Name,Engine,Root,Process;
        public bool ProfileRoot;
    }
    sealed class BrowserTarget
    {
        public string Browser,Category,CategoryLabel,Path,Root;
        public long Bytes,Files;
    }
    sealed class BrowserCleanupPlan
    {
        public DateTime Expires;
        public string[] Browsers,Categories;
        public List<BrowserTarget> Targets;
        public long Bytes,Files;
    }

    public WebAppForm()
    {
        Text = BuildInfo.IsBeta ? "OwlSetup " + BuildInfo.Channel.ToUpperInvariant() + " - " + BuildInfo.DisplayVersion : "OwlSetup";
        string iconPath=Path.Combine(Bootstrap.AppRoot,"OwlSetup.ico");
        Icon = File.Exists(iconPath) ? new Icon(iconPath) : SystemIcons.Application;
        Size = new Size(1500, 920);
        MinimumSize = new Size(900, 650);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(8, 11, 17);
        appRoot = Bootstrap.AppRoot;
        webView = new WebView2 { Dock=DockStyle.Fill, BackColor=BackColor, DefaultBackgroundColor=BackColor };
        Controls.Add(webView);
        Shown += InitializeWebView;
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        ApplyDarkWindowChrome();
    }

    void ApplyDarkWindowChrome()
    {
        if (Environment.OSVersion.Version.Major < 10) return;
        try
        {
            int enabled = 1;
            if (DwmSetWindowAttribute(Handle, DwmwaUseImmersiveDarkMode, ref enabled, sizeof(int)) != 0)
                DwmSetWindowAttribute(Handle, DwmwaUseImmersiveDarkModeLegacy, ref enabled, sizeof(int));

            int caption = ToColorRef(8, 11, 17);
            int border = ToColorRef(34, 51, 70);
            int text = ToColorRef(238, 243, 249);
            DwmSetWindowAttribute(Handle, DwmwaCaptionColor, ref caption, sizeof(int));
            DwmSetWindowAttribute(Handle, DwmwaBorderColor, ref border, sizeof(int));
            DwmSetWindowAttribute(Handle, DwmwaTextColor, ref text, sizeof(int));
        }
        catch (DllNotFoundException) { }
        catch (EntryPointNotFoundException) { }
    }

    static int ToColorRef(byte red, byte green, byte blue)
    {
        return red | (green << 8) | (blue << 16);
    }

    async void InitializeWebView(object sender, EventArgs e)
    {
        try
        {
            string userData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PCSetup", "WebView2Data");
            var environment = await CoreWebView2Environment.CreateAsync(null, userData);
            await webView.EnsureCoreWebView2Async(environment);
            if(!VerifyInterfaceIntegrity())throw new InvalidDataException("L'interface locale de OwlSetup a ete modifiee ou endommagee.");
            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            webView.CoreWebView2.Settings.AreHostObjectsAllowed = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.IsZoomControlEnabled = false;
            webView.CoreWebView2.PermissionRequested += delegate(object s, CoreWebView2PermissionRequestedEventArgs args) {
                args.State = CoreWebView2PermissionState.Deny;
            };
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping("pcsetup.local", appRoot, CoreWebView2HostResourceAccessKind.DenyCors);
            webView.CoreWebView2.WebMessageReceived += OnWebMessage;
            webView.CoreWebView2.NewWindowRequested += delegate(object s, CoreWebView2NewWindowRequestedEventArgs args) {
                args.Handled = true;
                OpenExternal(args.Uri);
            };
            webView.CoreWebView2.NavigationStarting += delegate(object s, CoreWebView2NavigationStartingEventArgs args) {
                if (!IsTrustedUiUri(args.Uri)) {
                    args.Cancel = true;
                    OpenExternal(args.Uri);
                }
            };
            webView.CoreWebView2.FrameNavigationStarting += delegate(object s, CoreWebView2NavigationStartingEventArgs args) {
                if(!IsTrustedUiUri(args.Uri))args.Cancel=true;
            };
            webView.Source = new Uri("https://pcsetup.local/index.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show("Impossible de charger l'interface OwlSetup.\r\n\r\n" + ex.Message, "OwlSetup", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    void OpenExternal(string address)
    {
        Uri uri;
        if (!Uri.TryCreate(address, UriKind.Absolute, out uri)) return;
        if (uri.Scheme != Uri.UriSchemeHttps) return;
        Process.Start(new ProcessStartInfo { FileName=uri.AbsoluteUri, UseShellExecute=true });
    }

    bool IsTrustedUiUri(string address)
    {
        Uri uri;
        return Uri.TryCreate(address,UriKind.Absolute,out uri) && uri.Scheme==Uri.UriSchemeHttps &&
            String.Equals(uri.Host,"pcsetup.local",StringComparison.OrdinalIgnoreCase) && uri.IsDefaultPort &&
            String.IsNullOrEmpty(uri.UserInfo);
    }

    bool VerifyInterfaceIntegrity()
    {
        return VerifyEmbeddedResource("index.html",Path.Combine(appRoot,"index.html")) &&
            VerifyEmbeddedResource("i18n.js",Path.Combine(appRoot,"i18n.js")) &&
            VerifyEmbeddedResource("catalog.generated.js",Path.Combine(appRoot,"catalog.generated.js")) &&
            VerifyEmbeddedResource("app.js",Path.Combine(appRoot,"app.js")) &&
            VerifyEmbeddedResource("styles.css",Path.Combine(appRoot,"styles.css"));
    }

    bool VerifyEmbeddedResource(string resourceName,string filePath)
    {
        if(!File.Exists(filePath))return false;
        using(var algorithm=SHA256.Create())
        using(var embedded=Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
        using(var file=File.Open(filePath,FileMode.Open,FileAccess.Read,FileShare.Read))
        {
            if(embedded==null)return false;
            byte[] expected=algorithm.ComputeHash(embedded),actual=algorithm.ComputeHash(file);
            if(expected.Length!=actual.Length)return false;
            int difference=0;for(int i=0;i<expected.Length;i++)difference|=expected[i]^actual[i];
            return difference==0;
        }
    }

    void OnWebMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string action = "unknown";
        try
        {
            if(!IsTrustedUiUri(e.Source) || !VerifyInterfaceIntegrity())throw new UnauthorizedAccessException("Commande refusee : origine ou integrite de l'interface invalide.");
            if(String.IsNullOrEmpty(e.WebMessageAsJson) || e.WebMessageAsJson.Length>1024*1024)throw new InvalidDataException("Commande trop volumineuse ou vide.");
            var message = json.DeserializeObject(e.WebMessageAsJson) as Dictionary<string, object>;
            if (message == null || !message.ContainsKey("action")) throw new InvalidOperationException("Commande invalide.");
            action = Convert.ToString(message["action"]);
            var payload = message.ContainsKey("payload") ? message["payload"] as Dictionary<string, object> : null;
            if (action == "get-app-info") { SendAppInfo(); SendSystemSummary(); }
            else if (action == "update") RunUpdate(payload);
            else if (action == "check-app-update") CheckAppUpdate(payload);
            else if (action == "install-app-update") InstallAppUpdate(payload);
            else if (action == "scan-health") ScanHealth();
            else if (action == "scan-updates") ScanUpdates();
            else if (action == "scan-windows-updates") ScanWindowsUpdates();
            else if (action == "install-windows-updates") InstallWindowsUpdates(payload);
            else if (action == "open-windows-update") OpenWindowsUpdateSettings();
            else if (action == "schedule-state") SendScheduleState();
            else if (action == "schedule-configure") ConfigureSchedule(payload);
            else if (action == "schedule-remove") RemoveSchedule();
            else if (action == "install") RunInstall(payload);
            else if (action == "preflight-install") RunInstallPreflight(payload);
            else if (action == "choose-install-location") ChooseInstallLocation(payload);
            else if (action == "scan-installed") ScanInstalled(payload);
            else if (action == "scan-app-health") ScanApplicationHealth(payload);
            else if (action == "repair") RunRepair(payload);
            else if (action == "uninstall") RunUninstall(payload);
            else if (action == "quarantine-uninstall-residues") QuarantineUninstallResidues(payload);
            else if (action == "simulate-uninstall") SimulateUninstall(payload);
            else if (action == "batch-uninstall") RunBatchUninstall(payload);
            else if (action == "simulate-batch-uninstall") SimulateBatchUninstall(payload);
            else if (action == "export-config") ExportConfiguration(payload);
            else if (action == "import-config") ImportConfiguration();
            else if (action == "analyze-cleanup") AnalyzeCleanup(payload);
            else if (action == "scan-browser-data") ScanBrowserData();
            else if (action == "analyze-browser-data") AnalyzeBrowserData(payload);
            else if (action == "cleanup-browser-data") RunBrowserCleanup(payload);
            else if (action == "diagnose-winget") DiagnoseWinget();
            else if (action == "search-winget") SearchWinget(payload);
            else if (action == "repair-winget") RepairWinget();
            else if (action == "inspect-package-processes") InspectPackageProcesses(payload);
            else if (action == "close-package-processes") ClosePackageProcesses(payload);
            else if (action == "create-restore-point") CreateRestorePoint();
            else if (action == "open-system-restore") OpenSystemRestore();
            else if (action == "open-system-protection") OpenSystemProtection();
            else if (action == "load-history") LoadHistory();
            else if (action == "open-log") OpenLog(payload);
            else if (action == "open-report") OpenReport(payload);
            else if (action == "export-report") ExportReport(payload);
            else if (action == "open-log-folder") OpenLogFolder();
            else if (action == "feedback-diagnostics") SendFeedbackDiagnostics();
            else if (action == "self-diagnostic") RunSelfDiagnostic();
            else if (action == "prune-history") PruneHistory(payload);
            else if (action == "clear-history") ClearHistory();
            else if (action == "export-support") ExportSupportBundle(payload);
            else if (action == "check-feedback") CheckFeedbackFollowups(payload);
            else if (action == "scan-startup") ScanStartup();
            else if (action == "open-startup-settings") OpenStartupSettings();
            else if (action == "scan-disk") ScanDiskUsage();
            else if (action == "open-disk-folder") OpenDiskFolder(payload);
            else if (action == "quarantine-disk-folder") QuarantineDiskFolder(payload);
            else if (action == "security-status") SendSecurityStatus();
            else if (action == "export-security") ExportSecurityDiagnostic();
            else if (action == "open-windows-security") OpenWindowsSecurity(payload);
            else if (action == "open-installed-apps") Process.Start(new ProcessStartInfo("ms-settings:appsfeatures"){UseShellExecute=true});
            else if (action == "cleanup") RunCleanup(payload);
            else if (action == "scan-quarantine") SendQuarantineState();
            else if (action == "restore-quarantine") RestoreQuarantine(payload);
            else if (action == "delete-quarantine") DeleteQuarantine(payload);
            else if (action == "purge-quarantine") PurgeOldQuarantine(payload);
            else throw new InvalidOperationException("Action inconnue.");
        }
        catch (Exception ex)
        {
            string errorKind = ex is UnauthorizedAccessException ? "permission" : ex is InvalidDataException ? "validation" : ex is Win32Exception ? "win32" : "application";
            string detail = json.Serialize(new {message=ex.Message,operation=action,failureStage="execution",errorKind=errorKind,resolutionStatus="open"});
            webView.CoreWebView2.ExecuteScriptAsync("window.dispatchEvent(new CustomEvent('owlsetup:native-error',{detail:" + detail + "}));");
        }
    }

    void RunInstallPreflight(Dictionary<string,object> payload)
    {
        var packages=ReadArray(payload,"packages").Where(x=>IsValidPackageId(x)).Distinct(StringComparer.OrdinalIgnoreCase).Take(100).ToArray();
        var catalog=ReadCatalog(payload);
        long requestId=payload!=null&&payload.ContainsKey("requestId")?Convert.ToInt64(payload["requestId"]):0;
        if(packages.Length==0)throw new InvalidOperationException("Aucun logiciel valide n'est sélectionné.");
        Task.Run(delegate {
            bool wingetReady=false,diskReady=false,systemReady=false,packagesReady=false;
            var unavailable=new List<string>();
            try
            {
                SendToWeb(new {type="install-preflight-progress",requestId=requestId,key="winget",state="checking",title="Contrôle de WinGet",detail="Version et disponibilité..."});
                var wingetOutput=new StringBuilder();
                int wingetCode=RunWingetCli("--version",wingetOutput);
                wingetReady=wingetCode==0;
                SendToWeb(new {type="install-preflight-progress",requestId=requestId,key="winget",state=wingetReady?"success":"failed",title="Contrôle de WinGet",detail=wingetReady?wingetOutput.ToString().Trim():"WinGet est indisponible"});

                SendToWeb(new {type="install-preflight-progress",requestId=requestId,key="disk",state="checking",title="Contrôle du stockage",detail="Espace libre sur le disque choisi..."});
                string requestedBase=ReadRequestedInstallBase(payload);
                string root=Path.GetPathRoot(String.IsNullOrWhiteSpace(requestedBase)?Environment.SystemDirectory:requestedBase);
                long freeBytes=new DriveInfo(root).AvailableFreeSpace;
                diskReady=freeBytes>=1024L*1024L*1024L;
                string diskState=diskReady?(freeBytes<5L*1024L*1024L*1024L?"warning":"success"):"failed";
                SendToWeb(new {type="install-preflight-progress",requestId=requestId,key="disk",state=diskState,title="Contrôle du stockage",detail=FormatBytes(freeBytes)+" libres"});

                systemReady=Environment.Is64BitOperatingSystem;
                bool restart=IsRestartPending();
                var blockers=FindRunningPackageProcesses(packages,catalog);
                string systemDetail=systemReady?(restart?"64 bits · redémarrage complet du PC conseillé":"Windows 64 bits compatible"):"Windows 64 bits requis";
                if(blockers.Length>0)systemDetail+=" · à fermer : "+String.Join(", ",blockers);
                SendToWeb(new {type="install-preflight-progress",requestId=requestId,key="system",state=systemReady?((restart||blockers.Length>0)?"warning":"success"):"failed",title="Compatibilité Windows",detail=systemDetail});

                if(wingetReady)
                {
                    for(int i=0;i<packages.Length;i++)
                    {
                        string id=packages[i];
                        SendToWeb(new {type="install-preflight-progress",requestId=requestId,key="packages",state="checking",title="Contrôle des paquets",detail=(i+1)+" / "+packages.Length+" · "+id});
                        var output=new StringBuilder();
                        int code=RunWingetCli("show --id \""+id+"\" --exact"+WingetSourceArgument(id)+" --accept-source-agreements --disable-interactivity",output);
                        if(code!=0)unavailable.Add(id);
                    }
                }
                else unavailable.AddRange(packages);
                packagesReady=unavailable.Count==0;
                SendToWeb(new {type="install-preflight-progress",requestId=requestId,key="packages",state=packagesReady?"success":"failed",title="Contrôle terminé",detail=packagesReady?packages.Length+" paquet(s) disponible(s)":unavailable.Count+" paquet(s) introuvable(s)"});
                bool ready=wingetReady&&diskReady&&systemReady&&packagesReady;
                SendToWeb(new {type="install-preflight-complete",requestId=requestId,ready=ready,blockers=blockers,failedPackages=unavailable.ToArray(),message=ready?(blockers.Length>0?"Fermez les applications indiquées pour éviter un blocage.":""):"Corrigez les éléments signalés ou retirez les paquets indisponibles."});
            }
            catch(Exception ex)
            {
                SendToWeb(new {type="install-preflight-complete",requestId=requestId,ready=false,failedPackages=unavailable.ToArray(),message=ex.Message});
            }
        });
    }

    void RunInstall(Dictionary<string, object> payload)
    {
        var packages = ReadArray(payload, "packages").Where(x => IsValidPackageId(x)).Distinct().Take(100).ToArray();
        if(packages.Any(id=>String.Equals(id,"VMware.WorkstationPro",StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("VMware Workstation Pro necessite une connexion Broadcom et l'acceptation de ses conditions. Utilisez Installation guidee depuis sa carte.");
        var catalog=ReadCatalog(payload);
        var portablePackages=ReadPortableCatalog(payload);
        string shortcutPreference=payload!=null&&payload.ContainsKey("shortcut")?Convert.ToString(payload["shortcut"]):"start";
        string installBase=ReadRequestedInstallBase(payload);
        bool launchAfter=payload!=null&&payload.ContainsKey("launchAfter")&&Convert.ToBoolean(payload["launchAfter"]);
        if(!new[]{"start","desktop","both","none"}.Contains(shortcutPreference))shortcutPreference="start";
        if (packages.Length == 0) throw new InvalidOperationException("Aucun logiciel valide n'est sélectionné.");
        if (installationRunning) { SendToWeb(new {type="install-already-running"}); return; }
        if(uninstallRunning || repairRunning || updateRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        installationRunning = true;
        SendToWeb(new { type="install-start", total=packages.Length });
        Task.Run(delegate {
            int success=0, failed=0;
            var failedPackages=new List<string>();
            var verifiedPackages=new List<string>();
            var itemResults=new List<Dictionary<string,object>>();
            var report=new StringBuilder();
            string operationId="PC-Setup-Installation-"+DateTime.Now.ToString("yyyy-MM-dd-HHmmss");
            string logName=operationId+".log";
            string reportName=operationId+".json";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            try
            {
                report.AppendLine("OWLSETUP - RAPPORT D'INSTALLATION");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                report.AppendLine(String.IsNullOrWhiteSpace(installBase)?"Emplacement : automatique (WinGet ou éditeur)":"Emplacement de base demandé : "+installBase);
                if(!String.IsNullOrWhiteSpace(installBase))report.AppendLine("Remarque : certains installateurs peuvent conserver un emplacement imposé par leur éditeur.");
                for(int i=0;i<packages.Length;i++)
                {
                    string id=packages[i];
                    string appName=catalog.ContainsKey(id)?catalog[id]:id.Split('.').Last();
                    string requestedLocation=String.IsNullOrWhiteSpace(installBase)?null:Path.Combine(installBase,SafeShortcutName(appName));
                    SendToWeb(new { type="install-progress", index=i+1, total=packages.Length, id=id });
                    report.AppendLine(); report.AppendLine("===== "+id+" =====");
                    var preflight=new StringBuilder();
                    int showCode=RunWingetCli("show --id \""+id+"\" --exact"+WingetSourceArgument(id)+" --accept-source-agreements --disable-interactivity",preflight);
                    report.AppendLine("Contrôle du manifeste et de la source : "+(showCode==0?"OK":"ÉCHEC"));
                    report.Append(preflight.ToString());
                    SendToWeb(new { type="install-security", index=i+1, total=packages.Length, id=id, success=showCode==0 });
                    if(showCode!=0)
                    {
                        failed++;
                        failedPackages.Add(id);
                        itemResults.Add(new Dictionary<string,object>{{"id",id},{"name",catalog.ContainsKey(id)?catalog[id]:id},{"success",false},{"code",showCode},{"stage","preflight"},{"message",ExplainWingetFailure(showCode,preflight.ToString(),"installation")}});
                        SendToWeb(new { type="install-item", index=i+1, total=packages.Length, id=id, success=false, code=showCode, errorMessage=ExplainWingetFailure(showCode,preflight.ToString(),"installation") });
                        continue;
                    }
                    SendToWeb(new { type="install-execution", index=i+1, total=packages.Length, id=id });
                    int operationStart=report.Length;
                    int code=RunWinget(id,requestedLocation,report);
                    string operationOutput=report.ToString(operationStart,report.Length-operationStart);
                    if(code==0&&!String.IsNullOrWhiteSpace(requestedLocation))SaveInstallLocation(id,requestedLocation);
                    if(portablePackages.Contains(id) && EnsurePortableShortcut(id,appName,shortcutPreference,report))code=0;
                    else if(code==0)ConfigureStandardShortcut(appName,shortcutPreference,report);
                    bool ok=code==0;
                    bool verified=VerifyPackageInstallationWithRetry(id,portablePackages.Contains(id),report);
                    SendToWeb(new {type="install-verification",index=i+1,total=packages.Length,id=id,success=verified});
                    if(verified&&!ok)
                    {
                        report.AppendLine("WinGet a retourné un avertissement, mais l'application est bien installée. Résultat corrigé automatiquement.");
                        ok=true;
                    }
                    else if(!verified&&ok)
                    {
                        ok=false;code=unchecked((int)0x8A150061);report.AppendLine("Vérification après installation : application non détectée après plusieurs contrôles.");
                    }
                    if(ok)
                    {
                        SaveApplicationName(id,appName);
                        verifiedPackages.Add(id);
                        if(launchAfter && packages.Length==1)LaunchInstalledApplication(id,appName,portablePackages.Contains(id),report);
                    }
                    if(ok)success++;else{failed++;failedPackages.Add(id);}
                    itemResults.Add(new Dictionary<string,object>{{"id",id},{"name",appName},{"success",ok},{"code",code},{"stage","install"},{"message",ok?"Installation réussie":ExplainWingetFailure(code,operationOutput,"installation")}});
                    report.AppendLine("Code de sortie : "+code);
                    SendToWeb(new { type="install-item", index=i+1, total=packages.Length, id=id, success=ok, code=code, errorMessage=ok?"":ExplainWingetFailure(code,operationOutput,"installation") });
                }
            }
            catch(Exception ex)
            {
                failed++;
                report.AppendLine(); report.AppendLine("ERREUR : "+ex.Message);
            }
            finally
            {
                try { File.WriteAllText(logPath,report.ToString(),Encoding.UTF8); } catch { }
                try { WriteOperationReport(reportName,"installation",success,failed,itemResults); } catch { }
                installationRunning=false;
                SendToWeb(new { type="install-complete", success=success, failed=failed, installedPackages=verifiedPackages.Distinct(StringComparer.OrdinalIgnoreCase).ToArray(), failedPackages=failedPackages.Distinct(StringComparer.OrdinalIgnoreCase).ToArray(), logName=logName, reportName=reportName });
            }
        });
    }

    void WriteOperationReport(string reportName,string operation,int success,int failed,List<Dictionary<string,object>> items)
    {
        var payload=new Dictionary<string,object>
        {
            {"schema","https://owlnetgeek.fr/schemas/owlsetup-operation-report-v1.json"},
            {"schemaVersion",1},
            {"owlSetupVersion",BuildInfo.DisplayVersion},
            {"channel",BuildInfo.Channel},
            {"operation",operation},
            {"createdAtUtc",DateTime.UtcNow.ToString("o")},
            {"environment",new Dictionary<string,object>{{"windows",Environment.OSVersion.VersionString},{"architecture",Environment.Is64BitOperatingSystem?"x64":"x86"}}},
            {"summary",new Dictionary<string,object>{{"success",success},{"failed",failed},{"total",success+failed}}},
            {"items",items}
        };
        File.WriteAllText(Path.Combine(GetDataFolder("Reports"),reportName),new JavaScriptSerializer().Serialize(payload),Encoding.UTF8);
    }

    int RunWinget(string packageId, string requestedLocation, StringBuilder report)
    {
        string scope=String.Equals(packageId,"Google.Chrome",StringComparison.OrdinalIgnoreCase)?" --scope machine":String.Equals(packageId,"Spotify.Spotify",StringComparison.OrdinalIgnoreCase)?" --scope user":"";
        string location=String.IsNullOrWhiteSpace(requestedLocation)?"":" --location \""+requestedLocation.Replace("\"","")+"\"";
        if(!String.IsNullOrWhiteSpace(requestedLocation))report.AppendLine("Emplacement demandé : "+requestedLocation);
        int code=RunWingetCli("install --id \""+packageId+"\" --exact"+WingetSourceArgument(packageId)+scope+location+" --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
        if(code!=0 && (String.Equals(packageId,"Google.Chrome",StringComparison.OrdinalIgnoreCase) || String.Equals(packageId,"Spotify.Spotify",StringComparison.OrdinalIgnoreCase)))
        {
            report.AppendLine();
            report.AppendLine("WinGet n'a pas terminé l'installation. Activation du secours signé de l'éditeur...");
            code=InstallSignedPublisherFallback(packageId,report);
        }
        return code;
    }

    void ChooseInstallLocation(Dictionary<string,object> payload)
    {
        using(var dialog=new FolderBrowserDialog())
        {
            dialog.Description="Choisissez le dossier de base pour les logiciels. OwlSetup créera un sous-dossier par application.";
            dialog.ShowNewFolderButton=true;
            string current=payload!=null&&payload.ContainsKey("currentPath")?Convert.ToString(payload["currentPath"]):"";
            if(!String.IsNullOrWhiteSpace(current)&&Directory.Exists(current))dialog.SelectedPath=current;
            if(dialog.ShowDialog(this)!=DialogResult.OK)return;
            string selected=ValidateInstallBasePath(dialog.SelectedPath);
            SendToWeb(new {type="install-location-selected",path=selected});
        }
    }

    string ReadRequestedInstallBase(Dictionary<string,object> payload)
    {
        string mode=payload!=null&&payload.ContainsKey("locationMode")?Convert.ToString(payload["locationMode"]):"auto";
        if(!String.Equals(mode,"custom",StringComparison.OrdinalIgnoreCase))return null;
        string path=payload!=null&&payload.ContainsKey("locationPath")?Convert.ToString(payload["locationPath"]):"";
        if(String.IsNullOrWhiteSpace(path))throw new InvalidOperationException("Choisissez un dossier d'installation personnalisé.");
        return ValidateInstallBasePath(path);
    }

    string ValidateInstallBasePath(string path)
    {
        if(String.IsNullOrWhiteSpace(path)||path.IndexOf('"')>=0)throw new InvalidOperationException("Le dossier d'installation est invalide.");
        string full=Path.GetFullPath(path.Trim()).TrimEnd(Path.DirectorySeparatorChar,Path.AltDirectorySeparatorChar);
        if(!Path.IsPathRooted(full)||full.StartsWith("\\\\",StringComparison.Ordinal))throw new InvalidOperationException("Choisissez un dossier local sur ce PC.");
        string root=Path.GetPathRoot(full).TrimEnd(Path.DirectorySeparatorChar,Path.AltDirectorySeparatorChar);
        if(String.Equals(full,root,StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Choisissez un dossier, pas la racine du disque.");
        string windows=Environment.GetFolderPath(Environment.SpecialFolder.Windows).TrimEnd(Path.DirectorySeparatorChar);
        if(IsSameOrChildPath(full,windows)||IsSameOrChildPath(full,appRoot))throw new InvalidOperationException("Ce dossier est protégé. Choisissez un autre emplacement.");
        if(!Directory.Exists(full))Directory.CreateDirectory(full);
        // Les controles ci-dessus travaillent sur le chemin TEXTUEL : un dossier
        // existant peut etre une jonction qui redirige vers une zone protegee
        // sans que le chemin le laisse voir. On verifie donc chaque composant,
        // comme le fait deja GetAuthorizedDiskTarget pour les dossiers analyses.
        EnsureNoReparsePoints(full,Path.GetPathRoot(full));
        return full;
    }

    bool IsSameOrChildPath(string candidate,string parent)
    {
        if(String.IsNullOrWhiteSpace(candidate)||String.IsNullOrWhiteSpace(parent))return false;
        string normalizedParent=Path.GetFullPath(parent).TrimEnd(Path.DirectorySeparatorChar,Path.AltDirectorySeparatorChar);
        string normalizedCandidate=Path.GetFullPath(candidate).TrimEnd(Path.DirectorySeparatorChar,Path.AltDirectorySeparatorChar);
        return String.Equals(normalizedCandidate,normalizedParent,StringComparison.OrdinalIgnoreCase)||normalizedCandidate.StartsWith(normalizedParent+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase);
    }

    bool VerifyPackageInstallation(string packageId,bool portable,StringBuilder report)
    {
        if(portable)return IsManagedPortable(packageId);
        var verification=new StringBuilder();
        int code=RunWingetCli("list --id \""+packageId+"\" --exact --accept-source-agreements --disable-interactivity",verification);
        report.AppendLine("Vérification après installation : "+(code==0?"terminée":"échec"));
        report.Append(verification.ToString());
        return code==0&&WingetTableContainsId(verification.ToString(),packageId);
    }

    bool VerifyPackageInstallationWithRetry(string packageId,bool portable,StringBuilder report)
    {
        const int attempts=4;
        for(int attempt=1;attempt<=attempts;attempt++)
        {
            if(VerifyPackageInstallation(packageId,portable,report))
            {
                if(attempt>1)report.AppendLine("Application détectée après attente (contrôle "+attempt+"/"+attempts+").");
                return true;
            }
            if(attempt<attempts)
            {
                report.AppendLine("Enregistrement de l'application encore en cours. Nouvelle vérification...");
                Thread.Sleep(1200);
            }
        }
        return false;
    }

    string[] FindRunningPackageProcesses(string[] packages,Dictionary<string,string> catalog)
    {
        var tokens=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(string id in packages)
        {
            string name=catalog.ContainsKey(id)?catalog[id]:id.Split('.').Last();
            foreach(string token in Regex.Split(name+" "+id.Split('.').Last(),"[^A-Za-z0-9]+"))if(token.Length>=4)tokens.Add(token);
        }
        var found=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(var process in Process.GetProcesses())
        {
            try{if(tokens.Any(token=>process.ProcessName.IndexOf(token,StringComparison.OrdinalIgnoreCase)>=0))found.Add(process.ProcessName);}catch{}finally{process.Dispose();}
        }
        return found.Take(8).OrderBy(x=>x).ToArray();
    }

    Dictionary<string,string[]> KnownPackageProcesses()
    {
        return new Dictionary<string,string[]>(StringComparer.OrdinalIgnoreCase)
        {
            {"OBSProject.OBSStudio",new[]{"obs64","obs32"}},
            {"Google.Chrome",new[]{"chrome"}},
            {"Mozilla.Firefox",new[]{"firefox"}},
            {"Brave.Brave",new[]{"brave"}},
            {"Microsoft.Edge",new[]{"msedge"}},
            {"VideoLAN.VLC",new[]{"vlc"}},
            {"Notepad++.Notepad++",new[]{"notepad++"}},
            {"TheDocumentFoundation.LibreOffice",new[]{"soffice","swriter","scalc","simpress","sdraw"}},
            {"Spotify.Spotify",new[]{"spotify"}},
            {"Discord.Discord",new[]{"discord"}},
            {"Valve.Steam",new[]{"steam","steamwebhelper"}},
            {"Microsoft.VisualStudioCode",new[]{"code"}},
            {"Audacity.Audacity",new[]{"audacity"}},
            {"7zip.7zip",new[]{"7zfm","7zg"}},
            {"RARLab.WinRAR",new[]{"winrar"}},
            {"qBittorrent.qBittorrent",new[]{"qbittorrent"}},
            {"Zoom.Zoom",new[]{"zoom"}},
            {"GitHub.GitHubDesktop",new[]{"githubdesktop"}},
            {"Docker.DockerDesktop",new[]{"docker desktop"}}
        };
    }

    bool IsProtectedProcess(Process process)
    {
        if(process==null)return true;
        if(process.Id==Process.GetCurrentProcess().Id)return true;
        string name="";
        try{name=(process.ProcessName??"").ToLowerInvariant();}catch{return true;}
        string[] protectedNames={"system","idle","registry","smss","csrss","wininit","winlogon","services","lsass","svchost","dwm","explorer","taskhostw","sihost","shellhost","startmenuexperiencehost","searchhost","securityhealthservice","msmpeng","owlsetup"};
        return protectedNames.Contains(name,StringComparer.OrdinalIgnoreCase);
    }

    List<Process> ResolvePackageProcesses(IEnumerable<string> packageIds)
    {
        var map=KnownPackageProcesses();
        var packageSet=new HashSet<string>(packageIds,StringComparer.OrdinalIgnoreCase);
        var allowed=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(string packageId in packageSet)
        {
            string[] names;if(map.TryGetValue(packageId,out names))foreach(string name in names)allowed.Add(name);
        }
        var matchedNames=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var matchedIds=new HashSet<int>();
        var result=new List<Process>();
        foreach(Process process in Process.GetProcesses())
        {
            try
            {
                bool knownName=allowed.Contains(process.ProcessName);
                bool loadedModule=ProcessUsesPackageModule(process,packageSet);
                if(!IsProtectedProcess(process)&&(knownName||loadedModule))
                {
                    result.Add(process);matchedIds.Add(process.Id);
                    if(loadedModule)matchedNames.Add(process.ProcessName);
                }
                else process.Dispose();
            }
            catch{process.Dispose();}
        }
        if(matchedNames.Count>0)
        {
            foreach(Process process in Process.GetProcesses())
            {
                try
                {
                    if(!matchedIds.Contains(process.Id)&&!IsProtectedProcess(process)&&matchedNames.Contains(process.ProcessName))
                    {result.Add(process);matchedIds.Add(process.Id);}
                    else process.Dispose();
                }
                catch{process.Dispose();}
            }
        }
        return result;
    }

    bool ProcessUsesPackageModule(Process process,HashSet<string> packageIds)
    {
        if(!packageIds.Contains("OBSProject.OBSStudio"))return false;
        string programFiles=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string programFilesX86=Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string obsRoot=Path.Combine(programFiles,"obs-studio")+Path.DirectorySeparatorChar;
        string obsRootX86=Path.Combine(programFilesX86,"obs-studio")+Path.DirectorySeparatorChar;
        try
        {
            foreach(ProcessModule module in process.Modules)
            {
                string path=module.FileName??"";
                if(path.StartsWith(obsRoot,StringComparison.OrdinalIgnoreCase) || path.StartsWith(obsRootX86,StringComparison.OrdinalIgnoreCase) ||
                   path.IndexOf("obs-virtualcam",StringComparison.OrdinalIgnoreCase)>=0)return true;
            }
        }
        catch{}
        return false;
    }

    object[] DescribeProcesses(IEnumerable<Process> processes)
    {
        var items=new List<object>();
        foreach(Process process in processes)
        {
            try
            {
                if(process.HasExited)continue;
                string title="";try{title=process.MainWindowTitle??"";}catch{}
                items.Add(new {pid=process.Id,name=process.ProcessName,title=title,canClose=process.MainWindowHandle!=IntPtr.Zero});
            }
            catch{}
        }
        return items.ToArray();
    }

    void InspectPackageProcesses(Dictionary<string,object> payload)
    {
        var packages=ReadArray(payload,"packages").Where(x=>IsValidPackageId(x)).Distinct(StringComparer.OrdinalIgnoreCase).Take(10).ToArray();
        if(packages.Length==0)throw new InvalidOperationException("Aucun paquet valide a examiner.");
        Task.Run(delegate
        {
            var known=KnownPackageProcesses();
            string[] unknownPackages=packages.Where(id=>!known.ContainsKey(id)).ToArray();
            var processes=ResolvePackageProcesses(packages);
            try{SendToWeb(new {type="package-process-scan",packages=packages,processes=DescribeProcesses(processes),recognized=unknownPackages.Length==0,unknownPackages=unknownPackages});}
            finally{foreach(Process process in processes)process.Dispose();}
        });
    }

    void ClosePackageProcesses(Dictionary<string,object> payload)
    {
        var packages=ReadArray(payload,"packages").Where(x=>IsValidPackageId(x)).Distinct(StringComparer.OrdinalIgnoreCase).Take(10).ToArray();
        bool force=payload!=null&&payload.ContainsKey("force")&&Convert.ToBoolean(payload["force"]);
        bool confirmed=payload!=null&&payload.ContainsKey("confirmed")&&Convert.ToBoolean(payload["confirmed"]);
        if(packages.Length==0)throw new InvalidOperationException("Aucun paquet valide a traiter.");
        if(force&&!confirmed)throw new InvalidOperationException("La fermeture forcee doit etre confirmee explicitement.");
        Task.Run(delegate
        {
            var processes=ResolvePackageProcesses(packages);int requested=processes.Count,closed=0;
            try
            {
                foreach(Process process in processes)
                {
                    try
                    {
                        if(process.HasExited)continue;
                        if(force)process.Kill();
                        else if(process.MainWindowHandle!=IntPtr.Zero)process.CloseMainWindow();
                    }
                    catch{}
                }
                DateTime deadline=DateTime.UtcNow.AddSeconds(force?3:7);
                while(DateTime.UtcNow<deadline)
                {
                    if(processes.All(process=>{try{return process.HasExited;}catch{return true;}}))break;
                    Thread.Sleep(250);
                }
                foreach(Process process in processes)try{if(process.HasExited)closed++;}catch{closed++;}
            }
            finally{foreach(Process process in processes)process.Dispose();}
            var remaining=ResolvePackageProcesses(packages);
            try{SendToWeb(new {type="package-process-close",packages=packages,force=force,requested=requested,closed=closed,processes=DescribeProcesses(remaining)});}
            finally{foreach(Process process in remaining)process.Dispose();}
        });
    }

    string WingetSourceArgument(string packageId)
    {
        return String.Equals(packageId,"9NT1R1C2HH7J",StringComparison.OrdinalIgnoreCase)?" --source msstore":" --source winget";
    }

    bool EnsurePortableShortcut(string packageId,StringBuilder report)
    {
        return EnsurePortableShortcut(packageId,LoadApplicationName(packageId),LoadShortcutPreference(packageId),report);
    }

    string ResolvePortableExecutable(string packageId,string appName,StringBuilder report)
    {
        string local=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string idName=packageId.Split('.').Last();
        string wanted=NormalizeSoftwareName(String.IsNullOrWhiteSpace(appName)?idName:appName).Replace(" ","");
        string customLocation=LoadInstallLocation(packageId);
        if(!String.IsNullOrWhiteSpace(customLocation))
        {
            string customExecutable=FindPortableExecutableInFolder(customLocation,wanted,idName,report);
            if(!String.IsNullOrWhiteSpace(customExecutable))return customExecutable;
        }
        string linksRoot=Path.Combine(local,"Microsoft","WinGet","Links");
        try
        {
            if(Directory.Exists(linksRoot)&&!IsReparsePoint(linksRoot))
            {
                string alias=Directory.GetFiles(linksRoot,"*.exe",SearchOption.TopDirectoryOnly)
                    .Where(path=>!IsReparsePoint(path))
                    .OrderByDescending(path=>NormalizeSoftwareName(Path.GetFileNameWithoutExtension(path)).Replace(" ","")==wanted)
                    .FirstOrDefault(path=>NormalizeSoftwareName(Path.GetFileNameWithoutExtension(path)).Replace(" ","").Contains(wanted) || wanted.Contains(NormalizeSoftwareName(Path.GetFileNameWithoutExtension(path)).Replace(" ","")));
                if(!String.IsNullOrEmpty(alias)){report.AppendLine("Executable portable detecte via le lien WinGet : "+alias);return alias;}
            }
        }catch{}
        string packagesRoot=Path.Combine(local,"Microsoft","WinGet","Packages");
        try
        {
            if(Directory.Exists(packagesRoot) && !IsReparsePoint(packagesRoot))
            {
                foreach(string packageFolder in Directory.GetDirectories(packagesRoot,packageId+"_*",SearchOption.TopDirectoryOnly).OrderByDescending(path=>Directory.GetLastWriteTimeUtc(path)))
                {
                    if(IsReparsePoint(packageFolder))continue;
                    var candidates=new List<string>();
                    candidates.AddRange(Directory.GetFiles(packageFolder,"*.exe",SearchOption.TopDirectoryOnly).Where(path=>!IsReparsePoint(path)));
                    foreach(string child in Directory.GetDirectories(packageFolder,"*",SearchOption.TopDirectoryOnly).Where(path=>!IsReparsePoint(path)))
                    {
                        candidates.AddRange(Directory.GetFiles(child,"*.exe",SearchOption.TopDirectoryOnly).Where(path=>!IsReparsePoint(path)));
                    }
                    var safeCandidates=candidates.Where(IsSafePortableExecutable).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                    string executable=safeCandidates
                        .OrderByDescending(path=>PortableExecutableScore(path,wanted,idName))
                        .ThenBy(path=>Path.GetFileName(path).Length)
                        .FirstOrDefault();
                    if(safeCandidates.Count>1 && !String.IsNullOrEmpty(executable) && PortableExecutableScore(executable,wanted,idName)<70)
                    {
                        report.AppendLine("Plusieurs executables portables ambigus ont ete trouves : aucun raccourci automatique n'est cree.");
                        executable=null;
                    }
                    if(!String.IsNullOrEmpty(executable))
                    {
                        EnsureNoReparsePoints(executable,packagesRoot);
                        report.AppendLine("Executable principal detecte dans le paquet portable WinGet : "+executable);
                        return executable;
                    }
                }
            }
        }
        catch(Exception ex){report.AppendLine("Recherche du paquet portable : "+ex.Message);}
        return null;
    }

    string FindPortableExecutableInFolder(string folder,string wanted,string idName,StringBuilder report)
    {
        try
        {
            if(!Directory.Exists(folder)||IsReparsePoint(folder))return null;
            var candidates=new List<string>();
            candidates.AddRange(Directory.GetFiles(folder,"*.exe",SearchOption.TopDirectoryOnly).Where(path=>!IsReparsePoint(path)));
            foreach(string child in Directory.GetDirectories(folder,"*",SearchOption.TopDirectoryOnly).Where(path=>!IsReparsePoint(path)).Take(40))
                candidates.AddRange(Directory.GetFiles(child,"*.exe",SearchOption.TopDirectoryOnly).Where(path=>!IsReparsePoint(path)));
            var safe=candidates.Where(IsSafePortableExecutable).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            string executable=safe.OrderByDescending(path=>PortableExecutableScore(path,wanted,idName)).ThenBy(path=>Path.GetFileName(path).Length).FirstOrDefault();
            if(safe.Count>1&&!String.IsNullOrWhiteSpace(executable)&&PortableExecutableScore(executable,wanted,idName)<70)return null;
            if(!String.IsNullOrWhiteSpace(executable))
            {
                EnsureNoReparsePoints(executable,folder);
                report.AppendLine("Exécutable portable détecté dans le dossier choisi : "+executable);
                return executable;
            }
        }
        catch(Exception ex){report.AppendLine("Recherche dans le dossier choisi : "+ex.Message);}
        return null;
    }

    bool IsSafePortableExecutable(string path)
    {
        string name=Path.GetFileNameWithoutExtension(path).ToLowerInvariant();
        string[] rejected={"unins","uninstall","update","updater","setup","install","crash","helper","service","report","elevate"};
        return !rejected.Any(value=>name.Contains(value));
    }

    int PortableExecutableScore(string path,string wanted,string idName)
    {
        string name=NormalizeSoftwareName(Path.GetFileNameWithoutExtension(path)).Replace(" ","");
        string id=NormalizeSoftwareName(idName).Replace(" ","");
        if(name==wanted)return 100;
        if(name==id)return 95;
        if(name.Contains(wanted)||wanted.Contains(name))return 80;
        if(name.Contains(id)||id.Contains(name))return 70;
        return 10;
    }

    bool EnsurePortableShortcut(string packageId,string appName,string preference,StringBuilder report)
    {
        string target=ResolvePortableExecutable(packageId,appName,report);
        if(String.IsNullOrEmpty(target)||!File.Exists(target))
        {
            report.AppendLine("L'application portable est introuvable dans les dossiers WinGet.");
            return false;
        }
        try
        {
            SaveShortcutPreference(packageId,preference);
            SaveApplicationName(packageId,appName);
            SavePortableMarker(packageId);
            var shortcuts=new List<string>();
            string safeName=SafeShortcutName(appName);
            if(preference=="start" || preference=="both")shortcuts.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),safeName+".lnk"));
            if(preference=="desktop" || preference=="both")shortcuts.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),safeName+".lnk"));
            foreach(string shortcut in shortcuts)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(shortcut));
                if(!File.Exists(shortcut))
                {
                    if(!CreateShortcut(shortcut,target,appName+" - application portable geree par OwlSetup",report))
                        report.AppendLine("Le raccourci n'a pas pu etre cree : "+shortcut);
                }
                if(File.Exists(shortcut))report.AppendLine("Raccourci portable : "+shortcut);
            }
            if(preference=="none")report.AppendLine(appName+" est disponible sans raccourci supplementaire.");
            return true;
        }
        catch(Exception ex)
        {
            report.AppendLine(appName+" est installe, mais le raccourci n'a pas pu etre cree : "+ex.Message);
            return true;
        }
    }

    bool PortableShortcutExists(string appName,string preference)
    {
        try
        {
            if(preference=="none")return true;
            string safeName=SafeShortcutName(appName);
            var expected=new List<string>();
            if(preference=="start" || preference=="both")
                expected.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),safeName+".lnk"));
            if(preference=="desktop" || preference=="both")
                expected.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),safeName+".lnk"));
            return expected.Count>0 && expected.All(File.Exists);
        }
        catch{return false;}
    }

    string SafeShortcutName(string appName)
    {
        string value=Regex.Replace(appName??"Application","[\\\\/:*?\"<>|]"," ").Trim();
        return String.IsNullOrWhiteSpace(value)?"Application":value;
    }

    void SaveApplicationName(string packageId,string appName)
    {
        try{File.WriteAllText(Path.Combine(GetDataFolder("Settings"),packageId+".name.txt"),SafeShortcutName(appName),Encoding.UTF8);}catch{}
    }

    void SavePortableMarker(string packageId)
    {
        try{File.WriteAllText(Path.Combine(GetDataFolder("Settings"),packageId+".portable.txt"),"1",Encoding.ASCII);}catch{}
    }

    bool IsManagedPortable(string packageId)
    {
        try{return File.Exists(Path.Combine(GetDataFolder("Settings"),packageId+".portable.txt")) || String.Equals(packageId,"Rufus.Rufus",StringComparison.OrdinalIgnoreCase);}catch{return false;}
    }

    string LoadApplicationName(string packageId)
    {
        try
        {
            string path=Path.Combine(GetDataFolder("Settings"),packageId+".name.txt");
            if(File.Exists(path)){string value=File.ReadAllText(path).Trim();if(!String.IsNullOrWhiteSpace(value))return SafeShortcutName(value);}
        }catch{}
        return SafeShortcutName(packageId.Split('.').Last());
    }

    string LoadShortcutPreference(string packageId)
    {
        try
        {
            string path=Path.Combine(GetDataFolder("Settings"),packageId+".shortcut.txt");
            string value=File.Exists(path)?File.ReadAllText(path).Trim():"start";
            return new[]{"start","desktop","both","none"}.Contains(value)?value:"start";
        }
        catch{return "start";}
    }

    void SaveShortcutPreference(string packageId,string preference)
    {
        try
        {
            if(!new[]{"start","desktop","both","none"}.Contains(preference))return;
            File.WriteAllText(Path.Combine(GetDataFolder("Settings"),packageId+".shortcut.txt"),preference,Encoding.UTF8);
        }
        catch{}
    }

    void SaveInstallLocation(string packageId,string location)
    {
        try
        {
            string validated=ValidateInstallBasePath(location);
            File.WriteAllText(Path.Combine(GetDataFolder("Settings"),packageId+".location.txt"),validated,Encoding.UTF8);
        }
        catch{}
    }

    string LoadInstallLocation(string packageId)
    {
        try
        {
            string path=Path.Combine(GetDataFolder("Settings"),packageId+".location.txt");
            if(!File.Exists(path))return null;
            string value=File.ReadAllText(path).Trim();
            return Directory.Exists(value)?ValidateInstallBasePath(value):null;
        }
        catch{return null;}
    }

    bool CreateShortcut(string shortcut,string target,string description,StringBuilder report)
    {
        string script="$shell=New-Object -ComObject WScript.Shell;"+
            "$shortcut=$shell.CreateShortcut('"+shortcut.Replace("'","''")+"');"+
            "$shortcut.TargetPath='"+target.Replace("'","''")+"';"+
            "$shortcut.WorkingDirectory='"+Path.GetDirectoryName(target).Replace("'","''")+"';"+
            "$shortcut.IconLocation='"+target.Replace("'","''")+",0';"+
            "$shortcut.Description='"+description.Replace("'","''")+"';"+
            "$shortcut.Save()";
        string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
        int code=RunHiddenProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,report);
        return code==0 && File.Exists(shortcut);
    }

    void ConfigureStandardShortcut(string appName,string preference,StringBuilder report)
    {
        if(preference!="desktop" && preference!="both")return;
        try
        {
            string normalized=NormalizeSoftwareName(appName);
            var roots=new[]{Environment.GetFolderPath(Environment.SpecialFolder.Programs),Environment.GetFolderPath(Environment.SpecialFolder.CommonPrograms)};
            string source=roots.Where(Directory.Exists).SelectMany(root=>Directory.GetFiles(root,"*.lnk",SearchOption.AllDirectories))
                .OrderByDescending(path=>NormalizeSoftwareName(Path.GetFileNameWithoutExtension(path))==normalized)
                .ThenByDescending(path=>NormalizeSoftwareName(Path.GetFileNameWithoutExtension(path)).Contains(normalized))
                .FirstOrDefault(path=>NormalizeSoftwareName(Path.GetFileNameWithoutExtension(path)).Contains(normalized) || normalized.Contains(NormalizeSoftwareName(Path.GetFileNameWithoutExtension(path))));
            if(String.IsNullOrEmpty(source))
            {
                report.AppendLine("Aucun raccourci existant trouve pour creer un acces Bureau : "+appName);
                return;
            }
            string destination=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),Path.GetFileName(source));
            File.Copy(source,destination,true);
            report.AppendLine("Raccourci Bureau : "+destination);
        }
        catch(Exception ex){report.AppendLine("Creation du raccourci Bureau impossible pour "+appName+" : "+ex.Message);}
    }

    void LaunchInstalledApplication(string packageId,string appName,bool portable,StringBuilder report)
    {
        try
        {
            if(!portable)return;
            string target=ResolvePortableExecutable(packageId,appName,report);
            if(String.IsNullOrEmpty(target)||!File.Exists(target)){report.AppendLine("Lancement impossible : executable portable introuvable.");return;}
            Process.Start(new ProcessStartInfo{FileName=target,UseShellExecute=true});
            report.AppendLine(appName+" a ete lance apres l'installation.");
        }
        catch(Exception ex){report.AppendLine("Lancement automatique impossible : "+ex.Message);}
    }

    int InstallSignedPublisherFallback(string packageId,StringBuilder report)
    {
        bool chrome=String.Equals(packageId,"Google.Chrome",StringComparison.OrdinalIgnoreCase);
        string url=chrome?"https://dl.google.com/dl/chrome/install/googlechromestandaloneenterprise64.msi":"https://download.scdn.co/SpotifyFullSetupX64.exe";
        string publisher=chrome?"Google LLC":"Spotify AB";
        string extension=chrome?".msi":".exe";
        string folder=Path.Combine(Path.GetTempPath(),"PCSetup","Installers");
        Directory.CreateDirectory(folder);
        string installer=Path.Combine(folder,packageId+"-"+Guid.NewGuid().ToString("N")+extension);
        try
        {
            // TLS 1.2 explicite, et non SecurityProtocolType.SystemDefault que
            // suggere l analyseur : sur .NET Framework 4.6.2, la valeur par
            // defaut du systeme peut encore autoriser TLS 1.0. Le jour ou la
            // cible passera en 4.7.1+, SystemDefault deviendra le bon choix.
            ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;
            report.AppendLine("Téléchargement officiel : "+url);
            using(var client=new WebClient())
            {
                client.Headers[HttpRequestHeader.UserAgent]="PC-Setup/"+CurrentVersionText();
                client.DownloadFile(url,installer);
            }
            string escaped=installer.Replace("'","''");
            string expected=publisher.Replace("'","''");
            string launch=chrome?
                "$p=Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i',$file,'/qn','/norestart') -Wait -PassThru; exit $p.ExitCode":
                "$p=Start-Process -FilePath $file -ArgumentList @('/silent') -Wait -PassThru; exit $p.ExitCode";
            string script="$ErrorActionPreference='Stop'; $file='"+escaped+"'; $sig=Get-AuthenticodeSignature -LiteralPath $file; "+
                "if($sig.Status -ne 'Valid' -or -not $sig.SignerCertificate -or $sig.SignerCertificate.Subject -notmatch 'O="+expected+"'){Write-Error 'Signature numérique de l éditeur invalide.'; exit 87}; "+launch;
            string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
            int code=RunHiddenProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,report);
            report.AppendLine("Code du secours éditeur : "+code);
            return code;
        }
        catch(Exception ex)
        {
            report.AppendLine("Échec du secours éditeur : "+ex.Message);
            return -1;
        }
        finally
        {
            try{if(File.Exists(installer))File.Delete(installer);}catch{}
        }
    }

    int RunHiddenProcess(string fileName, string arguments, StringBuilder report)
    {
        return RunHiddenProcess(fileName,arguments,report,null);
    }

    // --- Journal d'audit des operations elevees -----------------------------
    //
    // Chaque elevation laisse une trace, ecrite par RunElevatedProcess lui-meme :
    // on ne peut donc pas ajouter un appelant qui echapperait au journal. Le
    // fichier suit la convention de nommage des journaux (PC-Setup-*.log), il
    // apparait donc dans l'historique local et s'ouvre depuis l'interface.
    const string ElevationLogName="PC-Setup-Elevations.log";
    const long ElevationLogMaxBytes=512*1024;
    static readonly object elevationLogLock=new object();

    internal static string SummarizeElevationArguments(string arguments)
    {
        if(String.IsNullOrEmpty(arguments))return "(sans argument)";
        string flat=Regex.Replace(arguments,"\\s+"," ").Trim();
        return flat.Length>300?flat.Substring(0,300)+"…":flat;
    }

    internal static void TrimElevationLog(string path)
    {
        // OpenLog refuse d'afficher un journal de plus de 2 Mo. On garde la
        // moitie la plus recente plutot que de laisser le fichier grossir
        // jusqu'a devenir illisible depuis l'interface.
        try
        {
            if(!File.Exists(path))return;
            if(new FileInfo(path).Length<=ElevationLogMaxBytes)return;
            string[] lines=File.ReadAllLines(path,Encoding.UTF8);
            var kept=new List<string>();
            for(int i=lines.Length/2;i<lines.Length;i++)kept.Add(lines[i]);
            File.WriteAllLines(path,kept.ToArray(),Encoding.UTF8);
        }
        catch{}
    }

    internal static void LogElevation(string fileName,string arguments,string outcome)
    {
        // Une trace d'audit ne doit jamais faire echouer l'operation qu'elle
        // observe : toute erreur d'ecriture est ignoree.
        try
        {
            string line=DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                +" | "+Path.GetFileName(fileName==null?"":fileName)
                +" | "+SummarizeElevationArguments(arguments)
                +" | "+outcome;
            lock(elevationLogLock)
            {
                string path=Path.Combine(GetDataFolder("Logs"),ElevationLogName);
                TrimElevationLog(path);
                File.AppendAllText(path,line+Environment.NewLine,Encoding.UTF8);
            }
        }
        catch{}
    }

    int RunElevatedProcess(string fileName,string arguments,StringBuilder report)
    {
        // La demande est tracee AVANT le lancement : si l'application est
        // interrompue pendant l'operation, l'historique garde tout de meme la
        // trace de ce qui a ete demande.
        LogElevation(fileName,arguments,"demande");
        try
        {
            report.AppendLine("Autorisation administrateur demandee uniquement pour cette operation.");
            using(var process=new Process())
            {
                process.StartInfo=new ProcessStartInfo{FileName=fileName,Arguments=arguments,UseShellExecute=true,Verb="runas",WindowStyle=ProcessWindowStyle.Hidden};
                process.Start();process.WaitForExit();
                report.AppendLine("Code de l'operation elevee : "+process.ExitCode);
                LogElevation(fileName,arguments,"code="+process.ExitCode);
                return process.ExitCode;
            }
        }
        catch(System.ComponentModel.Win32Exception ex)
        {
            if(ex.NativeErrorCode==1223){report.AppendLine("Autorisation administrateur annulee par l'utilisateur.");LogElevation(fileName,arguments,"refus UAC");return 1223;}
            report.AppendLine("Elevation impossible : "+ex.Message);
            LogElevation(fileName,arguments,"echec Win32 "+ex.NativeErrorCode);
            return ex.NativeErrorCode;
        }
        catch(Exception ex){report.AppendLine("Elevation impossible : "+ex.Message);LogElevation(fileName,arguments,"echec");return -1;}
    }

    int RunHiddenProcess(string fileName, string arguments, StringBuilder report, Action<string> onLine)
    {
        var process=new Process();
        process.StartInfo=new ProcessStartInfo {
            FileName=fileName,
            Arguments=arguments,
            UseShellExecute=false,
            CreateNoWindow=true,
            RedirectStandardOutput=true,
            RedirectStandardError=true,
            StandardOutputEncoding=Encoding.UTF8,
            StandardErrorEncoding=Encoding.UTF8
        };
        object sync=new object();
        DataReceivedEventHandler append=delegate(object s,DataReceivedEventArgs e){
            if(e.Data==null)return;
            lock(sync)report.AppendLine(e.Data);
            if(onLine!=null)try{onLine(e.Data);}catch{}
        };
        process.OutputDataReceived+=append;process.ErrorDataReceived+=append;
        process.Start();process.BeginOutputReadLine();process.BeginErrorReadLine();process.WaitForExit();process.WaitForExit();
        return process.ExitCode;
    }

    // Point d'entree unique pour lancer le CLI winget en arriere-plan et capturer
    // sa sortie. ResolveWingetPath() trouve le vrai winget.exe (alias WindowsApps
    // puis paquet Microsoft.DesktopAppInstaller) et leve une exception explicite
    // s'il est absent. Tous les appels lecture/ecriture winget passent par ici :
    // un seul endroit ou ajouter journalisation, delai maximal ou telemetrie.
    int RunWingetCli(string arguments, StringBuilder report)
    {
        return RunWingetCli(arguments, report, null);
    }

    int RunWingetCli(string arguments, StringBuilder report, Action<string> onLine)
    {
        return RunHiddenProcess(ResolveWingetPath(), arguments, report, onLine);
    }

    int RunAsInteractiveUser(string fileName,string arguments,StringBuilder report)
    {
        Process explorer=null;IntPtr shellToken=IntPtr.Zero,primaryToken=IntPtr.Zero,environment=IntPtr.Zero;
        PROCESS_INFORMATION processInfo=new PROCESS_INFORMATION();
        try
        {
            int session=Process.GetCurrentProcess().SessionId;
            explorer=Process.GetProcessesByName("explorer").FirstOrDefault(item=>item.SessionId==session);
            if(explorer==null)throw new InvalidOperationException("Session Windows interactive introuvable.");
            if(!OpenProcessToken(explorer.Handle,TOKEN_QUERY|TOKEN_DUPLICATE|TOKEN_ASSIGN_PRIMARY,out shellToken))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            if(!DuplicateTokenEx(shellToken,TOKEN_ALL_ACCESS,IntPtr.Zero,SecurityImpersonation,TokenPrimary,out primaryToken))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            if(!CreateEnvironmentBlock(out environment,primaryToken,false))environment=IntPtr.Zero;
            var startup=new STARTUPINFO();startup.cb=Marshal.SizeOf(typeof(STARTUPINFO));
            var commandLine=new StringBuilder("\""+fileName+"\" "+arguments);
            bool created=CreateProcessWithTokenW(primaryToken,LOGON_WITH_PROFILE,fileName,commandLine,CREATE_UNICODE_ENVIRONMENT|CREATE_NO_WINDOW,environment,Path.GetDirectoryName(fileName),ref startup,out processInfo);
            if(!created)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            WaitForSingleObject(processInfo.hProcess,INFINITE);
            uint exitCode;if(!GetExitCodeProcess(processInfo.hProcess,out exitCode))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            report.AppendLine("Code de la tentative utilisateur : "+unchecked((int)exitCode));
            return unchecked((int)exitCode);
        }
        catch(Exception ex){report.AppendLine("Tentative utilisateur impossible : "+ex.Message);return -1;}
        finally
        {
            if(processInfo.hThread!=IntPtr.Zero)CloseNativeHandle(processInfo.hThread);
            if(processInfo.hProcess!=IntPtr.Zero)CloseNativeHandle(processInfo.hProcess);
            if(environment!=IntPtr.Zero)DestroyEnvironmentBlock(environment);
            if(primaryToken!=IntPtr.Zero)CloseNativeHandle(primaryToken);
            if(shellToken!=IntPtr.Zero)CloseNativeHandle(shellToken);
            if(explorer!=null)explorer.Dispose();
        }
    }

    const uint TOKEN_ASSIGN_PRIMARY=0x0001,TOKEN_DUPLICATE=0x0002,TOKEN_QUERY=0x0008,TOKEN_ALL_ACCESS=0x000F01FF;
    const int SecurityImpersonation=2,TokenPrimary=1;
    const uint LOGON_WITH_PROFILE=0x00000001,CREATE_UNICODE_ENVIRONMENT=0x00000400,CREATE_NO_WINDOW=0x08000000,INFINITE=0xFFFFFFFF;

    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]
    struct STARTUPINFO
    {
        public int cb;public string lpReserved,lpDesktop,lpTitle;public int dwX,dwY,dwXSize,dwYSize,dwXCountChars,dwYCountChars,dwFillAttribute,dwFlags;public short wShowWindow,cbReserved2;public IntPtr lpReserved2,hStdInput,hStdOutput,hStdError;
    }
    [StructLayout(LayoutKind.Sequential)]struct PROCESS_INFORMATION{public IntPtr hProcess,hThread;public uint dwProcessId,dwThreadId;}
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("advapi32.dll",SetLastError=true)]static extern bool OpenProcessToken(IntPtr processHandle,uint desiredAccess,out IntPtr tokenHandle);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("advapi32.dll",SetLastError=true)]static extern bool DuplicateTokenEx(IntPtr existingToken,uint desiredAccess,IntPtr tokenAttributes,int impersonationLevel,int tokenType,out IntPtr newToken);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcessWithTokenW(IntPtr token,uint logonFlags,string applicationName,StringBuilder commandLine,uint creationFlags,IntPtr environment,string currentDirectory,ref STARTUPINFO startupInfo,out PROCESS_INFORMATION processInformation);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("userenv.dll",SetLastError=true)]static extern bool CreateEnvironmentBlock(out IntPtr environment,IntPtr token,bool inherit);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("userenv.dll",SetLastError=true)]static extern bool DestroyEnvironmentBlock(IntPtr environment);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("kernel32.dll",SetLastError=true)]static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetExitCodeProcess(IntPtr process,out uint exitCode);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("kernel32.dll",EntryPoint="CloseHandle",SetLastError=true)]static extern bool CloseNativeHandle(IntPtr handle);

    string ResolveWingetPath()
    {
        string alias=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Microsoft","WindowsApps","winget.exe");
        try{if(File.Exists(alias))return alias;}catch{}
        try
        {
            string windowsApps=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"WindowsApps");
            if(Directory.Exists(windowsApps))
            {
                foreach(string package in Directory.GetDirectories(windowsApps,"Microsoft.DesktopAppInstaller_*__8wekyb3d8bbwe",SearchOption.TopDirectoryOnly).OrderByDescending(Directory.GetLastWriteTimeUtc))
                {
                    string candidate=Path.Combine(package,"winget.exe");
                    if(File.Exists(candidate) && !IsReparsePoint(candidate))return candidate;
                }
            }
        }catch{}
        throw new FileNotFoundException("WinGet officiel est introuvable. Installez ou réparez App Installer depuis Microsoft Store.");
    }

    // --- Analyse de la sortie tabulaire de winget -----------------------------
    // Portage fidèle de beta/src/modules/winget-table.js (testé sur de vraies
    // captures). Lit la ligne d'en-tête pour retrouver la position de chaque
    // colonne, puis découpe par positions : tolère les valeurs à espaces
    // (« < 1.2.3 »), les colonnes vides, « Unknown », les en-têtes FR/EN et ANSI.

    static readonly Dictionary<string,string> WingetHeaderAliases = new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase)
    {
        {"name","name"},{"nom","name"},
        {"id","id"},
        {"version","version"},
        {"available","available"},{"disponible","available"},
        {"source","source"},
        {"match","match"},{"correspondance","match"},
    };

    static string StripWingetAnsi(string line)
    {
        string value=Regex.Replace(line ?? "","\x1B\\[[0-9;?]*[ -/]*[@-~]","");
        if(value.Length>0 && value[0]=='﻿')value=value.Substring(1);
        return value;
    }

    struct WingetColumn { public string Key; public int Start; }

    static List<WingetColumn> WingetHeaderColumns(string headerLine)
    {
        // Les en-tetes winget sont toujours des MOTS SIMPLES (Nom/Name, ID,
        // Version, Disponible/Available, Source, Correspondance/Match). On decoupe
        // donc sur n'importe quel espace. (Le decoupage des LIGNES DE DONNEES,
        // lui, se fait par position et tolere les espaces dans les valeurs :
        // "< 1.2.3", "Unknown", ids "MSIX\ ...".) L'ancien motif tolerant un
        // espace simple fusionnait "Version Source" quand la sortie etroite de
        // `winget list --id X --exact` ne laissait qu'un espace entre les deux.
        var result=new List<WingetColumn>();
        var seen=new HashSet<string>(StringComparer.Ordinal);
        foreach(Match token in Regex.Matches(headerLine,@"\S+"))
        {
            string key;
            if(!WingetHeaderAliases.TryGetValue(token.Value.Trim(),out key))continue;
            if(!seen.Add(key))continue;
            result.Add(new WingetColumn{Key=key,Start=token.Index});
        }
        result.Sort((a,b)=>a.Start.CompareTo(b.Start));
        return result;
    }

    internal static List<Dictionary<string,string>> ParseWingetTable(string output)
    {
        var rows=new List<Dictionary<string,string>>();
        string[] lines=(output ?? "").Split(new[]{"\r\n","\r","\n"},StringSplitOptions.None)
            .Select(StripWingetAnsi).ToArray();

        int headerIdx=-1;List<WingetColumn> cols=null;
        for(int i=0;i<lines.Length;i++)
        {
            var candidate=WingetHeaderColumns(lines[i]);
            if(candidate.Count>=2 && candidate.Any(c=>c.Key=="id")){headerIdx=i;cols=candidate;break;}
        }
        if(headerIdx<0 || cols==null)return rows;

        int secondColStart=cols.Count>1?cols[1].Start:0;
        for(int i=headerIdx+1;i<lines.Length;i++)
        {
            string line=lines[i];
            if(Regex.IsMatch(line,@"^\s*[-–—]{3,}"))continue;
            if(line.Trim().Length==0){if(rows.Count>0)break;continue;}
            if(secondColStart>0 && line.Length<=secondColStart)break;

            var row=new Dictionary<string,string>(StringComparer.Ordinal);
            for(int c=0;c<cols.Count;c++)
            {
                int from=cols[c].Start;
                int to=c+1<cols.Count?cols[c+1].Start:line.Length;
                if(from>line.Length)from=line.Length;
                if(to>line.Length)to=line.Length;
                row[cols[c].Key]=from<to?line.Substring(from,to-from).Trim():"";
            }
            string name=row.ContainsKey("name")?row["name"]:"";
            string id=row.ContainsKey("id")?row["id"]:"";
            if(name.Length>0 && id.Length>0)rows.Add(row);
        }
        return rows;
    }

    // Vrai si l'identifiant apparait dans la colonne ID d'une sortie tabulaire winget
    // (list/upgrade). Remplace les IndexOf/Regex qui pouvaient reconnaitre l'id dans
    // un nom ou un chemin.
    static bool WingetTableContainsId(string output,string id)
    {
        if(String.IsNullOrWhiteSpace(output)||String.IsNullOrWhiteSpace(id))return false;
        foreach(var row in ParseWingetTable(output))
        {
            string value=row.ContainsKey("id")?row["id"]:"";
            if(String.Equals(value,id,StringComparison.OrdinalIgnoreCase))return true;
        }
        return false;
    }

    void ScanInstalled(Dictionary<string, object> payload)
    {
        if (scanRunning) return;
        var requested = new HashSet<string>(ReadArray(payload, "ids").Where(x => IsValidPackageId(x)).Take(200), StringComparer.OrdinalIgnoreCase);
        var catalog=ReadCatalog(payload);
        var portablePackages=ReadPortableCatalog(payload);
        var customPackages=ReadCustomCatalog(payload);
        scanRunning = true;
        Task.Run(delegate {
            var report=new StringBuilder();
            string error;
            var wingetInstalled=DetectInstalledFromWinget(requested,report,out error);
            var installed=new HashSet<string>(wingetInstalled,StringComparer.OrdinalIgnoreCase);
            string discoveryWarning;
            var discoveredPackages=DiscoverInstalledPackages(report,out discoveryWarning);
            if(!String.IsNullOrWhiteSpace(discoveryWarning) && String.IsNullOrWhiteSpace(error))error=discoveryWarning;
            foreach(var package in discoveredPackages)
            {
                string packageId=package.ContainsKey("id")?package["id"]:"";
                if(!String.IsNullOrWhiteSpace(packageId))
                {
                    installed.Add(packageId);
                    if(package.ContainsKey("source") && String.Equals(package["source"],"winget",StringComparison.OrdinalIgnoreCase))wingetInstalled.Add(packageId);
                }
            }
            var registryInstalled=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var msixInstalled=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var relatedPackages=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                DetectInstalledFromRegistry(catalog,requested,registryInstalled);
                DetectInstalledMsix(catalog,requested,msixInstalled);
                relatedPackages.UnionWith(registryInstalled.Concat(msixInstalled).Where(id=>customPackages.Contains(id)));
                registryInstalled.ExceptWith(customPackages);
                msixInstalled.ExceptWith(customPackages);
                PromoteVerifiedWingetPackages(wingetInstalled,registryInstalled.Concat(msixInstalled).Concat(customPackages),report);
                relatedPackages.ExceptWith(wingetInstalled);
                installed.UnionWith(registryInstalled);
                installed.UnionWith(msixInstalled);
            }
            catch(Exception ex){if(String.IsNullOrWhiteSpace(error))error=ex.Message;}
            finally
            {
                foreach(string id in installed.Where(value=>portablePackages.Contains(value)))
                {
                    string name=catalog.ContainsKey(id)?catalog[id]:LoadApplicationName(id);
                    string preference=LoadShortcutPreference(id);
                    bool shortcutAlreadyPresent=PortableShortcutExists(name,preference);
                    if(EnsurePortableShortcut(id,name,preference,report) && !shortcutAlreadyPresent && preference!="none")
                        SendToWeb(new { type="portable-access-ready", id=id, name=name });
                }
                var discoveredById=discoveredPackages
                    .Where(item=>item.ContainsKey("id"))
                    .GroupBy(item=>item["id"],StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(group=>group.Key,group=>group.First(),StringComparer.OrdinalIgnoreCase);
                var details=installed.OrderBy(value=>catalog.ContainsKey(value)?catalog[value]:discoveredById.ContainsKey(value)?discoveredById[value]["name"]:value).Select(id=>new{
                    id=id,
                    name=catalog.ContainsKey(id)?catalog[id]:discoveredById.ContainsKey(id)?discoveredById[id]["name"]:id,
                    version=discoveredById.ContainsKey(id)&&discoveredById[id].ContainsKey("version")?discoveredById[id]["version"]:"",
                    iconData=discoveredById.ContainsKey(id)&&discoveredById[id].ContainsKey("iconData")?discoveredById[id]["iconData"]:"",
                    discovered=!catalog.ContainsKey(id),
                    source=portablePackages.Contains(id)?"portable":wingetInstalled.Contains(id)?"winget":msixInstalled.Contains(id)?"msix":"windows",
                    manageable=portablePackages.Contains(id)||wingetInstalled.Contains(id)
                }).ToArray();
                scanRunning=false;
                string detection=wingetInstalled.Count>0&&(registryInstalled.Count>0||msixInstalled.Count>0)?"multiple":wingetInstalled.Count>0?"winget":"windows";
                SendToWeb(new { type="installed-state", ids=installed.ToArray(), managedIds=details.Where(item=>item.manageable).Select(item=>item.id).ToArray(), relatedIds=relatedPackages.ToArray(), details=details, method=detection, count=installed.Count, warning=error });
            }
        });
    }

    void ScanApplicationHealth(Dictionary<string, object> payload)
    {
        var requested=new HashSet<string>(ReadArray(payload,"ids").Where(x=>IsValidPackageId(x)).Take(200),StringComparer.OrdinalIgnoreCase);
        var catalog=ReadCatalog(payload);
        var portablePackages=ReadPortableCatalog(payload);
        var customPackages=ReadCustomCatalog(payload);
        Task.Run(delegate {
            var report=new StringBuilder();
            var items=new List<object>();
            int healthy=0,limited=0,warning=0;
            try
            {
                string wingetError;
                var wingetInstalled=DetectInstalledFromWinget(requested,report,out wingetError);
                var registryInstalled=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var msixInstalled=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                DetectInstalledFromRegistry(catalog,requested,registryInstalled);
                DetectInstalledMsix(catalog,requested,msixInstalled);
                registryInstalled.ExceptWith(customPackages);
                msixInstalled.ExceptWith(customPackages);
                PromoteVerifiedWingetPackages(wingetInstalled,registryInstalled.Concat(msixInstalled).Concat(customPackages),report);
                foreach(string id in requested.OrderBy(value=>catalog.ContainsKey(value)?catalog[value]:value))
                {
                    bool ok=false,isLimited=false;
                    string detail,source;
                    if(portablePackages.Contains(id))
                    {
                        ok=IsManagedPortable(id);
                        source="portable";
                        detail=ok?"Application portable gérée par OwlSetup":"Dossier portable ou raccourci introuvable";
                    }
                    else if(wingetInstalled.Contains(id)){ok=true;source="winget";detail="Installée et gérable par WinGet";}
                    else if(msixInstalled.Contains(id)){ok=true;isLimited=true;source="msix";detail="Installée via Windows (paquet MSIX), non associée à WinGet";}
                    else if(registryInstalled.Contains(id)){ok=true;isLimited=true;source="windows";detail="Installée et détectée via le registre Windows";}
                    else
                    {
                        source="unknown";
                        detail="Installation introuvable dans WinGet, le registre et les paquets MSIX";
                    }
                    if(!ok)warning++;else if(isLimited)limited++;else healthy++;
                    items.Add(new { id=id,name=catalog.ContainsKey(id)?catalog[id]:id,healthy=ok,limited=isLimited,manageable=ok&&!isLimited,source=source,detail=detail });
                }
                SendToWeb(new { type="app-health-state",healthy=healthy,limited=limited,warning=warning,total=requested.Count,items=items.ToArray(),wingetWarning=wingetError });
            }
            catch(Exception ex){SendToWeb(new { type="app-health-state",healthy=healthy,limited=limited,warning=warning,total=requested.Count,items=items.ToArray(),error=ex.Message });}
        });
    }

    HashSet<string> DetectInstalledFromWinget(HashSet<string> requested,StringBuilder report,out string error)
    {
        string folder=Path.Combine(Path.GetTempPath(),"PCSetup");
        string exportFile=Path.Combine(folder,"installed-"+Guid.NewGuid().ToString("N")+".json");
        var installed=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        error=null;
        try
        {
            Directory.CreateDirectory(folder);
            int code=RunWingetCli("export -o \""+exportFile+"\" --accept-source-agreements --disable-interactivity",report);
            if(File.Exists(exportFile))
            {
                string contents=File.ReadAllText(exportFile,Encoding.UTF8);
                foreach(Match match in Regex.Matches(contents,"\"PackageIdentifier\"\\s*:\\s*\"([^\"]+)\"",RegexOptions.IgnoreCase))
                {
                    string id=match.Groups[1].Value;
                    if(requested.Count==0||requested.Contains(id))installed.Add(id);
                }
            }
            if(code!=0||!File.Exists(exportFile))error="WinGet n'a pas pu exporter toute la liste. Les sources Windows locales restent utilisées.";
        }
        catch(Exception ex){error=ex.Message;}
        finally{try{if(File.Exists(exportFile))File.Delete(exportFile);}catch{}}
        return installed;
    }

    List<Dictionary<string,string>> DiscoverInstalledPackages(StringBuilder report,out string warning)
    {
        warning=null;
        var results=new List<Dictionary<string,string>>();
        var capture=new StringBuilder();
        try
        {
            int code=RunWingetCli("list --accept-source-agreements --disable-interactivity",capture);
            report.AppendLine(capture.ToString());
            var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach(var row in ParseWingetTable(capture.ToString()))
            {
                string name=row.ContainsKey("name")?row["name"]:"";
                string id=row.ContainsKey("id")?row["id"]:"";
                // \ dans les ids MSIX\ / ARP\ : exclus par cette regex, comme avant.
                if(!IsValidPackageId(id)||name.Length==0||!seen.Add(id))continue;
                string version=Regex.Match(row.ContainsKey("version")?row["version"]:"",@"^\S+").Value;
                string sourceValue=row.ContainsKey("source")?row["source"]:"";
                string source=(sourceValue.StartsWith("winget",StringComparison.OrdinalIgnoreCase)||sourceValue.StartsWith("msstore",StringComparison.OrdinalIgnoreCase))?"winget":"windows";
                results.Add(new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){{"id",id},{"name",name},{"version",version},{"source",source}});
            }
            EnrichInstalledPackageIcons(results,report);
            if(code!=0)warning="WinGet n'a pas pu terminer l'inventaire complet des applications installées.";
        }
        catch(Exception ex){warning=ex.Message;}
        return results;
    }

    void EnrichInstalledPackageIcons(List<Dictionary<string,string>> packages,StringBuilder report)
    {
        if(packages==null||packages.Count==0)return;
        var registryIcons=new List<Tuple<string,string>>();
        foreach(RegistryHive hive in new[]{RegistryHive.LocalMachine,RegistryHive.CurrentUser})
        foreach(RegistryView view in new[]{RegistryView.Registry64,RegistryView.Registry32})
        {
            try
            {
                using(var baseKey=RegistryKey.OpenBaseKey(hive,view))
                using(var uninstall=baseKey.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"))
                {
                    if(uninstall==null)continue;
                    foreach(string childName in uninstall.GetSubKeyNames())
                    {
                        try
                        {
                            using(var child=uninstall.OpenSubKey(childName))
                            {
                                string name=Convert.ToString(child.GetValue("DisplayName"));
                                string displayIcon=Convert.ToString(child.GetValue("DisplayIcon"));
                                if(!String.IsNullOrWhiteSpace(name)&&!String.IsNullOrWhiteSpace(displayIcon))
                                    registryIcons.Add(Tuple.Create(NormalizeSoftwareName(name),displayIcon));
                            }
                        }
                        catch{}
                    }
                }
            }
            catch{}
        }
        foreach(var package in packages)
        {
            try
            {
                string packageName=package.ContainsKey("name")?NormalizeSoftwareName(package["name"]):"";
                string idTail=package.ContainsKey("id")?NormalizeSoftwareName(package["id"].Split('.').Last()):"";
                if(packageName.Length<2)continue;
                var match=registryIcons.Select(item=>new{Item=item,Score=InstalledIconMatchScore(packageName,idTail,item.Item1)})
                    .Where(item=>item.Score>0).OrderByDescending(item=>item.Score).FirstOrDefault();
                if(match==null)continue;
                string iconData=ReadInstalledIconData(match.Item.Item2);
                if(!String.IsNullOrWhiteSpace(iconData))package["iconData"]=iconData;
            }
            catch(Exception ex){report.AppendLine("Icone locale ignoree : "+ex.Message);}
        }
    }

    int InstalledIconMatchScore(string packageName,string idTail,string registryName)
    {
        if(String.IsNullOrWhiteSpace(registryName))return 0;
        if(registryName==packageName)return 100;
        if(!String.IsNullOrWhiteSpace(idTail)&&registryName==idTail)return 95;
        if(packageName.Length>=5&&(registryName.StartsWith(packageName+" ",StringComparison.OrdinalIgnoreCase)||packageName.StartsWith(registryName+" ",StringComparison.OrdinalIgnoreCase)))return 85;
        if(idTail.Length>=5&&(registryName.Contains(idTail)||idTail.Contains(registryName)))return 70;
        return 0;
    }

    string ReadInstalledIconData(string displayIcon)
    {
        if(String.IsNullOrWhiteSpace(displayIcon))return "";
        string value=Environment.ExpandEnvironmentVariables(displayIcon.Trim());
        Match quoted=Regex.Match(value,"^\\\"([^\\\"]+)\\\"");
        string path=quoted.Success?quoted.Groups[1].Value:Regex.Replace(value,@",\s*-?\d+\s*$","").Trim().Trim('"');
        if(!Path.IsPathRooted(path)||!File.Exists(path)||IsReparsePoint(path))return "";
        string extension=Path.GetExtension(path).ToLowerInvariant();
        if(extension!=".exe"&&extension!=".dll"&&extension!=".ico")return "";
        try
        {
            using(Icon source=extension==".ico"?new Icon(path):Icon.ExtractAssociatedIcon(path))
            {
                if(source==null)return "";
                using(var bitmap=new Bitmap(48,48))
                {
                    using(var graphics=Graphics.FromImage(bitmap))
                    {
                        graphics.Clear(Color.Transparent);
                        graphics.DrawIcon(source,new Rectangle(0,0,48,48));
                    }
                    using(var stream=new MemoryStream())
                    {
                        bitmap.Save(stream,System.Drawing.Imaging.ImageFormat.Png);
                        return "data:image/png;base64,"+Convert.ToBase64String(stream.ToArray());
                    }
                }
            }
        }
        catch{return "";}
    }

    void PromoteVerifiedWingetPackages(HashSet<string> wingetInstalled,IEnumerable<string> windowsCandidates,StringBuilder report)
    {
        foreach(string id in windowsCandidates.Distinct(StringComparer.OrdinalIgnoreCase).Where(value=>!wingetInstalled.Contains(value)).Take(60))
        {
            var verification=new StringBuilder();
            try
            {
                int code=RunWingetCli("list --id \""+id+"\" --exact --accept-source-agreements --disable-interactivity",verification);
                string output=verification.ToString();
                bool exact=code==0 && WingetTableContainsId(output,id);
                report.AppendLine("Verification exacte WinGet "+id+" : "+(exact?"confirmee":"non confirmee")+" (code "+code+")");
                if(exact)wingetInstalled.Add(id);
            }
            catch(Exception ex){report.AppendLine("Verification exacte WinGet "+id+" impossible : "+ex.Message);}
        }
    }

    Dictionary<string,string> ReadCatalog(Dictionary<string,object> payload)
    {
        var result=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        if(payload==null || !payload.ContainsKey("apps"))return result;
        IEnumerable<object> values=Enumerable.Empty<object>();
        var array=payload["apps"] as object[];if(array!=null)values=array;
        var list=payload["apps"] as ArrayList;if(list!=null)values=list.Cast<object>();
        foreach(object value in values)
        {
            var item=value as Dictionary<string,object>;
            if(item==null || !item.ContainsKey("id") || !item.ContainsKey("name"))continue;
            string id=Convert.ToString(item["id"]),name=Convert.ToString(item["name"]);
            if(IsValidPackageId(id) && !String.IsNullOrWhiteSpace(name))result[id]=name;
        }
        return result;
    }

    HashSet<string> ReadPortableCatalog(Dictionary<string,object> payload)
    {
        var result=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if(payload==null || !payload.ContainsKey("apps"))return result;
        IEnumerable<object> values=Enumerable.Empty<object>();
        var array=payload["apps"] as object[];if(array!=null)values=array;
        var list=payload["apps"] as ArrayList;if(list!=null)values=list.Cast<object>();
        foreach(object value in values)
        {
            var item=value as Dictionary<string,object>;
            if(item==null || !item.ContainsKey("id") || !item.ContainsKey("portable"))continue;
            string id=Convert.ToString(item["id"]);
            bool portable=false;try{portable=Convert.ToBoolean(item["portable"]);}catch{}
            if(portable && IsValidPackageId(id))result.Add(id);
        }
        return result;
    }

    HashSet<string> ReadCustomCatalog(Dictionary<string,object> payload)
    {
        var result=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if(payload==null || !payload.ContainsKey("apps"))return result;
        IEnumerable<object> values=Enumerable.Empty<object>();
        var array=payload["apps"] as object[];if(array!=null)values=array;
        var list=payload["apps"] as ArrayList;if(list!=null)values=list.Cast<object>();
        foreach(object value in values)
        {
            var item=value as Dictionary<string,object>;
            if(item==null || !item.ContainsKey("id") || !item.ContainsKey("custom"))continue;
            string id=Convert.ToString(item["id"]);
            bool custom=false;try{custom=Convert.ToBoolean(item["custom"]);}catch{}
            if(custom && IsValidPackageId(id))result.Add(id);
        }
        return result;
    }

    void DetectInstalledFromRegistry(Dictionary<string,string> catalog,HashSet<string> requested,HashSet<string> installed)
    {
        var displayNames=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(RegistryHive hive in new[]{RegistryHive.LocalMachine,RegistryHive.CurrentUser})
        foreach(RegistryView view in new[]{RegistryView.Registry64,RegistryView.Registry32})
        {
            try
            {
                using(var baseKey=RegistryKey.OpenBaseKey(hive,view))
                using(var uninstall=baseKey.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"))
                {
                    if(uninstall==null)continue;
                    foreach(string childName in uninstall.GetSubKeyNames())
                    {
                        try{using(var child=uninstall.OpenSubKey(childName)){string name=Convert.ToString(child.GetValue("DisplayName"));if(!String.IsNullOrWhiteSpace(name))displayNames.Add(NormalizeSoftwareName(name));}}catch{}
                    }
                }
            }catch{}
        }
        foreach(var item in catalog)
        {
            if(requested.Count>0 && !requested.Contains(item.Key))continue;
            foreach(string candidate in DetectionNames(item.Key,item.Value))
            {
                string normalized=NormalizeSoftwareName(candidate);
                if(normalized.Length<2)continue;
                if(displayNames.Any(name=>name==normalized || name.StartsWith(normalized+" ",StringComparison.OrdinalIgnoreCase) || normalized.StartsWith(name+" ",StringComparison.OrdinalIgnoreCase)))
                {
                    installed.Add(item.Key);break;
                }
            }
        }
    }

    void DetectInstalledMsix(Dictionary<string,string> catalog,HashSet<string> requested,HashSet<string> installed)
    {
        var packageNames=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        string[] roots={
            @"Software\Classes\Local Settings\Software\Microsoft\Windows\CurrentVersion\AppModel\Repository\Packages",
            @"Software\Microsoft\Windows\CurrentVersion\Appx\AppxAllUserStore\Applications"
        };
        foreach(RegistryHive hive in new[]{RegistryHive.CurrentUser,RegistryHive.LocalMachine})
        foreach(string root in roots)
        {
            try
            {
                using(var baseKey=RegistryKey.OpenBaseKey(hive,RegistryView.Registry64))
                using(var packages=baseKey.OpenSubKey(root,false))
                {
                    if(packages==null)continue;
                    foreach(string childName in packages.GetSubKeyNames())packageNames.Add(NormalizeSoftwareName(childName.Replace('_',' ')));
                }
            }
            catch{}
        }
        foreach(var item in catalog)
        {
            if(requested.Count>0&&!requested.Contains(item.Key))continue;
            foreach(string candidate in DetectionNames(item.Key,item.Value))
            {
                string normalized=NormalizeSoftwareName(candidate);
                if(normalized.Length<3)continue;
                if(packageNames.Any(name=>name==normalized||name.Contains(" "+normalized+" ")||name.StartsWith(normalized+" ",StringComparison.OrdinalIgnoreCase)))
                {
                    installed.Add(item.Key);break;
                }
            }
        }
    }

    IEnumerable<string> DetectionNames(string id,string name)
    {
        yield return name;
        string last=id.Split('.').Last();yield return last;
        var aliases=new Dictionary<string,string[]>(StringComparer.OrdinalIgnoreCase){
            {"Google.Chrome",new[]{"Google Chrome"}},
            {"7zip.7zip",new[]{"7-Zip"}},
            {"VideoLAN.VLC",new[]{"VLC media player"}},
            {"TheDocumentFoundation.LibreOffice",new[]{"LibreOffice"}},
            {"EpicGames.EpicGamesLauncher",new[]{"Epic Games Launcher"}},
            {"Blizzard.BattleNet",new[]{"Battle.net","Battle net","Blizzard Battle.net"}},
            {"Brave.Brave",new[]{"Brave","Brave Browser"}},
            {"GitHub.GitHubDesktop",new[]{"GitHub Desktop","GitHubDesktop"}},
            {"OpenJS.NodeJS.LTS",new[]{"Node.js","Node.js LTS","Node JS"}},
            {"Python.Python.3.13",new[]{"Python 3","Python 3.13","Python Launcher"}},
            {"qBittorrent.qBittorrent",new[]{"qBittorrent","qBittorrent Enhanced Edition"}},
            {"Microsoft.DotNet.DesktopRuntime.8",new[]{"Microsoft Windows Desktop Runtime",".NET Desktop Runtime"}},
            {"Microsoft.VCRedist.2015+.x64",new[]{"Microsoft Visual C++ 2022 X64","Microsoft Visual C++ v14 Redistributable (x64)"}},
            {"OBSProject.OBSStudio",new[]{"OBS Studio"}},
            {"Ubisoft.Connect",new[]{"Ubisoft Connect"}},
            {"Valve.Steam",new[]{"Steam"}}
        };
        string[] values;if(aliases.TryGetValue(id,out values))foreach(string value in values)yield return value;
    }

    string NormalizeSoftwareName(string value)
    {
        string text=(value??"").ToLowerInvariant();
        text=Regex.Replace(text,@"\b(x64|x86|64-bit|32-bit|version|runtime|desktop|lts)\b"," ");
        text=Regex.Replace(text,@"[^a-z0-9+#]+"," ");
        return Regex.Replace(text,@"\s+"," ").Trim();
    }

    bool IsSuccessfulUninstallCode(int code)
    {
        return code==0 || code==3010 || code==1641;
    }

    bool IsPackageStillInstalled(string packageId,StringBuilder report)
    {
        try
        {
            var wingetReport=new StringBuilder();
            int listCode=RunWingetCli("list --id \""+packageId+"\" --exact --accept-source-agreements --disable-interactivity",wingetReport);
            string listOutput=wingetReport.ToString();
            report.AppendLine("Verification WinGet apres desinstallation : "+listCode);
            if(listCode==0 && WingetTableContainsId(listOutput,packageId))return true;
        }
        catch(Exception ex){report.AppendLine("Verification WinGet impossible : "+ex.Message);}
        try
        {
            var catalog=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
            catalog[packageId]=LoadApplicationName(packageId);
            var requested=new HashSet<string>(StringComparer.OrdinalIgnoreCase);requested.Add(packageId);
            var installed=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            DetectInstalledFromRegistry(catalog,requested,installed);
            return installed.Contains(packageId);
        }
        catch(Exception ex){report.AppendLine("Verification du registre impossible : "+ex.Message);return true;}
    }

    int RunUninstallWithFallbacks(string packageId,StringBuilder report)
    {
        string common="uninstall --id \""+packageId+"\" --exact --silent --accept-source-agreements --disable-interactivity";
        report.AppendLine("Tentative 1/3 : contexte Windows actuel.");
        int code=RunWingetCli(common,report);
        if(IsSuccessfulUninstallCode(code))return code;

        report.AppendLine();
        report.AppendLine("Tentative 2/3 : installation machine avec autorisation administrateur.");
        int machineCode=RunElevatedProcess(ResolveWingetPath(),common+" --scope machine",report);
        if(IsSuccessfulUninstallCode(machineCode))return machineCode;

        report.AppendLine();
        report.AppendLine("Tentative 3/3 : installation liee au compte Windows.");
        int userCode=RunAsInteractiveUser(ResolveWingetPath(),common+" --scope user",report);
        if(IsSuccessfulUninstallCode(userCode))return userCode;
        return userCode!=-1?userCode:(machineCode!=-1?machineCode:code);
    }

    IEnumerable<string> ParseWingetListPackageIds(string output)
    {
        foreach(var row in ParseWingetTable(output))
        {
            string candidate=row.ContainsKey("id")?row["id"]:"";
            if(IsValidPackageId(candidate))yield return candidate;
        }
    }

    bool OutputContainsExactPackageId(string output,string packageId)
    {
        return WingetTableContainsId(output,packageId);
    }

    string ResolveInstalledWingetPackage(string packageId,string appName,StringBuilder report)
    {
        var exactIdReport=new StringBuilder();
        int exactIdCode=RunWingetCli("list --id \""+packageId+"\" --exact --accept-source-agreements --disable-interactivity",exactIdReport);
        report.AppendLine("Resolution par identifiant exact : "+exactIdCode);
        report.Append(exactIdReport.ToString());
        var exactIds=ParseWingetListPackageIds(exactIdReport.ToString()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        string exactId=exactIds.FirstOrDefault(value=>String.Equals(value,packageId,StringComparison.OrdinalIgnoreCase));
        if(exactIdCode==0 && (!String.IsNullOrWhiteSpace(exactId)||OutputContainsExactPackageId(exactIdReport.ToString(),packageId)))return packageId;

        if(String.IsNullOrWhiteSpace(appName))return "";
        var exactNameReport=new StringBuilder();
        string safeName=appName.Replace("\"","").Trim();
        int exactNameCode=RunWingetCli("list --name \""+safeName+"\" --exact --accept-source-agreements --disable-interactivity",exactNameReport);
        report.AppendLine("Resolution par nom exact : "+exactNameCode);
        report.Append(exactNameReport.ToString());
        var nameIds=ParseWingetListPackageIds(exactNameReport.ToString()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if(exactNameCode==0 && nameIds.Length==1)return nameIds[0];
        return "";
    }

    string ExplainWingetFailure(int code,string output,string operation)
    {
        if(code==0)return "Operation terminee avec succes.";
        string text=(output??"").ToLowerInvariant();
        if(code==unchecked((int)0x8A150101) || code==unchecked((int)0x8A150103) || code==unchecked((int)0x8A150111))
            return "L'application ou l'un de ses fichiers est encore utilise. Fermez-la completement, y compris depuis la zone de notification, puis relancez uniquement cette mise a jour.";
        if(code==unchecked((int)0x8A150061))
            return "L'installateur s'est terminé, mais OwlSetup ne retrouve pas l'application. Relancez la détection ou consultez le rapport avant de recommencer.";
        if(code==5 || code==unchecked((int)0x80070005))
            return "Windows a refusé l'accès. Fermez l'application concernée puis acceptez la demande d'autorisation administrateur.";
        if(code==6 || text.Contains("currently used by another application") || text.Contains("files modified by the installer are currently in use") || text.Contains("fichiers sont actuellement utilisés"))
            return "Des fichiers sont encore utilisés. Fermez complètement l'application (y compris dans la zone de notification), puis réessayez.";
        if(code==1223 || text.Contains("operation was canceled") || text.Contains("operation cancelled") || text.Contains("annulee par l'utilisateur") || text.Contains("annulÃ©e par l'utilisateur"))
            return "L'autorisation Windows a ete annulee. Relancez l'operation puis acceptez la demande de securite.";
        if(code==unchecked((int)0x8A15007D) || text.Contains("installed for user scope cannot be uninstalled") || text.Contains("installe pour l'utilisateur") || text.Contains("installÃ© pour l'utilisateur"))
            return "Cette application appartient a votre compte Windows. OwlSetup doit effectuer l'operation sans elevation administrateur.";
        if(code==1618 || text.Contains("another installation is already in progress") || text.Contains("une autre installation est en cours"))
            return "Une autre installation Windows est deja en cours. Attendez sa fin puis recommencez.";
        if(code==1603 || text.Contains("installer failed with exit code: 1603"))
            return "L'installateur de l'editeur a rencontre une erreur. Fermez l'application concernee puis recommencez.";
        if(code==3010 || text.Contains("restart required") || text.Contains("reboot required") || text.Contains("redemarrage requis") || text.Contains("redÃ©marrage requis"))
            return "L'operation est terminee mais le PC doit etre redemarre pour que Windows l'applique completement.";
        if(text.Contains("no package found") || text.Contains("no package was found") || text.Contains("aucun package trouve") || text.Contains("aucun package trouvÃ©") || text.Contains("aucun logiciel trouve") || text.Contains("aucun logiciel trouvÃ©"))
            return "Le logiciel n'a pas ete trouve dans les sources WinGet. Actualisez les sources puis reessayez.";
        if(text.Contains("hash mismatch") || text.Contains("hash does not match") || text.Contains("hachage") && text.Contains("ne correspond"))
            return "Le controle de securite du fichier a echoue : son empreinte ne correspond pas au manifeste. L'installation a ete bloquee.";
        if(text.Contains("already installed") || text.Contains("deja installe") || text.Contains("dÃ©jÃ  installÃ©"))
            return "Le logiciel est deja installe. Utilisez plutot Mettre a jour ou Reparer.";
        if(text.Contains("access is denied") || text.Contains("acces refuse") || text.Contains("accÃ¨s refusÃ©"))
            return "Windows a refuse l'acces. Fermez le logiciel concerne et acceptez la demande d'autorisation si elle apparait.";
        if(text.Contains("network") || text.Contains("internet") || text.Contains("connection") || text.Contains("connexion"))
            return "Le telechargement n'a pas abouti. Verifiez la connexion Internet puis recommencez.";
        return "WinGet n'a pas pu terminer cette "+operation+". Le rapport contient les details techniques (code "+code+").";
    }

    bool IsNoApplicableUpdateCode(int code)
    {
        return code==unchecked((int)0x8A15002B);
    }

    // Lanceurs et applications qui embarquent leur propre mise a jour : WinGet
    // les propose souvent en boucle car la version enregistree dans Windows ne
    // suit pas le meme schema que le manifeste, et `winget upgrade` echoue ou
    // reste sans effet. Pour ceux-la, OwlSetup n'affiche pas d'erreur : il
    // explique qu'il faut ouvrir le logiciel pour qu'il se mette a jour.
    static readonly HashSet<string> SelfManagedUpdaters = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "Ankama.AnkamaLauncher",
        "ElectronicArts.EADesktop",
        "EpicGames.EpicGamesLauncher",
        "Blizzard.BattleNet",
        "Ubisoft.Connect",
        "GOG.Galaxy",
        "Valve.Steam",
        "Discord.Discord",
        "RiotGames.LeagueOfLegends.EUW",
        "RiotGames.Valorant.EU",
        "Overwolf.CurseForge",
        "Amazon.Games",
        "Logitech.GHUB",
    };

    // Vrai quand la version proposee n'est qu'un prefixe etendu de la version
    // installee (ex. installee 3.15.2, proposee 3.15.2.20509) : c'est presque
    // toujours une difference de schema de version, pas une vraie mise a jour.
    static bool IsVersionPrefixMismatch(string current,string available)
    {
        if(String.IsNullOrWhiteSpace(current) || String.IsNullOrWhiteSpace(available))return false;
        string a=current.Trim(), b=available.Trim();
        if(String.Equals(a,b,StringComparison.OrdinalIgnoreCase))return false;
        if(b.StartsWith(a+".",StringComparison.OrdinalIgnoreCase))return true;
        if(a.StartsWith(b+".",StringComparison.OrdinalIgnoreCase))return true;
        return false;
    }

    bool IsSelfManagedUpdate(string id,string current,string available)
    {
        return SelfManagedUpdaters.Contains(id ?? "") || IsVersionPrefixMismatch(current,available);
    }

    string ClassifyWingetFailure(int code,string output)
    {
        string text=(output??"").ToLowerInvariant();
        if(code==unchecked((int)0x8A150101) || code==unchecked((int)0x8A150103) || code==unchecked((int)0x8A150111) || code==6 ||
           text.Contains("currently running") || text.Contains("currently in use") || text.Contains("file is being used") ||
           text.Contains("files modified by the installer are currently in use") || text.Contains("fichiers sont actuellement utilis"))return "files-in-use";
        if(code==unchecked((int)0x8A150109) || code==unchecked((int)0x8A15010A) || code==3010 ||
           text.Contains("restart required") || text.Contains("reboot required") || text.Contains("redemarrage requis"))return "restart-required";
        if(code==unchecked((int)0x8A150107) || text.Contains("no network") || text.Contains("network") || text.Contains("connexion"))return "network";
        if(code==unchecked((int)0x8A150011) || text.Contains("hash mismatch") || text.Contains("hash does not match"))return "hash-mismatch";
        if(text.Contains("no package found") || text.Contains("no package was found") || text.Contains("aucun package"))return "package-not-found";
        return "winget";
    }

    void SimulateUninstall(Dictionary<string,object> payload)
    {
        string packageId=payload!=null&&payload.ContainsKey("id")?Convert.ToString(payload["id"]):"";
        string appName=payload!=null&&payload.ContainsKey("name")?Convert.ToString(payload["name"]):LoadApplicationName(packageId);
        if(!IsValidPackageId(packageId))throw new InvalidOperationException("Logiciel invalide.");
        Task.Run(delegate {
            var report=new StringBuilder();bool installed=false;string version="",scope="Installation WinGet";int shortcuts=0;
            try
            {
                string resolvedPackageId=ResolveInstalledWingetPackage(packageId,appName,report);
                installed=!String.IsNullOrWhiteSpace(resolvedPackageId);
                Match versionMatch=Regex.Match(report.ToString(),Regex.Escape(resolvedPackageId)+@"\s+([^\r\n]+)",RegexOptions.IgnoreCase);
                if(versionMatch.Success)version=versionMatch.Groups[1].Value.Trim();
                if(IsManagedPortable(packageId))
                {
                    scope="Application portable installée pour l'utilisateur";
                    string shortcutName=SafeShortcutName(LoadApplicationName(packageId))+".lnk";
                    if(File.Exists(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),shortcutName)))shortcuts++;
                    if(File.Exists(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),shortcutName)))shortcuts++;
                }
                lock(uninstallSimulations)
                {
                    uninstallSimulations[packageId]=DateTime.UtcNow.AddMinutes(5);
                    resolvedUninstallPackages[packageId]=resolvedPackageId;
                }
                SendToWeb(new { type="uninstall-simulation",id=packageId,resolvedId=resolvedPackageId,installed=installed,version=version,scope=scope,shortcuts=shortcuts,expiresMinutes=5 });
            }
            catch(Exception ex){SendToWeb(new { type="uninstall-simulation-error",id=packageId,message=ex.Message });}
        });
    }

    bool ConsumeUninstallSimulation(string packageId,out string resolvedPackageId)
    {
        lock(uninstallSimulations)
        {
            resolvedPackageId="";
            DateTime expires;if(!uninstallSimulations.TryGetValue(packageId,out expires)||expires<DateTime.UtcNow)return false;
            uninstallSimulations.Remove(packageId);
            resolvedUninstallPackages.TryGetValue(packageId,out resolvedPackageId);
            resolvedUninstallPackages.Remove(packageId);
            return !String.IsNullOrWhiteSpace(resolvedPackageId);
        }
    }

    bool ConsumeUninstallSimulation(string packageId)
    {
        string resolvedPackageId;
        bool valid=ConsumeUninstallSimulation(packageId,out resolvedPackageId);
        if(valid)lock(uninstallSimulations)resolvedUninstallPackages[packageId]=resolvedPackageId;
        return valid;
    }

    string TakeResolvedUninstallPackage(string packageId)
    {
        lock(uninstallSimulations)
        {
            string resolvedPackageId="";
            resolvedUninstallPackages.TryGetValue(packageId,out resolvedPackageId);
            resolvedUninstallPackages.Remove(packageId);
            return resolvedPackageId;
        }
    }

    void RunUninstall(Dictionary<string, object> payload)
    {
        string packageId=payload != null && payload.ContainsKey("id") ? Convert.ToString(payload["id"]) : "";
        bool scanResidues=payload != null && payload.ContainsKey("scanResidues") && Convert.ToBoolean(payload["scanResidues"]);
        if(!IsValidPackageId(packageId)) throw new InvalidOperationException("Logiciel invalide.");
        string appName=payload != null && payload.ContainsKey("name") ? Convert.ToString(payload["name"]) : LoadApplicationName(packageId);
        if(String.IsNullOrWhiteSpace(appName)||appName.Length>120)appName=LoadApplicationName(packageId);
        if(!ConsumeUninstallSimulation(packageId))throw new InvalidOperationException("La simulation de désinstallation est absente ou expirée. Relancez l'aperçu.");
        if(uninstallRunning) throw new InvalidOperationException("Une désinstallation est déjà en cours.");
        if(installationRunning || repairRunning || updateRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        string resolvedPackageId=TakeResolvedUninstallPackage(packageId);
        if(String.IsNullOrWhiteSpace(resolvedPackageId))throw new InvalidOperationException("WinGet n'a pas confirme un paquet unique a desinstaller.");
        uninstallRunning=true;
        SendToWeb(new { type="uninstall-start", id=packageId });
        Task.Run(delegate {
            var report=new StringBuilder();
            string logName="PC-Setup-Desinstallation-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            int code=-1;
            bool success=false;
            var residues=new List<ResidueCandidate>();
            string residueToken="";
            try
            {
                report.AppendLine("OWLSETUP - RAPPORT DE DESINSTALLATION");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                report.AppendLine("Logiciel demande : "+packageId);
                report.AppendLine("Identifiant WinGet resolu : "+resolvedPackageId);
                report.AppendLine();
                code=RunUninstallWithFallbacks(resolvedPackageId,report);
                success=IsSuccessfulUninstallCode(code);
                if(success)
                {
                    for(int attempt=0;attempt<5 && IsPackageStillInstalled(resolvedPackageId,report);attempt++)Thread.Sleep(750);
                    success=!IsPackageStillInstalled(resolvedPackageId,report);
                    if(!success)report.AppendLine("Le logiciel est encore detecte apres la desinstallation.");
                }
                else if(!IsPackageStillInstalled(resolvedPackageId,report))
                {
                    report.AppendLine("Le logiciel n'est plus detecte malgre le code de sortie retourne.");
                    success=true;
                }
                if(success)
                {
                    RemoveManagedShortcuts(packageId,report);
                    if(scanResidues)
                    {
                        residues=FindUninstallResidues(packageId,appName,report);
                        if(residues.Count>0)
                        {
                            residueToken=Guid.NewGuid().ToString("N");
                            lock(uninstallResidueSimulations)
                            {
                                uninstallResidueSimulations[residueToken]=residues;
                                uninstallResidueExpirations[residueToken]=DateTime.UtcNow.AddMinutes(10);
                            }
                        }
                    }
                }
                report.AppendLine();
                report.AppendLine("Code de sortie : "+code);
            }
            catch(Exception ex)
            {
                report.AppendLine();
                report.AppendLine("ERREUR : "+ex.Message);
            }
            finally
            {
                try { File.WriteAllText(logPath,report.ToString(),Encoding.UTF8); } catch { }
                uninstallRunning=false;
                SendToWeb(new { type="uninstall-complete", id=packageId, success=success, code=code, errorMessage=success?"":ExplainWingetFailure(code,report.ToString(),"desinstallation"), logName=logName, residueToken=residueToken, residueSize=FormatBytes(residues.Sum(item=>item.Bytes)), residues=residues.Select(item=>new {name=item.Name,display=item.Display,size=FormatBytes(item.Bytes),files=item.Files}).ToArray() });
            }
        });
    }

    List<ResidueCandidate> FindUninstallResidues(string packageId,string appName,StringBuilder report)
    {
        var targets=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(string value in new[]{appName,packageId.Split('.').LastOrDefault()??""})
        {
            string normalized=NormalizeResidueName(value);
            if(normalized.Length>=5&&!IsGenericResidueName(normalized))targets.Add(normalized);
        }
        var results=new List<ResidueCandidate>();
        foreach(var rootInfo in new[]{new {Path=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),Type="Local",Label="%LOCALAPPDATA%"},new {Path=Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),Type="Roaming",Label="%APPDATA%"}})
        {
            if(!Directory.Exists(rootInfo.Path)||IsReparsePoint(rootInfo.Path))continue;
            foreach(string folder in Directory.GetDirectories(rootInfo.Path,"*",SearchOption.TopDirectoryOnly))
            {
                try
                {
                    if(IsReparsePoint(folder)||!targets.Contains(NormalizeResidueName(Path.GetFileName(folder))))continue;
                    long bytes,files;MeasurePath(folder,out bytes,out files);
                    results.Add(new ResidueCandidate{Path=folder,RootType=rootInfo.Type,Name=Path.GetFileName(folder),Display=rootInfo.Label+"\\"+Path.GetFileName(folder),Bytes=bytes,Files=files});
                    report.AppendLine("Résidu proposé : "+rootInfo.Label+"\\"+Path.GetFileName(folder)+" ("+FormatBytes(bytes)+")");
                }
                catch(Exception ex){report.AppendLine("Analyse de résidu ignorée : "+ex.Message);}
            }
        }
        return results.GroupBy(item=>item.Path,StringComparer.OrdinalIgnoreCase).Select(group=>group.First()).Take(20).ToList();
    }

    string NormalizeResidueName(string value)
    {
        return Regex.Replace((value??"").ToLowerInvariant(),"[^a-z0-9]","");
    }

    bool IsGenericResidueName(string value)
    {
        return new[]{"application","applications","desktop","client","runtime","launcher","setup","installer","update","windows","microsoft"}.Contains(value);
    }

    void QuarantineUninstallResidues(Dictionary<string,object> payload)
    {
        string token=payload!=null&&payload.ContainsKey("token")?Convert.ToString(payload["token"]):"";
        string context=payload!=null&&payload.ContainsKey("context")?Convert.ToString(payload["context"]):"single";
        if(context!="single"&&context!="batch")context="single";
        if(!Regex.IsMatch(token,"^[a-f0-9]{32}$",RegexOptions.IgnoreCase))throw new InvalidOperationException("Analyse de résidus invalide.");
        List<ResidueCandidate> candidates;
        lock(uninstallResidueSimulations)
        {
            DateTime expires;
            if(!uninstallResidueSimulations.TryGetValue(token,out candidates)||!uninstallResidueExpirations.TryGetValue(token,out expires)||expires<DateTime.UtcNow)throw new InvalidOperationException("L'analyse des résidus a expiré. Relancez la désinstallation.");
            uninstallResidueSimulations.Remove(token);uninstallResidueExpirations.Remove(token);
        }
        Task.Run(delegate {
            int moved=0,failed=0;
            string batchName="PC-Setup-Quarantaine-"+DateTime.Now.ToString("yyyy-MM-dd-HHmmss");
            string batchPath=Path.Combine(GetDataFolder("Quarantine"),batchName);
            string logName="PC-Setup-Residus-"+DateTime.Now.ToString("yyyy-MM-dd-HHmmss")+".log";
            var report=new StringBuilder();
            try
            {
                Directory.CreateDirectory(batchPath);
                foreach(var candidate in candidates)
                {
                    try
                    {
                        string allowedRoot=candidate.RootType=="Local"?Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData):Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                        if(!String.Equals(Path.GetDirectoryName(Path.GetFullPath(candidate.Path)),Path.GetFullPath(allowedRoot),StringComparison.OrdinalIgnoreCase))throw new UnauthorizedAccessException("Seuls les dossiers AppData directs sont autorisés.");
                        EnsureNoReparsePoints(candidate.Path,allowedRoot);
                        string destination=Path.Combine(batchPath,candidate.RootType+"-"+candidate.Name);
                        if(Directory.Exists(destination))destination+="-"+Guid.NewGuid().ToString("N").Substring(0,6);
                        Directory.Move(candidate.Path,destination);moved++;
                        report.AppendLine("Mis en quarantaine : "+candidate.Display);
                    }
                    catch(Exception ex){failed++;report.AppendLine("Échec : "+candidate.Display+" · "+ex.Message);}
                }
                if(Directory.Exists(batchPath)&&!Directory.EnumerateFileSystemEntries(batchPath).Any())Directory.Delete(batchPath);
            }
            catch(Exception ex){failed++;report.AppendLine("ERREUR : "+ex.Message);}
            finally
            {
                try{File.WriteAllText(Path.Combine(GetDataFolder("Logs"),logName),report.ToString(),Encoding.UTF8);}catch{}
                SendToWeb(new {type="uninstall-residues-complete",context=context,moved=moved,failed=failed,logName=logName});
            }
        });
    }

    void RemoveManagedShortcuts(string packageId,StringBuilder report)
    {
        if(!IsManagedPortable(packageId))return;
        string preference=LoadShortcutPreference(packageId);
        string shortcutName=SafeShortcutName(LoadApplicationName(packageId))+".lnk";
        var shortcuts=new List<string>();
        if(preference=="start" || preference=="both")shortcuts.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),shortcutName));
        if(preference=="desktop" || preference=="both")shortcuts.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),shortcutName));
        foreach(string shortcut in shortcuts)
        {
            try{if(File.Exists(shortcut)){File.Delete(shortcut);report.AppendLine("Raccourci supprime : "+shortcut);}}catch(Exception ex){report.AppendLine("Raccourci non supprime : "+ex.Message);}
        }
        try
        {
            string setting=Path.Combine(GetDataFolder("Settings"),packageId+".shortcut.txt");
            if(File.Exists(setting))File.Delete(setting);
            string nameSetting=Path.Combine(GetDataFolder("Settings"),packageId+".name.txt");
            if(File.Exists(nameSetting))File.Delete(nameSetting);
            string portableSetting=Path.Combine(GetDataFolder("Settings"),packageId+".portable.txt");
            if(File.Exists(portableSetting))File.Delete(portableSetting);
        }
        catch{}
    }

    void RunRepair(Dictionary<string, object> payload)
    {
        string packageId=payload != null && payload.ContainsKey("id") ? Convert.ToString(payload["id"]) : "";
        if(!IsValidPackageId(packageId)) throw new InvalidOperationException("Logiciel invalide.");
        if(repairRunning) throw new InvalidOperationException("Une réparation est déjà en cours.");
        if(installationRunning || uninstallRunning || updateRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        repairRunning=true;
        SendToWeb(new { type="repair-start", id=packageId });
        Task.Run(delegate {
            var report=new StringBuilder();
            string logName="PC-Setup-Reparation-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            int code=-1;
            int nativeCode=-1;
            bool success=false;
            string mode="native";
            try
            {
                report.AppendLine("OWLSETUP - RAPPORT DE REPARATION");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                report.AppendLine("Logiciel : "+packageId);
                report.AppendLine();
                code=RunWingetCli("repair --id \""+packageId+"\" --exact --force --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
                nativeCode=code;
                if(code!=0)
                {
                    mode="reinstall";
                    report.AppendLine();
                    report.AppendLine("La réparation native n'est pas disponible. Tentative de réinstallation réparatrice sans désinstallation...");
                    SendToWeb(new { type="repair-fallback", id=packageId, nativeCode=nativeCode });
                    code=RunWingetCli("install --id \""+packageId+"\" --exact"+WingetSourceArgument(packageId)+" --force --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
                }
                if(IsManagedPortable(packageId) && EnsurePortableShortcut(packageId,report))code=0;
                success=code==0;
                report.AppendLine();
                report.AppendLine("Mode utilisé : "+mode);
                report.AppendLine("Code de réparation native : "+nativeCode);
                report.AppendLine("Code de sortie : "+code);
            }
            catch(Exception ex)
            {
                report.AppendLine();
                report.AppendLine("ERREUR : "+ex.Message);
            }
            finally
            {
                try { File.WriteAllText(logPath,report.ToString(),Encoding.UTF8); } catch { }
                repairRunning=false;
                SendToWeb(new { type="repair-complete", id=packageId, success=success, code=code, nativeCode=nativeCode, mode=mode, errorMessage=success?"":ExplainWingetFailure(code,report.ToString(),"reparation"), logName=logName });
            }
        });
    }

    void RunBatchUninstall(Dictionary<string,object> payload)
    {
        var packages=ReadArray(payload,"packages").Where(x=>IsValidPackageId(x)).Distinct(StringComparer.OrdinalIgnoreCase).Take(50).ToArray();
        var catalog=ReadCatalog(payload);
        bool scanResidues=payload!=null&&payload.ContainsKey("scanResidues")&&Convert.ToBoolean(payload["scanResidues"]);
        if(packages.Length==0)throw new InvalidOperationException("Aucun logiciel valide à désinstaller.");
        string simulationKey=String.Join("|",packages.OrderBy(value=>value,StringComparer.OrdinalIgnoreCase));
        lock(batchUninstallSimulations)
        {
            DateTime expires;
            if(!batchUninstallSimulations.TryGetValue(simulationKey,out expires)||expires<DateTime.UtcNow)throw new InvalidOperationException("La simulation groupée est absente ou expirée.");
            batchUninstallSimulations.Remove(simulationKey);
        }
        Dictionary<string,string> resolvedPackages;
        lock(resolvedBatchUninstallPackages)
        {
            if(!resolvedBatchUninstallPackages.TryGetValue(simulationKey,out resolvedPackages))throw new InvalidOperationException("WinGet n'a pas confirme les paquets a desinstaller.");
            resolvedBatchUninstallPackages.Remove(simulationKey);
        }
        if(uninstallRunning || repairRunning || installationRunning || updateRunning || cleanupRunning)throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        uninstallRunning=true;
        SendToWeb(new { type="batch-uninstall-start",total=packages.Length });
        Task.Run(delegate {
            var report=new StringBuilder();int success=0,failed=0;
            var residues=new List<ResidueCandidate>();
            string logName="PC-Setup-Desinstallation-Groupee-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            try
            {
                report.AppendLine("OWLSETUP - DESINSTALLATION GROUPEE");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                for(int i=0;i<packages.Length;i++)
                {
                    string id=packages[i];
                    string resolvedId=resolvedPackages.ContainsKey(id)?resolvedPackages[id]:"";
                    SendToWeb(new { type="batch-uninstall-progress",id=id,index=i+1,total=packages.Length });
                    report.AppendLine();report.AppendLine("===== "+id+" =====");
                    report.AppendLine("Identifiant WinGet resolu : "+resolvedId);
                    int itemStart=report.Length;
                    int code=String.IsNullOrWhiteSpace(resolvedId)?-1:RunUninstallWithFallbacks(resolvedId,report);
                    string itemOutput=report.ToString(itemStart,report.Length-itemStart);
                    bool ok=IsSuccessfulUninstallCode(code);
                    if(ok)
                    {
                        for(int attempt=0;attempt<5 && IsPackageStillInstalled(resolvedId,report);attempt++)Thread.Sleep(750);
                        ok=!IsPackageStillInstalled(resolvedId,report);
                    }
                    else if(!String.IsNullOrWhiteSpace(resolvedId)&&!IsPackageStillInstalled(resolvedId,report))ok=true;
                    if(ok)
                    {
                        success++;
                        string appName=catalog.ContainsKey(id)?catalog[id]:LoadApplicationName(id);
                        RemoveManagedShortcuts(id,report);
                        if(scanResidues)residues.AddRange(FindUninstallResidues(id,appName,report));
                    }
                    else failed++;
                    SendToWeb(new { type="batch-uninstall-item",id=id,success=ok,index=i+1,total=packages.Length,code=code,errorMessage=ok?"":ExplainWingetFailure(code,itemOutput,"desinstallation") });
                }
            }
            catch(Exception ex){failed++;report.AppendLine("ERREUR : "+ex.Message);}
            finally
            {
                try{File.WriteAllText(logPath,report.ToString(),Encoding.UTF8);}catch{}
                residues=residues.GroupBy(item=>item.Path,StringComparer.OrdinalIgnoreCase).Select(group=>group.First()).Take(50).ToList();
                string residueToken="";
                if(residues.Count>0)
                {
                    residueToken=Guid.NewGuid().ToString("N");
                    lock(uninstallResidueSimulations)
                    {
                        uninstallResidueSimulations[residueToken]=residues;
                        uninstallResidueExpirations[residueToken]=DateTime.UtcNow.AddMinutes(10);
                    }
                }
                uninstallRunning=false;
                SendToWeb(new { type="batch-uninstall-complete",success=success,failed=failed,logName=logName,residueToken=residueToken,residueSize=FormatBytes(residues.Sum(item=>item.Bytes)),residues=residues.Select(item=>new {name=item.Name,display=item.Display,size=FormatBytes(item.Bytes),files=item.Files}).ToArray() });
            }
        });
    }

    void SimulateBatchUninstall(Dictionary<string,object> payload)
    {
        var packages=ReadArray(payload,"packages").Where(x=>IsValidPackageId(x)).Distinct(StringComparer.OrdinalIgnoreCase).Take(50).ToArray();
        var catalog=ReadCatalog(payload);
        if(packages.Length==0)throw new InvalidOperationException("Aucun logiciel valide à simuler.");
        Task.Run(delegate {
            try
            {
                var resolved=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
                foreach(string id in packages)
                {
                    var report=new StringBuilder();
                    string appName=catalog.ContainsKey(id)?catalog[id]:LoadApplicationName(id);
                    string resolvedId=ResolveInstalledWingetPackage(id,appName,report);
                    if(!String.IsNullOrWhiteSpace(resolvedId))resolved[id]=resolvedId;
                }
                if(resolved.Count==0)throw new InvalidOperationException("Aucun paquet unique n'a ete confirme par WinGet.");
                string[] resolvedIds=packages.Where(id=>resolved.ContainsKey(id)).ToArray();
                string resolvedKey=String.Join("|",resolvedIds.OrderBy(value=>value,StringComparer.OrdinalIgnoreCase));
                lock(batchUninstallSimulations)batchUninstallSimulations[resolvedKey]=DateTime.UtcNow.AddMinutes(5);
                lock(resolvedBatchUninstallPackages)resolvedBatchUninstallPackages[resolvedKey]=resolved;
                SendToWeb(new { type="batch-uninstall-simulation",packages=resolvedIds,unresolved=packages.Where(id=>!resolved.ContainsKey(id)).ToArray(),expiresMinutes=5 });
            }
            catch(Exception ex){SendToWeb(new { type="batch-uninstall-simulation-error",message=ex.Message });}
        });
    }

    void DiagnoseWinget()
    {
        SendToWeb(new { type="tool-progress", tool="winget", percent=10, status="Verification de WinGet..." });
        Task.Run(delegate {
            var report=new StringBuilder();string version="";bool available=false;bool sources=false;string message="";
            try
            {
                int code=RunWingetCli("--version",report);
                available=code==0;
                SendToWeb(new { type="tool-progress", tool="winget", percent=55, status="Version controlee." });
                version=report.ToString().Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()??"";
                if(available)
                {
                    report.Clear();
                    sources=RunWingetCli("source list --disable-interactivity",report)==0;
                }
                SendToWeb(new { type="tool-progress", tool="winget", percent=90, status="Sources controlees." });
                message=available?(sources?"WinGet et ses sources répondent correctement.":"WinGet répond, mais ses sources doivent être réparées."):"WinGet est absent ou inaccessible.";
            }
            catch(Exception ex){message=ex.Message;}
            SendToWeb(new { type="tool-progress", tool="winget", percent=100, status="Diagnostic termine." });
            SendToWeb(new { type="winget-diagnostic",available=available,sources=sources,version=version,message=message });
        });
    }

    void SearchWinget(Dictionary<string,object> payload)
    {
        string query=payload!=null&&payload.ContainsKey("query")?Convert.ToString(payload["query"]).Trim():"";
        if(query.Length<2||query.Length>80||!Regex.IsMatch(query,@"^[\p{L}\p{N} ._+\-]+$"))
        {
            SendToWeb(new {type="winget-search-complete",success=false,query=query,items=new object[0],message="Utilisez entre 2 et 80 lettres, chiffres, espaces, points, tirets ou signes +."});
            return;
        }
        Task.Run(delegate {
            var report=new StringBuilder();
            try
            {
                string arguments="search --query \""+query+"\" --source winget --count 15 --accept-source-agreements --disable-interactivity";
                int code=RunWingetCli(arguments,report);
                var items=ParseWingetSearchResults(report.ToString()).Take(12).ToArray();
                string message=code==0
                    ? (items.Length==0?"Aucun paquet WinGet supplémentaire n'a été trouvé.":"Recherche WinGet terminée.")
                    : "WinGet n'a pas pu terminer la recherche.";
                SendToWeb(new {type="winget-search-complete",success=code==0,query=query,items=items,message=message});
            }
            catch(Exception ex)
            {
                SendToWeb(new {type="winget-search-complete",success=false,query=query,items=new object[0],message=ex.Message});
            }
        });
    }

    IEnumerable<object> ParseWingetSearchResults(string output)
    {
        var results=new List<object>();
        var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(var row in ParseWingetTable(output))
        {
            string name=row.ContainsKey("name")?row["name"]:"";
            string id=row.ContainsKey("id")?row["id"]:"";
            if(!IsValidPackageId(id)||name.Length==0||!seen.Add(id))continue;
            string versionArea=row.ContainsKey("version")?row["version"]:"";
            string version=Regex.Match(versionArea,@"^\S+").Value;
            results.Add(new {name=name,id=id,version=version,source="winget"});
        }
        return results;
    }

    void RepairWinget()
    {
        if(installationRunning || uninstallRunning || repairRunning || updateRunning || cleanupRunning)throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        SendToWeb(new { type="winget-repair-start" });
        SendToWeb(new { type="tool-progress", tool="winget", percent=10, status="Preparation de la reparation..." });
        Task.Run(delegate {
            var report=new StringBuilder();int code=-1;string logName="PC-Setup-Reparation-WinGet-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            string sourcesNote="";
            try
            {
                // 1) re-enregistrement App Installer + simple actualisation des sources.
                // 2) seulement si ça échoue : sauvegarde des sources personnalisées,
                //    reset --force, puis ré-ajout des sources non standard.
                string script="$ErrorActionPreference='Stop';"+
                    "$pkg=Get-AppxPackage Microsoft.DesktopAppInstaller;"+
                    "if(-not $pkg){throw 'App Installer est absent. Installez-le depuis le Microsoft Store.'};"+
                    "Add-AppxPackage -DisableDevelopmentMode -Register (Join-Path $pkg.InstallLocation 'AppxManifest.xml');"+
                    "$winget=Join-Path $env:LOCALAPPDATA 'Microsoft\\WindowsApps\\winget.exe';"+
                    "if(-not (Test-Path $winget)){$winget='winget.exe'};"+
                    "& $winget source update --disable-interactivity;"+
                    "if($LASTEXITCODE -eq 0){ Write-Output 'PCSETUP_WG|updated'; exit 0 };"+
                    // `winget source export` produit une ligne JSON par source (NDJSON).
                    // On ne conserve que les sources ajoutées par l'utilisateur
                    // (TrustLevel sans 'StoreOrigin' = pas une source Microsoft intégrée).
                    "$std=@('winget','winget-font','msstore'); $custom=@(); try{ foreach($ln in (& $winget source export 2>$null)){ $t=$ln.Trim(); if(-not $t.StartsWith('{')){continue}; try{ $o=ConvertFrom-Json $t; $store=$o.TrustLevel -and ($o.TrustLevel -contains 'StoreOrigin'); if($o.Name -and $o.Arg -and -not $store -and ($std -notcontains $o.Name)){ $custom+=$o } }catch{} } }catch{};"+
                    "& $winget source reset --force --disable-interactivity;"+
                    "& $winget source update --disable-interactivity;"+
                    "$restored=0; $failed=@();"+
                    "foreach($s in $custom){ try{ if($s.Type){ & $winget source add --name $s.Name --arg $s.Arg --type $s.Type --disable-interactivity 2>$null } else { & $winget source add --name $s.Name --arg $s.Arg --disable-interactivity 2>$null }; if($LASTEXITCODE -eq 0){ $restored++ } else { $failed+=$s.Name } }catch{ $failed+=$s.Name } };"+
                    "if($custom.Count -gt 0){ Write-Output ('PCSETUP_WG|reset|restored='+$restored+'|failed='+($failed -join ',')) } else { Write-Output 'PCSETUP_WG|reset' };"+
                    "exit 0";
                string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
                SendToWeb(new { type="tool-progress", tool="winget", percent=35, status="Reenregistrement et actualisation des sources..." });
                code=RunHiddenProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,report);
                SendToWeb(new { type="tool-progress", tool="winget", percent=90, status="Verification du resultat..." });
                string text=report.ToString();
                if(text.Contains("PCSETUP_WG|updated"))sourcesNote="Sources actualisées sans réinitialisation.";
                else
                {
                    Match r=Regex.Match(text,@"PCSETUP_WG\|reset(?:\|restored=(\d+)\|failed=([^\r\n]*))?");
                    if(r.Success)
                    {
                        if(r.Groups[1].Success)
                        {
                            string failed=r.Groups[2].Value.Trim();
                            sourcesNote="Réinitialisation complète. Sources personnalisées ré-ajoutées : "+r.Groups[1].Value+".";
                            if(failed.Length>0)sourcesNote+=" À ré-ajouter manuellement : "+failed+".";
                        }
                        else sourcesNote="Réinitialisation complète des sources (aucune source personnalisée détectée).";
                    }
                }
            }
            catch(Exception ex){report.AppendLine("ERREUR : "+ex.Message);}
            finally
            {
                try{File.WriteAllText(logPath,report.ToString(),Encoding.UTF8);}catch{}
                SendToWeb(new { type="tool-progress", tool="winget", percent=100, status=code==0?"Reparation terminee.":"Reparation a verifier." });
                SendToWeb(new { type="winget-repair-complete",success=code==0,code=code,sourcesNote=sourcesNote,logName=logName });
            }
        });
    }

    void CreateRestorePoint()
    {
        SendToWeb(new { type="restore-point-start" });
        SendToWeb(new { type="tool-progress", tool="restore", percent=10, status="Preparation du point..." });
        Task.Run(delegate {
            var report=new StringBuilder();int code=-1;string logName="PC-Setup-Point-Restauration-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            string marker="";int recentHours=0;
            try
            {
                string label="OwlSetup "+BuildInfo.DisplayVersion+" - "+DateTime.Now.ToString("yyyy-MM-dd HH:mm");
                // 1) Vérifie que la protection système est active.
                // 2) Tente la création et confirme via le nombre de points.
                // 3) Si Windows a refusé à cause de sa limite de 1 point / 24 h,
                //    signale qu'un point récent protège déjà le PC (pas de
                //    modification du registre : c'est fragile si le process meurt).
                string script=
                    "$ErrorActionPreference='Stop';"+
                    "$k='HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore';"+
                    "$disabled=$false; try{ $disabled=((Get-ItemProperty $k -Name DisableSR -EA SilentlyContinue).DisableSR -eq 1) }catch{};"+
                    "if($disabled){ Write-Output 'PCSETUP_SR|disabled'; exit 3 };"+
                    "$before=@(Get-ComputerRestorePoint -EA SilentlyContinue).Count;"+
                    "try{ Checkpoint-Computer -Description '"+label.Replace("'","''")+"' -RestorePointType 'MODIFY_SETTINGS' }catch{};"+
                    "$points=@(Get-ComputerRestorePoint -EA SilentlyContinue);"+
                    "if($points.Count -gt $before){ Write-Output 'PCSETUP_SR|created'; exit 0 };"+
                    "$last=$points | Sort-Object { [Management.ManagementDateTimeConverter]::ToDateTime($_.CreationTime) } | Select-Object -Last 1;"+
                    "if($last){ $age=(New-TimeSpan -Start ([Management.ManagementDateTimeConverter]::ToDateTime($last.CreationTime)) -End (Get-Date)).TotalHours; if($age -lt 24){ Write-Output ('PCSETUP_SR|recent|'+[int]$age); exit 5 } };"+
                    "Write-Output 'PCSETUP_SR|not-created'; exit 4";
                string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
                SendToWeb(new { type="tool-progress", tool="restore", percent=40, status="Creation par Windows..." });
                code=RunElevatedProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,report);
                SendToWeb(new { type="tool-progress", tool="restore", percent=90, status="Verification du point..." });
                Match m=Regex.Match(report.ToString(),@"PCSETUP_SR\|([a-z-]+)(?:\|(\d+))?");
                if(m.Success)marker=m.Groups[1].Value;
                if(m.Success && m.Groups[2].Success)Int32.TryParse(m.Groups[2].Value,out recentHours);
            }
            catch(Exception ex){report.AppendLine("ERREUR : "+ex.Message);}
            finally
            {
                try{File.WriteAllText(logPath,report.ToString(),Encoding.UTF8);}catch{}
                // Un point < 24 h protège déjà le PC : on considère l'objectif atteint.
                // (le script sort avec un code != 0 pour « recent », d'où le test sur le marqueur.)
                bool created=marker=="created" || marker=="recent";
                SendToWeb(new { type="tool-progress", tool="restore", percent=100, status=created?(marker=="recent"?"Point recent existant.":"Point cree."):"Creation a verifier." });
                string reason;
                if(marker=="created")reason="created";
                else if(marker=="recent")reason="recent";
                else if(code==1223)reason="uac-cancelled";
                else if(marker=="disabled")reason="system-protection-disabled";
                else if(marker=="not-created")reason="not-created";
                else reason="system-protection-disabled";
                SendToWeb(new { type="restore-point-complete",success=created,code=code,reason=reason,recentHours=recentHours,logName=logName });
            }
        });
    }

    void OpenSystemRestore()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "rstrui.exe",
            UseShellExecute = true
        });
    }

    void OpenSystemProtection()
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = "SystemPropertiesProtection.exe",
            UseShellExecute = true
        });
    }

    void LoadHistory()
    {
        try
        {
            string folder=GetDataFolder("Logs");
            string reportFolder=GetDataFolder("Reports");
            var items=new List<object>();
            foreach(var file in Directory.GetFiles(folder,"PC-Setup-*.log",SearchOption.TopDirectoryOnly).Select(path=>new FileInfo(path)).OrderByDescending(value=>value.LastWriteTime).Take(80))
            {
                string reportName=Path.GetFileNameWithoutExtension(file.Name)+".json";
                string reportPath=Path.Combine(reportFolder,reportName);
                string title=HistoryType(file.Name),summary="",result="";
                if(File.Exists(reportPath))
                {
                    try
                    {
                        var root=new JavaScriptSerializer().DeserializeObject(File.ReadAllText(reportPath,Encoding.UTF8)) as Dictionary<string,object>;
                        var values=root!=null&&root.ContainsKey("summary")?root["summary"] as Dictionary<string,object>:null;
                        int ok=values!=null&&values.ContainsKey("success")?Convert.ToInt32(values["success"]):0;
                        int failed=values!=null&&values.ContainsKey("failed")?Convert.ToInt32(values["failed"]):0;
                        summary=ok+" réussi(s) · "+failed+" échec(s)";
                        result=failed==0?"success":"failed";
                    }
                    catch{reportName="";}
                }
                else reportName="";
                items.Add(new {name=file.Name,date=file.LastWriteTime.ToString("dd/MM/yyyy HH:mm"),size=FormatBytes(file.Length),type=HistoryType(file.Name),title=title,summary=summary,result=result,reportName=reportName});
            }
            SendToWeb(new { type="history-state",items=items });
        }
        catch(Exception ex){SendToWeb(new { type="history-error",message=ex.Message });}
    }

    string HistoryType(string name)
    {
        if(name.IndexOf("Installation",StringComparison.OrdinalIgnoreCase)>=0)return "Installation";
        if(name.IndexOf("Desinstallation",StringComparison.OrdinalIgnoreCase)>=0)return "Désinstallation";
        if(name.IndexOf("Reparation",StringComparison.OrdinalIgnoreCase)>=0)return "Réparation";
        if(name.IndexOf("Nettoyage",StringComparison.OrdinalIgnoreCase)>=0)return "Nettoyage";
        if(name.IndexOf("Residus",StringComparison.OrdinalIgnoreCase)>=0)return "Résidus";
        if(name.IndexOf("Mise-a-jour",StringComparison.OrdinalIgnoreCase)>=0)return "Mise à jour";
        if(name.IndexOf("Elevations",StringComparison.OrdinalIgnoreCase)>=0)return "Élévation";
        return "Opération";
    }

    void OpenLog(Dictionary<string,object> payload)
    {
        string name=payload!=null&&payload.ContainsKey("name")?Convert.ToString(payload["name"]):"";
        if(Path.GetFileName(name)!=name || !name.StartsWith("PC-Setup-",StringComparison.OrdinalIgnoreCase) || !name.EndsWith(".log",StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Journal invalide.");
        string path=Path.Combine(GetDataFolder("Logs"),name);
        if(!File.Exists(path))throw new FileNotFoundException("Journal introuvable.");
        var info=new FileInfo(path);
        if(info.Length>2*1024*1024)throw new InvalidDataException("Le journal est trop volumineux pour être affiché.");
        string content;
        using(var reader=new StreamReader(path,Encoding.UTF8,true))content=reader.ReadToEnd();
        SendToWeb(new {type="log-data",name=name,category=HistoryType(name),date=info.LastWriteTime.ToString("dd/MM/yyyy HH:mm"),size=FormatBytes(info.Length),content=content});
    }

    void OpenReport(Dictionary<string,object> payload)
    {
        string name=payload!=null&&payload.ContainsKey("name")?Convert.ToString(payload["name"]):"";
        if(Path.GetFileName(name)!=name || !name.StartsWith("PC-Setup-",StringComparison.OrdinalIgnoreCase) || !name.EndsWith(".json",StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Rapport JSON invalide.");
        string path=Path.Combine(GetDataFolder("Reports"),name);
        if(!File.Exists(path))throw new FileNotFoundException("Rapport JSON introuvable.");
        var info=new FileInfo(path);
        if(info.Length>1024*1024)throw new InvalidDataException("Le rapport est trop volumineux pour être affiché.");
        string content=File.ReadAllText(path,Encoding.UTF8);
        object report=json.DeserializeObject(content);
        if(report==null)throw new InvalidDataException("Le rapport est illisible.");
        SendToWeb(new {type="report-data",name=name,report=report});
    }

    void ExportReport(Dictionary<string,object> payload)
    {
        string name=payload!=null&&payload.ContainsKey("name")?Convert.ToString(payload["name"]):"";
        if(Path.GetFileName(name)!=name || !name.StartsWith("PC-Setup-",StringComparison.OrdinalIgnoreCase) || !name.EndsWith(".json",StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Rapport JSON invalide.");
        string path=Path.Combine(GetDataFolder("Reports"),name);
        if(!File.Exists(path))throw new FileNotFoundException("Rapport JSON introuvable.");
        OpenTechnicalTextFile(path);
    }

    void OpenTechnicalTextFile(string path)
    {
        if(String.IsNullOrWhiteSpace(path) || !File.Exists(path))throw new FileNotFoundException("Fichier technique introuvable.");
        Process.Start(new ProcessStartInfo
        {
            FileName="notepad.exe",
            Arguments="\""+path+"\"",
            UseShellExecute=false
        });
    }

    void OpenLogFolder()
    {
        string folder=GetDataFolder("Logs");
        Directory.CreateDirectory(folder);
        Process.Start(new ProcessStartInfo{FileName=folder,UseShellExecute=true});
    }

    void SendFeedbackDiagnostics()
    {
        string webViewVersion="Indisponible";
        try{if(webView.CoreWebView2!=null)webViewVersion=webView.CoreWebView2.Environment.BrowserVersionString;}catch{}
        Task.Run(delegate {
            string windows=Environment.OSVersion.VersionString;
            try
            {
                using(var key=Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion"))
                {
                    string product=Convert.ToString(key==null?null:key.GetValue("ProductName"));
                    string display=Convert.ToString(key==null?null:key.GetValue("DisplayVersion"));
                    string build=Convert.ToString(key==null?null:key.GetValue("CurrentBuildNumber"));
                    if(!String.IsNullOrWhiteSpace(product))windows=product+(String.IsNullOrWhiteSpace(display)?"":" "+display)+(String.IsNullOrWhiteSpace(build)?"":" (build "+build+")");
                }
            }
            catch{}
            string wingetVersion=CachedWingetVersion();
            SendToWeb(new { type="feedback-diagnostics", version=BuildInfo.DisplayVersion, windows=windows, architecture=Environment.Is64BitOperatingSystem?"64 bits":"32 bits", winget=wingetVersion, webview=webViewVersion });
        });
    }

    void RunSelfDiagnostic()
    {
        string detectedWebView="";
        try{if(webView.CoreWebView2!=null)detectedWebView=webView.CoreWebView2.Environment.BrowserVersionString;}catch{}
        Task.Run(delegate {
            var tests=new List<object>();
            bool integrity=false,winget=false,webviewReady=false,storage=false,logsWritable=false;
            try{integrity=VerifyInterfaceIntegrity();}catch{}
            tests.Add(new {name="Intégrité de l’interface",success=integrity,detail=integrity?"Ressources conformes à l’exécutable":"Une ressource locale diffère de la version intégrée"});
            try{var output=new StringBuilder();winget=RunWingetCli("--version",output)==0;tests.Add(new {name="WinGet",success=winget,detail=winget?output.ToString().Trim():"WinGet est indisponible"});}catch(Exception ex){tests.Add(new {name="WinGet",success=false,detail=ex.Message});}
            try{webviewReady=!String.IsNullOrWhiteSpace(detectedWebView);tests.Add(new {name="WebView2",success=webviewReady,detail=webviewReady?detectedWebView:"Version introuvable"});}catch{tests.Add(new {name="WebView2",success=false,detail="Détection impossible"});}
            try{string settings=GetDataFolder("Settings"),reports=GetDataFolder("Reports");storage=Directory.Exists(settings)&&Directory.Exists(reports);tests.Add(new {name="Stockage local",success=storage,detail=storage?"Dossiers locaux disponibles":"Dossiers locaux indisponibles"});}catch(Exception ex){tests.Add(new {name="Stockage local",success=false,detail=ex.Message});}
            try{string probe=Path.Combine(GetDataFolder("Logs"),".write-test");File.WriteAllText(probe,"ok",Encoding.ASCII);File.Delete(probe);logsWritable=true;tests.Add(new {name="Écriture des journaux",success=true,detail="Permissions locales correctes"});}catch(Exception ex){tests.Add(new {name="Écriture des journaux",success=false,detail=ex.Message});}
            bool success=integrity&&winget&&webviewReady&&storage&&logsWritable;
            SendToWeb(new {type="self-diagnostic-result",success=success,tests=tests.ToArray(),checkedAt=DateTime.Now.ToString("dd/MM/yyyy HH:mm")});
        });
    }

    void PruneHistory(Dictionary<string,object> payload)
    {
        int days=90;
        if(payload!=null&&payload.ContainsKey("days"))Int32.TryParse(Convert.ToString(payload["days"]),out days);
        if(!new[]{7,30,90,365}.Contains(days))throw new InvalidOperationException("Durée de conservation invalide.");
        DateTime cutoff=DateTime.Now.AddDays(-days);int deleted=0;
        foreach(string folder in new[]{GetDataFolder("Logs"),GetDataFolder("Reports")})
        {
            foreach(string path in Directory.GetFiles(folder,"PC-Setup-*",SearchOption.TopDirectoryOnly))
            {
                var info=new FileInfo(path);
                if(info.LastWriteTime>=cutoff)continue;
                if(info.Extension.Equals(".log",StringComparison.OrdinalIgnoreCase)||info.Extension.Equals(".json",StringComparison.OrdinalIgnoreCase)){File.Delete(path);deleted++;}
            }
        }
        SendToWeb(new {type="history-pruned",deleted=deleted,days=days});
        LoadHistory();
        SendSecurityStatus();
    }

    void ClearHistory()
    {
        int deleted=0;
        foreach(string folder in new[]{GetDataFolder("Logs"),GetDataFolder("Reports")})
        {
            foreach(string path in Directory.GetFiles(folder,"PC-Setup-*",SearchOption.TopDirectoryOnly))
            {
                var info=new FileInfo(path);
                if(!info.Extension.Equals(".log",StringComparison.OrdinalIgnoreCase)&&!info.Extension.Equals(".json",StringComparison.OrdinalIgnoreCase))continue;
                File.Delete(path);deleted++;
            }
        }
        SendToWeb(new {type="history-cleared",deleted=deleted});
        LoadHistory();
        SendSecurityStatus();
    }

    void ExportSupportBundle(Dictionary<string,object> payload)
    {
        string summary=payload!=null&&payload.ContainsKey("summary")?Convert.ToString(payload["summary"]):"";
        if(summary.Length>20000)summary=summary.Substring(0,20000);
        using(var dialog=new SaveFileDialog())
        {
            dialog.Title="Exporter l’archive d’assistance OwlSetup";
            dialog.Filter="Archive ZIP (*.zip)|*.zip";
            dialog.FileName="OwlSetup-Assistance-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".zip";
            if(dialog.ShowDialog(this)!=DialogResult.OK)return;
            using(var stream=new FileStream(dialog.FileName,FileMode.Create,FileAccess.ReadWrite,FileShare.None))
            using(var archive=new ZipArchive(stream,ZipArchiveMode.Create))
            {
                var readme=archive.CreateEntry("LISEZ-MOI.txt",CompressionLevel.Optimal);
                using(var writer=new StreamWriter(readme.Open(),new UTF8Encoding(false)))writer.Write("Archive d’assistance OwlSetup créée à la demande de l’utilisateur.\r\nAucun journal complet, fichier personnel, compte Windows ou chemin utilisateur n’est inclus automatiquement.\r\n");
                var diagnostic=archive.CreateEntry("diagnostic-anonymise.txt",CompressionLevel.Optimal);
                using(var writer=new StreamWriter(diagnostic.Open(),new UTF8Encoding(false)))writer.Write("OwlSetup : "+BuildInfo.DisplayVersion+"\r\nCanal : "+BuildInfo.Channel+"\r\nDate : "+DateTime.Now.ToString("dd/MM/yyyy HH:mm")+"\r\n\r\n"+summary);
            }
            SendToWeb(new {type="support-exported",name=Path.GetFileName(dialog.FileName)});
        }
    }

    void CheckFeedbackFollowups(Dictionary<string,object> payload)
    {
        var titles=ReadArray(payload,"titles").Where(x=>!String.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).Take(20).ToArray();
        Task.Run(delegate {
            try
            {
                string raw;
                using(var client=new WebClient())
                {
                    client.Headers[HttpRequestHeader.UserAgent]="OwlSetup/"+BuildInfo.DisplayVersion;
                    client.Headers[HttpRequestHeader.Accept]="application/vnd.github+json";
                    raw=client.DownloadString("https://api.github.com/repos/OwlNetGeekFR/OwlSetup/issues?state=all&per_page=100");
                }
                var issues=json.DeserializeObject(raw) as object[];
                var found=new List<object>();
                foreach(var value in issues??new object[0])
                {
                    var issue=value as Dictionary<string,object>;
                    if(issue==null||issue.ContainsKey("pull_request"))continue;
                    string title=Convert.ToString(issue.ContainsKey("title")?issue["title"]:"");
                    if(!titles.Any(expected=>String.Equals(expected,title,StringComparison.OrdinalIgnoreCase)))continue;
                    found.Add(new {title=title,state=Convert.ToString(issue["state"]),comments=Convert.ToInt32(issue["comments"]),url=Convert.ToString(issue["html_url"])});
                }
                SendToWeb(new {type="feedback-followup-state",items=found.ToArray()});
            }
            catch(Exception ex){SendToWeb(new {type="feedback-followup-error",message=ex.Message});}
        });
    }

    void ScanStartup()
    {
        SendToWeb(new { type="tool-progress", tool="startup", percent=10, status="Analyse du registre..." });
        Task.Run(delegate {
            var items=new List<object>();
            foreach(RegistryHive hive in new[]{RegistryHive.CurrentUser,RegistryHive.LocalMachine})
            foreach(RegistryView view in new[]{RegistryView.Registry64,RegistryView.Registry32})
            {
                try
                {
                    using(var baseKey=RegistryKey.OpenBaseKey(hive,view))
                    using(var run=baseKey.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"))
                    {
                        if(run==null)continue;
                        foreach(string name in run.GetValueNames())items.Add(new { name=name,command=Convert.ToString(run.GetValue(name)),source=hive==RegistryHive.CurrentUser?"Utilisateur":"Machine" });
                    }
                }catch{}
            }
            SendToWeb(new { type="tool-progress", tool="startup", percent=65, status="Analyse des dossiers de demarrage..." });
            foreach(string folder in new[]{Environment.GetFolderPath(Environment.SpecialFolder.Startup),Environment.GetFolderPath(Environment.SpecialFolder.CommonStartup)})
            {
                try{foreach(string file in Directory.GetFiles(folder))items.Add(new {name=Path.GetFileNameWithoutExtension(file),command=file,source="Dossier Démarrage"});}catch{}
            }
            SendToWeb(new { type="tool-progress", tool="startup", percent=100, status="Analyse terminee." });
            SendToWeb(new { type="startup-state",items=items.GroupBy(x=>Convert.ToString(x.GetType().GetProperty("name").GetValue(x,null)),StringComparer.OrdinalIgnoreCase).Select(x=>x.First()).ToArray() });
        });
    }

    void OpenStartupSettings()
    {
        Process.Start(new ProcessStartInfo{FileName="ms-settings:startupapps",UseShellExecute=true});
    }

    void ScanDiskUsage()
    {
        SendToWeb(new { type="disk-scan-start" });
        Task.Run(delegate {
            try
            {
                string profile=Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                var folders=Directory.GetDirectories(profile).Where(path=>!IsProtectedSystemPath(path)).Take(80).ToArray();
                var results=new List<object>();
                var authorizedTargets=new Dictionary<string,bool>(StringComparer.OrdinalIgnoreCase);
                for(int i=0;i<folders.Length;i++)
                {
                    string folder=folders[i];
                    long bytes,files;MeasurePath(folder,out bytes,out files);
                    bool partial=lastMeasureTruncated;
                    bool canClean=IsSafeDiskCleanupFolder(folder);
                    results.Add(new {name=Path.GetFileName(folder),path=folder,bytes=bytes,size=FormatBytes(bytes),files=files,canClean=canClean,partial=partial});
                    authorizedTargets[Path.GetFullPath(folder)]=canClean;
                    int percent=folders.Length==0?95:10+(int)Math.Round(((i+1)/(double)folders.Length)*85);
                    SendToWeb(new { type="tool-progress", tool="disk", percent=percent, status="Analyse de "+Path.GetFileName(folder)+"..." });
                }
                lock(diskScanTargets){diskScanTargets.Clear();foreach(var target in authorizedTargets)diskScanTargets[target.Key]=target.Value;}
                SendToWeb(new { type="tool-progress", tool="disk", percent=100, status="Analyse terminee." });
                SendToWeb(new { type="disk-scan-state",items=results.OrderByDescending(item=>Convert.ToInt64(item.GetType().GetProperty("bytes").GetValue(item,null))).Take(15).ToArray() });
            }
            catch(Exception ex){SendToWeb(new { type="tool-progress", tool="disk", percent=100, status="Analyse interrompue." });SendToWeb(new { type="disk-scan-error",message=ex.Message });}
        });
    }

    bool IsProtectedSystemPath(string path)
    {
        string name=Path.GetFileName(path);
        return name.StartsWith("AppData",StringComparison.OrdinalIgnoreCase);
    }

    bool IsSafeDiskCleanupFolder(string path)
    {
        return String.Equals(Path.GetFileName(path),".cache",StringComparison.OrdinalIgnoreCase);
    }

    string GetAuthorizedDiskTarget(Dictionary<string,object> payload,bool requireCleanable)
    {
        string requested=payload!=null&&payload.ContainsKey("path")?Convert.ToString(payload["path"]):"";
        if(String.IsNullOrWhiteSpace(requested))throw new InvalidOperationException("Dossier non renseigné.");
        string full=Path.GetFullPath(requested);
        string profile=Path.GetFullPath(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile));
        if(!Directory.Exists(full)||!String.Equals(Path.GetDirectoryName(full),profile,StringComparison.OrdinalIgnoreCase))throw new UnauthorizedAccessException("Ce dossier ne fait pas partie des résultats autorisés.");
        bool cleanable;
        lock(diskScanTargets){if(!diskScanTargets.TryGetValue(full,out cleanable))throw new UnauthorizedAccessException("Relancez l’analyse du disque avant cette action.");}
        if(requireCleanable&&!cleanable)throw new UnauthorizedAccessException("Ce dossier contient potentiellement des données personnelles et ne peut pas être nettoyé automatiquement.");
        EnsureNoReparsePoints(full,profile);
        return full;
    }

    void OpenDiskFolder(Dictionary<string,object> payload)
    {
        string folder=GetAuthorizedDiskTarget(payload,false);
        Process.Start(new ProcessStartInfo{FileName="explorer.exe",Arguments="\""+folder+"\"",UseShellExecute=true});
    }

    void QuarantineDiskFolder(Dictionary<string,object> payload)
    {
        string folder=GetAuthorizedDiskTarget(payload,true);
        Task.Run(delegate {
            try
            {
                string quarantineRoot=GetDataFolder("Quarantine");
                string batch=Path.Combine(quarantineRoot,"PC-Setup-Quarantaine-"+DateTime.Now.ToString("yyyy-MM-dd-HHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,6));
                Directory.CreateDirectory(batch);
                string destination=Path.Combine(batch,"Profile-"+Path.GetFileName(folder));
                Directory.Move(folder,destination);
                lock(diskScanTargets)diskScanTargets.Remove(folder);
                SendToWeb(new {type="disk-folder-action",success=true,message="Le cache a été placé en quarantaine et reste récupérable.",path=folder});
                SendQuarantineState();
            }
            catch(Exception ex){SendToWeb(new {type="disk-folder-action",success=false,message=ex.Message,path=folder});}
        });
    }

    void RunUpdate(Dictionary<string, object> payload)
    {
        var packages=ReadArray(payload,"packages").Where(x=>IsValidPackageId(x)).Distinct().Take(100).ToArray();
        // Paquets que l'interface a marqués « géré par l'éditeur » ou « version
        // installée inconnue » : un échec winget n'est pas compté comme tel.
        var lenientPackages=new HashSet<string>(ReadArray(payload,"lenient").Where(x=>IsValidPackageId(x)),StringComparer.OrdinalIgnoreCase);
        if(updateRunning) throw new InvalidOperationException("Une mise à jour est déjà en cours.");
        if(installationRunning || uninstallRunning || repairRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        updateRunning=true;
        SendToWeb(new { type="update-start", total=packages.Length });
        Task.Run(delegate {
            var report=new StringBuilder();
            string logName="PC-Setup-Mise-a-jour-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            int failed=0, lastCode=0, failedCode=0;
            string lastOutput="",failedOutput="";
            var failedItems=new List<Dictionary<string,object>>();
            var remaining=new List<Dictionary<string,object>>();
            var selfManagedItems=new List<Dictionary<string,object>>();
            bool windowsStarted=false;
            int windowsUpdateCount=-1,windowsDriverCount=0;
            try
            {
                report.AppendLine("OWLSETUP - RAPPORT DE MISE A JOUR");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                report.AppendLine();
                SendToWeb(new { type="update-stage", stage="sources", percent=10, title="Actualisation des sources", detail="Connexion au catalogue WinGet" });
                RunWingetCli("source update --disable-interactivity",report);

                for(int i=0;i<packages.Length;i++)
                {
                    string id=packages[i];
                    int percent=20+(int)Math.Round(i*58.0/Math.Max(packages.Length,1));
                    SendToWeb(new { type="update-stage", stage="applications", percent=percent, title="Mise à jour de "+id, detail=(i+1)+" / "+packages.Length+" application(s)" });
                    report.AppendLine();report.AppendLine("===== "+id+" =====");
                    int itemStart=report.Length;
                    lastCode=RunWingetCli("upgrade --id \""+id+"\" --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity",report);
                    lastOutput=report.ToString(itemStart,report.Length-itemStart);
                    if(IsNoApplicableUpdateCode(lastCode))
                    {
                        report.AppendLine("Résultat validé : aucune mise à jour applicable, le logiciel est déjà à jour.");
                        lastCode=0;
                    }
                    if(lastCode!=0 && (SelfManagedUpdaters.Contains(id) || lenientPackages.Contains(id)))
                    {
                        report.AppendLine("Logiciel à mise à jour intégrée : WinGet ne peut pas la piloter. Ouvrez l'application pour qu'elle se mette à jour elle-même.");
                        selfManagedItems.Add(new Dictionary<string,object>{{"id",id},{"name",LoadApplicationName(id)}});
                        lastCode=0;
                    }
                    if(lastCode!=0)
                    {
                        failed++;failedCode=lastCode;failedOutput=lastOutput;
                        failedItems.Add(new Dictionary<string,object>{{"id",id},{"name",LoadApplicationName(id)},{"code",lastCode},{"kind",ClassifyWingetFailure(lastCode,lastOutput)},{"message",ExplainWingetFailure(lastCode,lastOutput,"mise a jour")}});
                    }
                }

                SendToWeb(new { type="update-stage", stage="applications", percent=80, title="Vérification des applications", detail="Contrôle des versions après installation" });
                var selectedIds=new HashSet<string>(packages,StringComparer.OrdinalIgnoreCase);
                var stillProposed=QueryAvailableUpdates().Where(item=>selectedIds.Contains(Convert.ToString(item["id"]))).ToList();
                foreach(var item in stillProposed)
                {
                    bool selfManaged=Convert.ToBoolean(item["selfManaged"]) || SelfManagedUpdaters.Contains(Convert.ToString(item["id"]));
                    if(selfManaged)
                    {
                        if(!selfManagedItems.Any(x=>String.Equals(Convert.ToString(x["id"]),Convert.ToString(item["id"]),StringComparison.OrdinalIgnoreCase)))
                            selfManagedItems.Add(new Dictionary<string,object>{{"id",item["id"]},{"name",item["name"]}});
                    }
                    else remaining.Add(item);
                }
                if(stillProposed.Count>0)
                {
                    report.AppendLine();
                    report.AppendLine("ENCORE PROPOSEES PAR WINGET : "+String.Join(", ",stillProposed.Select(item=>Convert.ToString(item["id"]))));
                }
                if(selfManagedItems.Count>0)
                {
                    report.AppendLine("A MISE A JOUR INTEGREE (ouvrir le logiciel pour finaliser) : "+String.Join(", ",selfManagedItems.Select(item=>Convert.ToString(item["id"]))));
                }

                SendToWeb(new { type="update-stage", stage="windows", percent=84, title="Analyse de Windows Update", detail="Recherche des composants et pilotes proposés par Microsoft" });
                try
                {
                    string wuWarning;bool wuDone;
                    var wuList=SearchWindowsUpdates(report,out wuWarning,out wuDone);
                    if(wuDone)
                    {
                        windowsUpdateCount=wuList.Count;
                        windowsDriverCount=wuList.Count(u=>Convert.ToString(u["kind"])=="driver");
                    }
                }
                catch(Exception wuEx){report.AppendLine();report.AppendLine("Analyse Windows Update impossible : "+wuEx.Message);}
                string wuDetail=windowsUpdateCount<0?"Ouverture de Windows Update"
                    :windowsUpdateCount==0?"Aucune mise à jour Windows en attente"
                    :windowsUpdateCount+" mise(s) à jour Windows en attente"+(windowsDriverCount>0?" (dont "+windowsDriverCount+" pilote(s))":"");
                SendToWeb(new { type="update-stage", stage="windows", percent=90, title="Windows Update", detail=wuDetail });
                windowsStarted=TriggerWindowsUpdate(report);
            }
            catch(Exception ex)
            {
                failed++;
                report.AppendLine(); report.AppendLine("ERREUR : "+ex.Message);
            }
            finally
            {
                bool appsSuccess=failed==0 && remaining.Count==0;
                bool success=appsSuccess && windowsStarted;
                string errorMessage="";
                string selfManagedMessage="";
                if(selfManagedItems.Count>0)
                {
                    string selfNames=String.Join(", ",selfManagedItems.Select(item=>Convert.ToString(item["name"])).Distinct().ToArray());
                    selfManagedMessage=selfNames+(selfManagedItems.Count>1?" se mettent à jour ":" se met à jour ")+
                        "toute seule à son lancement. Ouvrez l'application une fois pour finaliser : elle ne sera plus proposée ensuite.";
                }
                if(failed>0)
                {
                    string failedNames=String.Join(", ",failedItems.Select(item=>Convert.ToString(item["name"])).Distinct().ToArray());
                    errorMessage=ExplainWingetFailure(failedCode,failedOutput,"mise a jour");
                    if(!String.IsNullOrWhiteSpace(failedNames))errorMessage=failedNames+" : "+errorMessage;
                }
                else if(remaining.Count>0)
                {
                    bool edgePending=remaining.Any(item=>String.Equals(Convert.ToString(item["id"]),"Microsoft.Edge",StringComparison.OrdinalIgnoreCase));
                    string names=String.Join(", ",remaining.Select(item=>Convert.ToString(item["name"])).ToArray());
                    errorMessage=edgePending?"Microsoft Edge est encore proposé. Fermez toutes les fenêtres Edge, attendez quelques secondes puis relancez la mise à jour.":"Toujours proposé après installation : "+names+". Fermez les applications concernées puis relancez la mise à jour.";
                }
                try { File.WriteAllText(logPath,report.ToString(),Encoding.UTF8); } catch { }
                updateRunning=false;
                SendToWeb(new { type="update-complete", success=success, appsSuccess=appsSuccess, windowsStarted=windowsStarted, windowsUpdateCount=windowsUpdateCount, windowsDriverCount=windowsDriverCount, pendingCount=remaining.Count, code=appsSuccess?lastCode:failedCode, errorMessage=errorMessage, failureKind=failedItems.Count>0?Convert.ToString(failedItems[0]["kind"]):"", failedItems=failedItems.ToArray(), selfManagedItems=selfManagedItems.ToArray(), selfManagedMessage=selfManagedMessage, logName=logName });
            }
        });
    }

    bool TriggerWindowsUpdate(StringBuilder report)
    {
        object instance=null;
        try
        {
            Type type=Type.GetTypeFromProgID("Microsoft.Update.AutoUpdate");
            if(type==null) throw new InvalidOperationException("Service Windows Update indisponible.");
            instance=Activator.CreateInstance(type);
            type.InvokeMember("DetectNow",BindingFlags.InvokeMethod,null,instance,null);
            report.AppendLine(); report.AppendLine("Recherche Windows Update déclenchée.");
            return true;
        }
        catch(Exception ex)
        {
            report.AppendLine(); report.AppendLine("Windows Update : "+ex.Message);
            return false;
        }
        finally
        {
            if(instance!=null && Marshal.IsComObject(instance)) try { Marshal.FinalReleaseComObject(instance); } catch { }
        }
    }

    // Inventaire Windows Update via l'API WUA (Microsoft.Update.Session), en
    // LECTURE SEULE : ne télécharge ni n'installe rien. La recherche WUA peut
    // durer de 10 s à 2 min et nécessite Internet ; à n'appeler que sur action
    // explicite de l'utilisateur. Chaque mise à jour est émise sur une ligne
    // « PCSETUP_WU_ITEM|{json} », suivie de « PCSETUP_WU_END|ok|<n> » ou
    // « PCSETUP_WU_END|error|<message> ».
    List<Dictionary<string,object>> SearchWindowsUpdates(StringBuilder report,out string warning,out bool completed)
    {
        warning=null;completed=false;
        var updates=new List<Dictionary<string,object>>();
        // La sortie est forcée en ASCII pur (échappement \uXXXX) : PowerShell 5.1
        // n'écrit pas de l'UTF-8 fiable sur un flux redirigé, or les titres de
        // mises à jour contiennent des accents. JavaScriptSerializer redécode
        // les \uXXXX correctement côté hôte.
        string script="$ErrorActionPreference='Stop';"+
            "function Out-Ascii($p){ $b=New-Object System.Text.StringBuilder; foreach($ch in $p.ToCharArray()){ if([int]$ch -lt 128){ [void]$b.Append($ch) } else { [void]$b.AppendFormat('\\u{0:x4}',[int]$ch) } }; [Console]::Out.WriteLine($b.ToString()) }"+
            "try{"+
            "$s=New-Object -ComObject Microsoft.Update.Session;"+
            "$searcher=$s.CreateUpdateSearcher();"+
            "$r=$searcher.Search('IsInstalled=0 AND IsHidden=0');"+
            "foreach($u in $r.Updates){"+
            "$drv=$false; foreach($c in $u.Categories){ if($c.Name -eq 'Drivers'){ $drv=$true } };"+
            "$kb=@(); foreach($k in $u.KBArticleIDs){ $kb+=('KB'+$k) };"+
            "$o=[ordered]@{ updateId=[string]$u.Identity.UpdateID; title=[string]$u.Title; kb=($kb -join ','); kind=$(if($drv){'driver'}else{'software'}); bytes=[int64]$u.MaxDownloadSize; downloaded=[bool]$u.IsDownloaded; severity=[string]$u.MsrcSeverity; mandatory=[bool]$u.IsMandatory; browseOnly=[bool]$u.BrowseOnly };"+
            "Out-Ascii ('PCSETUP_WU_ITEM|'+($o | ConvertTo-Json -Compress)); };"+
            "Out-Ascii ('PCSETUP_WU_END|ok|'+$r.Updates.Count);"+
            "}catch{ Out-Ascii ('PCSETUP_WU_END|error|'+$_.Exception.Message); }";
        string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
        var raw=new StringBuilder();
        RunHiddenProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,raw);
        report.Append(raw.ToString());
        foreach(string line in raw.ToString().Split(new[]{"\r\n","\r","\n"},StringSplitOptions.RemoveEmptyEntries))
        {
            if(line.StartsWith("PCSETUP_WU_ITEM|",StringComparison.Ordinal))
            {
                try
                {
                    var item=json.DeserializeObject(line.Substring("PCSETUP_WU_ITEM|".Length)) as Dictionary<string,object>;
                    if(item==null)continue;
                    string title=Convert.ToString(item.ContainsKey("title")?item["title"]:"").Trim();
                    if(title.Length==0)continue;
                    long bytes=0;try{bytes=Convert.ToInt64(item.ContainsKey("bytes")?item["bytes"]:0);}catch{}
                    string updateId=Convert.ToString(item.ContainsKey("updateId")?item["updateId"]:"").Trim();
                    if(!Regex.IsMatch(updateId,@"^[0-9a-fA-F-]{36}$"))updateId="";
                    updates.Add(new Dictionary<string,object>
                    {
                        {"updateId",updateId},
                        {"title",title},
                        {"kb",Convert.ToString(item.ContainsKey("kb")?item["kb"]:"")},
                        {"kind",Convert.ToString(item.ContainsKey("kind")?item["kind"]:"software")=="driver"?"driver":"software"},
                        {"bytes",bytes},
                        {"downloaded",item.ContainsKey("downloaded") && Convert.ToBoolean(item["downloaded"])},
                        {"severity",Convert.ToString(item.ContainsKey("severity")?item["severity"]:"")},
                        {"mandatory",item.ContainsKey("mandatory") && Convert.ToBoolean(item["mandatory"])},
                        // BrowseOnly : mise à jour optionnelle / préversion « seeker ».
                        // WUA la renvoie mais son installation réelle passe par
                        // l'orchestrateur de Windows Update, pas par IUpdateInstaller.
                        {"browseOnly",item.ContainsKey("browseOnly") && Convert.ToBoolean(item["browseOnly"])}
                    });
                }
                catch{}
            }
            else if(line.StartsWith("PCSETUP_WU_END|",StringComparison.Ordinal))
            {
                string[] parts=line.Split('|');
                if(parts.Length>=2 && parts[1]=="ok")completed=true;
                else if(parts.Length>=3 && parts[1]=="error")warning=parts[2];
            }
        }
        if(!completed && String.IsNullOrEmpty(warning))warning="La recherche Windows Update ne s'est pas terminée.";
        return updates;
    }

    void ScanWindowsUpdates()
    {
        if(windowsUpdatesScanning)return;
        windowsUpdatesScanning=true;
        SendToWeb(new { type="windows-updates-scanning" });
        Task.Run(delegate {
            var report=new StringBuilder();
            var updates=new List<Dictionary<string,object>>();
            string warning=null;bool completed=false;
            try { updates=SearchWindowsUpdates(report,out warning,out completed); }
            catch(Exception ex) { warning=ex.Message; }
            finally
            {
                windowsUpdatesScanning=false;
                int drivers=updates.Count(u=>Convert.ToString(u["kind"])=="driver");
                SendToWeb(new {
                    type="windows-updates",
                    updates=updates.ToArray(),
                    count=updates.Count,
                    driverCount=drivers,
                    softwareCount=updates.Count-drivers,
                    completed=completed,
                    warning=warning ?? "",
                    checkedAt=DateTime.Now.ToString("HH:mm")
                });
            }
        });
    }

    void OpenWindowsUpdateSettings()
    {
        try { Process.Start(new ProcessStartInfo("ms-settings:windowsupdate"){UseShellExecute=true}); }
        catch(Exception ex)
        {
            SendToWeb(new { type="windows-update-open-failed", message=ex.Message });
        }
    }

    // Télécharge et installe une sélection de mises à jour Windows via l'API WUA,
    // avec élévation (relance UAC). L'écriture réelle est déléguée à un script
    // PowerShell élevé qui journalise chaque résultat dans un fichier repris
    // ensuite par ce processus (mêmes contraintes que le nettoyage élevé :
    // RunElevatedProcess ne capture pas la sortie standard).
    void InstallWindowsUpdates(Dictionary<string,object> payload)
    {
        if(windowsUpdateInstalling)throw new InvalidOperationException("Une installation Windows Update est déjà en cours.");
        if(installationRunning || uninstallRunning || repairRunning || updateRunning || cleanupRunning)
            throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        var ids=ReadArray(payload,"updateIds")
            .Select(value=>Convert.ToString(value).Trim())
            .Where(value=>Regex.IsMatch(value,@"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(100)
            .ToArray();
        if(ids.Length==0)throw new InvalidOperationException("Aucune mise à jour Windows valide n'est sélectionnée.");

        windowsUpdateInstalling=true;
        SendToWeb(new { type="windows-update-install-start", total=ids.Length });
        Task.Run(delegate {
            var report=new StringBuilder();
            string logName="PC-Setup-Windows-Update-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            string resultName="wu-result-"+Guid.NewGuid().ToString("N")+".txt";
            string resultPath=Path.Combine(GetDataFolder("Logs"),resultName);
            int code=-1;bool rebootRequired=false;string warning=null;
            var items=new List<Dictionary<string,object>>();
            try
            {
                string idArray=String.Join(",",ids.Select(id=>"'"+id+"'").ToArray());
                string safeResult=resultPath.Replace("'","''");
                string script="$ErrorActionPreference='Stop';"+
                    "$ids=@("+idArray+");"+
                    "$log='"+safeResult+"';"+
                    "function W($t){ Add-Content -LiteralPath $log -Value $t -Encoding UTF8 }"+
                    "try{"+
                    "$s=New-Object -ComObject Microsoft.Update.Session;"+
                    "$searcher=$s.CreateUpdateSearcher();"+
                    "$r=$searcher.Search('IsInstalled=0 AND IsHidden=0');"+
                    "$coll=New-Object -ComObject Microsoft.Update.UpdateColl;"+
                    "$skipped=0;"+
                    // BrowseOnly = préversion/optionnelle « seeker » : IUpdateInstaller
                    // ne la pilote pas réellement, on ne l'ajoute pas.
                    "foreach($u in $r.Updates){ if($ids -contains [string]$u.Identity.UpdateID){ if($u.BrowseOnly){ $skipped++; continue }; if(-not $u.EulaAccepted){ try{ $u.AcceptEula() }catch{} }; [void]$coll.Add($u) } };"+
                    "if($coll.Count -eq 0){ if($skipped -gt 0){ W 'PCSETUP_WUI_END|error|Mise a jour optionnelle : installez-la depuis Windows Update.' } else { W 'PCSETUP_WUI_END|error|Aucune des mises a jour selectionnees n''a ete retrouvee.' }; exit 2 };"+
                    "$dl=$s.CreateUpdateDownloader(); $dl.Updates=$coll; [void]$dl.Download();"+
                    "$inst=$s.CreateUpdateInstaller(); $inst.Updates=$coll; $ir=$inst.Install();"+
                    "for($i=0;$i -lt $coll.Count;$i++){ $u=$coll.Item($i); $res=$ir.GetUpdateResult($i); $done=$false; try{ $done=[bool]$u.IsInstalled }catch{}; $o=@{ updateId=[string]$u.Identity.UpdateID; hresult=[int]$res.HResult; resultCode=[int]$res.ResultCode; installedNow=$done } | ConvertTo-Json -Compress; W ('PCSETUP_WUI_ITEM|'+$o) };"+
                    "$sysReboot=$false; try{ $sysReboot=[bool](New-Object -ComObject Microsoft.Update.SystemInfo).RebootRequired }catch{};"+
                    "$regReboot=Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired';"+
                    "$reboot=([bool]$ir.RebootRequired -or $sysReboot -or $regReboot);"+
                    "W ('PCSETUP_WUI_END|ok|reboot='+[int]$reboot+'|installed='+$coll.Count);"+
                    "if($reboot){ exit 3010 } else { exit 0 };"+
                    "}catch{ W ('PCSETUP_WUI_END|error|'+$_.Exception.Message); exit 1 }";
                string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
                SendToWeb(new { type="windows-update-install-stage", percent=30, status="Autorisation Windows puis téléchargement..." });
                code=RunElevatedProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,report);
                SendToWeb(new { type="windows-update-install-stage", percent=85, status="Lecture du résultat..." });

                if(File.Exists(resultPath))
                {
                    string contents=File.ReadAllText(resultPath,Encoding.UTF8);
                    report.AppendLine(contents);
                    var rawItems=new List<Dictionary<string,object>>();
                    foreach(string line in contents.Split(new[]{"\r\n","\r","\n"},StringSplitOptions.RemoveEmptyEntries))
                    {
                        if(line.StartsWith("PCSETUP_WUI_ITEM|",StringComparison.Ordinal))
                        {
                            try
                            {
                                var raw=json.DeserializeObject(line.Substring("PCSETUP_WUI_ITEM|".Length)) as Dictionary<string,object>;
                                if(raw!=null)rawItems.Add(raw);
                            }
                            catch{}
                        }
                        else if(line.StartsWith("PCSETUP_WUI_END|",StringComparison.Ordinal))
                        {
                            string[] parts=line.Split('|');
                            if(parts.Length>=2 && parts[1]=="error")warning=parts.Length>=3?parts[2]:"Échec de l'installation Windows Update.";
                            foreach(string seg in parts)
                                if(seg.StartsWith("reboot=",StringComparison.Ordinal))rebootRequired=seg=="reboot=1";
                        }
                    }
                    foreach(var raw in rawItems)
                    {
                        int resultCode=0;try{resultCode=Convert.ToInt32(raw.ContainsKey("resultCode")?raw["resultCode"]:0);}catch{}
                        int hresult=0;try{hresult=Convert.ToInt32(raw.ContainsKey("hresult")?raw["hresult"]:0);}catch{}
                        bool installedNow=raw.ContainsKey("installedNow") && Convert.ToBoolean(raw["installedNow"]);
                        // resultCode 2 = succès annoncé. Pour les cumulatives/préversions,
                        // Windows peut l'annoncer sans rien appliquer : on n'accepte le
                        // succès que si la mise à jour est vraiment installée OU si un
                        // redémarrage est en attente pour la finaliser.
                        bool applied=resultCode==2 && (installedNow || rebootRequired);
                        bool notApplied=resultCode==2 && !installedNow && !rebootRequired;
                        items.Add(new Dictionary<string,object>
                        {
                            {"updateId",Convert.ToString(raw.ContainsKey("updateId")?raw["updateId"]:"")},
                            {"ok",applied},
                            {"partial",resultCode==3},
                            {"notApplied",notApplied},
                            {"resultCode",resultCode},
                            {"hresult",hresult}
                        });
                    }
                    if(String.IsNullOrEmpty(warning) && items.Count>0 && items.All(x=>Convert.ToBoolean(x["notApplied"])))
                        warning="Windows a signalé un succès mais la mise à jour n'est pas appliquée. Installez-la depuis Windows Update.";
                }
                else if(code==1223)warning="Autorisation administrateur refusée : l'installation Windows Update n'a pas démarré.";
                else warning="Windows n'a pas produit de résultat. Ouvrez Windows Update pour installer ces mises à jour.";
            }
            catch(Exception ex){warning=ex.Message;}
            finally
            {
                try{if(File.Exists(resultPath))File.Delete(resultPath);}catch{}
                try{File.WriteAllText(logPath,report.ToString(),Encoding.UTF8);}catch{}
                windowsUpdateInstalling=false;
                int installed=items.Count(x=>Convert.ToBoolean(x["ok"]));
                int notApplied=items.Count(x=>Convert.ToBoolean(x["notApplied"]));
                int failed=items.Count-installed;
                bool success=String.IsNullOrEmpty(warning) && failed==0 && installed>0;
                SendToWeb(new {
                    type="windows-update-install-complete",
                    success=success,
                    installed=installed,
                    failed=failed,
                    notApplied=notApplied,
                    rebootRequired=rebootRequired,
                    items=items.ToArray(),
                    warning=warning ?? "",
                    code=code,
                    logName=logName
                });
            }
        });
    }

    List<Dictionary<string,object>> QueryAvailableUpdates()
    {
        var report=new StringBuilder();
        // --include-unknown : ne pas masquer les paquets dont WinGet ne connaît
        // pas la version installée (jeux, lanceurs, installeurs maison). Aligné
        // sur ce que ferait « winget upgrade --all ».
        RunWingetCli("upgrade --include-unknown --accept-source-agreements --disable-interactivity",report);
        var results=new List<Dictionary<string,object>>();
        var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(var row in ParseWingetTable(report.ToString()))
        {
            string name=row.ContainsKey("name")?row["name"]:"";
            string id=row.ContainsKey("id")?row["id"]:"";
            string current=row.ContainsKey("version")?row["version"]:"";
            string available=row.ContainsKey("available")?row["available"]:"";
            if(!IsValidPackageId(id) || !Regex.IsMatch(available,"[0-9]") || !seen.Add(id))continue;
            bool unknownVersion=!Regex.IsMatch(current,"[0-9]");
            if(unknownVersion)current="inconnue";
            // Version installée inconnue = même traitement prudent que les
            // lanceurs auto-updatés : WinGet la reproposera peut-être en boucle.
            bool selfManaged=unknownVersion || IsSelfManagedUpdate(id,current,available);
            results.Add(new Dictionary<string,object>{{"name",name},{"id",id},{"current",current},{"available",available},{"selfManaged",selfManaged},{"unknownVersion",unknownVersion}});
        }
        return results;
    }

    void ScanUpdates()
    {
        if(updatesScanning)return;
        updatesScanning=true;
        SendToWeb(new { type="updates-scanning" });
        Task.Run(delegate {
            var updates=new List<Dictionary<string,object>>();
            string error=null;
            try { updates=QueryAvailableUpdates(); }
            catch(Exception ex) { error=ex.Message; }
            finally
            {
                updatesScanning=false;
                SendToWeb(new { type="updates-found", updates=updates.ToArray(), error=error });
            }
        });
    }

    void ScanHealth()
    {
        if(healthScanning)return;
        healthScanning=true;
        SendToWeb(new { type="health-scanning" });
        Task.Run(delegate {
            double freeGb=0,totalGb=0,freePercent=0;
            bool restart=false;
            int quarantine=0;
            var updates=new List<Dictionary<string,object>>();
            string error=null;
            try
            {
                var drive=new DriveInfo(Path.GetPathRoot(Environment.SystemDirectory));
                totalGb=Math.Round(drive.TotalSize/1073741824.0,1);
                freeGb=Math.Round(drive.AvailableFreeSpace/1073741824.0,1);
                freePercent=drive.TotalSize>0?Math.Round(drive.AvailableFreeSpace*100.0/drive.TotalSize):0;
                restart=IsRestartPending();
                quarantine=BuildQuarantineItems().Count;
                updates=QueryAvailableUpdates();
            }
            catch(Exception ex) { error=ex.Message; }
            int updatePenalty=Math.Min(32,updates.Count*4);
            int diskPenalty=freePercent<10?25:(freePercent<20?12:0);
            int restartPenalty=restart?8:0;
            int scanPenalty=error!=null?35:0;
            int score=100-updatePenalty-diskPenalty-restartPenalty-scanPenalty;
            score=Math.Max(20,Math.Min(100,score));
            healthScanning=false;
            SendToWeb(new { type="updates-found", updates=updates.ToArray(), error=error });
            SendToWeb(new { type="health-state", score=score, freeGb=freeGb, totalGb=totalGb, freePercent=freePercent, updateCount=updates.Count, pendingRestart=restart, quarantineCount=quarantine, error=error, deductions=new { updates=updatePenalty, disk=diskPenalty, restart=restartPenalty, scan=scanPenalty } });
        });
    }

    bool IsRestartPending()
    {
        return !String.IsNullOrEmpty(GetRestartReason());
    }

    string GetRestartReason()
    {
        try
        {
            using(var key=Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending"))if(key!=null)return "Maintenance Windows en attente";
            using(var key=Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired"))if(key!=null)return "Windows Update en attente";
            using(var key=Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\Session Manager"))if(key!=null && key.GetValue("PendingFileRenameOperations")!=null)return "Remplacement de fichiers en attente";
        }
        catch { }
        return "";
    }

    static string GetDataFolder(string name)
    {
        string folder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"PCSetup",name);
        Directory.CreateDirectory(folder);
        return folder;
    }

    List<Dictionary<string,object>> BuildQuarantineItems()
    {
        var items=new List<Dictionary<string,object>>();
        string quarantineRoot=GetDataFolder("Quarantine");
        foreach(string batchPath in Directory.GetDirectories(quarantineRoot,"PC-Setup-Quarantaine-*",SearchOption.TopDirectoryOnly))
        {
            if(IsReparsePoint(batchPath))continue;
            foreach(string itemPath in Directory.GetDirectories(batchPath,"*",SearchOption.TopDirectoryOnly))
            {
                if(IsReparsePoint(itemPath))continue;
                var info=new DirectoryInfo(itemPath);
                long bytes,files;MeasurePath(itemPath,out bytes,out files);
                int ageDays=(int)Math.Max(0,(DateTime.Now-info.LastWriteTime).TotalDays);
                items.Add(new Dictionary<string,object>{
                    {"batch",Path.GetFileName(batchPath)},{"item",info.Name},
                    {"modified",info.LastWriteTime.ToString("g")},{"modifiedSort",info.LastWriteTime.ToString("o")},
                    {"ageDays",ageDays},{"bytes",bytes},{"size",FormatBytes(bytes)},{"partial",lastMeasureTruncated}});
            }
        }
        // Tri par date réelle (la chaîne "o" ISO-8601 se trie correctement,
        // contrairement au format court local utilisé auparavant).
        return items.OrderByDescending(x=>Convert.ToString(x["modifiedSort"])).ToList();
    }

    void PurgeOldQuarantine(Dictionary<string,object> payload)
    {
        int days=30;
        if(payload!=null&&payload.ContainsKey("days"))Int32.TryParse(Convert.ToString(payload["days"]),out days);
        if(!new[]{7,30,90}.Contains(days))days=30;
        Task.Run(delegate {
            int removed=0;
            try
            {
                string quarantineRoot=Path.GetFullPath(GetDataFolder("Quarantine"))+Path.DirectorySeparatorChar;
                DateTime cutoff=DateTime.Now.AddDays(-days);
                foreach(string batchPath in Directory.GetDirectories(quarantineRoot,"PC-Setup-Quarantaine-*",SearchOption.TopDirectoryOnly))
                {
                    if(IsReparsePoint(batchPath)||!batchPath.StartsWith(quarantineRoot,StringComparison.OrdinalIgnoreCase))continue;
                    foreach(string itemPath in Directory.GetDirectories(batchPath,"*",SearchOption.TopDirectoryOnly))
                    {
                        if(IsReparsePoint(itemPath))continue;
                        if(new DirectoryInfo(itemPath).LastWriteTime>=cutoff)continue;
                        try{EnsureNoReparsePoints(itemPath,quarantineRoot);if(ForceDeleteDirectory(itemPath)==0)removed++;}catch{}
                    }
                    try{if(!Directory.EnumerateFileSystemEntries(batchPath).Any())ForceDeleteDirectory(batchPath);}catch{}
                }
                SendToWeb(new{type="quarantine-action",success=true,action="purge",message=removed>0?removed+" élément(s) de plus de "+days+" jours supprimé(s) définitivement.":"Aucun élément de plus de "+days+" jours à supprimer."});
            }
            catch(Exception ex){SendToWeb(new{type="quarantine-action",success=false,action="purge",message=ex.Message});}
            SendQuarantineState();
        });
    }

    void SendQuarantineState()
    {
        Task.Run(delegate {
            try { SendToWeb(new { type="quarantine-state", items=BuildQuarantineItems().ToArray() }); }
            catch(Exception ex) { SendToWeb(new { type="quarantine-error", error=ex.Message }); }
        });
    }

    string GetQuarantineItem(Dictionary<string,object> payload,out string batchPath)
    {
        string batch=payload!=null && payload.ContainsKey("batch")?Convert.ToString(payload["batch"]):"";
        string item=payload!=null && payload.ContainsKey("item")?Convert.ToString(payload["item"]):"";
        if(Path.GetFileName(batch)!=batch || Path.GetFileName(item)!=item || !batch.StartsWith("PC-Setup-Quarantaine-",StringComparison.Ordinal))throw new InvalidOperationException("Élément de quarantaine invalide.");
        string quarantineRoot=Path.GetFullPath(GetDataFolder("Quarantine"))+Path.DirectorySeparatorChar;
        batchPath=Path.GetFullPath(Path.Combine(quarantineRoot,batch));
        string itemPath=Path.GetFullPath(Path.Combine(batchPath,item));
        if(!batchPath.StartsWith(quarantineRoot,StringComparison.OrdinalIgnoreCase) || !itemPath.StartsWith(batchPath+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase) || !Directory.Exists(itemPath))throw new InvalidOperationException("Élément de quarantaine introuvable.");
        EnsureNoReparsePoints(batchPath,quarantineRoot);
        EnsureNoReparsePoints(itemPath,quarantineRoot);
        return itemPath;
    }

    void RestoreQuarantine(Dictionary<string,object> payload)
    {
        Task.Run(delegate {
            try
            {
                string batchPath;
                string itemPath=GetQuarantineItem(payload,out batchPath);
                string item=Path.GetFileName(itemPath),folderName=null,root=null;
                if(item.StartsWith("Profile-",StringComparison.OrdinalIgnoreCase)){root=Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);folderName=item.Substring(8);}
                else if(item.StartsWith("Local-",StringComparison.OrdinalIgnoreCase)){root=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);folderName=item.Substring(6);}
                else if(item.StartsWith("Roaming-",StringComparison.OrdinalIgnoreCase)){root=Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);folderName=item.Substring(8);}
                else if(item.StartsWith("ProgramData-",StringComparison.OrdinalIgnoreCase)){root=Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);folderName=item.Substring(12);}
                else throw new InvalidOperationException("Emplacement d'origine inconnu.");
                string destination=Path.Combine(root,folderName);
                EnsureNoReparsePoints(root,root);
                if(Directory.Exists(destination))throw new IOException("Un dossier portant ce nom existe déjà à l'emplacement d'origine.");
                bool moved=false;
                try{Directory.Move(itemPath,destination);moved=true;}
                catch(PathTooLongException){}
                catch(DirectoryNotFoundException){}
                catch(IOException){}
                if(!moved)
                {
                    // Chemins profonds : robocopy /MOVE gère nativement les > 260.
                    Directory.CreateDirectory(destination);
                    using(var process=Process.Start(new ProcessStartInfo("robocopy.exe","\""+itemPath+"\" \""+destination+"\" /E /MOVE /NFL /NDL /NJH /NJS /R:1 /W:1"){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden}))
                    {
                        if(process!=null)process.WaitForExit(120000);
                        if(process==null||process.ExitCode>=8)throw new IOException("La restauration n'a pas pu déplacer tous les fichiers (dossier profond ou fichier verrouillé).");
                    }
                    ForceDeleteDirectory(itemPath);
                }
                try{if(!Directory.EnumerateFileSystemEntries(batchPath).Any())ForceDeleteDirectory(batchPath);}catch{}
                SendToWeb(new { type="quarantine-action", success=true, action="restore", message="Dossier restauré : "+destination });
            }
            catch(Exception ex){SendToWeb(new { type="quarantine-action", success=false, action="restore", message=ex.Message });}
            SendQuarantineState();
        });
    }

    void DeleteQuarantine(Dictionary<string,object> payload)
    {
        Task.Run(delegate {
            try
            {
                string batchPath;
                string itemPath=GetQuarantineItem(payload,out batchPath);
                int failures=ForceDeleteDirectory(itemPath);
                if(failures>0)
                {
                    SendToWeb(new { type="quarantine-action", success=false, action="delete", message=failures+" fichier(s) n'ont pas pu être supprimés : l'application concernée est peut-être ouverte. Fermez-la (CapCut, jeu, éditeur…) puis réessayez." });
                }
                else
                {
                    try{if(!Directory.EnumerateFileSystemEntries(batchPath).Any())ForceDeleteDirectory(batchPath);}catch{}
                    SendToWeb(new { type="quarantine-action", success=true, action="delete", message="Élément supprimé définitivement." });
                }
            }
            catch(Exception ex){SendToWeb(new { type="quarantine-action", success=false, action="delete", message=ex.Message });}
            SendQuarantineState();
        });
    }

    Dictionary<string,object> GetLatestRelease()
    {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        using(var client=new WebClient())
        {
            client.Headers[HttpRequestHeader.UserAgent]="OwlSetup/"+Assembly.GetExecutingAssembly().GetName().Version;
            client.Headers[HttpRequestHeader.Accept]="application/vnd.github+json";
            string content=client.DownloadString("https://api.github.com/repos/OwlNetGeekFR/OwlSetup/releases/latest");
            var release=json.DeserializeObject(content) as Dictionary<string,object>;
            if(release==null)throw new InvalidDataException("Réponse GitHub invalide.");
            return release;
        }
    }

    // Canal de mise a jour. includePrerelease=false : /releases/latest (stables
    // uniquement, comportement historique). includePrerelease=true : on liste
    // /releases et on retient le tag le plus recent selon CompareAppVersions
    // (les preversions -beta.N sont donc prises en compte).
    Dictionary<string,object> GetLatestRelease(bool includePrerelease)
    {
        if(!includePrerelease)return GetLatestRelease();
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        using(var client=new WebClient())
        {
            client.Headers[HttpRequestHeader.UserAgent]="OwlSetup/"+Assembly.GetExecutingAssembly().GetName().Version;
            client.Headers[HttpRequestHeader.Accept]="application/vnd.github+json";
            string content=client.DownloadString("https://api.github.com/repos/OwlNetGeekFR/OwlSetup/releases?per_page=30");
            var list=json.DeserializeObject(content) as object[];
            Dictionary<string,object> best=null;
            string bestTag=null;
            if(list!=null)
            {
                foreach(var item in list)
                {
                    var rel=item as Dictionary<string,object>;
                    if(rel==null)continue;
                    if(rel.ContainsKey("draft") && Convert.ToBoolean(rel["draft"]))continue;
                    string tag=rel.ContainsKey("tag_name")?Convert.ToString(rel["tag_name"]):"";
                    if(tag!=null && tag.StartsWith("v",StringComparison.OrdinalIgnoreCase))tag=tag.Substring(1);
                    if(ParseAppVersion(tag)==null)continue;
                    if(bestTag==null || CompareAppVersions(bestTag,tag)<0){best=rel;bestTag=tag;}
                }
            }
            if(best==null)throw new InvalidDataException("Aucune Release exploitable n'a été trouvée.");
            return best;
        }
    }

    Dictionary<string,object> FindReleaseAsset(Dictionary<string,object> release,string name)
    {
        if(!release.ContainsKey("assets"))return null;
        IEnumerable<object> assets=Enumerable.Empty<object>();
        var array=release["assets"] as object[];
        if(array!=null)assets=array;
        var list=release["assets"] as ArrayList;
        if(list!=null)assets=list.Cast<object>();
        return assets.Select(x=>x as Dictionary<string,object>).FirstOrDefault(x=>x!=null && x.ContainsKey("name") && String.Equals(Convert.ToString(x["name"]),name,StringComparison.OrdinalIgnoreCase));
    }

    string ReadAssetHash(string hashText,string assetName)
    {
        string pattern="(?im)^\\s*([0-9a-f]{64})\\s+\\*?"+Regex.Escape(assetName)+"\\s*$";
        Match match=Regex.Match(hashText,pattern);
        if(!match.Success)throw new InvalidDataException("Empreinte SHA-256 absente pour "+assetName+".");
        return match.Groups[1].Value.ToUpperInvariant();
    }

    string ReadReleaseTag(Dictionary<string,object> release)
    {
        string tag=release.ContainsKey("tag_name")?Convert.ToString(release["tag_name"]):"";
        if(tag!=null && tag.StartsWith("v",StringComparison.OrdinalIgnoreCase))tag=tag.Substring(1);
        if(ParseAppVersion(tag)==null)throw new InvalidDataException("Version GitHub invalide : "+tag);
        return tag;
    }

    // Miroir de beta/src/modules/app-version.js (couvert par app-version.test.js).
    // Format : X.Y.Z eventuellement suivi de -<canal>.<n> avec <canal> parmi
    // alpha|beta|rc (cf. build.ps1). Renvoie [major,minor,patch,preRank,preNumber]
    // ou null si illisible. preRank : alpha=0, beta=1, rc=2, inconnu=-1, pas de
    // preversion=100 (une stable passe devant la preversion de meme X.Y.Z).
    static int[] ParseAppVersion(string value)
    {
        if(value==null)return null;
        string text=value.Trim();
        if(text.StartsWith("v",StringComparison.OrdinalIgnoreCase))text=text.Substring(1);
        Match m=Regex.Match(text,@"^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?$");
        if(!m.Success)return null;
        int major=int.Parse(m.Groups[1].Value);
        int minor=m.Groups[2].Success?int.Parse(m.Groups[2].Value):0;
        int patch=m.Groups[3].Success?int.Parse(m.Groups[3].Value):0;
        int preRank=100,preNumber=0;
        if(m.Groups[4].Success)
        {
            Match p=Regex.Match(m.Groups[4].Value,@"^([A-Za-z]+)(?:[.-]?(\d+))?$");
            string stage=(p.Success?p.Groups[1].Value:m.Groups[4].Value).ToLowerInvariant();
            if(stage=="alpha")preRank=0;
            else if(stage=="beta")preRank=1;
            else if(stage=="rc")preRank=2;
            else preRank=-1;
            if(p.Success && p.Groups[2].Success)preNumber=int.Parse(p.Groups[2].Value);
        }
        return new int[]{major,minor,patch,preRank,preNumber};
    }

    // < 0 : current plus ancienne (mise a jour dispo) ; 0 : identiques ;
    // > 0 : current plus recente. Leve si l'une des chaines est illisible.
    static int CompareAppVersions(string current,string candidate)
    {
        int[] a=ParseAppVersion(current);
        int[] b=ParseAppVersion(candidate);
        if(a==null || b==null)throw new InvalidDataException("Version illisible ("+current+" / "+candidate+").");
        for(int i=0;i<a.Length;i++)
        {
            if(a[i]!=b[i])return a[i]<b[i]?-1:1;
        }
        return 0;
    }

    string CurrentVersionText()
    {
        return BuildInfo.DisplayVersion;
    }

    void SendAppInfo()
    {
        SendToWeb(new { type="app-info", version=BuildInfo.DisplayVersion, channel=BuildInfo.Channel, beta=BuildInfo.IsBeta });
    }

    void SendSystemSummary()
    {
        Task.Run(delegate {
            string product="Windows",display="",build="",wingetVersion="Indisponible";
            try
            {
                using(var key=Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion"))
                {
                    product=Convert.ToString(key==null?null:key.GetValue("ProductName"));
                    display=Convert.ToString(key==null?null:key.GetValue("DisplayVersion"));
                    build=Convert.ToString(key==null?null:key.GetValue("CurrentBuildNumber"));
                }
                int buildNumber=0;
                if(Int32.TryParse(build,out buildNumber) && buildNumber>=22000 && product.IndexOf("Windows 10",StringComparison.OrdinalIgnoreCase)>=0)product=product.Replace("Windows 10","Windows 11");
            }
            catch{}
            bool wingetReady=false;
            try
            {
                var output=new StringBuilder();
                wingetReady=RunWingetCli("--version",output)==0;
                if(wingetReady)wingetVersion=output.ToString().Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()??"Disponible";
            }
            catch{}
            string restartReason=GetRestartReason();
            SendToWeb(new {type="system-summary",os=String.IsNullOrWhiteSpace(product)?"Windows":product,display=display,build=build,architecture=Environment.Is64BitOperatingSystem?"x64":"x86",winget=wingetVersion,wingetReady=wingetReady,restartPending=!String.IsNullOrEmpty(restartReason),restartReason=restartReason});
        });
    }

    static bool RegistryFlagEnabled(string path,string name,bool defaultValue)
    {
        bool? value=ReadRegistryFlag(path,name);
        return value ?? defaultValue;
    }

    // null = valeur absente ou illisible (on ne peut pas conclure).
    static bool? ReadRegistryFlag(string path,string name)
    {
        try
        {
            using(var key=Registry.LocalMachine.OpenSubKey(path,false))
            {
                object value=key==null?null:key.GetValue(name,null);
                if(value==null)return null;
                return Convert.ToInt32(value)!=0;
            }
        }
        catch{return null;}
    }

    static bool VersionOlderThan(string text,Version minimum)
    {
        try
        {
            var match=Regex.Match(text??"",@"\d+(?:\.\d+){0,3}");
            Version current;
            return !match.Success||!Version.TryParse(match.Value,out current)||current.CompareTo(minimum)<0;
        }
        catch{return true;}
    }

    static bool TryGetSecurityProviderHealth(uint provider,out int health)
    {
        health=-1;
        try{return WscGetSecurityProviderHealth(provider,out health)==0;}
        catch{return false;}
    }

    static string SecurityProviderHealthLabel(int health)
    {
        switch(health)
        {
            case 0:return "Protection active";
            case 1:return "État non surveillé";
            case 2:return "Protection à vérifier";
            case 3:return "Protection suspendue";
            default:return "État indisponible";
        }
    }

    static string ExecutableSha256()
    {
        try
        {
            using(var stream=File.OpenRead(Application.ExecutablePath))
            using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();
        }
        catch{return "indisponible";}
    }

    // Évite de relancer winget.exe à chaque rafraîchissement du Centre de
    // sécurité ou du diagnostic : la version ne change pas dans la session.
    static string _cachedWingetVersion;
    static DateTime _cachedWingetVersionAt;
    string CachedWingetVersion()
    {
        if(_cachedWingetVersion!=null && (DateTime.UtcNow-_cachedWingetVersionAt)<TimeSpan.FromMinutes(10))return _cachedWingetVersion;
        string version="Indisponible";
        try
        {
            var report=new StringBuilder();
            if(RunWingetCli("--version",report)==0)
                version=report.ToString().Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()??"Indisponible";
        }
        catch{}
        _cachedWingetVersion=version;
        _cachedWingetVersionAt=DateTime.UtcNow;
        return version;
    }

    Dictionary<string,object> BuildSecuritySnapshot(string detectedWebView)
    {
        bool signed=false,trusted=false,integrity=false,admin=false,secureRuntime=false;
        bool defenderActive=true,firewallActive=true,antivirusActive=true;
        int antivirusHealth=-1,firewallHealth=-1;
        string signer=BuildInfo.IsBeta?"Bêta locale non signée":"Exécutable non signé";
        string wingetVersion="Indisponible",webViewVersion=String.IsNullOrWhiteSpace(detectedWebView)?"Indisponible":detectedWebView;
        int logCount=0;
        try{integrity=VerifyInterfaceIntegrity();}catch{}
        try{admin=new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator);}catch{}
        try
        {
            // Le certificat detient des ressources non managees : il est libere
            // des la fin du controle, comme la chaine qu il alimente.
            using(var certificate=new X509Certificate2(X509Certificate.CreateFromSignedFile(Application.ExecutablePath)))
            {
                signed=true;signer=certificate.GetNameInfo(X509NameType.SimpleName,false);
                using(var chain=new X509Chain()){chain.ChainPolicy.RevocationMode=X509RevocationMode.Online;chain.ChainPolicy.UrlRetrievalTimeout=TimeSpan.FromSeconds(4);trusted=chain.Build(certificate);}
            }
        }
        catch{}
        try
        {
            string runtime=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"PCSetup","SecureRuntime");
            secureRuntime=Directory.Exists(runtime)&&!IsReparsePoint(runtime);
        }
        catch{}
        try{logCount=Directory.GetFiles(GetDataFolder("Logs"),"PC-Setup-*.log",SearchOption.TopDirectoryOnly).Length;}catch{}
        wingetVersion=CachedWingetVersion();
        bool? rtmDisabled=ReadRegistryFlag(@"SOFTWARE\Microsoft\Windows Defender\Real-Time Protection","DisableRealtimeMonitoring");
        bool? antiSpywareDisabled=ReadRegistryFlag(@"SOFTWARE\Microsoft\Windows Defender","DisableAntiSpyware");
        bool defenderKeysReadable=rtmDisabled.HasValue||antiSpywareDisabled.HasValue;
        defenderActive=(rtmDisabled!=true)&&(antiSpywareDisabled!=true);
        bool? fwDomain=ReadRegistryFlag(@"SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile","EnableFirewall");
        bool? fwPublic=ReadRegistryFlag(@"SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile","EnableFirewall");
        bool? fwStandard=ReadRegistryFlag(@"SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\StandardProfile","EnableFirewall");
        bool firewallKeysReadable=fwDomain.HasValue||fwPublic.HasValue||fwStandard.HasValue;
        firewallActive=(fwDomain!=false)&&(fwPublic!=false)&&(fwStandard!=false);
        // Le Centre de sécurité Windows connaît aussi les antivirus et pare-feu tiers.
        // Le contrôle registre ci-dessus reste uniquement un repli si WSC est indisponible.
        bool antivirusHealthAvailable=TryGetSecurityProviderHealth(WscSecurityProviderAntivirus,out antivirusHealth);
        bool firewallHealthAvailable=TryGetSecurityProviderHealth(WscSecurityProviderFirewall,out firewallHealth);
        antivirusActive=antivirusHealthAvailable?antivirusHealth==WscSecurityProviderHealthGood:defenderActive;
        firewallActive=firewallHealthAvailable?firewallHealth==WscSecurityProviderHealthGood:firewallActive;
        // « determined » = on a une source fiable (WSC) OU au moins une valeur registre lisible.
        bool antivirusDetermined=antivirusHealthAvailable||defenderKeysReadable;
        bool firewallDetermined=firewallHealthAvailable||firewallKeysReadable;
        bool wingetAvailable=!String.Equals(wingetVersion,"Indisponible",StringComparison.OrdinalIgnoreCase);
        bool webViewAvailable=!String.Equals(webViewVersion,"Indisponible",StringComparison.OrdinalIgnoreCase);
        bool wingetOutdated=wingetAvailable&&VersionOlderThan(wingetVersion,new Version(1,8));
        bool webViewOutdated=webViewAvailable&&VersionOlderThan(webViewVersion,new Version(120,0));
        string signatureState=trusted?"valid":signed?"invalid":BuildInfo.IsBeta?"unsigned-beta":"unsigned";
        int score=0;
        if(integrity)score+=20;score+=15;if(!admin)score+=10;
        if(trusted)score+=15;else if(signatureState=="unsigned-beta")score+=8;
        if(wingetAvailable&&!wingetOutdated)score+=10;if(webViewAvailable&&!webViewOutdated)score+=10;
        if(secureRuntime)score+=10;else score+=5;
        if(antivirusActive&&antivirusDetermined)score+=5;if(firewallActive&&firewallDetermined)score+=5;
        var recommendations=new List<object>();
        if(!integrity)recommendations.Add(new{severity="critical",title="Réinstaller OwlSetup",detail="Les ressources intégrées ne correspondent plus à l’exécutable officiel.",action="release"});
        if(admin)recommendations.Add(new{severity="warning",title="Relancer OwlSetup normalement",detail="L’interface ne doit pas rester ouverte en administrateur.",action="none"});
        if(signatureState=="invalid")recommendations.Add(new{severity="critical",title="Ne pas utiliser cet exécutable",detail="Une signature existe mais Windows ne peut pas l’approuver.",action="release"});
        // Une version stable non signée reste visible dans sa carte dédiée et dans le détail du score.
        // Elle n'est pas ajoutée aux actions : aucun correctif local ne peut résoudre cet état.
        else if(signatureState=="unsigned-beta")recommendations.Add(new{severity="info",title="Bêta locale non signée",detail="État attendu pour cette bêta. Comparez son SHA-256 avec BETA-INFO.txt.",action="none"});
        if(!secureRuntime)recommendations.Add(new{severity="info",title="Worker protégé pas encore initialisé",detail="Le dossier sécurisé sera créé automatiquement lors de la première opération élevée.",action="none"});
        if(!wingetAvailable)recommendations.Add(new{severity="warning",title="Réparer WinGet",detail="Le gestionnaire de paquets Microsoft est indisponible.",action="winget"});
        else if(wingetOutdated)recommendations.Add(new{severity="warning",title="Mettre WinGet à jour",detail="La version détectée est ancienne.",action="winget"});
        if(!webViewAvailable||webViewOutdated)recommendations.Add(new{severity="warning",title="Mettre WebView2 à jour",detail="Le moteur d’interface Evergreen est absent ou ancien.",action="webview"});
        if(!antivirusActive&&antivirusDetermined)recommendations.Add(new{severity="warning",title="Contrôler la protection antivirus",detail="Le Centre de sécurité Windows indique qu’aucun antivirus actif ne protège actuellement le PC.",action="defender"});
        else if(!antivirusDetermined)recommendations.Add(new{severity="info",title="État antivirus indéterminé",detail="OwlSetup n’a pas pu lire l’état de la protection (Sécurité Windows indisponible ou clé protégée). Ouvrez Sécurité Windows pour le vérifier.",action="defender"});
        if(!firewallActive&&firewallDetermined)recommendations.Add(new{severity="warning",title="Contrôler la protection pare-feu",detail="Le Centre de sécurité Windows indique que la protection pare-feu demande votre attention.",action="firewall"});
        else if(!firewallDetermined)recommendations.Add(new{severity="info",title="État pare-feu indéterminé",detail="OwlSetup n’a pas pu lire l’état du pare-feu. Ouvrez Sécurité Windows pour le vérifier.",action="firewall"});
        if(recommendations.Count==0)recommendations.Add(new{severity="success",title="Aucune action requise",detail="Les contrôles locaux principaux sont satisfaisants.",action="none"});
        return new Dictionary<string,object>{{"integrity",integrity},{"originLocked",true},{"standardUser",!admin},{"elevation","À la demande"},{"signed",signed},{"trusted",trusted},{"signatureState",signatureState},{"signer",signer},{"winget",wingetVersion},{"wingetOutdated",wingetOutdated},{"webview",webViewVersion},{"webviewOutdated",webViewOutdated},{"secureRuntime",secureRuntime},{"defenderActive",defenderActive},{"antivirusActive",antivirusActive},{"antivirusHealth",SecurityProviderHealthLabel(antivirusHealth)},{"antivirusManagedByWsc",antivirusHealthAvailable},{"antivirusDetermined",antivirusDetermined},{"firewallActive",firewallActive},{"firewallHealth",SecurityProviderHealthLabel(firewallHealth)},{"firewallManagedByWsc",firewallHealthAvailable},{"firewallDetermined",firewallDetermined},{"logs",logCount},{"version",BuildInfo.DisplayVersion},{"score",Math.Max(0,Math.Min(100,score))},{"sha256",ExecutableSha256()},{"recommendations",recommendations.ToArray()}};
    }

    void SendSecurityStatus()
    {
        string detectedWebView="Indisponible";
        try{if(webView.CoreWebView2!=null)detectedWebView=webView.CoreWebView2.Environment.BrowserVersionString;}catch{}
        Task.Run(delegate {
            var snapshot=BuildSecuritySnapshot(detectedWebView);
            snapshot["type"]="security-status";
            snapshot["checkedAt"]=DateTime.Now.ToString("HH:mm");
            SendToWeb(snapshot);
        });
    }

    void ExportSecurityDiagnostic()
    {
        string detectedWebView="Indisponible";
        try{if(webView.CoreWebView2!=null)detectedWebView=webView.CoreWebView2.Environment.BrowserVersionString;}catch{}
        using(var dialog=new SaveFileDialog())
        {
            dialog.Title="Exporter le diagnostic de sécurité OwlSetup";
            dialog.Filter="Diagnostic JSON (*.json)|*.json";
            dialog.FileName="OwlSetup-Diagnostic-Securite-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".json";
            if(dialog.ShowDialog(this)!=DialogResult.OK)return;
            var snapshot=BuildSecuritySnapshot(detectedWebView);
            snapshot.Remove("recommendations");
            snapshot["schemaVersion"]=1;
            snapshot["createdAtUtc"]=DateTime.UtcNow.ToString("o");
            snapshot["osVersion"]=Environment.OSVersion.VersionString;
            snapshot["architecture"]=Environment.Is64BitOperatingSystem?"x64":"x86";
            File.WriteAllText(dialog.FileName,json.Serialize(snapshot),new UTF8Encoding(false));
            SendToWeb(new{type="security-exported",name=Path.GetFileName(dialog.FileName)});
        }
    }


    // ---------------------------------------------------------------------
    // Entretien planifie (lot 6) : une vraie tache planifiee Windows qui
    // rappelle le mode CLI (lot 7). La tache s'execute sous le compte de
    // l'utilisateur courant, sans mot de passe stocke et SANS elevation :
    // OwlSetup ne cree jamais de tache privilegiee silencieuse.
    // ---------------------------------------------------------------------
    const string ScheduleTaskName = "OwlSetup-Entretien";
    bool scheduleBusy;

    static string PsQuote(string value)
    {
        return "'"+(value ?? "").Replace("'","''")+"'";
    }

    // Argument CLI reellement lance par la tache, selon l'action demandee.
    static string ScheduleArguments(string action)
    {
        // "check" ouvre l interface : une verification planifiee sans fenetre
        // n apprendrait rien a l utilisateur, et --check-updates renvoie 1 quand
        // des mises a jour existent, ce que Windows afficherait comme un echec.
        return action=="update" ? "--update --silent" : "";
    }

    int RunScheduleScript(string script,StringBuilder report)
    {
        string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
        return RunHiddenProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,report);
    }

    // Lit l'etat de la tache et le renvoie a l'interface. Marqueurs :
    // PCSETUP_SCHED|<exists>|<action>|<frequency>|<day>|<time>|<next>
    void SendScheduleState()
    {
        Task.Run(delegate {
            var report=new StringBuilder();
            string script=
                "$ErrorActionPreference='SilentlyContinue';"+
                "$t=Get-ScheduledTask -TaskName "+PsQuote(ScheduleTaskName)+" -ErrorAction SilentlyContinue;"+
                "if($null -eq $t){Write-Output 'PCSETUP_SCHED|0|||||'}else{"+
                "$a=($t.Actions | Select-Object -First 1).Arguments;"+
                "$act=if($a -match '--update'){'update'}else{'check'};"+
                "$tr=$t.Triggers | Select-Object -First 1;"+
                "$freq=if($tr.WeeksInterval -ge 4){'monthly'}else{'weekly'};"+
                "$start=[datetime]$tr.StartBoundary;"+
                // DaysOfWeek est un masque de bits (dimanche=1, lundi=2, ... samedi=64).
                "$mask=[int]$tr.DaysOfWeek; $wd=if($mask -gt 0){[int][Math]::Round([Math]::Log($mask,2))}else{[int]$start.DayOfWeek};"+
                "$info=Get-ScheduledTaskInfo -TaskName "+PsQuote(ScheduleTaskName)+" -ErrorAction SilentlyContinue;"+
                "$next=if($info -and $info.NextRunTime){$info.NextRunTime.ToString('yyyy-MM-dd HH:mm')}else{''};"+
                "Write-Output ('PCSETUP_SCHED|1|'+$act+'|'+$freq+'|'+$wd+'|'+$start.ToString('HH:mm')+'|'+$next)}";
            RunScheduleScript(script,report);

            bool exists=false;string action="check",frequency="weekly",time="20:00",next="";int day=5;
            var match=Regex.Match(report.ToString(),@"PCSETUP_SCHED\|(\d)\|([a-z]*)\|([a-z]*)\|(\d*)\|([0-9:]*)\|([^\r\n]*)");
            if(match.Success)
            {
                exists=match.Groups[1].Value=="1";
                if(exists)
                {
                    action=match.Groups[2].Value.Length>0?match.Groups[2].Value:"check";
                    frequency=match.Groups[3].Value.Length>0?match.Groups[3].Value:"weekly";
                    int parsedDay;if(int.TryParse(match.Groups[4].Value,out parsedDay))day=parsedDay;
                    if(match.Groups[5].Value.Length>0)time=match.Groups[5].Value;
                    next=match.Groups[6].Value.Trim();
                }
            }
            SendToWeb(new { type="schedule-state", exists=exists, action=action, frequency=frequency, day=day, time=time, nextRun=next });
        });
    }

    void ConfigureSchedule(Dictionary<string,object> payload)
    {
        if(scheduleBusy)return;
        string action=payload!=null&&payload.ContainsKey("action")?Convert.ToString(payload["action"]):"check";
        string frequency=payload!=null&&payload.ContainsKey("frequency")?Convert.ToString(payload["frequency"]):"weekly";
        string time=payload!=null&&payload.ContainsKey("time")?Convert.ToString(payload["time"]):"20:00";
        int day=1;
        try{if(payload!=null&&payload.ContainsKey("day"))day=Convert.ToInt32(payload["day"]);}catch{}

        // Validation stricte : rien de ce qui vient de l'interface n'entre tel
        // quel dans le script PowerShell.
        if(action!="check" && action!="update")action="check";
        if(frequency!="weekly" && frequency!="monthly")frequency="weekly";
        if(!Regex.IsMatch(time,@"^([01][0-9]|2[0-3]):[0-5][0-9]$"))time="20:00";
        if(day<0||day>6)day=5; // jour de semaine (0 = dimanche) dans les deux frequences

        scheduleBusy=true;
        SendToWeb(new { type="schedule-busy" });
        Task.Run(delegate {
            var report=new StringBuilder();
            try
            {
                string[] weekDays={"Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"};
                string trigger=frequency=="weekly"
                    ? "$trigger=New-ScheduledTaskTrigger -Weekly -DaysOfWeek "+weekDays[day]+" -At "+PsQuote(time)+";"
                    // « Mensuel » = toutes les 4 semaines, le meme jour : le module
                    // n'expose pas de declencheur mensuel, et cela reste previsible
                    // pour l'utilisateur (le jour choisi est respecte).
                    : "$trigger=New-ScheduledTaskTrigger -Weekly -WeeksInterval 4 -DaysOfWeek "+weekDays[day]+" -At "+PsQuote(time)+";";

                string script=
                    "$ErrorActionPreference='Stop';"+
                    "try{"+
                    "$exe="+PsQuote(Application.ExecutablePath)+";"+
                    trigger+
                    // -Argument refuse une chaine vide : on omet le parametre quand
                    // la tache doit simplement ouvrir l interface.
                    (ScheduleArguments(action).Length>0
                        ? "$act=New-ScheduledTaskAction -Execute $exe -Argument "+PsQuote(ScheduleArguments(action))+";"
                        : "$act=New-ScheduledTaskAction -Execute $exe;")+
                    // Compte courant, interactif, sans elevation ni mot de passe.
                    "$principal=New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited;"+
                    "$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2);"+
                    "Unregister-ScheduledTask -TaskName "+PsQuote(ScheduleTaskName)+" -Confirm:$false -ErrorAction SilentlyContinue;"+
                    "Register-ScheduledTask -TaskName "+PsQuote(ScheduleTaskName)+" -Action $act -Trigger $trigger -Principal $principal -Settings $settings -Description 'Entretien planifie OwlSetup' | Out-Null;"+
                    "$info=Get-ScheduledTaskInfo -TaskName "+PsQuote(ScheduleTaskName)+";"+
                    "$next=if($info -and $info.NextRunTime){$info.NextRunTime.ToString('yyyy-MM-dd HH:mm')}else{''};"+
                    "Write-Output ('PCSETUP_SCHED_OK|'+$next)"+
                    "}catch{Write-Output ('PCSETUP_SCHED_ERR|'+$_.Exception.Message)}";

                RunScheduleScript(script,report);
                string output=report.ToString();
                var ok=Regex.Match(output,@"PCSETUP_SCHED_OK\|([^\r\n]*)");
                if(ok.Success)
                {
                    scheduleBusy=false;
                    SendToWeb(new { type="schedule-saved", nextRun=ok.Groups[1].Value.Trim() });
                    SendScheduleState();
                    return;
                }
                var err=Regex.Match(output,@"PCSETUP_SCHED_ERR\|([^\r\n]*)");
                throw new InvalidOperationException(err.Success?err.Groups[1].Value.Trim():"Le planificateur de tâches Windows a refusé la demande.");
            }
            catch(Exception ex)
            {
                scheduleBusy=false;
                SendToWeb(new { type="schedule-error", message=ex.Message });
            }
        });
    }

    void RemoveSchedule()
    {
        if(scheduleBusy)return;
        scheduleBusy=true;
        SendToWeb(new { type="schedule-busy" });
        Task.Run(delegate {
            var report=new StringBuilder();
            string script=
                "$ErrorActionPreference='SilentlyContinue';"+
                "Unregister-ScheduledTask -TaskName "+PsQuote(ScheduleTaskName)+" -Confirm:$false;"+
                "Write-Output 'PCSETUP_SCHED_REMOVED'";
            RunScheduleScript(script,report);
            scheduleBusy=false;
            SendToWeb(new { type="schedule-removed" });
            SendScheduleState();
        });
    }

    void OpenWindowsSecurity(Dictionary<string,object> payload)
    {
        string page=payload!=null&&payload.ContainsKey("page")?Convert.ToString(payload["page"]):"defender";
        string uri=String.Equals(page,"firewall",StringComparison.OrdinalIgnoreCase)?"windowsdefender://network/":"windowsdefender:";
        Process.Start(new ProcessStartInfo(uri){UseShellExecute=true});
    }

    static bool WantsPrerelease(Dictionary<string,object> payload)
    {
        try{return payload!=null && payload.ContainsKey("prerelease") && Convert.ToBoolean(payload["prerelease"]);}catch{return false;}
    }

    void CheckAppUpdate(Dictionary<string,object> payload)
    {
        if(selfUpdateRunning)return;
        // Build sans version comparable (dev local) : rien a proposer.
        if(ParseAppVersion(BuildInfo.DisplayVersion)==null)
        {
            SendToWeb(new { type="app-update-state", status="beta", current=CurrentVersionText(), latest="" });
            return;
        }
        bool includePrerelease=WantsPrerelease(payload);
        SendToWeb(new { type="app-update-state", status="checking", current=CurrentVersionText() });
        Task.Run(delegate {
            try
            {
                var release=GetLatestRelease(includePrerelease);
                string tag=ReadReleaseTag(release);
                bool available=CompareAppVersions(BuildInfo.DisplayVersion,tag)<0;
                SendToWeb(new { type="app-update-state", status=available?"available":"current", current=CurrentVersionText(), latest=tag, page=release.ContainsKey("html_url")?Convert.ToString(release["html_url"]):"" });
            }
            catch(Exception ex){SendToWeb(new { type="app-update-state", status="error", current=CurrentVersionText(), message=ex.Message });}
        });
    }

    void InstallAppUpdate(Dictionary<string,object> payload)
    {
        // Mise a jour verifiee : l'executable telecharge est controle par son
        // empreinte SHA-256 (asset SHA256.txt de la Release), par le prefixe
        // d'URL github.com/OwlNetGeekFR/OwlSetup et par son en-tete MZ. Elle
        // n'est lancee qu'apres confirmation explicite de l'utilisateur (modale).
        // OwlSetup n'est pas signe Authenticode : SmartScreen peut avertir au
        // redemarrage.
        if(selfUpdateRunning)throw new InvalidOperationException("La mise à jour de OwlSetup est déjà en cours.");
        if(installationRunning || uninstallRunning || repairRunning || updateRunning || cleanupRunning)throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        bool includePrerelease=WantsPrerelease(payload);
        selfUpdateRunning=true;
        SendToWeb(new { type="app-update-state", status="downloading", current=CurrentVersionText() });
        Task.Run(delegate {
            string downloaded=null;
            try
            {
                var release=GetLatestRelease(includePrerelease);
                string tag=ReadReleaseTag(release);
                if(CompareAppVersions(BuildInfo.DisplayVersion,tag)>=0)throw new InvalidOperationException("OwlSetup est déjà à jour.");
                var exeAsset=FindReleaseAsset(release,"OwlSetup.exe")??FindReleaseAsset(release,"PC-Setup.exe");
                var hashAsset=FindReleaseAsset(release,"SHA256.txt");
                if(exeAsset==null || hashAsset==null)throw new FileNotFoundException("La Release ne contient pas les fichiers de mise à jour requis.");
                string exeName=Convert.ToString(exeAsset["name"]);
                string exeUrl=Convert.ToString(exeAsset["browser_download_url"]);
                string hashUrl=Convert.ToString(hashAsset["browser_download_url"]);
                string trustedPrefix="https://github.com/OwlNetGeekFR/OwlSetup/releases/download/";
                if(!exeUrl.StartsWith(trustedPrefix,StringComparison.OrdinalIgnoreCase) || !hashUrl.StartsWith(trustedPrefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Source de mise à jour non approuvée.");
                string folder=Path.Combine(Path.GetTempPath(),"PCSetup","Update-"+tag);
                Directory.CreateDirectory(folder);
                downloaded=Path.Combine(folder,"OwlSetup.exe");
                string expected;
                using(var client=new WebClient())
                {
                    client.Headers[HttpRequestHeader.UserAgent]="OwlSetup/"+CurrentVersionText();
                    string hashText=client.DownloadString(hashUrl);
                    expected=ReadAssetHash(hashText,exeName);
                    client.DownloadFile(exeUrl,downloaded);
                }
                using(var stream=File.OpenRead(downloaded))
                {
                    if(stream.Length<2 || stream.ReadByte()!=0x4D || stream.ReadByte()!=0x5A)throw new InvalidDataException("Le fichier téléchargé n'est pas un exécutable Windows valide.");
                }
                string actual;
                using(var sha=SHA256.Create())using(var stream=File.OpenRead(downloaded))actual=BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","");
                if(!String.Equals(actual,expected,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("La vérification SHA-256 a échoué. La mise à jour est annulée.");
                string destination=Application.ExecutablePath;
                string script=Path.Combine(folder,"installer-mise-a-jour.ps1");
                string ps="$ErrorActionPreference='Stop'\r\n"+
                    "$source='"+downloaded.Replace("'","''")+"'\r\n"+
                    "$destination='"+destination.Replace("'","''")+"'\r\n"+
                    "$pidToWait="+Process.GetCurrentProcess().Id+"\r\n"+
                    "Wait-Process -Id $pidToWait -ErrorAction SilentlyContinue\r\n"+
                    "$copied=$false\r\n"+
                    "1..20 | ForEach-Object { if(-not $copied){ try { Copy-Item -LiteralPath $source -Destination $destination -Force; $copied=$true } catch { Start-Sleep -Milliseconds 500 } } }\r\n"+
                    "if(-not $copied){ exit 1 }\r\n"+
                    "Start-Process -FilePath $destination\r\n"+
                    "Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue\r\n";
                File.WriteAllText(script,ps,new UTF8Encoding(false));
                SendToWeb(new { type="app-update-state", status="restarting", current=CurrentVersionText(), latest=tag });
                Process.Start(new ProcessStartInfo { FileName="powershell.exe", Arguments="-NoLogo -NoProfile -ExecutionPolicy Bypass -File \""+script+"\"", UseShellExecute=true, WindowStyle=ProcessWindowStyle.Hidden });
                BeginInvoke(new Action(Close));
            }
            catch(Exception ex)
            {
                try{if(downloaded!=null && File.Exists(downloaded))File.Delete(downloaded);}catch{}
                selfUpdateRunning=false;
                SendToWeb(new { type="app-update-state", status="error", current=CurrentVersionText(), message=ex.Message });
            }
        });
    }

    void ExportConfiguration(Dictionary<string, object> payload)
    {
        var selected=ReadArray(payload,"selected").Where(x=>IsValidPackageId(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        var cleanup=ReadArray(payload,"cleanup").Where(x=>Regex.IsMatch(x,"^[a-z-]+$")).Distinct().ToArray();
        string preferences=payload!=null&&payload.ContainsKey("preferences")?Convert.ToString(payload["preferences"]):"";
        if(preferences.Length>65536)preferences="";
        string destination;
        using(var dialog=new SaveFileDialog())
        {
            dialog.Title="Sauvegarder la configuration OwlSetup";
            dialog.Filter="Configuration OwlSetup (*.pcsetup.json)|*.pcsetup.json|Fichier JSON (*.json)|*.json";
            dialog.FileName="OwlSetup-Configuration-"+DateTime.Now.ToString("yyyy-MM-dd")+".pcsetup.json";
            if(dialog.ShowDialog(this)!=DialogResult.OK)return;
            destination=dialog.FileName;
        }
        SendToWeb(new { type="config-export-start" });
        Task.Run(delegate {
            string temp=Path.Combine(Path.GetTempPath(),"PCSetup","export-"+Guid.NewGuid().ToString("N")+".json");
            var installed=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var report=new StringBuilder();
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(temp));
                RunWingetCli("export -o \""+temp+"\" --accept-source-agreements --disable-interactivity",report);
                if(File.Exists(temp))
                {
                    foreach(Match match in Regex.Matches(File.ReadAllText(temp,Encoding.UTF8),"\"PackageIdentifier\"\\s*:\\s*\"([^\"]+)\"",RegexOptions.IgnoreCase))
                    {
                        string id=match.Groups[1].Value;
                        if(IsValidPackageId(id))installed.Add(id);
                    }
                }
                var configuration=new {
                    format="pc-setup-configuration", formatVersion=1, createdAt=DateTime.UtcNow.ToString("o"),
                    appVersion=CurrentVersionText(), installedPackages=installed.OrderBy(x=>x).ToArray(),
                    selectedPackages=selected, cleanupChoices=cleanup, preferences=preferences,
                    protectedFolders=new[]{"Desktop","Documents","Downloads","Pictures","Music","Videos"}
                };
                File.WriteAllText(destination,json.Serialize(configuration),new UTF8Encoding(true));
                SendToWeb(new { type="config-export-complete", success=true, count=installed.Count, file=Path.GetFileName(destination) });
            }
            catch(Exception ex){SendToWeb(new { type="config-export-complete", success=false, message=ex.Message });}
            finally{try{if(File.Exists(temp))File.Delete(temp);}catch{}}
        });
    }

    void ImportConfiguration()
    {
        string source;
        using(var dialog=new OpenFileDialog())
        {
            dialog.Title="Restaurer une configuration OwlSetup";
            dialog.Filter="Configuration OwlSetup (*.pcsetup.json;*.json)|*.pcsetup.json;*.json";
            dialog.CheckFileExists=true;
            if(dialog.ShowDialog(this)!=DialogResult.OK)return;
            source=dialog.FileName;
        }
        try
        {
            var sourceInfo=new FileInfo(source);
            if(sourceInfo.Length>1024*1024)throw new InvalidDataException("Le fichier de configuration dépasse la taille maximale autorisée de 1 Mo.");
            var root=json.DeserializeObject(File.ReadAllText(source,Encoding.UTF8)) as Dictionary<string,object>;
            if(root==null || !root.ContainsKey("format") || Convert.ToString(root["format"])!="pc-setup-configuration")throw new InvalidDataException("Ce fichier n'est pas une configuration OwlSetup valide.");
            var packages=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach(string key in new[]{"installedPackages","selectedPackages"})
                foreach(string id in ReadArray(root,key))if(IsValidPackageId(id))packages.Add(id);
            var cleanup=ReadArray(root,"cleanupChoices").Where(x=>Regex.IsMatch(x,"^[a-z-]+$")).Distinct().ToArray();
            string preferences=root.ContainsKey("preferences")?Convert.ToString(root["preferences"]):"";
            if(preferences.Length>65536)preferences="";
            SendToWeb(new { type="config-imported", packages=packages.ToArray(), cleanup=cleanup, preferences=preferences, file=Path.GetFileName(source) });
        }
        catch(Exception ex){SendToWeb(new { type="config-import-error", message=ex.Message });}
    }

    List<BrowserDefinition> BrowserDefinitions()
    {
        string local=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), roaming=Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), home=Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        return new List<BrowserDefinition>{
            new BrowserDefinition{Id="chrome",Name="Google Chrome",Engine="Chromium",Root=Path.Combine(local,@"Google\Chrome\User Data"),Process="chrome"},
            new BrowserDefinition{Id="edge",Name="Microsoft Edge",Engine="Chromium",Root=Path.Combine(local,@"Microsoft\Edge\User Data"),Process="msedge"},
            new BrowserDefinition{Id="brave",Name="Brave",Engine="Chromium",Root=Path.Combine(local,@"BraveSoftware\Brave-Browser\User Data"),Process="brave"},
            new BrowserDefinition{Id="vivaldi",Name="Vivaldi",Engine="Chromium",Root=Path.Combine(local,@"Vivaldi\User Data"),Process="vivaldi"},
            new BrowserDefinition{Id="opera",Name="Opera",Engine="Chromium",Root=Path.Combine(roaming,@"Opera Software\Opera Stable"),Process="opera",ProfileRoot=true},
            new BrowserDefinition{Id="opera-gx",Name="Opera GX",Engine="Chromium",Root=Path.Combine(roaming,@"Opera Software\Opera GX Stable"),Process="opera",ProfileRoot=true},
            new BrowserDefinition{Id="firefox",Name="Mozilla Firefox",Engine="Firefox",Root=Path.Combine(roaming,@"Mozilla\Firefox\Profiles"),Process="firefox"},
            new BrowserDefinition{Id="librewolf",Name="LibreWolf",Engine="Firefox",Root=Path.Combine(roaming,@"librewolf\Profiles"),Process="librewolf"},
            new BrowserDefinition{Id="floorp",Name="Floorp",Engine="Firefox",Root=Path.Combine(roaming,@"Floorp\Profiles"),Process="floorp"},
            new BrowserDefinition{Id="waterfox",Name="Waterfox",Engine="Firefox",Root=Path.Combine(roaming,@"Waterfox\Profiles"),Process="waterfox"},
            new BrowserDefinition{Id="tor",Name="Tor Browser",Engine="Firefox",Root=Path.Combine(home,@"Tor Browser\Browser\TorBrowser\Data\Browser\profile.default"),Process="firefox",ProfileRoot=true}
        };
    }

    List<string> BrowserProfiles(BrowserDefinition browser)
    {
        var result=new List<string>();if(!Directory.Exists(browser.Root)||IsReparsePoint(browser.Root))return result;
        if(browser.ProfileRoot){result.Add(browser.Root);return result;}
        if(browser.Engine=="Chromium")
        {
            foreach(string path in Directory.GetDirectories(browser.Root))
            {string name=Path.GetFileName(path);if(name=="Default"||name=="Guest Profile"||name.StartsWith("Profile ",StringComparison.OrdinalIgnoreCase))result.Add(path);}
        }
        else foreach(string path in Directory.GetDirectories(browser.Root))if(!IsReparsePoint(path))result.Add(path);
        return result;
    }

    void ScanBrowserData()
    {
        Task.Run(delegate{try{var items=BrowserDefinitions().Select(browser=>new{browser=browser,profiles=BrowserProfiles(browser)}).Where(x=>x.profiles.Count>0).Select(x=>new{id=x.browser.Id,name=x.browser.Name,engine=x.browser.Engine,profiles=x.profiles.Count,running=Process.GetProcessesByName(x.browser.Process).Length>0}).ToArray();SendToWeb(new{type="browser-scan-state",items=items});}catch(Exception ex){SendToWeb(new{type="browser-scan-error",message=ex.Message});}});
    }

    string BrowserCategoryLabel(string category)
    {
        if(category=="cache")return "Cache de navigation";if(category=="media-cache")return "Cache multimédia";if(category=="crash")return "Rapports de plantage";if(category=="cookies")return "Cookies";if(category=="site-data")return "Données de sites";return "Historique";
    }

    IEnumerable<string> BrowserRelativeTargets(BrowserDefinition browser,string category)
    {
        if(browser.Engine=="Chromium")
        {
            if(category=="cache")return new[]{"Cache","Code Cache","GPUCache","DawnCache"};
            if(category=="media-cache")return new[]{"Media Cache"};
            if(category=="crash")return new[]{"Crashpad\\reports","Crashpad\\pending"};
            if(category=="cookies")return new[]{"Network\\Cookies","Network\\Cookies-journal","Cookies","Cookies-journal"};
            if(category=="site-data")return new[]{"Local Storage","IndexedDB","Service Worker","Session Storage","WebStorage"};
            if(category=="history")return new[]{"History","History-journal","History-wal","History-shm","Archived History","Archived History-journal","Archived History-wal","Archived History-shm"};
        }
        else
        {
            if(category=="cache")return new[]{"cache2","startupCache"};
            if(category=="media-cache")return new string[0];
            if(category=="crash")return new[]{"minidumps"};
            if(category=="cookies")return new[]{"cookies.sqlite","cookies.sqlite-wal","cookies.sqlite-shm"};
            if(category=="site-data")return new[]{"storage\\default","storage\\temporary"};
            // Firefox stocke l'historique et les favoris dans places.sqlite : on protège donc les deux.
            if(category=="history")return new string[0];
        }
        return new string[0];
    }

    void AnalyzeBrowserData(Dictionary<string,object> payload)
    {
        string[] allowedCategories={"cache","media-cache","crash","cookies","site-data","history"};
        var selectedBrowsers=new HashSet<string>(ReadArray(payload,"browsers").Where(x=>Regex.IsMatch(x,"^[a-z0-9-]+$")),StringComparer.OrdinalIgnoreCase);
        var categories=ReadArray(payload,"categories").Where(x=>allowedCategories.Contains(x)).Distinct().ToArray();
        if(selectedBrowsers.Count==0||categories.Length==0)throw new InvalidOperationException("Sélection de navigateurs vide.");
        Task.Run(delegate{try{
            var targets=new List<BrowserTarget>();var definitions=BrowserDefinitions().Where(x=>selectedBrowsers.Contains(x.Id)).ToArray();
            foreach(var browser in definitions)foreach(string profile in BrowserProfiles(browser))foreach(string category in categories)foreach(string relative in BrowserRelativeTargets(browser,category))
            {
                string path=Path.Combine(profile,relative);if(!File.Exists(path)&&!Directory.Exists(path))continue;
                EnsureNoReparsePoints(path,browser.Root);long bytes=0,files=0;if(File.Exists(path)){bytes=new FileInfo(path).Length;files=1;}else MeasurePath(path,out bytes,out files);
                targets.Add(new BrowserTarget{Browser=browser.Name,Category=category,CategoryLabel=BrowserCategoryLabel(category),Path=path,Root=browser.Root,Bytes=bytes,Files=files});
            }
            targets=targets.GroupBy(x=>x.Path,StringComparer.OrdinalIgnoreCase).Select(x=>x.First()).ToList();string token=Guid.NewGuid().ToString("N");
            var plan=new BrowserCleanupPlan{Expires=DateTime.UtcNow.AddMinutes(5),Browsers=definitions.Select(x=>x.Id).OrderBy(x=>x).ToArray(),Categories=categories.OrderBy(x=>x).ToArray(),Targets=targets,Bytes=targets.Sum(x=>x.Bytes),Files=targets.Sum(x=>x.Files)};
            lock(browserCleanupPlans){browserCleanupPlans[token]=plan;foreach(string expired in browserCleanupPlans.Where(x=>x.Value.Expires<DateTime.UtcNow).Select(x=>x.Key).ToArray())browserCleanupPlans.Remove(expired);}
            var items=targets.GroupBy(x=>new{x.Browser,x.Category,x.CategoryLabel}).Select(group=>new{browser=group.Key.Browser,category=group.Key.Category,categoryLabel=group.Key.CategoryLabel,bytes=group.Sum(x=>x.Bytes),size=FormatBytes(group.Sum(x=>x.Bytes)),files=group.Sum(x=>x.Files)}).ToArray();
            SendToWeb(new{type="browser-analysis-state",token=token,items=items,bytes=plan.Bytes,size=FormatBytes(plan.Bytes),files=plan.Files,protectedData=new[]{"Mots de passe","Favoris","Extensions","Téléchargements","Sessions","Profils"}});
        }catch(Exception ex){SendToWeb(new{type="browser-analysis-error",message=ex.Message});}});
    }

    void RunBrowserCleanup(Dictionary<string,object> payload)
    {
        string token=payload!=null&&payload.ContainsKey("token")?Convert.ToString(payload["token"]):"";BrowserCleanupPlan plan;
        if(!Regex.IsMatch(token,"^[a-f0-9]{32}$"))throw new InvalidOperationException("Jeton d'analyse invalide.");
        lock(browserCleanupPlans){if(!browserCleanupPlans.TryGetValue(token,out plan)||plan.Expires<DateTime.UtcNow)throw new InvalidOperationException("L'analyse a expiré. Relancez-la.");browserCleanupPlans.Remove(token);}
        if(browserCleanupRunning)throw new InvalidOperationException("Un nettoyage de navigateur est déjà en cours.");
        bool closeBrowsers=payload!=null&&payload.ContainsKey("closeBrowsers")&&Convert.ToBoolean(payload["closeBrowsers"]);browserCleanupRunning=true;
        Task.Run(delegate{int deleted=0,skipped=0;long recovered=0;string logName="PC-Setup-Navigateurs-"+DateTime.Now.ToString("yyyy-MM-dd-HHmmss")+".log";var report=new StringBuilder();try{
            var definitions=BrowserDefinitions().Where(x=>plan.Browsers.Contains(x.Id)).ToArray();var running=definitions.Where(x=>Process.GetProcessesByName(x.Process).Length>0).ToArray();
            if(running.Length>0&&closeBrowsers){foreach(var browser in running)foreach(Process process in Process.GetProcessesByName(browser.Process))try{process.CloseMainWindow();}catch{}Thread.Sleep(1800);running=definitions.Where(x=>Process.GetProcessesByName(x.Process).Length>0).ToArray();}
            if(running.Length>0)throw new InvalidOperationException("Fermez complètement : "+String.Join(", ",running.Select(x=>x.Name).Distinct())+", puis relancez l'analyse.");
            SendToWeb(new{type="browser-cleanup-start",detail=plan.Targets.Count+" zone(s) analysée(s)"});
            foreach(var target in plan.Targets)try{EnsureNoReparsePoints(target.Path,target.Root);if(File.Exists(target.Path))File.Delete(target.Path);else if(Directory.Exists(target.Path))DeleteBrowserTree(target.Path,target.Root);deleted++;recovered+=target.Bytes;report.AppendLine("SUPPRIME | "+target.Browser+" | "+target.CategoryLabel+" | "+target.Path);}catch(Exception ex){skipped++;report.AppendLine("IGNORE | "+target.Path+" | "+ex.Message);}
            File.WriteAllText(Path.Combine(GetDataFolder("Logs"),logName),report.ToString(),Encoding.UTF8);SendToWeb(new{type="browser-cleanup-complete",success=skipped==0,deleted=deleted,skipped=skipped,recovered=FormatBytes(recovered),logName=logName});
        }catch(Exception ex){SendToWeb(new{type="browser-cleanup-error",message=ex.Message});}finally{browserCleanupRunning=false;}});
    }

    void DeleteBrowserTree(string path,string allowedRoot)
    {
        EnsureNoReparsePoints(path,allowedRoot);if(!Directory.Exists(path))return;
        foreach(string file in Directory.GetFiles(path))try{File.SetAttributes(file,FileAttributes.Normal);File.Delete(file);}catch{throw;}
        foreach(string folder in Directory.GetDirectories(path)){if(IsReparsePoint(folder))throw new UnauthorizedAccessException("Lien symbolique refusé.");DeleteBrowserTree(folder,allowedRoot);}
        Directory.Delete(path,false);
    }

    void AnalyzeCleanup(Dictionary<string, object> payload)
    {
        string[] allowed={"user-temp","windows-temp","recycle-bin","delivery","components"};
        var choices=ReadArray(payload,"choices").Where(x=>allowed.Contains(x)).Distinct().ToArray();
        if(choices.Length==0)throw new InvalidOperationException("Aucune zone à analyser.");
        SendToWeb(new { type="cleanup-analysis-start" });
        Task.Run(delegate {
            try
            {
                var items=new List<object>();long total=0;
                foreach(string id in choices)
                {
                    string label=id,path="",note="";long bytes=0,files=0;bool partial=false;
                    if(id=="user-temp"){label="Fichiers temporaires utilisateur";path=Path.GetTempPath();MeasurePath(path,out bytes,out files);partial=lastMeasureTruncated;}
                    else if(id=="windows-temp"){label="Fichiers temporaires Windows";path=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"Temp");MeasurePath(path,out bytes,out files);partial=lastMeasureTruncated;}
                    else if(id=="recycle-bin"){label="Corbeille";path="Corbeilles des lecteurs locaux";note="Suppression définitive après confirmation";MeasureRecycleBin(out bytes,out files);}
                    else if(id=="delivery"){label="Cache d'optimisation de livraison";path=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),@"ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache");MeasurePath(path,out bytes,out files);partial=lastMeasureTruncated;}
                    else if(id=="components"){label="Anciens composants Windows";path="Magasin de composants Windows (WinSxS)";note="Taille déterminée par DISM pendant l'opération";}
                    if(partial)note=(note.Length>0?note+" · ":"")+"mesure partielle : au moins 200 000 fichiers";
                    total+=bytes;
                    items.Add(new { id=id,label=label,path=path,bytes=bytes,size=FormatBytes(bytes),files=files,note=note });
                }
                lock(cleanupSimulations)cleanupSimulations[String.Join("|",choices.OrderBy(value=>value))]=DateTime.UtcNow.AddMinutes(5);
                SendToWeb(new { type="cleanup-analysis",items=items.ToArray(),bytes=total,size=FormatBytes(total),protectedFolders=new[]{"Bureau","Documents","Téléchargements","Images","Musique","Vidéos"} });
            }
            catch(Exception ex){SendToWeb(new { type="cleanup-analysis-error",message=ex.Message });}
        });
    }

    const int MeasurePathFileCap=200000;
    bool lastMeasureTruncated;

    void MeasurePath(string root,out long bytes,out long files)
    {
        bytes=0;files=0;lastMeasureTruncated=false;
        if(String.IsNullOrWhiteSpace(root)||!Directory.Exists(root))return;
        if(IsReparsePoint(root))return;
        var folders=new Stack<string>();folders.Push(root);int visited=0;
        while(folders.Count>0&&visited<MeasurePathFileCap)
        {
            string folder=folders.Pop();
            try
            {
                foreach(string file in Directory.GetFiles(folder)){if(visited++>=MeasurePathFileCap){lastMeasureTruncated=true;break;}try{bytes+=new FileInfo(file).Length;files++;}catch{}}
                foreach(string child in Directory.GetDirectories(folder))if(!IsReparsePoint(child))folders.Push(child);
            }catch{}
        }
        if(folders.Count>0)lastMeasureTruncated=true;
    }

    bool IsReparsePoint(string path)
    {
        try{return (File.GetAttributes(path)&FileAttributes.ReparsePoint)==FileAttributes.ReparsePoint;}catch{return true;}
    }

    // Préfixe \\?\ : contourne la limite MAX_PATH (260) sur les API fichier.
    // Nécessaire pour supprimer des arborescences profondes (caches CapCut, npm, jeux…).
    static string ExtendedPath(string path)
    {
        if(String.IsNullOrEmpty(path)||path.StartsWith(@"\\?\",StringComparison.Ordinal))return path;
        string full=Path.GetFullPath(path);
        if(full.StartsWith(@"\\",StringComparison.Ordinal))return @"\\?\UNC\"+full.Substring(2);
        return @"\\?\"+full;
    }

    // Suppression récursive tolérante : longs chemins (> 260), attributs
    // lecture seule/système/caché, et liens (le lien est retiré, jamais suivi).
    // Renvoie le nombre d'éléments qui n'ont pas pu être supprimés (0 = succès).
    static int ForceDeleteDirectory(string path)
    {
        if(String.IsNullOrEmpty(path)||!Directory.Exists(path))return 0;
        // 1) Voie normale.
        try{Directory.Delete(path,true);return 0;}catch{}
        // 2) Récursion manuelle avec remise à zéro des attributs.
        int failures=DeleteTreeManual(path);
        try{Directory.Delete(path);}catch{}
        if(!Directory.Exists(path))return failures;
        // 3) Dernier recours : rd /s /q gère nativement les chemins > 260.
        try
        {
            string ext=ExtendedPath(path);
            using(var process=Process.Start(new ProcessStartInfo("cmd.exe","/c rd /s /q \""+ext+"\""){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden}))
            {
                if(process!=null)process.WaitForExit(20000);
            }
        }
        catch{}
        if(Directory.Exists(path))failures++;
        return failures;
    }

    static int DeleteTreeManual(string dir)
    {
        int failures=0;
        try
        {
            foreach(string file in Directory.GetFiles(dir))
            {
                try{File.SetAttributes(file,FileAttributes.Normal);File.Delete(file);}catch{failures++;}
            }
            foreach(string child in Directory.GetDirectories(dir))
            {
                try
                {
                    if((File.GetAttributes(child)&FileAttributes.ReparsePoint)==FileAttributes.ReparsePoint){Directory.Delete(child);continue;}
                }
                catch{failures++;continue;}
                failures+=DeleteTreeManual(child);
                try{Directory.Delete(child);}catch{failures++;}
            }
        }
        catch{failures++;}
        return failures;
    }

    void EnsureNoReparsePoints(string path,string allowedRoot)
    {
        string root=Path.GetFullPath(allowedRoot).TrimEnd(Path.DirectorySeparatorChar,Path.AltDirectorySeparatorChar);
        string candidate=Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar,Path.AltDirectorySeparatorChar);
        if(!candidate.Equals(root,StringComparison.OrdinalIgnoreCase) && !candidate.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Chemin hors de la zone autorisee.");
        string current=root;
        if((Directory.Exists(current)||File.Exists(current))&&IsReparsePoint(current))throw new UnauthorizedAccessException("Lien symbolique refuse : "+current);
        string relative=candidate.Length==root.Length?"":candidate.Substring(root.Length+1);
        foreach(string part in relative.Split(new[]{Path.DirectorySeparatorChar,Path.AltDirectorySeparatorChar},StringSplitOptions.RemoveEmptyEntries))
        {
            current=Path.Combine(current,part);
            if((Directory.Exists(current)||File.Exists(current))&&IsReparsePoint(current))throw new UnauthorizedAccessException("Lien symbolique refuse : "+current);
        }
    }

    void MeasureRecycleBin(out long bytes,out long files)
    {
        bytes=0;files=0;
        foreach(DriveInfo drive in DriveInfo.GetDrives().Where(x=>x.DriveType==DriveType.Fixed&&x.IsReady))
        {
            long itemBytes,itemFiles;MeasurePath(Path.Combine(drive.RootDirectory.FullName,"$Recycle.Bin"),out itemBytes,out itemFiles);
            bytes+=itemBytes;files+=itemFiles;
        }
    }

    string FormatBytes(long bytes)
    {
        double value=bytes;string[] units={"o","Ko","Mo","Go","To"};int unit=0;
        while(value>=1024&&unit<units.Length-1){value/=1024;unit++;}
        return value.ToString(unit==0?"0":"0.##")+" "+units[unit];
    }

    void SendToWeb(object data)
    {
        if (InvokeRequired) { BeginInvoke(new Action<object>(SendToWeb),data); return; }
        if (webView.CoreWebView2 != null) webView.CoreWebView2.PostWebMessageAsJson(json.Serialize(data));
    }

    void RunCleanup(Dictionary<string, object> payload)
    {
        string[] allowed = {"user-temp","windows-temp","recycle-bin","delivery","components"};
        var choices = ReadArray(payload, "choices").Where(x => allowed.Contains(x)).Distinct().ToArray();
        if (choices.Length == 0) throw new InvalidOperationException("Aucune zone de nettoyage n'est sélectionnée.");
        string simulationKey=String.Join("|",choices.OrderBy(value=>value));
        lock(cleanupSimulations)
        {
            DateTime expires;
            if(!cleanupSimulations.TryGetValue(simulationKey,out expires)||expires<DateTime.UtcNow)throw new InvalidOperationException("La simulation de nettoyage est absente ou expirée. Relancez l'analyse.");
            cleanupSimulations.Remove(simulationKey);
        }
        if(cleanupRunning) throw new InvalidOperationException("Un nettoyage est déjà en cours.");
        if(installationRunning || uninstallRunning || repairRunning || updateRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        cleanupRunning=true;
        SendToWeb(new { type="cleanup-start", total=choices.Length });
        Task.Run(delegate {
            var report=new StringBuilder();
            string recovered="0";
            int code=-1;
            string logName="PC-Setup-Nettoyage-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            try
            {
                string arguments="--elevated-cleanup \""+String.Join(",",choices)+"\" \""+logPath+"\"";
                SendToWeb(new { type="cleanup-stage", id="elevation", label="Autorisation Windows et nettoyage securise", index=1, total=choices.Length, percent=35 });
                code=RunElevatedProcess(Application.ExecutablePath,arguments,report);
                try
                {
                    if(File.Exists(logPath))
                    {
                        string contents=File.ReadAllText(logPath,Encoding.UTF8);
                        Match result=Regex.Match(contents,@"PCSETUP_RESULT\|([^\r\n]+)");
                        if(result.Success)recovered=result.Groups[1].Value.Trim();
                    }
                }
                catch{}
            }
            catch(Exception ex)
            {
                report.AppendLine(); report.AppendLine("ERREUR : "+ex.Message);
            }
            finally
            {
                try { if(!File.Exists(logPath)) File.WriteAllText(logPath,report.ToString(),Encoding.UTF8); } catch { }
                cleanupRunning=false;
                SendToWeb(new { type="cleanup-complete", success=code==0, code=code, recovered=recovered, logName=logName });
            }
        });
    }

    IEnumerable<string> ReadArray(Dictionary<string, object> payload, string key)
    {
        if (payload == null || !payload.ContainsKey(key)) return Enumerable.Empty<string>();
        var array = payload[key] as object[];
        if (array != null) return array.Select(Convert.ToString);
        var list = payload[key] as ArrayList;
        return list == null ? Enumerable.Empty<string>() : list.Cast<object>().Select(Convert.ToString);
    }

    string WriteTempJson(string prefix, string[] values)
    {
        string folder = Path.Combine(Path.GetTempPath(), "PCSetup");
        Directory.CreateDirectory(folder);
        string file = Path.Combine(folder, prefix + "-" + Guid.NewGuid().ToString("N") + ".json");
        File.WriteAllText(file, json.Serialize(values), System.Text.Encoding.UTF8);
        return file;
    }

    void StartScript(string name, string extraArguments)
    {
        string script = Path.Combine(appRoot, name);
        if (!File.Exists(script)) throw new FileNotFoundException("Composant manquant", name);
        string args = "-NoProfile -ExecutionPolicy Bypass -File \"" + script + "\"";
        if (!String.IsNullOrEmpty(extraArguments)) args += " " + extraArguments;
        Process.Start(new ProcessStartInfo { FileName="powershell.exe", Arguments=args, WorkingDirectory=appRoot, UseShellExecute=true });
    }
}

internal static class Bootstrap
{
    internal static string AppRoot;
    static string RuntimeRoot;

    static void MigrateDesktopArtifacts()
    {
        string desktop=Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        string dataRoot=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"PCSetup");
        string logs=Path.Combine(dataRoot,"Logs");
        string quarantine=Path.Combine(dataRoot,"Quarantine");
        Directory.CreateDirectory(logs);
        Directory.CreateDirectory(quarantine);
        foreach(string file in Directory.GetFiles(desktop,"PC-Setup-*.log",SearchOption.TopDirectoryOnly))
        {
            try
            {
                string destination=Path.Combine(logs,Path.GetFileName(file));
                if(File.Exists(destination))destination=Path.Combine(logs,Path.GetFileNameWithoutExtension(file)+"-"+Guid.NewGuid().ToString("N").Substring(0,6)+".log");
                File.Move(file,destination);
            }
            catch { }
        }
        foreach(string folder in Directory.GetDirectories(desktop,"PC-Setup-Quarantaine-*",SearchOption.TopDirectoryOnly))
        {
            try
            {
                string destination=Path.Combine(quarantine,Path.GetFileName(folder));
                if(Directory.Exists(destination))destination+="-"+Guid.NewGuid().ToString("N").Substring(0,6);
                Directory.Move(folder,destination);
            }
            catch { }
        }
    }

    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool SetDllDirectory(string lpPathName);

    static int RunElevatedCleanupWorker(string choicesValue,string logValue)
    {
        var principal=new WindowsPrincipal(WindowsIdentity.GetCurrent());
        if(!principal.IsInRole(WindowsBuiltInRole.Administrator))return 740;
        string[] allowed={"user-temp","windows-temp","recycle-bin","delivery","components"};
        string[] choices=(choicesValue??"").Split(new[]{','},StringSplitOptions.RemoveEmptyEntries).Where(value=>allowed.Contains(value)).Distinct().ToArray();
        if(choices.Length==0 || String.Join(",",choices)!=(choicesValue??""))return 87;
        string logRoot=Path.GetFullPath(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"PCSetup","Logs"))+Path.DirectorySeparatorChar;
        string logPath=Path.GetFullPath(logValue??"");
        if(!logPath.StartsWith(logRoot,StringComparison.OrdinalIgnoreCase) || !Regex.IsMatch(Path.GetFileName(logPath),@"^PC-Setup-Nettoyage-\d{4}-\d{2}-\d{2}-\d{4}\.log$"))return 87;
        Directory.CreateDirectory(logRoot);

        string programData=Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData);
        string secureParent=Path.Combine(programData,"PCSetup");
        Directory.CreateDirectory(secureParent);
        if((File.GetAttributes(programData)&FileAttributes.ReparsePoint)!=0 || (File.GetAttributes(secureParent)&FileAttributes.ReparsePoint)!=0)return 5;
        string secureRoot=Path.Combine(secureParent,"SecureRuntime");
        Directory.CreateDirectory(secureRoot);
        if((File.GetAttributes(secureRoot)&FileAttributes.ReparsePoint)!=0)return 5;
        var administrators=new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid,null);
        var system=new SecurityIdentifier(WellKnownSidType.LocalSystemSid,null);
        var users=new SecurityIdentifier(WellKnownSidType.BuiltinUsersSid,null);
        var security=new DirectorySecurity();
        security.SetAccessRuleProtection(true,false);
        security.SetOwner(administrators);
        var inheritance=InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit;
        security.AddAccessRule(new FileSystemAccessRule(administrators,FileSystemRights.FullControl,inheritance,PropagationFlags.None,AccessControlType.Allow));
        security.AddAccessRule(new FileSystemAccessRule(system,FileSystemRights.FullControl,inheritance,PropagationFlags.None,AccessControlType.Allow));
        security.AddAccessRule(new FileSystemAccessRule(users,FileSystemRights.ReadAndExecute,inheritance,PropagationFlags.None,AccessControlType.Allow));
        Directory.SetAccessControl(secureRoot,security);

        string cleanupScript=Path.Combine(secureRoot,"Liberer-espace-disque.ps1");
        string residueScript=Path.Combine(secureRoot,"Nettoyer-residus-applications.ps1");
        Extract("Liberer-espace-disque.ps1",cleanupScript);
        Extract("Nettoyer-residus-applications.ps1",residueScript);
        string choicesFile=Path.Combine(secureRoot,"cleanup-"+Guid.NewGuid().ToString("N")+".json");
        File.WriteAllText(choicesFile,new JavaScriptSerializer().Serialize(choices),Encoding.UTF8);
        string arguments="-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \""+cleanupScript+"\" -ChoicesFile \""+choicesFile+"\" -Integrated -LogPath \""+logPath+"\"";
        using(var process=Process.Start(new ProcessStartInfo{FileName="powershell.exe",Arguments=arguments,UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=secureRoot}))
        {
            process.WaitForExit();return process.ExitCode;
        }
    }

    // ------------------------------------------------------------------
    // Mode ligne de commande (sans interface) — style Ninite.
    //   OwlSetup.exe --install VideoLAN.VLC,7zip.7zip
    //   OwlSetup.exe --uninstall 7zip.7zip
    //   OwlSetup.exe --list [filtre]
    //   OwlSetup.exe --search vlc
    //   OwlSetup.exe --help | --version
    // L'exécutable est compilé en /target:winexe : on rattache la console
    // du processus appelant pour écrire la sortie.
    // ------------------------------------------------------------------

    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AttachConsole(int dwProcessId);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("kernel32.dll")] static extern bool FreeConsole();
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int nStdHandle);
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [DllImport("kernel32.dll")] static extern uint GetFileType(IntPtr hFile);
    const int ATTACH_PARENT_PROCESS = -1;
    const int STD_OUTPUT_HANDLE = -11, STD_ERROR_HANDLE = -12;
    const uint FILE_TYPE_DISK = 0x0001, FILE_TYPE_PIPE = 0x0003;

    // Vrai seulement si le flux standard pointe vers un vrai tube ou fichier
    // (redirection voulue par l'appelant : « ... > sortie.txt », capture par un
    // script). Un handle nul — cas d'un winexe lancé par le shim console — n'est
    // PAS considéré comme redirigé : il faut alors rattacher une console.
    static bool CliStdIsRealRedirect(int stdHandle)
    {
        IntPtr handle=GetStdHandle(stdHandle);
        if(handle==IntPtr.Zero || handle==new IntPtr(-1))return false;
        uint type=GetFileType(handle);
        return type==FILE_TYPE_PIPE || type==FILE_TYPE_DISK;
    }

    // Tout premier argument qui ressemble à une option (« -x », « --x », « /? »)
    // bascule en mode ligne de commande : RunCli affichera l'aide pour une
    // option inconnue plutôt que de démarrer l'interface graphique.
    static bool IsCliInvocation(string value)
    {
        if(String.IsNullOrEmpty(value))return false;
        return value[0]=='-' || value=="/?";
    }

    static void CliAttachConsole()
    {
        try
        {
            // On ne touche à rien seulement si les DEUX flux vont vers un vrai
            // tube/fichier (redirection voulue). Sinon — console interactive, ou
            // handles nuls d'un winexe lancé par le shim — on (re)branche.
            bool outRealRedirect=CliStdIsRealRedirect(STD_OUTPUT_HANDLE);
            bool errRealRedirect=CliStdIsRealRedirect(STD_ERROR_HANDLE);
            if(outRealRedirect && errRealRedirect)return;

            // AttachConsole rattache la console de l'appelant si on n'en a pas ;
            // s'il échoue (console déjà héritée via le shim .com), on écrit quand
            // même sur le périphérique console CONOUT$, fiable dès qu'un
            // processus est attaché à une console, avec son encodage (accents).
            AttachConsole(ATTACH_PARENT_PROCESS);
            Encoding consoleEncoding;
            try{consoleEncoding=Console.OutputEncoding;}catch{consoleEncoding=Encoding.UTF8;}
            if(!outRealRedirect)
            {
                try{Console.SetOut(new StreamWriter(new FileStream("CONOUT$",FileMode.Open,FileAccess.Write,FileShare.ReadWrite),consoleEncoding){AutoFlush=true});}catch{}
            }
            if(!errRealRedirect)
            {
                try{Console.SetError(new StreamWriter(new FileStream("CONOUT$",FileMode.Open,FileAccess.Write,FileShare.ReadWrite),consoleEncoding){AutoFlush=true});}catch{}
            }
        }
        catch{}
    }

    static bool CliIsAdmin()
    {
        try{return new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator);}
        catch{return false;}
    }

    // --- Auto-elevation avec relais de sortie (lot 7) -----------------------
    //
    // L elevation est OPT-IN (--elevate). Un outil pilote par un script ou un
    // MDM ne doit jamais faire surgir une invite UAC de lui-meme : sans le
    // drapeau, le comportement reste inchange (avertissement, nettoyage saute).
    //
    // Une elevation passe forcement par ShellExecute + « runas », qui interdit
    // la redirection des flux : le processus eleve ne peut donc pas ecrire dans
    // la console de l appelant. Il ecrit dans un fichier de relais que le
    // processus parent recopie ensuite sur sa propre sortie, avant de renvoyer
    // le code de sortie de l enfant. L appelant voit donc la sortie et le code
    // comme si l operation s etait deroulee sans elevation.
    const string CliRelaySwitch="--elevated-relay";
    static readonly Regex CliRelayNamePattern=new Regex(@"^PC-Setup-Elevation-\d{4}-\d{2}-\d{2}-\d{6}-[a-f0-9]{8}\.log$");

    // Les verbes qui touchent la machine entiere. --list, --search, --version…
    // n ont aucune raison de demander des droits.
    static bool CliVerbCanNeedAdmin(string verb)
    {
        return verb=="--install" || verb=="--uninstall" || verb=="--apply" || verb=="--update";
    }

    /// Mise entre guillemets a la convention Windows (CommandLineToArgvW) :
    /// les antislashs qui precedent un guillemet doivent etre doubles.
    static string CliQuoteArgument(string argument)
    {
        if(argument==null)return "\"\"";
        var builder=new StringBuilder("\"");
        int backslashes=0;
        foreach(char c in argument)
        {
            if(c=='\\'){backslashes++;continue;}
            if(c=='"'){builder.Append('\\',backslashes*2+1);builder.Append('"');}
            else{builder.Append('\\',backslashes);builder.Append(c);}
            backslashes=0;
        }
        builder.Append('\\',backslashes*2);
        builder.Append('"');
        return builder.ToString();
    }

    static bool CliIsValidRelayPath(string path)
    {
        try
        {
            if(String.IsNullOrWhiteSpace(path))return false;
            string root=Path.GetFullPath(CliLogsFolder())+Path.DirectorySeparatorChar;
            string full=Path.GetFullPath(path);
            return full.StartsWith(root,StringComparison.OrdinalIgnoreCase)
                && CliRelayNamePattern.IsMatch(Path.GetFileName(full));
        }
        catch{return false;}
    }

    /// Relance le processus courant en eleve, puis rejoue sa sortie.
    static int CliRunElevated(string[] commandLine)
    {
        string relay=Path.Combine(CliLogsFolder(),
            "PC-Setup-Elevation-"+DateTime.Now.ToString("yyyy-MM-dd-HHmmss")
            +"-"+Guid.NewGuid().ToString("N").Substring(0,8)+".log");

        var arguments=new StringBuilder();
        arguments.Append(CliRelaySwitch).Append(' ').Append(CliQuoteArgument(relay));
        // On rejoue les arguments d origine, sans --elevate : l enfant est deja
        // eleve, il ne doit surtout pas tenter de s elever a son tour.
        for(int i=1;i<commandLine.Length;i++)
        {
            if(commandLine[i]=="--elevate")continue;
            arguments.Append(' ').Append(CliQuoteArgument(commandLine[i]));
        }

        int code;
        try
        {
            using(var process=new Process())
            {
                process.StartInfo=new ProcessStartInfo{
                    FileName=Assembly.GetExecutingAssembly().Location,
                    Arguments=arguments.ToString(),
                    UseShellExecute=true,
                    Verb="runas",
                    WindowStyle=ProcessWindowStyle.Hidden
                };
                process.Start();
                process.WaitForExit();
                code=process.ExitCode;
            }
        }
        catch(System.ComponentModel.Win32Exception ex)
        {
            try{File.Delete(relay);}catch{}
            if(ex.NativeErrorCode==1223)
            {
                Console.Error.WriteLine("Elevation refusee : l'invite administrateur a ete annulee.");
                return 1223;
            }
            Console.Error.WriteLine("Elevation impossible : "+ex.Message);
            return ex.NativeErrorCode;
        }
        catch(Exception ex)
        {
            try{File.Delete(relay);}catch{}
            Console.Error.WriteLine("Elevation impossible : "+ex.Message);
            return -1;
        }

        try
        {
            if(File.Exists(relay))
            {
                foreach(string line in File.ReadAllLines(relay,Encoding.UTF8))Console.Out.WriteLine(line);
                File.Delete(relay);
            }
        }
        catch{}
        return code;
    }

    /// Point d entree du processus eleve : ecrit toute sa sortie dans le relais.
    internal static int CliRelayWorker(string[] commandLine)
    {
        // L enfant ne s eleve jamais lui-meme : s il n est pas deja
        // administrateur, l invocation est illegitime.
        if(!CliIsAdmin())return 740;
        string relay=commandLine.Length>2?commandLine[2]:null;
        if(!CliIsValidRelayPath(relay))return 87;

        var buffer=new StringWriter();
        var previousOut=Console.Out;
        var previousError=Console.Error;
        int code;
        try
        {
            Console.SetOut(buffer);
            Console.SetError(buffer);
            var forwarded=new List<string>{commandLine[0]};
            for(int i=3;i<commandLine.Length;i++)forwarded.Add(commandLine[i]);
            try{code=forwarded.Count>=2?RunCli(forwarded.ToArray()):2;}
            catch(Exception ex){buffer.WriteLine(ex.Message);code=-1;}
        }
        finally
        {
            Console.SetOut(previousOut);
            Console.SetError(previousError);
        }
        try{File.WriteAllText(relay,buffer.ToString(),Encoding.UTF8);}catch{}
        return code;
    }

    static string CliResolveWinget()
    {
        try
        {
            string alias=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Microsoft","WindowsApps","winget.exe");
            if(File.Exists(alias))return alias;
        }
        catch{}
        try
        {
            string windowsApps=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"WindowsApps");
            if(Directory.Exists(windowsApps))
                foreach(string package in Directory.GetDirectories(windowsApps,"Microsoft.DesktopAppInstaller_*__8wekyb3d8bbwe",SearchOption.TopDirectoryOnly).OrderByDescending(Directory.GetLastWriteTimeUtc))
                {
                    string candidate=Path.Combine(package,"winget.exe");
                    try{if(File.Exists(candidate) && (File.GetAttributes(candidate)&FileAttributes.ReparsePoint)==0)return candidate;}catch{}
                }
        }
        catch{}
        return null;
    }

    static List<Dictionary<string,object>> CliCatalog()
    {
        string js;
        using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("catalog.generated.js"))
        using(var reader=new StreamReader(stream,Encoding.UTF8))
            js=reader.ReadToEnd();
        int left=js.IndexOf('['),right=js.LastIndexOf(']');
        if(left<0 || right<=left)throw new InvalidDataException("catalogue introuvable dans la ressource.");
        var array=new JavaScriptSerializer().DeserializeObject(js.Substring(left,right-left+1)) as object[];
        var list=new List<Dictionary<string,object>>();
        if(array!=null)
            foreach(object item in array)
            {
                var entry=item as Dictionary<string,object>;
                if(entry!=null)list.Add(entry);
            }
        return list;
    }

    static string CliField(Dictionary<string,object> entry,string key)
    {
        object value;
        return entry!=null && entry.TryGetValue(key,out value) ? Convert.ToString(value) : "";
    }

    static string[] CliParseIds(string[] rest)
    {
        return String.Join(",",rest)
            .Split(new[]{',',' ',';','\t'},StringSplitOptions.RemoveEmptyEntries)
            .Select(value=>value.Trim())
            .Where(value=>WebAppForm.IsValidPackageId(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    // Transcription : tout ce qui est affiché est aussi conservé ici pour que
    // --apply puisse écrire un journal fichier de l'opération complète.
    static readonly StringBuilder CliTranscript = new StringBuilder();
    static void CliOut(string line){ Console.Out.WriteLine(line); CliTranscript.AppendLine(line); }
    static void CliErr(string line){ Console.Error.WriteLine(line); CliTranscript.AppendLine(line); }

    static readonly string[] CliCleanupZones = { "user-temp", "windows-temp", "recycle-bin", "delivery", "components" };

    static string CliLogsFolder()
    {
        string folder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"PCSetup","Logs");
        Directory.CreateDirectory(folder);
        return folder;
    }

    static int CliRunWinget(string winget,string arguments){ return CliRunWinget(winget,arguments,false); }

    static int CliRunWinget(string winget,string arguments,bool silent)
    {
        try
        {
            var info=new ProcessStartInfo
            {
                FileName=winget,Arguments=arguments,UseShellExecute=false,CreateNoWindow=true,
                RedirectStandardOutput=true,RedirectStandardError=true,
                StandardOutputEncoding=Encoding.UTF8,StandardErrorEncoding=Encoding.UTF8
            };
            var lines=new List<string>();
            object sync=new object();
            using(var process=new Process{StartInfo=info})
            {
                process.OutputDataReceived+=delegate(object s,DataReceivedEventArgs e){ if(e.Data!=null){lock(sync)lines.Add(e.Data);} };
                process.ErrorDataReceived+=delegate(object s,DataReceivedEventArgs e){ if(e.Data!=null){lock(sync)lines.Add(e.Data);} };
                process.Start();process.BeginOutputReadLine();process.BeginErrorReadLine();process.WaitForExit();
                // En mode silencieux on ne détaille que si l'opération a échoué.
                bool show=!silent || process.ExitCode!=0;
                foreach(string line in lines)
                {
                    CliTranscript.AppendLine("  "+line);
                    if(show)Console.Out.WriteLine("  "+line);
                }
                return process.ExitCode;
            }
        }
        catch(Exception ex)
        {
            CliErr("  "+ex.Message);
            return -1;
        }
    }

    static void CliHelp()
    {
        Console.Out.WriteLine("OwlSetup "+BuildInfo.DisplayVersion+" ("+BuildInfo.Channel+") — mode ligne de commande");
        Console.Out.WriteLine();
        Console.Out.WriteLine("  OwlSetup.exe --install <id>[,<id>...]    Installe / met à jour des logiciels via WinGet");
        Console.Out.WriteLine("  OwlSetup.exe --uninstall <id>[,<id>...]  Désinstalle des logiciels");
        Console.Out.WriteLine("  OwlSetup.exe --apply <config.pcsetup.json>  Rejoue une configuration exportée par l'interface");
        Console.Out.WriteLine("  OwlSetup.exe --update [<id>,...]          Met a jour (tout si aucun identifiant)");
        Console.Out.WriteLine("  OwlSetup.exe --check-updates [--json]     Liste les mises a jour disponibles");
        Console.Out.WriteLine("  OwlSetup.exe --export-profile <fichier>   Ecrit un profil rejouable par --apply");
        Console.Out.WriteLine("  OwlSetup.exe --list [filtre] [--json]    Liste le catalogue intégré");
        Console.Out.WriteLine("  OwlSetup.exe --search <terme>            Recherche dans la source WinGet");
        Console.Out.WriteLine("  OwlSetup.exe --version                   Version d'OwlSetup");
        Console.Out.WriteLine("  OwlSetup.exe --help                      Cette aide");
        Console.Out.WriteLine();
        Console.Out.WriteLine("Options : --dry-run (simule sans rien changer), --silent (sortie minimale),");
        Console.Out.WriteLine("          --elevate (relance en administrateur si nécessaire, puis rejoue la");
        Console.Out.WriteLine("          sortie et le code de l'opération élevée).");
        Console.Out.WriteLine("--elevate ne s'applique qu'à --install, --uninstall, --apply et --update, et");
        Console.Out.WriteLine("reste sans effet avec --dry-run. Sans ce drapeau, aucune invite UAC n'apparaît :");
        Console.Out.WriteLine("les actions qui exigent des droits sont signalées puis ignorées.");
        Console.Out.WriteLine("--apply exécute aussi les zones de nettoyage de la config si la session est élevée,");
        Console.Out.WriteLine("et écrit un journal dans %LOCALAPPDATA%\\PCSetup\\Logs.");
        Console.Out.WriteLine();
        Console.Out.WriteLine("Exemple : OwlSetup.exe --install VideoLAN.VLC,7zip.7zip,Mozilla.Firefox");
        Console.Out.WriteLine("Exemple : OwlSetup.exe --apply parc.pcsetup.json --silent");
        Console.Out.WriteLine("Exemple : OwlSetup.exe --export-profile modele.pcsetup.json");
        Console.Out.WriteLine("Exemple : OwlSetup.exe --check-updates --json");
        Console.Out.WriteLine("Sans argument, OwlSetup démarre son interface graphique.");
        Console.Out.WriteLine();
        Console.Out.WriteLine("Codes de sortie : 0 = succès, 1 = un échec au moins, 2 = usage, 3 = WinGet absent.");
        Console.Out.WriteLine("--check-updates renvoie 1 quand au moins une mise a jour est disponible (0 sinon).");
        Console.Out.WriteLine("Depuis PowerShell, pour attendre la fin et lire le code :");
        Console.Out.WriteLine("  Start-Process OwlSetup.exe -ArgumentList '--install VideoLAN.VLC' -Wait -NoNewWindow -PassThru");
    }

    static int CliList(string filter,bool asJson)
    {
        List<Dictionary<string,object>> apps;
        try{apps=CliCatalog();}
        catch(Exception ex){Console.Error.WriteLine("Catalogue illisible : "+ex.Message);return 3;}
        var rows=new List<Dictionary<string,object>>();
        foreach(var entry in apps)
        {
            string id=CliField(entry,"id"),name=CliField(entry,"name"),category=CliField(entry,"category");
            if(!String.IsNullOrEmpty(filter) && (id+" "+name+" "+category).IndexOf(filter,StringComparison.OrdinalIgnoreCase)<0)continue;
            rows.Add(new Dictionary<string,object>{{"id",id},{"name",name},{"category",category}});
        }
        if(asJson)
        {
            Console.Out.WriteLine(new JavaScriptSerializer().Serialize(rows));
            return 0;
        }
        foreach(var row in rows)
        {
            string id=Convert.ToString(row["id"]);
            Console.Out.WriteLine((id.Length<36?id.PadRight(36):id+" ")+row["name"]+(String.IsNullOrEmpty(Convert.ToString(row["category"]))?"":"  ["+row["category"]+"]"));
        }
        Console.Out.WriteLine();
        Console.Out.WriteLine(rows.Count+" application(s). Installer : OwlSetup.exe --install <id>");
        return 0;
    }

    static int CliSearch(string[] rest)
    {
        string query=String.Join(" ",rest).Trim();
        if(query.Length<2){Console.Error.WriteLine("Requête trop courte (2 caractères minimum).");return 2;}
        string winget=CliResolveWinget();
        if(winget==null){Console.Error.WriteLine("WinGet est introuvable. Installez « App Installer » depuis le Microsoft Store.");return 3;}
        return CliRunWinget(winget,"search --query \""+query.Replace("\"","")+"\" --source winget --accept-source-agreements --disable-interactivity");
    }

    static int CliInstallOrRemove(string[] rest,bool remove,bool dryRun,bool silent)
    {
        var ids=CliParseIds(rest);
        if(ids.Length==0)
        {
            Console.Error.WriteLine("Aucun identifiant valide. Exemple : OwlSetup.exe --install VideoLAN.VLC,7zip.7zip");
            return 2;
        }
        return CliRunInstallLoop(ids,remove,dryRun,silent);
    }

    static int CliRunInstallLoop(string[] ids,bool remove,bool dryRun,bool silent)
    {
        if(dryRun)
        {
            CliOut("[simulation] "+(remove?"Désinstallerait":"Installerait ou mettrait à jour")+" "+ids.Length+" application(s) :");
            foreach(string id in ids)CliOut("  - "+id);
            CliOut("[simulation] Mettrait ensuite a jour ceux que WinGet signale ameliorables.");
            CliOut("[simulation] Aucune modification effectuée.");
            return 0;
        }
        string winget=CliResolveWinget();
        if(winget==null){Console.Error.WriteLine("WinGet est introuvable. Installez « App Installer » depuis le Microsoft Store.");return 3;}
        if(!remove && !CliIsAdmin())
            CliOut("Note : les logiciels installés pour toute la machine demandent des droits administrateur.\n      Relancez depuis une invite « Administrateur » si une installation échoue.\n");

        int ok=0,failed=0;
        foreach(string id in ids)
        {
            CliOut((remove?"Désinstallation de ":"Installation de ")+id+" ...");
            string arguments=remove
                ? "uninstall --id \""+id+"\" --exact --silent --accept-source-agreements --disable-interactivity"
                : "install --id \""+id+"\" --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity";
            int code=CliRunWinget(winget,arguments,silent);
            // 0x8A15002B (-1978335189) = rien à faire (déjà installé / à jour) : on
            // le compte comme un succès pour rester idempotent.
            if(code==0 || code==unchecked((int)0x8A15002B))
            {
                ok++;
                CliOut("  -> OK : "+id);
            }
            else
            {
                failed++;
                CliErr("  -> ÉCHEC : "+id+" (code "+code+")");
            }
        }
        CliOut("");
        CliOut((remove?"Désinstallation":"Installation")+" terminée : "+ok+" réussie(s), "+failed+" en échec.");
        return failed==0 ? 0 : 1;
    }

    // --apply <fichier.pcsetup.json> : rejoue une configuration exportée par
    // l'interface. Installe/met à jour « selectedPackages » (repli
    // « installedPackages »), puis exécute les zones « cleanupChoices » si la
    // session est élevée. --dry-run affiche le plan sans rien changer,
    // --silent réduit la sortie, et un journal est écrit dans le dossier Logs.
    static int CliApply(string[] rest,bool dryRun,bool silent)
    {
        string path=String.Join(" ",rest).Trim().Trim('"');
        if(path.Length==0){Console.Error.WriteLine("Usage : OwlSetup.exe --apply <fichier.pcsetup.json> [--dry-run] [--silent]");return 2;}
        if(!File.Exists(path)){Console.Error.WriteLine("Fichier introuvable : "+path);return 2;}

        string[] ids;string source;string[] cleanup;
        try
        {
            var fileInfo=new FileInfo(path);
            if(fileInfo.Length>1024*1024){Console.Error.WriteLine("Fichier de configuration trop volumineux (max 1 Mo).");return 2;}
            var root=new JavaScriptSerializer().DeserializeObject(File.ReadAllText(path,Encoding.UTF8)) as Dictionary<string,object>;
            if(root==null || !root.ContainsKey("format") || Convert.ToString(root["format"])!="pc-setup-configuration")
            {
                Console.Error.WriteLine("Ce fichier n'est pas une configuration OwlSetup (champ « format » attendu).");
                return 2;
            }
            ids=CliConfigIds(root,"selectedPackages");source="selectedPackages";
            if(ids.Length==0){ids=CliConfigIds(root,"installedPackages");source="installedPackages";}
            if(ids.Length==0){Console.Error.WriteLine("La configuration ne contient aucun identifiant exploitable.");return 2;}
            // Zones de nettoyage : filtrées et réordonnées selon la liste autorisée
            // (RunElevatedCleanupWorker impose l'ordre exact de CliCleanupZones).
            var raw=root.ContainsKey("cleanupChoices") ? CliConfigIds(root,"cleanupChoices") : new string[0];
            cleanup=CliCleanupZones.Where(zone=>raw.Contains(zone,StringComparer.OrdinalIgnoreCase)).ToArray();
        }
        catch(Exception ex)
        {
            Console.Error.WriteLine("Configuration illisible : "+ex.Message);
            return 2;
        }

        CliOut("Configuration : "+Path.GetFileName(path)+" — "+ids.Length+" application(s) ("+source+")"+(cleanup.Length>0?", "+cleanup.Length+" zone(s) de nettoyage":"")+".");
        CliOut("");

        if(dryRun)
        {
            CliOut("[simulation] Installerait ou mettrait à jour :");
            foreach(string id in ids)CliOut("  - "+id);
            if(cleanup.Length>0)CliOut("[simulation] Nettoierait : "+String.Join(", ",cleanup)+(CliIsAdmin()?"":" (droits administrateur requis)"));
            CliOut("[simulation] Aucune modification effectuée.");
            return 0;
        }

        int code=CliRunInstallLoop(ids,false,false,silent);

        // Passe de mise a jour : l installation laisse les paquets deja presents
        // dans leur version actuelle. --apply doit amener la machine a l etat
        // decrit par la configuration, on met donc a jour ceux que WinGet
        // signale comme ameliorables (et eux seuls, pour rester rapide).
        string applyWinget=CliResolveWinget();
        if(applyWinget!=null)
        {
            int probe;
            var wanted=new HashSet<string>(ids,StringComparer.OrdinalIgnoreCase);
            string[] upgradable=CliAvailableUpdates(applyWinget,out probe)
                .Select(row=>row["id"].Trim())
                .Where(id=>wanted.Contains(id))
                .Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
            if(upgradable.Length>0)
            {
                CliOut("");
                CliOut("Mise a jour de "+upgradable.Length+" paquet(s) deja present(s) ...");
                if(CliUpgradeLoop(applyWinget,upgradable,false,silent)!=0)code=1;
            }
        }

        if(cleanup.Length>0)
        {
            CliOut("");
            if(!CliIsAdmin())
            {
                CliOut("Nettoyage ignoré : "+String.Join(", ",cleanup)+" — droits administrateur requis (relancez depuis une invite élevée).");
            }
            else
            {
                string cleanupLog=Path.Combine(CliLogsFolder(),"PC-Setup-Nettoyage-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log");
                CliOut("Nettoyage : "+String.Join(", ",cleanup)+" ...");
                int cleanupCode;
                try{cleanupCode=RunElevatedCleanupWorker(String.Join(",",cleanup),cleanupLog);}
                catch(Exception ex){cleanupCode=-1;CliErr("  "+ex.Message);}
                string recovered="0";
                try
                {
                    if(File.Exists(cleanupLog))
                    {
                        Match m=Regex.Match(File.ReadAllText(cleanupLog,Encoding.UTF8),@"PCSETUP_RESULT\|([^\r\n]+)");
                        if(m.Success)recovered=m.Groups[1].Value.Trim();
                    }
                }
                catch{}
                if(cleanupCode==0)CliOut("  -> Nettoyage terminé : "+recovered+" récupérés (journal "+Path.GetFileName(cleanupLog)+").");
                else CliErr("  -> Nettoyage en échec (code "+cleanupCode+").");
            }
        }

        try
        {
            string transcriptPath=Path.Combine(CliLogsFolder(),"PC-Setup-CLI-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log");
            File.WriteAllText(transcriptPath,CliTranscript.ToString(),Encoding.UTF8);
            Console.Out.WriteLine("Journal : "+transcriptPath);
        }
        catch{}

        return code;
    }

    static string[] CliConfigIds(Dictionary<string,object> root,string key)
    {
        object value;
        if(root==null || !root.TryGetValue(key,out value))return new string[0];
        var array=value as object[];
        if(array==null)return new string[0];
        return array.Select(item=>Convert.ToString(item).Trim())
            .Where(id=>key=="cleanupChoices" ? Regex.IsMatch(id,"^[a-z-]+$") : WebAppForm.IsValidPackageId(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }


    // Execute winget en capturant les lignes (sans les afficher) : utilise par
    // --check-updates et --export-profile qui doivent analyser la sortie.
    static int CliCaptureWinget(string winget,string arguments,out List<string> lines)
    {
        var captured=new List<string>();
        lines=captured;
        try
        {
            var info=new ProcessStartInfo
            {
                FileName=winget,Arguments=arguments,UseShellExecute=false,CreateNoWindow=true,
                RedirectStandardOutput=true,RedirectStandardError=true,
                StandardOutputEncoding=Encoding.UTF8,StandardErrorEncoding=Encoding.UTF8
            };
            object sync=new object();
            using(var process=new Process{StartInfo=info})
            {
                process.OutputDataReceived+=delegate(object s,DataReceivedEventArgs e){ if(e.Data!=null){lock(sync)captured.Add(e.Data);} };
                process.ErrorDataReceived+=delegate(object s,DataReceivedEventArgs e){ if(e.Data!=null){lock(sync)captured.Add(e.Data);} };
                process.Start();process.BeginOutputReadLine();process.BeginErrorReadLine();process.WaitForExit();
                foreach(string line in captured)CliTranscript.AppendLine("  "+line);
                return process.ExitCode;
            }
        }
        catch(Exception ex)
        {
            CliErr("  "+ex.Message);
            return -1;
        }
    }

    // Identifiants installes, via `winget export` (JSON) : plus fiable que
    // l'analyse du tableau de `winget list`, et identique a ce que fait
    // ExportConfiguration cote interface.
    static string[] CliInstalledIds(string winget)
    {
        string temp=Path.Combine(Path.GetTempPath(),"PCSetup","cli-export-"+Guid.NewGuid().ToString("N")+".json");
        var ids=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(temp));
            List<string> ignored;
            CliCaptureWinget(winget,"export -o \""+temp+"\" --accept-source-agreements --disable-interactivity",out ignored);
            if(File.Exists(temp))
                foreach(Match match in Regex.Matches(File.ReadAllText(temp,Encoding.UTF8),"\"PackageIdentifier\"\\s*:\\s*\"([^\"]+)\"",RegexOptions.IgnoreCase))
                {
                    string id=match.Groups[1].Value;
                    if(WebAppForm.IsValidPackageId(id))ids.Add(id);
                }
        }
        catch{}
        finally{try{if(File.Exists(temp))File.Delete(temp);}catch{}}
        return ids.OrderBy(x=>x,StringComparer.OrdinalIgnoreCase).ToArray();
    }

    // Mises a jour proposees par WinGet, via l'analyseur tabulaire commun.
    static List<Dictionary<string,string>> CliAvailableUpdates(string winget,out int code)
    {
        List<string> lines;
        code=CliCaptureWinget(winget,"upgrade --include-unknown --accept-source-agreements --disable-interactivity",out lines);
        var rows=new List<Dictionary<string,string>>();
        foreach(var row in WebAppForm.ParseWingetTable(String.Join("\r\n",lines)))
        {
            string id=row.ContainsKey("id")?row["id"].Trim():"";
            if(!WebAppForm.IsValidPackageId(id))continue;
            // Une vraie ligne de mise a jour porte une version disponible ; sans
            // elle, c est une ligne de resume de winget decoupee par les colonnes.
            string available=row.ContainsKey("available")?row["available"].Trim():"";
            if(available.Length==0)continue;
            rows.Add(row);
        }
        return rows;
    }

    static int CliCheckUpdates(bool asJson)
    {
        string winget=CliResolveWinget();
        if(winget==null){Console.Error.WriteLine("WinGet est introuvable. Installez App Installer depuis le Microsoft Store.");return 3;}
        int code;
        var rows=CliAvailableUpdates(winget,out code);
        var catalog=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        try{foreach(var entry in CliCatalog())catalog[CliField(entry,"id")]=CliField(entry,"name");}catch{}

        var payload=new List<Dictionary<string,object>>();
        foreach(var row in rows)
        {
            string id=row["id"].Trim();
            string name=row.ContainsKey("name")?row["name"].Trim():"";
            payload.Add(new Dictionary<string,object>{
                {"id",id},
                {"name",catalog.ContainsKey(id)&&catalog[id].Length>0?catalog[id]:name},
                {"current",row.ContainsKey("version")?row["version"].Trim():""},
                {"available",row.ContainsKey("available")?row["available"].Trim():""},
                {"inCatalog",catalog.ContainsKey(id)}
            });
        }

        if(asJson)
        {
            Console.Out.WriteLine(new JavaScriptSerializer().Serialize(new Dictionary<string,object>{
                {"checkedAt",DateTime.UtcNow.ToString("o")},
                {"count",payload.Count},
                {"updates",payload}
            }));
            return payload.Count>0?1:0;
        }

        if(payload.Count==0)
        {
            Console.Out.WriteLine("Aucune mise a jour proposee par WinGet.");
            return 0;
        }
        foreach(var item in payload)
        {
            string id=Convert.ToString(item["id"]);
            Console.Out.WriteLine((id.Length<40?id.PadRight(40):id+" ")+Convert.ToString(item["current"])+" -> "+Convert.ToString(item["available"]));
        }
        Console.Out.WriteLine();
        Console.Out.WriteLine(payload.Count+" mise(s) a jour. Appliquer : OwlSetup.exe --update");
        return 1;
    }

    static int CliExportProfile(string[] rest)
    {
        string path=String.Join(" ",rest).Trim().Trim('"');
        if(path.Length==0){Console.Error.WriteLine("Usage : OwlSetup.exe --export-profile <fichier.pcsetup.json>");return 2;}
        string winget=CliResolveWinget();
        if(winget==null){Console.Error.WriteLine("WinGet est introuvable. Installez App Installer depuis le Microsoft Store.");return 3;}

        string[] installed=CliInstalledIds(winget);
        if(installed.Length==0){Console.Error.WriteLine("Aucun logiciel detecte par WinGet : profil non ecrit.");return 1;}
        var known=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try{foreach(var entry in CliCatalog())known.Add(CliField(entry,"id"));}catch{}
        string[] selected=installed.Where(id=>known.Contains(id)).ToArray();

        // Meme format que l'export de l'interface : le fichier est relisible par
        // --apply et par la restauration de configuration de l'application.
        var configuration=new Dictionary<string,object>{
            {"format","pc-setup-configuration"},{"formatVersion",1},
            {"createdAt",DateTime.UtcNow.ToString("o")},{"appVersion",BuildInfo.DisplayVersion},
            {"installedPackages",installed},{"selectedPackages",selected},
            {"cleanupChoices",new string[0]},{"preferences",""}
        };
        try
        {
            string folder=Path.GetDirectoryName(Path.GetFullPath(path));
            if(!String.IsNullOrEmpty(folder))Directory.CreateDirectory(folder);
            File.WriteAllText(path,new JavaScriptSerializer().Serialize(configuration),new UTF8Encoding(false));
        }
        catch(Exception ex){Console.Error.WriteLine("Ecriture impossible : "+ex.Message);return 1;}

        Console.Out.WriteLine("Profil ecrit : "+Path.GetFullPath(path));
        Console.Out.WriteLine("  "+installed.Length+" logiciel(s) detecte(s), dont "+selected.Length+" du catalogue OwlSetup.");
        Console.Out.WriteLine("Rejouer sur un autre PC : OwlSetup.exe --apply \""+Path.GetFileName(path)+"\"");
        return 0;
    }

    // Met a jour les identifiants demandes ; sans argument, tout ce que WinGet propose.
    static int CliUpdate(string[] rest,bool dryRun,bool silent)
    {
        string winget=CliResolveWinget();
        if(winget==null){CliErr("WinGet est introuvable. Installez App Installer depuis le Microsoft Store.");return 3;}
        string[] ids=CliParseIds(rest);
        if(ids.Length==0)
        {
            int probe;
            ids=CliAvailableUpdates(winget,out probe).Select(row=>row["id"].Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
            if(ids.Length==0){CliOut("Aucune mise a jour proposee par WinGet.");return 0;}
            CliOut(ids.Length+" mise(s) a jour proposee(s) par WinGet.");
        }
        return CliUpgradeLoop(winget,ids,dryRun,silent);
    }

    static int CliUpgradeLoop(string winget,string[] ids,bool dryRun,bool silent)
    {
        if(dryRun)
        {
            CliOut("[simulation] Mettrait a jour :");
            foreach(string id in ids)CliOut("  - "+id);
            return 0;
        }
        int failures=0;
        foreach(string id in ids)
        {
            CliOut("Mise a jour : "+id+" ...");
            int code=CliRunWinget(winget,"upgrade --id \""+id+"\" --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity",silent);
            // -1978335189 (0x8A15002B) : aucune mise a jour applicable pour ce paquet.
            if(code==0)CliOut("  OK");
            else if(code==-1978335189)CliOut("  Deja a jour");
            else{CliErr("  Echec (code "+code+")");failures++;}
        }
        CliOut("");
        CliOut(ids.Length+" paquet(s) traite(s), "+failures+" echec(s).");
        return failures>0?1:0;
    }

    static int RunCli(string[] commandLine)
    {
        CliAttachConsole();
        string verb=commandLine[1];
        var flags=commandLine.Skip(2).ToArray();
        bool asJson=flags.Any(a=>a=="--json");
        bool dryRun=flags.Any(a=>a=="--dry-run");
        bool silent=flags.Any(a=>a=="--silent" || a=="--quiet");
        bool elevate=flags.Any(a=>a=="--elevate");
        var rest=flags.Where(a=>a!="--json" && a!="--dry-run" && a!="--silent" && a!="--quiet" && a!="--elevate").ToArray();
        // --dry-run ne change rien sur la machine : demander l elevation pour
        // une simulation ne ferait qu afficher une invite UAC inutile.
        if(elevate && !dryRun && !CliIsAdmin() && CliVerbCanNeedAdmin(verb))return CliRunElevated(commandLine);
        switch(verb)
        {
            case "--help": case "-h": case "/?": CliHelp(); return 0;
            case "--version": case "-v":
                Console.Out.WriteLine("OwlSetup "+BuildInfo.DisplayVersion+" ("+BuildInfo.Channel+")");
                return 0;
            case "--list": return CliList(rest.Length>0?String.Join(" ",rest):null,asJson);
            case "--search": return CliSearch(rest);
            case "--install": return CliInstallOrRemove(rest,false,dryRun,silent);
            case "--uninstall": return CliInstallOrRemove(rest,true,dryRun,silent);
            case "--apply": return CliApply(rest,dryRun,silent);
            case "--update": return CliUpdate(rest,dryRun,silent);
            case "--check-updates": return CliCheckUpdates(asJson);
            case "--export-profile": return CliExportProfile(rest);
            default:
                Console.Error.WriteLine("Option inconnue : "+verb);
                CliHelp();
                return 2;
        }
    }

    [STAThread]
    static void Main()
    {
        try
        {
            string[] commandLine=Environment.GetCommandLineArgs();
            if(commandLine.Length==4 && commandLine[1]=="--elevated-cleanup")
            {
                try{Environment.ExitCode=RunElevatedCleanupWorker(commandLine[2],commandLine[3]);}
                catch{Environment.ExitCode=-1;}
                return;
            }
            if(commandLine.Length>=4 && commandLine[1]==CliRelaySwitch)
            {
                try{Environment.ExitCode=CliRelayWorker(commandLine);}
                catch{Environment.ExitCode=-1;}
                return;
            }
            if(commandLine.Length>=2 && IsCliInvocation(commandLine[1]))
            {
                try{Environment.ExitCode=RunCli(commandLine);}
                catch(Exception ex){try{Console.Error.WriteLine(ex.Message);}catch{}Environment.ExitCode=-1;}
                finally{try{FreeConsole();}catch{}}
                return;
            }
            AppRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PCSetup", "App2");
            RuntimeRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PCSetup", "Runtime");
            Directory.CreateDirectory(AppRoot);
            Directory.CreateDirectory(RuntimeRoot);
            MigrateDesktopArtifacts();
            Directory.CreateDirectory(Path.Combine(AppRoot,"assets","branding"));
            Extract("index.html", Path.Combine(AppRoot, "index.html"));
            Extract("i18n.js", Path.Combine(AppRoot, "i18n.js"));
            Extract("catalog.generated.js", Path.Combine(AppRoot, "catalog.generated.js"));
            Extract("app.js", Path.Combine(AppRoot, "app.js"));
            Extract("styles.css", Path.Combine(AppRoot, "styles.css"));
            Extract("app-logo.png", Path.Combine(AppRoot, "assets", "branding", "owlsetup-logo.png"));
            Extract("app-icon.ico", Path.Combine(AppRoot, "OwlSetup.ico"));
            ExtractLogos();
            Extract("Mettre-a-jour-mon-PC.ps1", Path.Combine(AppRoot, "Mettre-a-jour-mon-PC.ps1"));
            Extract("Liberer-espace-disque.ps1", Path.Combine(AppRoot, "Liberer-espace-disque.ps1"));
            Extract("Nettoyer-residus-applications.ps1", Path.Combine(AppRoot, "Nettoyer-residus-applications.ps1"));
            Extract("Installer-selection.ps1", Path.Combine(AppRoot, "Installer-selection.ps1"));
            Extract("wv2core", Path.Combine(RuntimeRoot, "Microsoft.Web.WebView2.Core.dll"));
            Extract("wv2forms", Path.Combine(RuntimeRoot, "Microsoft.Web.WebView2.WinForms.dll"));
            Extract("wv2loader", Path.Combine(RuntimeRoot, "WebView2Loader.dll"));
            SetDllDirectory(RuntimeRoot);
            AppDomain.CurrentDomain.AssemblyResolve += ResolveAssembly;
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Type type = Assembly.GetExecutingAssembly().GetType("WebAppForm", true);
            Application.Run((Form)Activator.CreateInstance(type, true));
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "OwlSetup", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    static Assembly ResolveAssembly(object sender, ResolveEventArgs args)
    {
        string name = new AssemblyName(args.Name).Name;
        string file = null;
        if (name == "Microsoft.Web.WebView2.Core") file = Path.Combine(RuntimeRoot, "Microsoft.Web.WebView2.Core.dll");
        if (name == "Microsoft.Web.WebView2.WinForms") file = Path.Combine(RuntimeRoot, "Microsoft.Web.WebView2.WinForms.dll");
        return file != null && File.Exists(file) ? Assembly.LoadFrom(file) : null;
    }

    static void Extract(string resource, string destination)
    {
        using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream(resource))
        {
            if (input == null) throw new InvalidOperationException("Ressource manquante : " + resource);
            using (var output = new FileStream(destination, FileMode.Create, FileAccess.Write, FileShare.Read)) input.CopyTo(output);
        }
    }

    static void ExtractLogos()
    {
        string folder=Path.Combine(AppRoot,"assets","logos");
        Directory.CreateDirectory(folder);
        foreach(string resource in Assembly.GetExecutingAssembly().GetManifestResourceNames().Where(name => name.StartsWith("logos.",StringComparison.Ordinal)))
        {
            string fileName=resource.Substring("logos.".Length);
            Extract(resource,Path.Combine(folder,fileName));
        }
    }
}
