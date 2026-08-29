$ErrorActionPreference = "Stop"

# Verified in-app update (4.0.0-beta.33). Enabled despite the lack of code
# signing: integrity relies on the SHA-256 hash of the Release asset, the
# github.com/OwlNetGeekFR/OwlSetup URL prefix, the MZ header, and explicit
# confirmation via the modal. This test keeps those checks and covers the
# version comparator (prerelease -beta.N awareness).
# Assertions are ASCII-only on purpose: Windows PowerShell 5.1 mis-decodes
# accented literals in BOM-less UTF-8 script files.

$root = Split-Path -Parent $PSScriptRoot
$native = Get-Content -LiteralPath (Join-Path $root "OwlSetupWebView.cs") -Raw -Encoding UTF8
$app = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8
$html = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8

function Assert-Has([string]$Text, [string]$Token, [string]$Message) {
    if (-not $Text.Contains($Token)) { throw $Message }
}
function Assert-Missing([string]$Text, [string]$Token, [string]$Message) {
    if ($Text.Contains($Token)) { throw $Message }
}

# 1) The "no signature" hard block was removed, cleanly (no dead code after a throw).
Assert-Missing $native '#pragma warning disable 162' "InstallAppUpdate code is still preceded by a throw (dead code)."
Assert-Missing $native 'signature de code reconnue. Utilisez uniquement la Release GitHub' "The 'no signature' block of InstallAppUpdate is still there."
Assert-Missing $native 'if(BuildInfo.IsBeta)throw new InvalidOperationException("La mise' "The 'beta local' block of InstallAppUpdate is still there."

# 2) The update integrity checks are still in place.
Assert-Has $native 'OrdinalIgnoreCase))throw new InvalidDataException("La v' "InstallAppUpdate no longer verifies the SHA-256 hash."
Assert-Has $native 'https://github.com/OwlNetGeekFR/OwlSetup/releases/download/' "The locked Release URL prefix is gone."
Assert-Has $native '!exeUrl.StartsWith(trustedPrefix,StringComparison.OrdinalIgnoreCase)' "The update URL-prefix check is gone."
Assert-Has $native 'FindReleaseAsset(release,"SHA256.txt")' "The SHA256.txt asset is no longer fetched."
Assert-Has $native 'stream.ReadByte()!=0x4D' "The MZ executable header of the downloaded file is no longer checked."

# 3) Version comparator (mirror of beta/src/modules/app-version.js).
Assert-Has $native 'static int[] ParseAppVersion(string value)' "ParseAppVersion (version comparator) is gone."
Assert-Has $native 'static int CompareAppVersions(string current,string candidate)' "CompareAppVersions is gone."
Assert-Has $native 'CompareAppVersions(BuildInfo.DisplayVersion,tag)<0' "CheckAppUpdate no longer uses CompareAppVersions."
Assert-Has $native 'CompareAppVersions(BuildInfo.DisplayVersion,tag)>=0' "InstallAppUpdate no longer guards 'already up to date' with CompareAppVersions."
Assert-Missing $native 'Version latest=ReadReleaseVersion(release)' "The old System.Version comparator (blind to prereleases) is back."

# 4) Front-end: the button really triggers the install.
Assert-Has $app 'action: "install-app-update"' "The 'Install' button no longer posts the install-app-update action."
Assert-Has $html 'Installer la mise' "The update install button label changed."

# 5) Prerelease channel ("Recevoir les preversions").
Assert-Has $html 'id="prereleaseOptIn"' "The prerelease opt-in checkbox is missing from Settings."
Assert-Has $app 'owlsetup-prerelease-v1' "The prerelease opt-in storage key changed without migration."
Assert-Has $app 'function prereleaseOptIn()' "The prereleaseOptIn() helper is gone."
Assert-Has $app 'prerelease:prereleaseOptIn()' "check-app-update no longer forwards the prerelease preference."
Assert-Has $native 'Dictionary<string,object> GetLatestRelease(bool includePrerelease)' "The prerelease-aware GetLatestRelease overload is gone."
Assert-Has $native 'releases?per_page=' "The prerelease path no longer lists /releases."
Assert-Has $native 'void CheckAppUpdate(Dictionary<string,object> payload)' "CheckAppUpdate no longer receives the payload (prerelease flag)."
Assert-Has $native 'GetLatestRelease(includePrerelease)' "CheckAppUpdate/InstallAppUpdate no longer honor the prerelease flag."

# 6) Real comparator via reflection (when the compiled exe is present).
$exe = Join-Path $root "OwlSetup.exe"
if (Test-Path $exe) {
    $asm = [System.Reflection.Assembly]::LoadFrom($exe)
    $type = $asm.GetType("WebAppForm")
    $cmp = $type.GetMethod("CompareAppVersions", [System.Reflection.BindingFlags]"NonPublic,Static")
    $parse = $type.GetMethod("ParseAppVersion", [System.Reflection.BindingFlags]"NonPublic,Static")
    if (-not $cmp -or -not $parse) { throw "CompareAppVersions / ParseAppVersion not found via reflection." }

    function Cmp($a, $b) { [int]$cmp.Invoke($null, @([string]$a, [string]$b)) }

    if ((Cmp "4.0.0-beta.32" "4.0.0-beta.33") -ge 0) { throw "beta.32 should precede beta.33." }
    if ((Cmp "4.0.0-beta.9" "4.0.0-beta.32") -ge 0) { throw "Numeric prerelease compare broken (beta.9 vs beta.32)." }
    if ((Cmp "4.0.0-beta.32" "4.0.0") -ge 0) { throw "A stable should rank above its prerelease." }
    if ((Cmp "4.0.0" "4.0.0") -ne 0) { throw "Two identical versions should be equal." }
    if ((Cmp "4.1.0" "4.0.9") -le 0) { throw "4.1.0 should be newer than 4.0.9." }
    if ((Cmp "4.0.0-alpha.9" "4.0.0-beta.1") -ge 0) { throw "alpha should rank before beta." }
    if ($parse.Invoke($null, @([string]"latest")) -ne $null) { throw "ParseAppVersion should return null on an unreadable string." }

    Write-Host "Version comparator verified via reflection." -ForegroundColor Green
}
else {
    Write-Host "OwlSetup.exe absent: reflection check skipped (markers OK)." -ForegroundColor Yellow
}

Write-Host "In-app update: integrity checks present, version comparator correct." -ForegroundColor Green
