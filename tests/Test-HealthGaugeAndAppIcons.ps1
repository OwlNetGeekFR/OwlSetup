$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$css = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8
$js = Get-Content -LiteralPath (Join-Path $root "app.js") -Raw -Encoding UTF8

if (-not $css.Contains('conic-gradient(from 0deg,var(--ring-color) calc(var(--score)*1%)')) {
    throw "The maintenance gauge is not proportional to its score."
}
if (-not $js.Contains('$("#healthRing").style.setProperty("--score"')) {
    throw "The maintenance score is not sent to the gauge."
}
if (-not $css.Contains('.app-icon,.update-app-icon,.report-item-icon')) {
    throw "Application icons do not share a consistent visual treatment."
}
if (-not $css.Contains('background:linear-gradient(145deg,#1a2534,#111923)!important')) {
    throw "Application logos do not use the shared neutral background."
}
if ($css.Contains('filter:saturate(1.06) contrast(1.06)')) {
    throw "Official application logo colors are still being altered."
}

$coloredSvgFiles = @(
    "googlechrome.svg",
    "firefox.svg",
    "brave.svg",
    "opera.svg",
    "spotify.svg",
    "docker.svg",
    "git.svg"
)
foreach ($fileName in $coloredSvgFiles) {
    $logoPath = Join-Path $root "assets\logos\$fileName"
    $logo = Get-Content -LiteralPath $logoPath -Raw -Encoding UTF8
    $colors = [regex]::Matches($logo, '#[0-9A-Fa-f]{3,8}') |
        ForEach-Object { $_.Value.ToLowerInvariant() } |
        Where-Object { $_ -notin @('#fff', '#ffffff') } |
        Select-Object -Unique
    if (-not $colors) {
        throw "The application logo $fileName is still monochrome white."
    }
}

$vlcPath = Join-Path $root "assets\logos\vlc.png"
$vlcBytes = [System.IO.File]::ReadAllBytes($vlcPath)
if ($vlcBytes.Length -lt 8 -or $vlcBytes[0] -ne 0x89 -or $vlcBytes[1] -ne 0x50 -or $vlcBytes[2] -ne 0x4E -or $vlcBytes[3] -ne 0x47) {
    throw "The VLC logo is not a valid color PNG file."
}
if (-not $js.Contains('"GitHub.GitHubDesktop":"githubdesktop.png"') -or -not $js.Contains('"DBeaver.DBeaver.Community":"dbeaver.png"')) {
    throw "GitHub Desktop and DBeaver do not use their official application icons."
}
if (-not $js.Contains('const logosRequiringLightSurface = new Set([') -or -not $css.Contains('.app-icon.app-icon-light')) {
    throw "Dark official logos are not displayed on an accessible light surface."
}

Write-Host "Maintenance gauge and application icon treatment: OK" -ForegroundColor Green
