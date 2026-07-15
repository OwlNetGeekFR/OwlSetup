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
using System.Text.RegularExpressions;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("PC Setup")]
[assembly: AssemblyProduct("PC Setup")]
[assembly: AssemblyDescription("Installation, mise a jour et entretien de Windows")]
[assembly: AssemblyCompany("PC Setup")]
[assembly: AssemblyVersion("3.1.0.0")]
[assembly: AssemblyFileVersion("3.1.0.0")]

internal sealed class WebAppForm : Form
{
    readonly WebView2 webView;
    readonly string appRoot;
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    bool installationRunning;
    bool uninstallRunning;
    bool scanRunning;
    bool updateRunning;
    bool cleanupRunning;
    bool healthScanning;
    bool updatesScanning;
    bool selfUpdateRunning;

    public WebAppForm()
    {
        Text = "PC Setup";
        string iconPath=Path.Combine(Bootstrap.AppRoot,"PC-Setup.ico");
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
            webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.IsZoomControlEnabled = false;
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping("pcsetup.local", appRoot, CoreWebView2HostResourceAccessKind.DenyCors);
            webView.CoreWebView2.WebMessageReceived += OnWebMessage;
            webView.CoreWebView2.NewWindowRequested += delegate(object s, CoreWebView2NewWindowRequestedEventArgs args) {
                args.Handled = true;
                OpenExternal(args.Uri);
            };
            webView.CoreWebView2.NavigationStarting += delegate(object s, CoreWebView2NavigationStartingEventArgs args) {
                Uri target;
                if (Uri.TryCreate(args.Uri, UriKind.Absolute, out target) && target.Host != "pcsetup.local") {
                    args.Cancel = true;
                    OpenExternal(args.Uri);
                }
            };
            webView.Source = new Uri("https://pcsetup.local/index.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show("Impossible de charger l'interface PC Setup.\r\n\r\n" + ex.Message, "PC Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
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

    void OnWebMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var message = json.DeserializeObject(e.WebMessageAsJson) as Dictionary<string, object>;
            if (message == null || !message.ContainsKey("action")) throw new InvalidOperationException("Commande invalide.");
            string action = Convert.ToString(message["action"]);
            var payload = message.ContainsKey("payload") ? message["payload"] as Dictionary<string, object> : null;
            if (action == "update") RunUpdate(payload);
            else if (action == "check-app-update") CheckAppUpdate();
            else if (action == "install-app-update") InstallAppUpdate();
            else if (action == "scan-health") ScanHealth();
            else if (action == "scan-updates") ScanUpdates();
            else if (action == "install") RunInstall(payload);
            else if (action == "scan-installed") ScanInstalled(payload);
            else if (action == "uninstall") RunUninstall(payload);
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
        if (packages.Length == 0) throw new InvalidOperationException("Aucun logiciel valide n'est sélectionné.");
        if (installationRunning) throw new InvalidOperationException("Une installation est déjà en cours.");
        if(uninstallRunning || updateRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        installationRunning = true;
        SendToWeb(new { type="install-start", total=packages.Length });
        Task.Run(delegate {
            int success=0, failed=0;
            var report=new StringBuilder();
            string logName="PC-Setup-Installation-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),logName);
            try
            {
                report.AppendLine("PC SETUP - RAPPORT D'INSTALLATION");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                for(int i=0;i<packages.Length;i++)
                {
                    string id=packages[i];
                    SendToWeb(new { type="install-progress", index=i+1, total=packages.Length, id=id });
                    report.AppendLine(); report.AppendLine("===== "+id+" =====");
                    int code=RunWinget(id,report);
                    bool ok=code==0;
                    if(ok)success++;else failed++;
                    report.AppendLine("Code de sortie : "+code);
                    SendToWeb(new { type="install-item", index=i+1, total=packages.Length, id=id, success=ok });
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
        return RunHiddenProcess("winget.exe", "install --id \""+packageId+"\" --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity", report);
    }

    int RunHiddenProcess(string fileName, string arguments, StringBuilder report)
    {
        return RunHiddenProcess(fileName,arguments,report,null);
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

    void ScanInstalled(Dictionary<string, object> payload)
    {
        if (scanRunning) return;
        var requested = new HashSet<string>(ReadArray(payload, "ids").Where(x => Regex.IsMatch(x, "^[A-Za-z0-9.+_-]+$")).Take(200), StringComparer.OrdinalIgnoreCase);
        scanRunning = true;
        Task.Run(delegate {
            string folder=Path.Combine(Path.GetTempPath(),"PCSetup");
            string exportFile=Path.Combine(folder,"installed-"+Guid.NewGuid().ToString("N")+".json");
            var report=new StringBuilder();
            var installed=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                Directory.CreateDirectory(folder);
                RunHiddenProcess("winget.exe", "export -o \""+exportFile+"\" --accept-source-agreements --disable-interactivity", report);
                if(File.Exists(exportFile))
                {
                    string contents=File.ReadAllText(exportFile,Encoding.UTF8);
                    foreach(Match match in Regex.Matches(contents,"\"PackageIdentifier\"\\s*:\\s*\"([^\"]+)\"",RegexOptions.IgnoreCase))
                    {
                        string id=match.Groups[1].Value;
                        if(requested.Count==0 || requested.Contains(id)) installed.Add(id);
                    }
                }
            }
            catch { }
            finally
            {
                try { if(File.Exists(exportFile)) File.Delete(exportFile); } catch { }
                scanRunning=false;
                SendToWeb(new { type="installed-state", ids=installed.ToArray() });
            }
        });
    }

    void RunUninstall(Dictionary<string, object> payload)
    {
        string packageId=payload != null && payload.ContainsKey("id") ? Convert.ToString(payload["id"]) : "";
        if(!Regex.IsMatch(packageId,"^[A-Za-z0-9.+_-]+$")) throw new InvalidOperationException("Logiciel invalide.");
        if(uninstallRunning) throw new InvalidOperationException("Une désinstallation est déjà en cours.");
        if(installationRunning || updateRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        uninstallRunning=true;
        SendToWeb(new { type="uninstall-start", id=packageId });
        Task.Run(delegate {
            var report=new StringBuilder();
            string logName="PC-Setup-Desinstallation-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),logName);
            int code=-1;
            bool success=false;
            try
            {
                report.AppendLine("PC SETUP - RAPPORT DE DESINSTALLATION");
                report.AppendLine("Date : "+DateTime.Now.ToString("G"));
                report.AppendLine("Logiciel : "+packageId);
                report.AppendLine();
                code=RunHiddenProcess("winget.exe", "uninstall --id \""+packageId+"\" --exact --silent --accept-source-agreements --disable-interactivity", report);
                success=code==0;
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
                SendToWeb(new { type="uninstall-complete", id=packageId, success=success, code=code, logName=logName });
            }
        });
    }

    void RunUpdate(Dictionary<string, object> payload)
    {
        var packages=ReadArray(payload,"packages").Where(x=>Regex.IsMatch(x,"^[A-Za-z0-9.+_-]+$")).Distinct().Take(100).ToArray();
        if(updateRunning) throw new InvalidOperationException("Une mise à jour est déjà en cours.");
        if(installationRunning || uninstallRunning || cleanupRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        updateRunning=true;
        SendToWeb(new { type="update-start", total=packages.Length });
        Task.Run(delegate {
            var report=new StringBuilder();
            string logName="PC-Setup-Mise-a-jour-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),logName);
            int failed=0, lastCode=0;
            bool windowsStarted=false;
            try
            {
                report.AppendLine("PC SETUP - RAPPORT DE MISE A JOUR");
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
                    lastCode=RunHiddenProcess("winget.exe","upgrade --id \""+id+"\" --exact --silent --accept-package-agreements --accept-source-agreements --disable-interactivity",report);
                    if(lastCode!=0)failed++;
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
                SendToWeb(new { type="update-complete", success=success, appsSuccess=appsSuccess, windowsStarted=windowsStarted, code=lastCode, logName=logName });
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

    List<Dictionary<string,object>> BuildQuarantineItems()
    {
        var items=new List<Dictionary<string,object>>();
        string desktop=Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        foreach(string batchPath in Directory.GetDirectories(desktop,"PC-Setup-Quarantaine-*",SearchOption.TopDirectoryOnly))
        {
            foreach(string itemPath in Directory.GetDirectories(batchPath,"*",SearchOption.TopDirectoryOnly))
            {
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
        string desktop=Path.GetFullPath(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory))+Path.DirectorySeparatorChar;
        batchPath=Path.GetFullPath(Path.Combine(desktop,batch));
        string itemPath=Path.GetFullPath(Path.Combine(batchPath,item));
        if(!batchPath.StartsWith(desktop,StringComparison.OrdinalIgnoreCase) || !itemPath.StartsWith(batchPath+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase) || !Directory.Exists(itemPath))throw new InvalidOperationException("Élément de quarantaine introuvable.");
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
            client.Headers[HttpRequestHeader.UserAgent]="PC-Setup/"+Assembly.GetExecutingAssembly().GetName().Version;
            client.Headers[HttpRequestHeader.Accept]="application/vnd.github+json";
            string content=client.DownloadString("https://api.github.com/repos/OwlNetGeekFR/pc-setup/releases/latest");
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
        Version version=Assembly.GetExecutingAssembly().GetName().Version;
        return version.Major+"."+version.Minor+"."+version.Build;
    }

    void CheckAppUpdate()
    {
        if(selfUpdateRunning)return;
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
        if(selfUpdateRunning)throw new InvalidOperationException("La mise à jour de PC Setup est déjà en cours.");
        if(installationRunning || uninstallRunning || updateRunning || cleanupRunning)throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        selfUpdateRunning=true;
        SendToWeb(new { type="app-update-state", status="downloading", current=CurrentVersionText() });
        Task.Run(delegate {
            string downloaded=null;
            try
            {
                var release=GetLatestRelease();
                Version latest=ReadReleaseVersion(release);
                Version current=Assembly.GetExecutingAssembly().GetName().Version;
                if(latest.CompareTo(current)<=0)throw new InvalidOperationException("PC Setup est déjà à jour.");
                var exeAsset=FindReleaseAsset(release,"PC-Setup.exe");
                var hashAsset=FindReleaseAsset(release,"SHA256.txt");
                if(exeAsset==null || hashAsset==null)throw new FileNotFoundException("La Release ne contient pas les fichiers de mise à jour requis.");
                string exeUrl=Convert.ToString(exeAsset["browser_download_url"]);
                string hashUrl=Convert.ToString(hashAsset["browser_download_url"]);
                string trustedPrefix="https://github.com/OwlNetGeekFR/pc-setup/releases/download/";
                if(!exeUrl.StartsWith(trustedPrefix,StringComparison.OrdinalIgnoreCase) || !hashUrl.StartsWith(trustedPrefix,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Source de mise à jour non approuvée.");
                string folder=Path.Combine(Path.GetTempPath(),"PCSetup","Update-"+latest.ToString(3));
                Directory.CreateDirectory(folder);
                downloaded=Path.Combine(folder,"PC-Setup.exe");
                string expected;
                using(var client=new WebClient())
                {
                    client.Headers[HttpRequestHeader.UserAgent]="PC-Setup/"+CurrentVersionText();
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
        if(cleanupRunning) throw new InvalidOperationException("Un nettoyage est déjà en cours.");
        if(installationRunning || uninstallRunning || updateRunning) throw new InvalidOperationException("Attendez la fin de l'opération en cours.");
        string file = WriteTempJson("cleanup", choices);
        cleanupRunning=true;
        SendToWeb(new { type="cleanup-start", total=choices.Length });
        Task.Run(delegate {
            var report=new StringBuilder();
            string recovered="0";
            int code=-1;
            string logName="PC-Setup-Nettoyage-"+DateTime.Now.ToString("yyyy-MM-dd-HHmm")+".log";
            string logPath=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),logName);
            try
            {
                string script=Path.Combine(appRoot,"Liberer-espace-disque.ps1");
                string arguments="-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \""+script+"\" -ChoicesFile \""+file+"\" -Integrated -LogPath \""+logPath+"\"";
                code=RunHiddenProcess("powershell.exe",arguments,report,delegate(string line){
                    if(line.StartsWith("PCSETUP_STAGE|",StringComparison.Ordinal))
                    {
                        string[] parts=line.Split(new[]{'|'},3);
                        if(parts.Length==3)
                        {
                            int index=Array.IndexOf(choices,parts[1])+1;
                            int percent=10+(int)Math.Round((Math.Max(index,1)-1)*75.0/choices.Length);
                            SendToWeb(new { type="cleanup-stage", id=parts[1], label=parts[2], index=Math.Max(index,1), total=choices.Length, percent=percent });
                        }
                    }
                    else if(line.StartsWith("PCSETUP_RESULT|",StringComparison.Ordinal)) recovered=line.Substring("PCSETUP_RESULT|".Length).Trim();
                });
            }
            catch(Exception ex)
            {
                report.AppendLine(); report.AppendLine("ERREUR : "+ex.Message);
            }
            finally
            {
                try { if(File.Exists(file)) File.Delete(file); } catch { }
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

    [DllImport("kernel32", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool SetDllDirectory(string lpPathName);

    [STAThread]
    static void Main()
    {
        try
        {
            AppRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PCSetup", "App2");
            RuntimeRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PCSetup", "Runtime");
            Directory.CreateDirectory(AppRoot);
            Directory.CreateDirectory(RuntimeRoot);
            Directory.CreateDirectory(Path.Combine(AppRoot,"assets","branding"));
            Extract("index.html", Path.Combine(AppRoot, "index.html"));
            Extract("app.js", Path.Combine(AppRoot, "app.js"));
            Extract("styles.css", Path.Combine(AppRoot, "styles.css"));
            Extract("app-logo.png", Path.Combine(AppRoot, "assets", "branding", "pc-setup-logo.png"));
            Extract("app-icon.ico", Path.Combine(AppRoot, "PC-Setup.ico"));
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
            MessageBox.Show(ex.Message, "PC Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
