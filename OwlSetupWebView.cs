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

    [DllImport("dwmapi.dll")]
    static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int valueSize);

    // Windows Security Center agrège les produits Microsoft et les suites de sécurité tierces.
    [DllImport("wscapi.dll")]
    static extern int WscGetSecurityProviderHealth(uint providers, out int health);

    const uint WscSecurityProviderFirewall = 0x1;
    const uint WscSecurityProviderAntivirus = 0x4;
    const int WscSecurityProviderHealthGood = 0;

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
            else if (action == "check-app-update") CheckAppUpdate();
            else if (action == "install-app-update") InstallAppUpdate();
            else if (action == "scan-health") ScanHealth();
            else if (action == "scan-updates") ScanUpdates();
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
        var packages=ReadArray(payload,"packages").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct(StringComparer.OrdinalIgnoreCase).Take(100).ToArray();
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
                int wingetCode=RunHiddenProcess("winget.exe","--version",wingetOutput);
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
                        int code=RunHiddenProcess("winget.exe","show --id \""+id+"\" --exact"+WingetSourceArgument(id)+" --accept-source-agreements --disable-interactivity",output);
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
        var packages = ReadArray(payload, "packages").Where(x => Regex.IsMatch(x, "^[A-Za-z0-9.+_-]+$")).Distinct().Take(100).ToArray();
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
                    int showCode=RunHiddenProcess("winget.exe","show --id \""+id+"\" --exact"+WingetSourceArgument(id)+" --accept-source-agreements --disable-interactivity",preflight);
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
        int code=RunHiddenProcess("winget.exe", "install --id \""+packageId+"\" --exact"+WingetSourceArgument(packageId)+scope+location+" --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
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
        int code=RunHiddenProcess("winget.exe","list --id \""+packageId+"\" --exact --accept-source-agreements --disable-interactivity",verification);
        report.AppendLine("Vérification après installation : "+(code==0?"terminée":"échec"));
        report.Append(verification.ToString());
        return code==0&&verification.ToString().IndexOf(packageId,StringComparison.OrdinalIgnoreCase)>=0;
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
        var packages=ReadArray(payload,"packages").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct(StringComparer.OrdinalIgnoreCase).Take(10).ToArray();
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
        var packages=ReadArray(payload,"packages").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct(StringComparer.OrdinalIgnoreCase).Take(10).ToArray();
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
            ServicePointManager.SecurityProtocol=(SecurityProtocolType)3072;
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

    int RunElevatedProcess(string fileName,string arguments,StringBuilder report)
    {
        try
        {
            report.AppendLine("Autorisation administrateur demandee uniquement pour cette operation.");
            using(var process=new Process())
            {
                process.StartInfo=new ProcessStartInfo{FileName=fileName,Arguments=arguments,UseShellExecute=true,Verb="runas",WindowStyle=ProcessWindowStyle.Hidden};
                process.Start();process.WaitForExit();
                report.AppendLine("Code de l'operation elevee : "+process.ExitCode);
                return process.ExitCode;
            }
        }
        catch(System.ComponentModel.Win32Exception ex)
        {
            if(ex.NativeErrorCode==1223){report.AppendLine("Autorisation administrateur annulee par l'utilisateur.");return 1223;}
            report.AppendLine("Elevation impossible : "+ex.Message);return ex.NativeErrorCode;
        }
        catch(Exception ex){report.AppendLine("Elevation impossible : "+ex.Message);return -1;}
    }

    int RunHiddenProcess(string fileName, string arguments, StringBuilder report, Action<string> onLine)
    {
        if(String.Equals(fileName,"winget.exe",StringComparison.OrdinalIgnoreCase))
        {
            string resolved=ResolveWingetPath();
            if(!String.IsNullOrEmpty(resolved))fileName=resolved;
        }
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
    [DllImport("advapi32.dll",SetLastError=true)]static extern bool OpenProcessToken(IntPtr processHandle,uint desiredAccess,out IntPtr tokenHandle);
    [DllImport("advapi32.dll",SetLastError=true)]static extern bool DuplicateTokenEx(IntPtr existingToken,uint desiredAccess,IntPtr tokenAttributes,int impersonationLevel,int tokenType,out IntPtr newToken);
    [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool CreateProcessWithTokenW(IntPtr token,uint logonFlags,string applicationName,StringBuilder commandLine,uint creationFlags,IntPtr environment,string currentDirectory,ref STARTUPINFO startupInfo,out PROCESS_INFORMATION processInformation);
    [DllImport("userenv.dll",SetLastError=true)]static extern bool CreateEnvironmentBlock(out IntPtr environment,IntPtr token,bool inherit);
    [DllImport("userenv.dll",SetLastError=true)]static extern bool DestroyEnvironmentBlock(IntPtr environment);
    [DllImport("kernel32.dll",SetLastError=true)]static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
    [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetExitCodeProcess(IntPtr process,out uint exitCode);
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

    void ScanInstalled(Dictionary<string, object> payload)
    {
        if (scanRunning) return;
        var requested = new HashSet<string>(ReadArray(payload, "ids").Where(x => Regex.IsMatch(x, "^[A-Za-z0-9.+_-]+$")).Take(200), StringComparer.OrdinalIgnoreCase);
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
        var requested=new HashSet<string>(ReadArray(payload,"ids").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Take(200),StringComparer.OrdinalIgnoreCase);
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
            int code=RunHiddenProcess("winget.exe","export -o \""+exportFile+"\" --accept-source-agreements --disable-interactivity",report);
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
            int code=RunHiddenProcess("winget.exe","list --accept-source-agreements --disable-interactivity",capture);
            report.AppendLine(capture.ToString());
            string[] lines=capture.ToString().Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries)
                .Select(line=>Regex.Replace(line,@"\x1B\[[0-9;?]*[ -/]*[@-~]","").TrimEnd()).ToArray();
            int headerIndex=-1,idStart=-1,versionStart=-1,sourceStart=-1;
            for(int index=0;index<lines.Length;index++)
            {
                string line=lines[index];
                int candidateId=line.IndexOf("Id",StringComparison.OrdinalIgnoreCase);
                int candidateVersion=line.IndexOf("Version",StringComparison.OrdinalIgnoreCase);
                if(candidateId>0&&candidateVersion>candidateId)
                {
                    headerIndex=index;idStart=candidateId;versionStart=candidateVersion;
                    sourceStart=line.IndexOf("Source",StringComparison.OrdinalIgnoreCase);
                    break;
                }
            }
            var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if(headerIndex>=0)
            {
                for(int index=headerIndex+1;index<lines.Length;index++)
                {
                    string line=lines[index];
                    if(String.IsNullOrWhiteSpace(line)||Regex.IsMatch(line,@"^\s*-{3,}")||line.Length<=idStart)continue;
                    string name=line.Substring(0,Math.Min(idStart,line.Length)).Trim();
                    int idEnd=Math.Min(versionStart,line.Length);
                    string id=line.Substring(idStart,Math.Max(0,idEnd-idStart)).Trim();
                    if(!Regex.IsMatch(id,@"^[A-Za-z0-9][A-Za-z0-9._+\-]{1,127}$")||String.IsNullOrWhiteSpace(name)||!seen.Add(id))continue;
                    string version="",source="windows";
                    if(line.Length>versionStart)
                    {
                        int versionEnd=sourceStart>versionStart?Math.Min(sourceStart,line.Length):line.Length;
                        version=Regex.Match(line.Substring(versionStart,Math.Max(0,versionEnd-versionStart)).Trim(),@"^\S+").Value;
                    }
                    if(sourceStart>0&&line.Length>sourceStart)
                    {
                        string sourceValue=line.Substring(sourceStart).Trim();
                        if(sourceValue.StartsWith("winget",StringComparison.OrdinalIgnoreCase)||sourceValue.StartsWith("msstore",StringComparison.OrdinalIgnoreCase))source="winget";
                    }
                    results.Add(new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){{"id",id},{"name",name},{"version",version},{"source",source}});
                }
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
                int code=RunHiddenProcess("winget.exe","list --id \""+id+"\" --exact --accept-source-agreements --disable-interactivity",verification);
                string output=verification.ToString();
                bool exact=code==0 && Regex.IsMatch(output,@"(^|\s)"+Regex.Escape(id)+@"(\s|$)",RegexOptions.IgnoreCase|RegexOptions.Multiline);
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
            if(Regex.IsMatch(id,"^[A-Za-z0-9.+_-]+$") && !String.IsNullOrWhiteSpace(name))result[id]=name;
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
            if(portable && Regex.IsMatch(id,"^[A-Za-z0-9.+_-]+$"))result.Add(id);
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
            if(custom && Regex.IsMatch(id,"^[A-Za-z0-9.+_-]+$"))result.Add(id);
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
            int listCode=RunHiddenProcess("winget.exe","list --id \""+packageId+"\" --exact --accept-source-agreements --disable-interactivity",wingetReport);
            string listOutput=wingetReport.ToString();
            report.AppendLine("Verification WinGet apres desinstallation : "+listCode);
            if(listCode==0 && listOutput.IndexOf(packageId,StringComparison.OrdinalIgnoreCase)>=0)return true;
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
        int code=RunHiddenProcess("winget.exe",common,report);
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
        if(String.IsNullOrWhiteSpace(output))yield break;
        bool afterSeparator=false;
        foreach(string rawLine in output.Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries))
        {
            string line=rawLine.Trim();
            if(Regex.IsMatch(line,@"^-{3,}(\s+-{3,})+\s*$")){afterSeparator=true;continue;}
            if(!afterSeparator || line.StartsWith("-"))continue;
            string[] columns=Regex.Split(line,@"\s{2,}");
            if(columns.Length<2)continue;
            string candidate=columns[1].Trim();
            if(Regex.IsMatch(candidate,"^[A-Za-z0-9.+_-]+$"))yield return candidate;
        }
    }

    bool OutputContainsExactPackageId(string output,string packageId)
    {
        if(String.IsNullOrWhiteSpace(output)||String.IsNullOrWhiteSpace(packageId))return false;
        return Regex.IsMatch(output,@"(^|\s)"+Regex.Escape(packageId)+@"(?=\s|$)",RegexOptions.IgnoreCase|RegexOptions.Multiline);
    }

    string ResolveInstalledWingetPackage(string packageId,string appName,StringBuilder report)
    {
        var exactIdReport=new StringBuilder();
        int exactIdCode=RunHiddenProcess("winget.exe","list --id \""+packageId+"\" --exact --accept-source-agreements --disable-interactivity",exactIdReport);
        report.AppendLine("Resolution par identifiant exact : "+exactIdCode);
        report.Append(exactIdReport.ToString());
        var exactIds=ParseWingetListPackageIds(exactIdReport.ToString()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        string exactId=exactIds.FirstOrDefault(value=>String.Equals(value,packageId,StringComparison.OrdinalIgnoreCase));
        if(exactIdCode==0 && (!String.IsNullOrWhiteSpace(exactId)||OutputContainsExactPackageId(exactIdReport.ToString(),packageId)))return packageId;

        if(String.IsNullOrWhiteSpace(appName))return "";
        var exactNameReport=new StringBuilder();
        string safeName=appName.Replace("\"","").Trim();
        int exactNameCode=RunHiddenProcess("winget.exe","list --name \""+safeName+"\" --exact --accept-source-agreements --disable-interactivity",exactNameReport);
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
        if(!Regex.IsMatch(packageId,"^[A-Za-z0-9.+_-]+$"))throw new InvalidOperationException("Logiciel invalide.");
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
        if(!Regex.IsMatch(packageId,"^[A-Za-z0-9.+_-]+$")) throw new InvalidOperationException("Logiciel invalide.");
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
        if(!Regex.IsMatch(packageId,"^[A-Za-z0-9.+_-]+$")) throw new InvalidOperationException("Logiciel invalide.");
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
                code=RunHiddenProcess("winget.exe", "repair --id \""+packageId+"\" --exact --force --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
                nativeCode=code;
                if(code!=0)
                {
                    mode="reinstall";
                    report.AppendLine();
                    report.AppendLine("La réparation native n'est pas disponible. Tentative de réinstallation réparatrice sans désinstallation...");
                    SendToWeb(new { type="repair-fallback", id=packageId, nativeCode=nativeCode });
                    code=RunHiddenProcess("winget.exe", "install --id \""+packageId+"\" --exact"+WingetSourceArgument(packageId)+" --force --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
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
        var packages=ReadArray(payload,"packages").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct(StringComparer.OrdinalIgnoreCase).Take(50).ToArray();
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
        var packages=ReadArray(payload,"packages").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct(StringComparer.OrdinalIgnoreCase).Take(50).ToArray();
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
                int code=RunHiddenProcess("winget.exe","--version",report);
                available=code==0;
                SendToWeb(new { type="tool-progress", tool="winget", percent=55, status="Version controlee." });
                version=report.ToString().Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()??"";
                if(available)
                {
                    report.Clear();
                    sources=RunHiddenProcess("winget.exe","source list --disable-interactivity",report)==0;
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
                int code=RunHiddenProcess("winget.exe",arguments,report);
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
        string[] lines=(output??"").Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries)
            .Select(line=>Regex.Replace(line,@"\x1B\[[0-9;?]*[ -/]*[@-~]","").TrimEnd()).ToArray();
        int headerIndex=-1,idStart=-1,versionStart=-1,sourceStart=-1;
        for(int index=0;index<lines.Length;index++)
        {
            string line=lines[index];
            int candidateId=line.IndexOf("Id",StringComparison.OrdinalIgnoreCase);
            int candidateVersion=line.IndexOf("Version",StringComparison.OrdinalIgnoreCase);
            if(candidateId>0&&candidateVersion>candidateId)
            {
                headerIndex=index;idStart=candidateId;versionStart=candidateVersion;
                sourceStart=line.IndexOf("Source",StringComparison.OrdinalIgnoreCase);
                break;
            }
        }
        if(headerIndex<0)return new object[0];
        var results=new List<object>();var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for(int index=headerIndex+1;index<lines.Length;index++)
        {
            string line=lines[index];
            if(String.IsNullOrWhiteSpace(line)||Regex.IsMatch(line,@"^\s*-{3,}"))continue;
            if(line.Length<=idStart)continue;
            string name=line.Substring(0,Math.Min(idStart,line.Length)).Trim();
            int idEnd=Math.Min(versionStart,line.Length);
            string id=line.Substring(idStart,Math.Max(0,idEnd-idStart)).Trim();
            if(!Regex.IsMatch(id,@"^[A-Za-z0-9][A-Za-z0-9._+\-]{1,127}$")||String.IsNullOrWhiteSpace(name)||!seen.Add(id))continue;
            string version="";
            if(line.Length>versionStart)
            {
                int versionEnd=sourceStart>versionStart?Math.Min(sourceStart,line.Length):line.Length;
                string versionArea=line.Substring(versionStart,Math.Max(0,versionEnd-versionStart)).Trim();
                version=Regex.Match(versionArea,@"^\S+").Value;
            }
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
            try
            {
                string script="$ErrorActionPreference='Stop';"+
                    "$pkg=Get-AppxPackage Microsoft.DesktopAppInstaller;"+
                    "if(-not $pkg){throw 'App Installer est absent. Installez-le depuis le Microsoft Store.'};"+
                    "Add-AppxPackage -DisableDevelopmentMode -Register (Join-Path $pkg.InstallLocation 'AppxManifest.xml');"+
                    "$winget=Join-Path $env:LOCALAPPDATA 'Microsoft\\WindowsApps\\winget.exe';"+
                    "if(-not (Test-Path $winget)){$winget='winget.exe'};"+
                    "& $winget source reset --force --disable-interactivity;"+
                    "& $winget source update --disable-interactivity;"+
                    "exit $LASTEXITCODE";
                string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
                SendToWeb(new { type="tool-progress", tool="winget", percent=35, status="Reenregistrement et actualisation des sources..." });
                code=RunHiddenProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,report);
                SendToWeb(new { type="tool-progress", tool="winget", percent=90, status="Verification du resultat..." });
            }
            catch(Exception ex){report.AppendLine("ERREUR : "+ex.Message);}
            finally
            {
                try{File.WriteAllText(logPath,report.ToString(),Encoding.UTF8);}catch{}
                SendToWeb(new { type="tool-progress", tool="winget", percent=100, status=code==0?"Reparation terminee.":"Reparation a verifier." });
                SendToWeb(new { type="winget-repair-complete",success=code==0,code=code,logName=logName });
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
            try
            {
                string label="OwlSetup "+BuildInfo.DisplayVersion+" - "+DateTime.Now.ToString("yyyy-MM-dd HH:mm");
                string script="$ErrorActionPreference='Stop'; Checkpoint-Computer -Description '"+label.Replace("'","''")+"' -RestorePointType 'MODIFY_SETTINGS'";
                string encoded=Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
                SendToWeb(new { type="tool-progress", tool="restore", percent=40, status="Creation par Windows..." });
                code=RunElevatedProcess("powershell.exe","-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand "+encoded,report);
                SendToWeb(new { type="tool-progress", tool="restore", percent=90, status="Verification du point..." });
            }
            catch(Exception ex){report.AppendLine("ERREUR : "+ex.Message);}
            finally
            {
                try{File.WriteAllText(logPath,report.ToString(),Encoding.UTF8);}catch{}
                SendToWeb(new { type="tool-progress", tool="restore", percent=100, status=code==0?"Point cree.":"Creation a verifier." });
                string reason=code==0?"created":(code==1223?"uac-cancelled":"system-protection-disabled");
                SendToWeb(new { type="restore-point-complete",success=code==0,code=code,reason=reason,logName=logName });
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
            string wingetVersion="Indisponible";
            try
            {
                var report=new StringBuilder();
                if(RunHiddenProcess("winget.exe","--version",report)==0)wingetVersion=report.ToString().Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()??"Indisponible";
            }
            catch{}
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
            try{var output=new StringBuilder();winget=RunHiddenProcess("winget.exe","--version",output)==0;tests.Add(new {name="WinGet",success=winget,detail=winget?output.ToString().Trim():"WinGet est indisponible"});}catch(Exception ex){tests.Add(new {name="WinGet",success=false,detail=ex.Message});}
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
                    bool canClean=IsSafeDiskCleanupFolder(folder);
                    results.Add(new {name=Path.GetFileName(folder),path=folder,bytes=bytes,size=FormatBytes(bytes),files=files,canClean=canClean});
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
        var packages=ReadArray(payload,"packages").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct().Take(100).ToArray();
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
            bool windowsStarted=false;
            try
            {
                report.AppendLine("OWLSETUP - RAPPORT DE MISE A JOUR");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                report.AppendLine();
                SendToWeb(new { type="update-stage", stage="sources", percent=10, title="Actualisation des sources", detail="Connexion au catalogue WinGet" });
                RunHiddenProcess("winget.exe","source update --disable-interactivity",report);

                for(int i=0;i<packages.Length;i++)
                {
                    string id=packages[i];
                    int percent=20+(int)Math.Round(i*58.0/Math.Max(packages.Length,1));
                    SendToWeb(new { type="update-stage", stage="applications", percent=percent, title="Mise à jour de "+id, detail=(i+1)+" / "+packages.Length+" application(s)" });
                    report.AppendLine();report.AppendLine("===== "+id+" =====");
                    int itemStart=report.Length;
                    lastCode=RunHiddenProcess("winget.exe","upgrade --id \""+id+"\" --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity",report);
                    lastOutput=report.ToString(itemStart,report.Length-itemStart);
                    if(IsNoApplicableUpdateCode(lastCode))
                    {
                        report.AppendLine("Résultat validé : aucune mise à jour applicable, le logiciel est déjà à jour.");
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
                remaining=QueryAvailableUpdates().Where(item=>selectedIds.Contains(Convert.ToString(item["id"]))).ToList();
                if(remaining.Count>0)
                {
                    report.AppendLine();
                    report.AppendLine("MISES A JOUR ENCORE PROPOSEES : "+String.Join(", ",remaining.Select(item=>Convert.ToString(item["id"]))));
                }

                SendToWeb(new { type="update-stage", stage="windows", percent=84, title="Recherche Windows Update", detail="Composants Windows et pilotes certifiés" });
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
                SendToWeb(new { type="update-complete", success=success, appsSuccess=appsSuccess, windowsStarted=windowsStarted, pendingCount=remaining.Count, code=appsSuccess?lastCode:failedCode, errorMessage=errorMessage, failureKind=failedItems.Count>0?Convert.ToString(failedItems[0]["kind"]):"", failedItems=failedItems.ToArray(), logName=logName });
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

    List<Dictionary<string,object>> QueryAvailableUpdates()
    {
        var report=new StringBuilder();
        RunHiddenProcess("winget.exe","upgrade --accept-source-agreements --disable-interactivity",report);
        var results=new List<Dictionary<string,object>>();
        var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach(string raw in report.ToString().Split(new[]{"\r\n","\n"},StringSplitOptions.RemoveEmptyEntries))
        {
            string line=Regex.Replace(raw,"\x1B\\[[0-9;?]*[ -/]*[@-~]","").Trim();
            Match match=Regex.Match(line,@"^(.+?)\s{2,}([^\s]+)\s{2,}([^\s]+)\s{2,}([^\s]+)(?:\s{2,}([^\s]+))?$");
            if(!match.Success)continue;
            string name=match.Groups[1].Value.Trim();
            string id=match.Groups[2].Value.Trim();
            string current=match.Groups[3].Value.Trim();
            string available=match.Groups[4].Value.Trim();
            if(!Regex.IsMatch(id,"^[A-Za-z0-9.+_-]+$") || !Regex.IsMatch(current,"[0-9]") || !Regex.IsMatch(available,"[0-9]") || !seen.Add(id))continue;
            results.Add(new Dictionary<string,object>{{"name",name},{"id",id},{"current",current},{"available",available}});
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

    string GetDataFolder(string name)
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
                items.Add(new Dictionary<string,object>{{"batch",Path.GetFileName(batchPath)},{"item",info.Name},{"modified",info.LastWriteTime.ToString("g")}});
            }
        }
        return items.OrderByDescending(x=>Convert.ToString(x["modified"])).ToList();
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
                Directory.Move(itemPath,destination);
                if(!Directory.EnumerateFileSystemEntries(batchPath).Any())Directory.Delete(batchPath);
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
                Directory.Delete(itemPath,true);
                if(!Directory.EnumerateFileSystemEntries(batchPath).Any())Directory.Delete(batchPath);
                SendToWeb(new { type="quarantine-action", success=true, action="delete", message="Élément supprimé définitivement." });
            }
            catch(Exception ex){SendToWeb(new { type="quarantine-action", success=false, action="delete", message=ex.Message });}
            SendQuarantineState();
        });
    }

    Dictionary<string,object> GetLatestRelease()
    {
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
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

    Version ReadReleaseVersion(Dictionary<string,object> release)
    {
        string tag=release.ContainsKey("tag_name")?Convert.ToString(release["tag_name"]):"";
        Version version;
        if(!Version.TryParse(tag.TrimStart('v','V'),out version))throw new InvalidDataException("Version GitHub invalide.");
        return version;
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
                wingetReady=RunHiddenProcess("winget.exe","--version",output)==0;
                if(wingetReady)wingetVersion=output.ToString().Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()??"Disponible";
            }
            catch{}
            string restartReason=GetRestartReason();
            SendToWeb(new {type="system-summary",os=String.IsNullOrWhiteSpace(product)?"Windows":product,display=display,build=build,architecture=Environment.Is64BitOperatingSystem?"x64":"x86",winget=wingetVersion,wingetReady=wingetReady,restartPending=!String.IsNullOrEmpty(restartReason),restartReason=restartReason});
        });
    }

    static bool RegistryFlagEnabled(string path,string name,bool defaultValue)
    {
        try
        {
            using(var key=Registry.LocalMachine.OpenSubKey(path,false))
            {
                object value=key==null?null:key.GetValue(name,null);
                if(value==null)return defaultValue;
                return Convert.ToInt32(value)!=0;
            }
        }
        catch{return defaultValue;}
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
            var certificate=new X509Certificate2(X509Certificate.CreateFromSignedFile(Application.ExecutablePath));
            signed=true;signer=certificate.GetNameInfo(X509NameType.SimpleName,false);
            using(var chain=new X509Chain()){chain.ChainPolicy.RevocationMode=X509RevocationMode.Online;chain.ChainPolicy.UrlRetrievalTimeout=TimeSpan.FromSeconds(4);trusted=chain.Build(certificate);}
        }
        catch{}
        try
        {
            string runtime=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"PCSetup","SecureRuntime");
            secureRuntime=Directory.Exists(runtime)&&!IsReparsePoint(runtime);
        }
        catch{}
        try{logCount=Directory.GetFiles(GetDataFolder("Logs"),"PC-Setup-*.log",SearchOption.TopDirectoryOnly).Length;}catch{}
        try
        {
            var report=new StringBuilder();
            if(RunHiddenProcess("winget.exe","--version",report)==0)wingetVersion=report.ToString().Split(new[]{'\r','\n'},StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()??"Indisponible";
        }
        catch{}
        defenderActive=!RegistryFlagEnabled(@"SOFTWARE\Microsoft\Windows Defender\Real-Time Protection","DisableRealtimeMonitoring",false)
            && !RegistryFlagEnabled(@"SOFTWARE\Microsoft\Windows Defender","DisableAntiSpyware",false);
        firewallActive=RegistryFlagEnabled(@"SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\DomainProfile","EnableFirewall",true)
            && RegistryFlagEnabled(@"SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\PublicProfile","EnableFirewall",true)
            && RegistryFlagEnabled(@"SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\StandardProfile","EnableFirewall",true);
        // Le Centre de sécurité Windows connaît aussi les antivirus et pare-feu tiers.
        // Le contrôle registre ci-dessus reste uniquement un repli si WSC est indisponible.
        bool antivirusHealthAvailable=TryGetSecurityProviderHealth(WscSecurityProviderAntivirus,out antivirusHealth);
        bool firewallHealthAvailable=TryGetSecurityProviderHealth(WscSecurityProviderFirewall,out firewallHealth);
        antivirusActive=antivirusHealthAvailable?antivirusHealth==WscSecurityProviderHealthGood:defenderActive;
        firewallActive=firewallHealthAvailable?firewallHealth==WscSecurityProviderHealthGood:firewallActive;
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
        if(antivirusActive)score+=5;if(firewallActive)score+=5;
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
        if(!antivirusActive)recommendations.Add(new{severity="warning",title="Contrôler la protection antivirus",detail="Le Centre de sécurité Windows indique qu’aucun antivirus actif ne protège actuellement le PC.",action="defender"});
        if(!firewallActive)recommendations.Add(new{severity="warning",title="Contrôler la protection pare-feu",detail="Le Centre de sécurité Windows indique que la protection pare-feu demande votre attention.",action="firewall"});
        if(recommendations.Count==0)recommendations.Add(new{severity="success",title="Aucune action requise",detail="Les contrôles locaux principaux sont satisfaisants.",action="none"});
        return new Dictionary<string,object>{{"integrity",integrity},{"originLocked",true},{"standardUser",!admin},{"elevation","À la demande"},{"signed",signed},{"trusted",trusted},{"signatureState",signatureState},{"signer",signer},{"winget",wingetVersion},{"wingetOutdated",wingetOutdated},{"webview",webViewVersion},{"webviewOutdated",webViewOutdated},{"secureRuntime",secureRuntime},{"defenderActive",defenderActive},{"antivirusActive",antivirusActive},{"antivirusHealth",SecurityProviderHealthLabel(antivirusHealth)},{"antivirusManagedByWsc",antivirusHealthAvailable},{"firewallActive",firewallActive},{"firewallHealth",SecurityProviderHealthLabel(firewallHealth)},{"firewallManagedByWsc",firewallHealthAvailable},{"logs",logCount},{"version",BuildInfo.DisplayVersion},{"score",Math.Max(0,Math.Min(100,score))},{"sha256",ExecutableSha256()},{"recommendations",recommendations.ToArray()}};
    }

    void SendSecurityStatus()
    {
        string detectedWebView="Indisponible";
        try{if(webView.CoreWebView2!=null)detectedWebView=webView.CoreWebView2.Environment.BrowserVersionString;}catch{}
        Task.Run(delegate {
            var snapshot=BuildSecuritySnapshot(detectedWebView);
            snapshot["type"]="security-status";
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

    void OpenWindowsSecurity(Dictionary<string,object> payload)
    {
        string page=payload!=null&&payload.ContainsKey("page")?Convert.ToString(payload["page"]):"defender";
        string uri=String.Equals(page,"firewall",StringComparison.OrdinalIgnoreCase)?"windowsdefender://network/":"windowsdefender:";
        Process.Start(new ProcessStartInfo(uri){UseShellExecute=true});
    }

    void CheckAppUpdate()
    {
        if(selfUpdateRunning)return;
        if(BuildInfo.IsBeta)
        {
            SendToWeb(new { type="app-update-state", status="beta", current=CurrentVersionText(), latest="" });
            return;
        }
        SendToWeb(new { type="app-update-state", status="checking", current=CurrentVersionText() });
        Task.Run(delegate {
            try
            {
                var release=GetLatestRelease();
                Version latest=ReadReleaseVersion(release);
                Version current=Assembly.GetExecutingAssembly().GetName().Version;
                bool available=latest.CompareTo(current)>0;
                SendToWeb(new { type="app-update-state", status=available?"available":"current", current=CurrentVersionText(), latest=latest.ToString(3), page=release.ContainsKey("html_url")?Convert.ToString(release["html_url"]):"" });
            }
            catch(Exception ex){SendToWeb(new { type="app-update-state", status="error", current=CurrentVersionText(), message=ex.Message });}
        });
    }

    void InstallAppUpdate()
    {
        throw new InvalidOperationException("La mise à jour automatique est désactivée tant qu’OwlSetup ne possède pas une signature de code reconnue. Utilisez uniquement la Release GitHub officielle et vérifiez son empreinte SHA-256.");
#pragma warning disable 162
        if(BuildInfo.IsBeta)throw new InvalidOperationException("La mise à jour automatique est désactivée dans la version bêta locale.");
        if(selfUpdateRunning)throw new InvalidOperationException("La mise à jour de OwlSetup est déjà en cours.");
        if(installationRunning || uninstallRunning || repairRunning || updateRunning || cleanupRunning)throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        selfUpdateRunning=true;
        SendToWeb(new { type="app-update-state", status="downloading", current=CurrentVersionText() });
        Task.Run(delegate {
            string downloaded=null;
            try
            {
                var release=GetLatestRelease();
                Version latest=ReadReleaseVersion(release);
                Version current=Assembly.GetExecutingAssembly().GetName().Version;
                if(latest.CompareTo(current)<=0)throw new InvalidOperationException("OwlSetup est déjà à jour.");
                var exeAsset=FindReleaseAsset(release,"OwlSetup.exe")??FindReleaseAsset(release,"PC-Setup.exe");
                var hashAsset=FindReleaseAsset(release,"SHA256.txt");
                if(exeAsset==null || hashAsset==null)throw new FileNotFoundException("La Release ne contient pas les fichiers de mise à jour requis.");
                string exeName=Convert.ToString(exeAsset["name"]);
                string exeUrl=Convert.ToString(exeAsset["browser_download_url"]);
                string hashUrl=Convert.ToString(hashAsset["browser_download_url"]);
                string trustedPrefix="https://github.com/OwlNetGeekFR/OwlSetup/releases/download/";
                if(!exeUrl.StartsWith(trustedPrefix,StringComparison.OrdinalIgnoreCase) || !hashUrl.StartsWith(trustedPrefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Source de mise à jour non approuvée.");
                string folder=Path.Combine(Path.GetTempPath(),"PCSetup","Update-"+latest.ToString(3));
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
                SendToWeb(new { type="app-update-state", status="restarting", current=CurrentVersionText(), latest=latest.ToString(3) });
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
#pragma warning restore 162
    }

    void ExportConfiguration(Dictionary<string, object> payload)
    {
        var selected=ReadArray(payload,"selected").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
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
                RunHiddenProcess("winget.exe","export -o \""+temp+"\" --accept-source-agreements --disable-interactivity",report);
                if(File.Exists(temp))
                {
                    foreach(Match match in Regex.Matches(File.ReadAllText(temp,Encoding.UTF8),"\"PackageIdentifier\"\\s*:\\s*\"([^\"]+)\"",RegexOptions.IgnoreCase))
                    {
                        string id=match.Groups[1].Value;
                        if(Regex.IsMatch(id,"^[A-Za-z0-9.+_-]+$"))installed.Add(id);
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
                foreach(string id in ReadArray(root,key))if(Regex.IsMatch(id,"^[A-Za-z0-9.+_-]+$"))packages.Add(id);
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
        string[] allowed={"user-temp","windows-temp","recycle-bin","delivery","components","app-leftovers"};
        var choices=ReadArray(payload,"choices").Where(x=>allowed.Contains(x)).Distinct().ToArray();
        if(choices.Length==0)throw new InvalidOperationException("Aucune zone à analyser.");
        SendToWeb(new { type="cleanup-analysis-start" });
        Task.Run(delegate {
            try
            {
                var items=new List<object>();long total=0;
                foreach(string id in choices)
                {
                    string label=id,path="",note="";long bytes=0,files=0;
                    if(id=="user-temp"){label="Fichiers temporaires utilisateur";path=Path.GetTempPath();MeasurePath(path,out bytes,out files);}
                    else if(id=="windows-temp"){label="Fichiers temporaires Windows";path=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"Temp");MeasurePath(path,out bytes,out files);}
                    else if(id=="recycle-bin"){label="Corbeille";path="Corbeilles des lecteurs locaux";note="Suppression définitive après confirmation";MeasureRecycleBin(out bytes,out files);}
                    else if(id=="delivery"){label="Cache d'optimisation de livraison";path=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),@"ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache");MeasurePath(path,out bytes,out files);}
                    else if(id=="components"){label="Anciens composants Windows";path="Magasin de composants Windows (WinSxS)";note="Taille déterminée par DISM pendant l'opération";}
                    else if(id=="app-leftovers"){label="Résidus d'applications";path="%APPDATA% et %LOCALAPPDATA%";note="Chaque dossier sera confirmé puis placé en quarantaine";}
                    total+=bytes;
                    items.Add(new { id=id,label=label,path=path,bytes=bytes,size=FormatBytes(bytes),files=files,note=note });
                }
                lock(cleanupSimulations)cleanupSimulations[String.Join("|",choices.OrderBy(value=>value))]=DateTime.UtcNow.AddMinutes(5);
                SendToWeb(new { type="cleanup-analysis",items=items.ToArray(),bytes=total,size=FormatBytes(total),protectedFolders=new[]{"Bureau","Documents","Téléchargements","Images","Musique","Vidéos"} });
            }
            catch(Exception ex){SendToWeb(new { type="cleanup-analysis-error",message=ex.Message });}
        });
    }

    void MeasurePath(string root,out long bytes,out long files)
    {
        bytes=0;files=0;if(String.IsNullOrWhiteSpace(root)||!Directory.Exists(root))return;
        if(IsReparsePoint(root))return;
        var folders=new Stack<string>();folders.Push(root);int visited=0;
        while(folders.Count>0&&visited<200000)
        {
            string folder=folders.Pop();
            try
            {
                foreach(string file in Directory.GetFiles(folder)){if(visited++>=200000)break;try{bytes+=new FileInfo(file).Length;files++;}catch{}}
                foreach(string child in Directory.GetDirectories(folder))if(!IsReparsePoint(child))folders.Push(child);
            }catch{}
        }
    }

    bool IsReparsePoint(string path)
    {
        try{return (File.GetAttributes(path)&FileAttributes.ReparsePoint)==FileAttributes.ReparsePoint;}catch{return true;}
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
        string[] allowed = {"user-temp","windows-temp","recycle-bin","delivery","components","app-leftovers"};
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

    [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool SetDllDirectory(string lpPathName);

    static int RunElevatedCleanupWorker(string choicesValue,string logValue)
    {
        var principal=new WindowsPrincipal(WindowsIdentity.GetCurrent());
        if(!principal.IsInRole(WindowsBuiltInRole.Administrator))return 740;
        string[] allowed={"user-temp","windows-temp","recycle-bin","delivery","components","app-leftovers"};
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
            AppRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PCSetup", "App2");
            RuntimeRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PCSetup", "Runtime");
            Directory.CreateDirectory(AppRoot);
            Directory.CreateDirectory(RuntimeRoot);
            MigrateDesktopArtifacts();
            Directory.CreateDirectory(Path.Combine(AppRoot,"assets","branding"));
            Extract("index.html", Path.Combine(AppRoot, "index.html"));
            Extract("i18n.js", Path.Combine(AppRoot, "i18n.js"));
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
