using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
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
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal sealed class WebAppForm : Form
{
    readonly WebView2 webView;
    readonly string appRoot;
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    bool installationRunning;
    bool uninstallRunning;
    bool repairRunning;
    bool scanRunning;
    bool updateRunning;
    bool cleanupRunning;
    bool healthScanning;
    bool updatesScanning;
    bool selfUpdateRunning;
    readonly Dictionary<string,DateTime> cleanupSimulations=new Dictionary<string,DateTime>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,DateTime> uninstallSimulations=new Dictionary<string,DateTime>(StringComparer.OrdinalIgnoreCase);
    readonly Dictionary<string,DateTime> batchUninstallSimulations=new Dictionary<string,DateTime>(StringComparer.OrdinalIgnoreCase);

    public WebAppForm()
    {
        Text = BuildInfo.IsBeta ? "OwlSetup BETA - " + BuildInfo.DisplayVersion : "OwlSetup";
        string iconPath=Path.Combine(Bootstrap.AppRoot,"OwlSetup.ico");
        Icon = File.Exists(iconPath) ? new Icon(iconPath) : SystemIcons.Application;
        Size = new Size(1500, 920);
        MinimumSize = new Size(1050, 700);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(8, 11, 17);
        appRoot = Bootstrap.AppRoot;
        webView = new WebView2 { Dock=DockStyle.Fill, BackColor=BackColor, DefaultBackgroundColor=BackColor };
        Controls.Add(webView);
        Shown += InitializeWebView;
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
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return;
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
        try
        {
            if(!IsTrustedUiUri(e.Source) || !VerifyInterfaceIntegrity())throw new UnauthorizedAccessException("Commande refusee : origine ou integrite de l'interface invalide.");
            var message = json.DeserializeObject(e.WebMessageAsJson) as Dictionary<string, object>;
            if (message == null || !message.ContainsKey("action")) throw new InvalidOperationException("Commande invalide.");
            string action = Convert.ToString(message["action"]);
            var payload = message.ContainsKey("payload") ? message["payload"] as Dictionary<string, object> : null;
            if (action == "get-app-info") SendAppInfo();
            else if (action == "update") RunUpdate(payload);
            else if (action == "check-app-update") CheckAppUpdate();
            else if (action == "install-app-update") InstallAppUpdate();
            else if (action == "scan-health") ScanHealth();
            else if (action == "scan-updates") ScanUpdates();
            else if (action == "install") RunInstall(payload);
            else if (action == "scan-installed") ScanInstalled(payload);
            else if (action == "repair") RunRepair(payload);
            else if (action == "uninstall") RunUninstall(payload);
            else if (action == "simulate-uninstall") SimulateUninstall(payload);
            else if (action == "batch-uninstall") RunBatchUninstall(payload);
            else if (action == "simulate-batch-uninstall") SimulateBatchUninstall(payload);
            else if (action == "export-config") ExportConfiguration(payload);
            else if (action == "import-config") ImportConfiguration();
            else if (action == "analyze-cleanup") AnalyzeCleanup(payload);
            else if (action == "diagnose-winget") DiagnoseWinget();
            else if (action == "repair-winget") RepairWinget();
            else if (action == "create-restore-point") CreateRestorePoint();
            else if (action == "open-system-restore") OpenSystemRestore();
            else if (action == "load-history") LoadHistory();
            else if (action == "open-log") OpenLog(payload);
            else if (action == "scan-startup") ScanStartup();
            else if (action == "open-startup-settings") OpenStartupSettings();
            else if (action == "scan-disk") ScanDiskUsage();
            else if (action == "security-status") SendSecurityStatus();
            else if (action == "cleanup") RunCleanup(payload);
            else if (action == "scan-quarantine") SendQuarantineState();
            else if (action == "restore-quarantine") RestoreQuarantine(payload);
            else if (action == "delete-quarantine") DeleteQuarantine(payload);
            else throw new InvalidOperationException("Action inconnue.");
        }
        catch (Exception ex)
        {
            string text = json.Serialize(ex.Message);
            webView.CoreWebView2.ExecuteScriptAsync("alert(" + text + ")");
        }
    }

    void RunInstall(Dictionary<string, object> payload)
    {
        var packages = ReadArray(payload, "packages").Where(x => Regex.IsMatch(x, "^[A-Za-z0-9.+_-]+$")).Distinct().Take(100).ToArray();
        var catalog=ReadCatalog(payload);
        var portablePackages=ReadPortableCatalog(payload);
        string shortcutPreference=payload!=null&&payload.ContainsKey("shortcut")?Convert.ToString(payload["shortcut"]):"start";
        bool launchAfter=payload!=null&&payload.ContainsKey("launchAfter")&&Convert.ToBoolean(payload["launchAfter"]);
        if(!new[]{"start","desktop","both","none"}.Contains(shortcutPreference))shortcutPreference="start";
        if (packages.Length == 0) throw new InvalidOperationException("Aucun logiciel valide n'est sélectionné.");
        if (installationRunning) throw new InvalidOperationException("Une installation est déjà en cours.");
        if(uninstallRunning || repairRunning || updateRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        installationRunning = true;
        SendToWeb(new { type="install-start", total=packages.Length });
        Task.Run(delegate {
            int success=0, failed=0;
            var report=new StringBuilder();
            string logName="PC-Setup-Installation-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            try
            {
                report.AppendLine("OWLSETUP - RAPPORT D'INSTALLATION");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                for(int i=0;i<packages.Length;i++)
                {
                    string id=packages[i];
                    SendToWeb(new { type="install-progress", index=i+1, total=packages.Length, id=id });
                    report.AppendLine(); report.AppendLine("===== "+id+" =====");
                    var preflight=new StringBuilder();
                    int showCode=RunHiddenProcess("winget.exe","show --id \""+id+"\" --exact --accept-source-agreements --disable-interactivity",preflight);
                    report.AppendLine("Contrôle du manifeste et de la source : "+(showCode==0?"OK":"ÉCHEC"));
                    report.Append(preflight.ToString());
                    SendToWeb(new { type="install-security", index=i+1, total=packages.Length, id=id, success=showCode==0 });
                    if(showCode!=0)
                    {
                        failed++;
                        SendToWeb(new { type="install-item", index=i+1, total=packages.Length, id=id, success=false, code=showCode, errorMessage=ExplainWingetFailure(showCode,preflight.ToString(),"installation") });
                        continue;
                    }
                    SendToWeb(new { type="install-execution", index=i+1, total=packages.Length, id=id });
                    int operationStart=report.Length;
                    int code=RunWinget(id,report);
                    string operationOutput=report.ToString(operationStart,report.Length-operationStart);
                    string appName=catalog.ContainsKey(id)?catalog[id]:id.Split('.').Last();
                    if(portablePackages.Contains(id) && EnsurePortableShortcut(id,appName,shortcutPreference,report))code=0;
                    else if(code==0)ConfigureStandardShortcut(appName,shortcutPreference,report);
                    bool ok=code==0;
                    if(ok)
                    {
                        SaveApplicationName(id,appName);
                        if(launchAfter && packages.Length==1)LaunchInstalledApplication(id,appName,portablePackages.Contains(id),report);
                    }
                    if(ok)success++;else failed++;
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
                installationRunning=false;
                SendToWeb(new { type="install-complete", success=success, failed=failed, logName=logName });
            }
        });
    }

    int RunWinget(string packageId, StringBuilder report)
    {
        string scope=String.Equals(packageId,"Google.Chrome",StringComparison.OrdinalIgnoreCase)?" --scope machine":String.Equals(packageId,"Spotify.Spotify",StringComparison.OrdinalIgnoreCase)?" --scope user":"";
        int code=RunHiddenProcess("winget.exe", "install --id \""+packageId+"\" --exact"+scope+" --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
        if(code!=0 && (String.Equals(packageId,"Google.Chrome",StringComparison.OrdinalIgnoreCase) || String.Equals(packageId,"Spotify.Spotify",StringComparison.OrdinalIgnoreCase)))
        {
            report.AppendLine();
            report.AppendLine("WinGet n'a pas terminé l'installation. Activation du secours signé de l'éditeur...");
            code=InstallSignedPublisherFallback(packageId,report);
        }
        return code;
    }

    bool EnsurePortableShortcut(string packageId,StringBuilder report)
    {
        return EnsurePortableShortcut(packageId,LoadApplicationName(packageId),LoadShortcutPreference(packageId),report);
    }

    string ResolvePortableExecutable(string packageId,string appName,StringBuilder report)
    {
        string local=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string linksRoot=Path.Combine(local,"Microsoft","WinGet","Links");
        string idName=packageId.Split('.').Last();
        string wanted=NormalizeSoftwareName(String.IsNullOrWhiteSpace(appName)?idName:appName).Replace(" ","");
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
            RedirectStandardError=true
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
            string path=Environment.GetEnvironmentVariable("PATH")??"";
            foreach(string folder in path.Split(Path.PathSeparator))
            {
                if(String.IsNullOrWhiteSpace(folder))continue;
                string candidate=Path.Combine(folder.Trim(),"winget.exe");
                if(File.Exists(candidate))return candidate;
            }
        }catch{}
        return "winget.exe";
    }

    void ScanInstalled(Dictionary<string, object> payload)
    {
        if (scanRunning) return;
        var requested = new HashSet<string>(ReadArray(payload, "ids").Where(x => Regex.IsMatch(x, "^[A-Za-z0-9.+_-]+$")).Take(200), StringComparer.OrdinalIgnoreCase);
        var catalog=ReadCatalog(payload);
        var portablePackages=ReadPortableCatalog(payload);
        scanRunning = true;
        Task.Run(delegate {
            string folder=Path.Combine(Path.GetTempPath(),"PCSetup");
            string exportFile=Path.Combine(folder,"installed-"+Guid.NewGuid().ToString("N")+".json");
            var report=new StringBuilder();
            var installed=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            string detection="winget";
            string error=null;
            try
            {
                Directory.CreateDirectory(folder);
                int code=RunHiddenProcess("winget.exe", "export -o \""+exportFile+"\" --accept-source-agreements --disable-interactivity", report);
                if(File.Exists(exportFile))
                {
                    string contents=File.ReadAllText(exportFile,Encoding.UTF8);
                    foreach(Match match in Regex.Matches(contents,"\"PackageIdentifier\"\\s*:\\s*\"([^\"]+)\"",RegexOptions.IgnoreCase))
                    {
                        string id=match.Groups[1].Value;
                        if(requested.Count==0 || requested.Contains(id)) installed.Add(id);
                    }
                }
                if(code!=0 || !File.Exists(exportFile))error="WinGet n'a pas pu exporter la liste.";
            }
            catch(Exception ex){error=ex.Message;}
            finally
            {
                try { if(File.Exists(exportFile)) File.Delete(exportFile); } catch { }
                int before=installed.Count;
                DetectInstalledFromRegistry(catalog,requested,installed);
                if(installed.Count>before)detection=before>0?"winget+registre":"registre";
                foreach(string id in installed.Where(value=>portablePackages.Contains(value)))
                {
                    string name=catalog.ContainsKey(id)?catalog[id]:LoadApplicationName(id);
                    if(EnsurePortableShortcut(id,name,LoadShortcutPreference(id),report))
                        SendToWeb(new { type="portable-access-ready", id=id, name=name });
                }
                scanRunning=false;
                SendToWeb(new { type="installed-state", ids=installed.ToArray(), method=detection, count=installed.Count, warning=error });
            }
        });
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
            {"OpenJS.NodeJS.LTS",new[]{"Node.js"}},
            {"Python.Python.3.13",new[]{"Python 3"}},
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

    string ExplainWingetFailure(int code,string output,string operation)
    {
        if(code==0)return "Operation terminee avec succes.";
        string text=(output??"").ToLowerInvariant();
        if(code==1223 || text.Contains("operation was canceled") || text.Contains("operation cancelled") || text.Contains("annulee par l'utilisateur") || text.Contains("annulÃ©e par l'utilisateur"))
            return "L'autorisation Windows a ete annulee. Relancez l'operation puis acceptez la demande de securite.";
        if(code==unchecked((int)0x8A15007D) || text.Contains("installed for user scope cannot be uninstalled") || text.Contains("installe pour l'utilisateur") || text.Contains("installÃ© pour l'utilisateur"))
            return "Cette application appartient a votre compte Windows. OwlSetup doit effectuer l'operation sans elevation administrateur.";
        if(code==1618 || text.Contains("another installation is already in progress") || text.Contains("une autre installation est en cours"))
            return "Une autre installation Windows est deja en cours. Attendez sa fin puis recommencez.";
        if(code==1603 || text.Contains("installer failed with exit code: 1603"))
            return "L'installateur de l'editeur a rencontre une erreur. Fermez l'application concernee puis recommencez.";
        if(code==3010 || text.Contains("restart required") || text.Contains("reboot required") || text.Contains("redemarrage requis") || text.Contains("redÃ©marrage requis"))
            return "L'operation est terminee mais Windows doit redemarrer pour l'appliquer completement.";
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

    void SimulateUninstall(Dictionary<string,object> payload)
    {
        string packageId=payload!=null&&payload.ContainsKey("id")?Convert.ToString(payload["id"]):"";
        if(!Regex.IsMatch(packageId,"^[A-Za-z0-9.+_-]+$"))throw new InvalidOperationException("Logiciel invalide.");
        Task.Run(delegate {
            var report=new StringBuilder();bool installed=false;string version="",scope="Installation WinGet";int shortcuts=0;
            try
            {
                int code=RunHiddenProcess("winget.exe","list --id \""+packageId+"\" --exact --accept-source-agreements --disable-interactivity",report);
                installed=code==0&&report.ToString().IndexOf(packageId,StringComparison.OrdinalIgnoreCase)>=0;
                Match versionMatch=Regex.Match(report.ToString(),Regex.Escape(packageId)+@"\s+([^\r\n]+)",RegexOptions.IgnoreCase);
                if(versionMatch.Success)version=versionMatch.Groups[1].Value.Trim();
                if(IsManagedPortable(packageId))
                {
                    scope="Application portable installée pour l'utilisateur";
                    string shortcutName=SafeShortcutName(LoadApplicationName(packageId))+".lnk";
                    if(File.Exists(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),shortcutName)))shortcuts++;
                    if(File.Exists(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),shortcutName)))shortcuts++;
                }
                lock(uninstallSimulations)uninstallSimulations[packageId]=DateTime.UtcNow.AddMinutes(5);
                SendToWeb(new { type="uninstall-simulation",id=packageId,installed=installed,version=version,scope=scope,shortcuts=shortcuts,expiresMinutes=5 });
            }
            catch(Exception ex){SendToWeb(new { type="uninstall-simulation-error",id=packageId,message=ex.Message });}
        });
    }

    bool ConsumeUninstallSimulation(string packageId)
    {
        lock(uninstallSimulations)
        {
            DateTime expires;if(!uninstallSimulations.TryGetValue(packageId,out expires)||expires<DateTime.UtcNow)return false;
            uninstallSimulations.Remove(packageId);return true;
        }
    }

    void RunUninstall(Dictionary<string, object> payload)
    {
        string packageId=payload != null && payload.ContainsKey("id") ? Convert.ToString(payload["id"]) : "";
        if(!Regex.IsMatch(packageId,"^[A-Za-z0-9.+_-]+$")) throw new InvalidOperationException("Logiciel invalide.");
        if(!ConsumeUninstallSimulation(packageId))throw new InvalidOperationException("La simulation de désinstallation est absente ou expirée. Relancez l'aperçu.");
        if(uninstallRunning) throw new InvalidOperationException("Une désinstallation est déjà en cours.");
        if(installationRunning || repairRunning || updateRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        uninstallRunning=true;
        SendToWeb(new { type="uninstall-start", id=packageId });
        Task.Run(delegate {
            var report=new StringBuilder();
            string logName="PC-Setup-Desinstallation-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            int code=-1;
            bool success=false;
            try
            {
                report.AppendLine("OWLSETUP - RAPPORT DE DESINSTALLATION");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                report.AppendLine("Logiciel : "+packageId);
                report.AppendLine();
                string uninstallArguments="uninstall --id \""+packageId+"\" --exact --silent --accept-source-agreements --disable-interactivity";
                code=RunHiddenProcess("winget.exe",uninstallArguments,report);
                if(code==unchecked((int)0x8A15007D))
                {
                    report.AppendLine();
                    report.AppendLine("Paquet installe pour l'utilisateur : nouvelle tentative sans elevation administrateur.");
                    code=RunAsInteractiveUser(ResolveWingetPath(),uninstallArguments,report);
                }
                success=code==0;
                if(success)RemoveManagedShortcuts(packageId,report);
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
                SendToWeb(new { type="uninstall-complete", id=packageId, success=success, code=code, errorMessage=success?"":ExplainWingetFailure(code,report.ToString(),"desinstallation"), logName=logName });
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
                    code=RunHiddenProcess("winget.exe", "install --id \""+packageId+"\" --exact --force --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
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
        if(packages.Length==0)throw new InvalidOperationException("Aucun logiciel valide à désinstaller.");
        string simulationKey=String.Join("|",packages.OrderBy(value=>value,StringComparer.OrdinalIgnoreCase));
        lock(batchUninstallSimulations)
        {
            DateTime expires;
            if(!batchUninstallSimulations.TryGetValue(simulationKey,out expires)||expires<DateTime.UtcNow)throw new InvalidOperationException("La simulation groupée est absente ou expirée.");
            batchUninstallSimulations.Remove(simulationKey);
        }
        if(uninstallRunning || repairRunning || installationRunning || updateRunning || cleanupRunning)throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        uninstallRunning=true;
        SendToWeb(new { type="batch-uninstall-start",total=packages.Length });
        Task.Run(delegate {
            var report=new StringBuilder();int success=0,failed=0;
            string logName="PC-Setup-Desinstallation-Groupee-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(GetDataFolder("Logs"),logName);
            try
            {
                report.AppendLine("OWLSETUP - DESINSTALLATION GROUPEE");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                for(int i=0;i<packages.Length;i++)
                {
                    string id=packages[i];
                    SendToWeb(new { type="batch-uninstall-progress",id=id,index=i+1,total=packages.Length });
                    report.AppendLine();report.AppendLine("===== "+id+" =====");
                    int itemStart=report.Length;
                    int code=RunHiddenProcess("winget.exe","uninstall --id \""+id+"\" --exact --silent --accept-source-agreements --disable-interactivity",report);
                    string itemOutput=report.ToString(itemStart,report.Length-itemStart);
                    bool ok=code==0;if(ok){success++;RemoveManagedShortcuts(id,report);}else failed++;
                    SendToWeb(new { type="batch-uninstall-item",id=id,success=ok,index=i+1,total=packages.Length,code=code,errorMessage=ok?"":ExplainWingetFailure(code,itemOutput,"desinstallation") });
                }
            }
            catch(Exception ex){failed++;report.AppendLine("ERREUR : "+ex.Message);}
            finally
            {
                try{File.WriteAllText(logPath,report.ToString(),Encoding.UTF8);}catch{}
                uninstallRunning=false;
                SendToWeb(new { type="batch-uninstall-complete",success=success,failed=failed,logName=logName });
            }
        });
    }

    void SimulateBatchUninstall(Dictionary<string,object> payload)
    {
        var packages=ReadArray(payload,"packages").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct(StringComparer.OrdinalIgnoreCase).Take(50).ToArray();
        if(packages.Length==0)throw new InvalidOperationException("Aucun logiciel valide à simuler.");
        string key=String.Join("|",packages.OrderBy(value=>value,StringComparer.OrdinalIgnoreCase));
        lock(batchUninstallSimulations)batchUninstallSimulations[key]=DateTime.UtcNow.AddMinutes(5);
        SendToWeb(new { type="batch-uninstall-simulation",packages=packages,expiresMinutes=5 });
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
                SendToWeb(new { type="restore-point-complete",success=code==0,code=code,logName=logName });
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

    void LoadHistory()
    {
        try
        {
            string folder=GetDataFolder("Logs");
            var items=Directory.GetFiles(folder,"PC-Setup-*.log",SearchOption.TopDirectoryOnly)
                .Select(path=>new FileInfo(path)).OrderByDescending(file=>file.LastWriteTime).Take(80)
                .Select(file=>new { name=file.Name,date=file.LastWriteTime.ToString("dd/MM/yyyy HH:mm"),size=FormatBytes(file.Length),type=HistoryType(file.Name) }).ToArray();
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
        if(name.IndexOf("Mise-a-jour",StringComparison.OrdinalIgnoreCase)>=0)return "Mise à jour";
        return "Opération";
    }

    void OpenLog(Dictionary<string,object> payload)
    {
        string name=payload!=null&&payload.ContainsKey("name")?Convert.ToString(payload["name"]):"";
        if(Path.GetFileName(name)!=name || !name.StartsWith("PC-Setup-",StringComparison.OrdinalIgnoreCase) || !name.EndsWith(".log",StringComparison.OrdinalIgnoreCase))throw new InvalidOperationException("Journal invalide.");
        string path=Path.Combine(GetDataFolder("Logs"),name);
        if(!File.Exists(path))throw new FileNotFoundException("Journal introuvable.");
        Process.Start(new ProcessStartInfo{FileName=path,UseShellExecute=true});
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
                for(int i=0;i<folders.Length;i++)
                {
                    string folder=folders[i];
                    long bytes,files;MeasurePath(folder,out bytes,out files);
                    results.Add(new {name=Path.GetFileName(folder),path=folder,bytes=bytes,size=FormatBytes(bytes),files=files});
                    int percent=folders.Length==0?95:10+(int)Math.Round(((i+1)/(double)folders.Length)*85);
                    SendToWeb(new { type="tool-progress", tool="disk", percent=percent, status="Analyse de "+Path.GetFileName(folder)+"..." });
                }
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
                    if(lastCode!=0){failed++;failedCode=lastCode;failedOutput=lastOutput;}
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
                bool appsSuccess=failed==0;
                bool success=appsSuccess && windowsStarted;
                try { File.WriteAllText(logPath,report.ToString(),Encoding.UTF8); } catch { }
                updateRunning=false;
                SendToWeb(new { type="update-complete", success=success, appsSuccess=appsSuccess, windowsStarted=windowsStarted, code=appsSuccess?lastCode:failedCode, errorMessage=appsSuccess?"":ExplainWingetFailure(failedCode,failedOutput,"mise a jour"), logName=logName });
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
            int score=100-Math.Min(32,updates.Count*4)-(freePercent<10?25:(freePercent<20?12:0))-(restart?8:0)-(error!=null?35:0);
            score=Math.Max(20,Math.Min(100,score));
            healthScanning=false;
            SendToWeb(new { type="updates-found", updates=updates.ToArray(), error=error });
            SendToWeb(new { type="health-state", score=score, freeGb=freeGb, totalGb=totalGb, freePercent=freePercent, updateCount=updates.Count, pendingRestart=restart, quarantineCount=quarantine, error=error });
        });
    }

    bool IsRestartPending()
    {
        try
        {
            using(var key=Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending"))if(key!=null)return true;
            using(var key=Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired"))if(key!=null)return true;
            using(var key=Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\Session Manager"))if(key!=null && key.GetValue("PendingFileRenameOperations")!=null)return true;
        }
        catch { }
        return false;
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
                if(item.StartsWith("Local-",StringComparison.OrdinalIgnoreCase)){root=Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);folderName=item.Substring(6);}
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

    void SendSecurityStatus()
    {
        string detectedWebView="Indisponible";
        try{if(webView.CoreWebView2!=null)detectedWebView=webView.CoreWebView2.Environment.BrowserVersionString;}catch{}
        Task.Run(delegate {
            bool signed=false,trusted=false,integrity=false,admin=false,secureRuntime=false;string signer="Non signé (bêta locale)",wingetVersion="Indisponible",webViewVersion=detectedWebView;int logCount=0;
            try{integrity=VerifyInterfaceIntegrity();}catch{}
            try{admin=new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator);}catch{}
            try
            {
                var certificate=new X509Certificate2(X509Certificate.CreateFromSignedFile(Application.ExecutablePath));
                signed=true;signer=certificate.GetNameInfo(X509NameType.SimpleName,false);
                using(var chain=new X509Chain()){chain.ChainPolicy.RevocationMode=X509RevocationMode.NoCheck;trusted=chain.Build(certificate);}
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
            SendToWeb(new { type="security-status",integrity=integrity,originLocked=true,standardUser=!admin,elevation="À la demande",signed=signed,trusted=trusted,signer=signer,winget=wingetVersion,webview=webViewVersion,secureRuntime=secureRuntime,logs=logCount,logFolder=GetDataFolder("Logs"),version=BuildInfo.DisplayVersion });
        });
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
                    Match match=Regex.Match(hashText,"(?i)\\b[0-9a-f]{64}\\b");
                    if(!match.Success)throw new InvalidDataException("Empreinte SHA-256 absente.");
                    expected=match.Value.ToUpperInvariant();
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
    }

    void ExportConfiguration(Dictionary<string, object> payload)
    {
        var selected=ReadArray(payload,"selected").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        var cleanup=ReadArray(payload,"cleanup").Where(x=>Regex.IsMatch(x,"^[a-z-]+$")).Distinct().ToArray();
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
                    selectedPackages=selected, cleanupChoices=cleanup,
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
            var root=json.DeserializeObject(File.ReadAllText(source,Encoding.UTF8)) as Dictionary<string,object>;
            if(root==null || !root.ContainsKey("format") || Convert.ToString(root["format"])!="pc-setup-configuration")throw new InvalidDataException("Ce fichier n'est pas une configuration OwlSetup valide.");
            var packages=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach(string key in new[]{"installedPackages","selectedPackages"})
                foreach(string id in ReadArray(root,key))if(Regex.IsMatch(id,"^[A-Za-z0-9.+_-]+$"))packages.Add(id);
            var cleanup=ReadArray(root,"cleanupChoices").Where(x=>Regex.IsMatch(x,"^[a-z-]+$")).Distinct().ToArray();
            SendToWeb(new { type="config-imported", packages=packages.ToArray(), cleanup=cleanup, file=Path.GetFileName(source) });
        }
        catch(Exception ex){SendToWeb(new { type="config-import-error", message=ex.Message });}
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
