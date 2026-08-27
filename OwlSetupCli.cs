using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;

// Shim console d'OwlSetup.
//
// OwlSetup.exe est compilé en /target:winexe : depuis PowerShell, l'opérateur
// « & » ne l'attend pas et $LASTEXITCODE n'est pas renseigné. Ce petit
// exécutable console (livré sous le nom OwlSetup.com, prioritaire sur .exe dans
// PATHEXT) relaie tous les arguments vers l'OwlSetup.exe voisin, hérite de la
// console de l'appelant et propage le code de sortie. « OwlSetup --install X »
// se comporte alors comme n'importe quel outil en ligne de commande.
internal static class OwlSetupCliShim
{
    private static int Main(string[] args)
    {
        string self = Assembly.GetExecutingAssembly().Location;
        string target = Path.ChangeExtension(self, ".exe");
        if (!File.Exists(target))
        {
            Console.Error.WriteLine("OwlSetup : exécutable introuvable (" + Path.GetFileName(target) + " attendu à côté de ce fichier).");
            return 3;
        }

        var info = new ProcessStartInfo
        {
            FileName = target,
            Arguments = BuildArguments(args),
            UseShellExecute = false
        };

        try
        {
            using (var process = Process.Start(info))
            {
                process.WaitForExit();
                return process.ExitCode;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine("OwlSetup : " + ex.Message);
            return 1;
        }
    }

    private static string BuildArguments(string[] args)
    {
        var builder = new StringBuilder();
        foreach (string arg in args)
        {
            if (builder.Length > 0) builder.Append(' ');
            if (arg.Length == 0 || arg.IndexOf(' ') >= 0 || arg.IndexOf('"') >= 0 || arg.IndexOf('\t') >= 0)
                builder.Append('"').Append(arg.Replace("\"", "\\\"")).Append('"');
            else
                builder.Append(arg);
        }
        return builder.ToString();
    }
}
