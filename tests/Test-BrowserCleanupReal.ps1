param(
    [switch]$Execute,
    [switch]$IncludeHistory,
    [switch]$OnlyHistory,
    [string[]]$BrowserName
)

$ErrorActionPreference = 'Stop'

function Get-TreeStats {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return [pscustomobject]@{ Exists = $false; Files = 0; Bytes = 0L; LastWriteUtc = $null }
    }

    $item = Get-Item -LiteralPath $Path -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Point de jonction refusé : $Path"
    }

    if (-not $item.PSIsContainer) {
        return [pscustomobject]@{
            Exists = $true
            Files = 1
            Bytes = [long]$item.Length
            LastWriteUtc = $item.LastWriteTimeUtc.ToString('o')
        }
    }

    $files = @(Get-ChildItem -LiteralPath $Path -File -Force -Recurse -ErrorAction SilentlyContinue |
        Where-Object { ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0 })
    $bytes = ($files | Measure-Object -Property Length -Sum).Sum
    if ($null -eq $bytes) { $bytes = 0L }
    return [pscustomobject]@{
        Exists = $true
        Files = $files.Count
        Bytes = [long]$bytes
        LastWriteUtc = $item.LastWriteTimeUtc.ToString('o')
    }
}

function Assert-SafeTarget {
    param([string]$Root, [string]$Target)

    $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd('\')
    $targetFull = [IO.Path]::GetFullPath($Target).TrimEnd('\')
    $prefix = $rootFull + '\'
    if (-not $targetFull.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Cible hors du profil autorisé : $targetFull"
    }

    $cursor = $targetFull
    while ($cursor.Length -ge $rootFull.Length -and (Test-Path -LiteralPath $cursor)) {
        $item = Get-Item -LiteralPath $cursor -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Suppression refusée sur un point de jonction : $cursor"
        }
        if ($cursor.Equals($rootFull, [StringComparison]::OrdinalIgnoreCase)) { break }
        $cursor = Split-Path -Parent $cursor
    }
    return $targetFull
}

$definitions = @(
    [pscustomobject]@{ Name='Google Chrome'; Process='chrome'; Root="$env:LOCALAPPDATA\Google\Chrome\User Data"; Profiles=$true },
    [pscustomobject]@{ Name='Microsoft Edge'; Process='msedge'; Root="$env:LOCALAPPDATA\Microsoft\Edge\User Data"; Profiles=$true },
    [pscustomobject]@{ Name='Brave'; Process='brave'; Root="$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data"; Profiles=$true },
    [pscustomobject]@{ Name='Vivaldi'; Process='vivaldi'; Root="$env:LOCALAPPDATA\Vivaldi\User Data"; Profiles=$true },
    [pscustomobject]@{ Name='Opera'; Process='opera'; Root="$env:APPDATA\Opera Software\Opera Stable"; Profiles=$false },
    [pscustomobject]@{ Name='Opera GX'; Process='opera'; Root="$env:APPDATA\Opera Software\Opera GX Stable"; Profiles=$false }
)

$safeRelative = if ($OnlyHistory) {
    @('History', 'History-journal')
} else {
    @('Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'Media Cache', 'Crashpad\reports', 'Crashpad\pending')
}
if ($IncludeHistory -and -not $OnlyHistory) { $safeRelative += @('History', 'History-journal') }
$protectedRelative = @(
    'Login Data', 'Bookmarks', 'Extensions', 'Cookies', 'Web Data',
    'Sessions', 'Current Session', 'Current Tabs', 'Last Session', 'Last Tabs'
)
if (-not $IncludeHistory -and -not $OnlyHistory) { $protectedRelative += 'History' }
$results = @()

foreach ($browser in $definitions) {
    if ($BrowserName.Count -gt 0 -and $BrowserName -notcontains $browser.Name) { continue }
    if (-not (Test-Path -LiteralPath $browser.Root)) { continue }

    $running = @(Get-Process -Name $browser.Process -ErrorAction SilentlyContinue).Count -gt 0
    $profiles = if ($browser.Profiles) {
        @(Get-ChildItem -LiteralPath $browser.Root -Directory -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' })
    } else {
        @([pscustomobject]@{ Name='Profil principal'; FullName=$browser.Root })
    }

    foreach ($profile in $profiles) {
        $protectedBefore = @{}
        foreach ($relative in $protectedRelative) {
            $protectedBefore[$relative] = Get-TreeStats (Join-Path $profile.FullName $relative)
        }

        $beforeFiles = 0
        $beforeBytes = 0L
        $targets = @()
        foreach ($relative in $safeRelative) {
            $candidate = Join-Path $profile.FullName $relative
            if (Test-Path -LiteralPath $candidate) {
                $safePath = Assert-SafeTarget -Root $browser.Root -Target $candidate
                $stats = Get-TreeStats $safePath
                $beforeFiles += $stats.Files
                $beforeBytes += $stats.Bytes
                $targets += $safePath
            }
        }

        $status = if ($running) { 'Ignoré : navigateur ouvert' } elseif (-not $Execute) { 'Simulation' } else { 'Nettoyé' }
        $errors = @()
        if ($Execute -and -not $running) {
            foreach ($target in $targets) {
                try {
                    $null = Assert-SafeTarget -Root $browser.Root -Target $target
                    Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
                } catch {
                    $errors += $_.Exception.Message
                }
            }
            if ($errors.Count -gt 0) { $status = 'Nettoyage partiel' }
        }

        $afterFiles = 0
        $afterBytes = 0L
        foreach ($target in $targets) {
            $stats = Get-TreeStats $target
            $afterFiles += $stats.Files
            $afterBytes += $stats.Bytes
        }

        $protectedUnchanged = $true
        foreach ($relative in $protectedRelative) {
            $after = Get-TreeStats (Join-Path $profile.FullName $relative)
            $before = $protectedBefore[$relative]
            if ($before.Exists -ne $after.Exists -or $before.Files -ne $after.Files -or
                $before.Bytes -ne $after.Bytes -or $before.LastWriteUtc -ne $after.LastWriteUtc) {
                $protectedUnchanged = $false
            }
        }

        $results += [pscustomobject]@{
            Browser = $browser.Name
            Profile = $profile.Name
            Status = $status
            FilesBefore = $beforeFiles
            FilesAfter = $afterFiles
            BytesBefore = $beforeBytes
            BytesAfter = $afterBytes
            BytesFreed = [Math]::Max(0L, $beforeBytes - $afterBytes)
            ProtectedDataUnchanged = $protectedUnchanged
            Errors = $errors
        }
    }
}

$reportDirectory = Join-Path $PSScriptRoot 'results'
if (-not (Test-Path -LiteralPath $reportDirectory)) {
    New-Item -ItemType Directory -Path $reportDirectory | Out-Null
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$reportPath = Join-Path $reportDirectory "browser-cleanup-real-$stamp.json"
$report = [pscustomobject]@{
    Executed = [bool]$Execute
    CreatedAt = (Get-Date).ToUniversalTime().ToString('o')
    Categories = $(if ($OnlyHistory) { @('Historique') } else { @('Cache de navigation', 'Cache multimédia', 'Rapports de plantage') + $(if ($IncludeHistory) { 'Historique' }) })
    Protected = @('Mots de passe', 'Favoris', 'Extensions', 'Cookies', 'Données de sites', 'Sessions') + $(if (-not $IncludeHistory -and -not $OnlyHistory) { 'Historique' })
    Results = $results
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8

$results | Select-Object Browser, Profile, Status, FilesBefore, FilesAfter,
    @{Name='MoLibérés';Expression={[Math]::Round($_.BytesFreed / 1MB, 2)}}, ProtectedDataUnchanged, Errors |
    Format-Table -AutoSize
Write-Output "REPORT=$reportPath"

if (@($results | Where-Object { -not $_.ProtectedDataUnchanged }).Count -gt 0) { exit 2 }
if (@($results | Where-Object { $_.Errors.Count -gt 0 }).Count -gt 0) { exit 3 }
