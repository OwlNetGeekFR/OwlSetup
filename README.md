<div align="center">
  <img src="assets/branding/owlsetup-logo-512.png" width="150" alt="OwlSetup logo">

  # OwlSetup

  **An open-source Windows maintenance center to install, update, uninstall and clean software with WinGet.**

  [![Version](https://img.shields.io/github/v/release/OwlNetGeekFR/OwlSetup?display_name=tag&sort=semver)](https://github.com/OwlNetGeekFR/OwlSetup/releases/latest)
  [![Release build](https://github.com/OwlNetGeekFR/OwlSetup/actions/workflows/release.yml/badge.svg)](https://github.com/OwlNetGeekFR/OwlSetup/actions/workflows/release.yml)
  [![MIT License](https://img.shields.io/github/license/OwlNetGeekFR/OwlSetup)](LICENSE)
  [![Windows 10/11](https://img.shields.io/badge/Windows-10%20%7C%2011-1473e6)](#requirements)

  [Download](https://github.com/OwlNetGeekFR/OwlSetup/releases/latest) · [Official website](https://owlsetup.owlnetgeek.fr/) · [Report an issue](https://github.com/OwlNetGeekFR/OwlSetup/issues/new/choose) · [Privacy](PRIVACY.md)

  **English** · [Français](README.fr.md)
</div>

---

OwlSetup is a free, open-source and ad-free Windows maintenance application. It brings software installation and removal, updates, disk cleanup and useful system tools together in one interface. Sensitive actions are always shown to the user before they run.

## Why OwlSetup?

- Install and update applications through Microsoft WinGet.
- Detect installed applications and manage them from one catalog.
- Clean temporary files and application leftovers with a confirmation step.
- Keep reports and settings locally on the computer.
- Use the application without an account, advertising or mandatory telemetry.

## Quick installation

1. Download **`OwlSetup-Setup.exe`** from the [latest official release](https://github.com/OwlNetGeekFR/OwlSetup/releases/latest).
2. If desired, verify its checksum against the `SHA256.txt` file included in the same release.
3. Run the installer and follow the instructions.

> OwlSetup is not digitally signed yet. Windows SmartScreen may display a warning on first launch. Only download the application from this official repository.

## Main features

| Area | Features |
| --- | --- |
| Software | WinGet catalog, official links, profiles and installed-application detection |
| Management | Individual or batch installation, repair and uninstallation |
| Updates | Version comparison, individual selection, Windows Update and Microsoft-provided drivers |
| Cleanup | Temporary files, caches, Recycle Bin, Windows components and application leftovers |
| Security | Preview and confirmation of sensitive actions, restorable quarantine and path validation |
| Diagnostics | WinGet, restore points, startup applications, disk usage and local reports |

Logs and working data stay on the computer in `%LOCALAPPDATA%\PCSetup`. OwlSetup contains no advertising. Optional minimal diagnostic reporting is disabled by default and controlled by the user in Settings.

## Command line (no interface)

Launched with any argument starting with `-`, OwlSetup runs headless — useful for
technicians, scripted setups and fleet deployment. Without arguments it starts the
graphical interface as usual.

```text
OwlSetup.exe --install <id>[,<id>...]      Install / update software through WinGet
OwlSetup.exe --uninstall <id>[,<id>...]    Uninstall software
OwlSetup.exe --update [<id>,...]           Update (everything WinGet offers if no id)
OwlSetup.exe --check-updates [--json]      List available updates
OwlSetup.exe --export-profile <file>       Write a profile replayable by --apply
OwlSetup.exe --apply <config.pcsetup.json> Replay a configuration
OwlSetup.exe --list [filter] [--json]      List the built-in catalog
OwlSetup.exe --search <term>               Search the WinGet source
OwlSetup.exe --version | --help
```

Options: `--dry-run` (plan only, changes nothing), `--silent` (minimal output),
`--json` (machine-readable output for `--list` and `--check-updates`).

Exit codes: `0` success, `1` at least one failure, `2` usage error, `3` WinGet
missing. `--check-updates` returns `1` when at least one update is available, so
it can drive a scheduled task. Every run also writes a transcript to
`%LOCALAPPDATA%\PCSetup\Logs`.

`OwlSetup.com` ships next to the executable: it is a console shim, so
`& OwlSetup --version` from PowerShell waits for completion and fills
`$LASTEXITCODE`.

Clone one machine onto another:

```powershell
# On the reference machine
OwlSetup.exe --export-profile modele.pcsetup.json

# On the target machine (elevated for machine-wide packages)
OwlSetup.exe --apply modele.pcsetup.json --silent
```

`--apply` installs the packages listed in the configuration, then updates those
WinGet reports as upgradable, then runs the configuration's cleanup zones when the
session is elevated.


## Requirements

- Windows 10 version 1809 or later, or Windows 11;
- a 64-bit processor;
- Microsoft Edge WebView2 Runtime;
- WinGet / App Installer;
- administrator privileges for some system operations.

## Build the project

Prerequisites: Windows PowerShell, .NET Framework and [Inno Setup 6](https://jrsoftware.org/isinfo.php) to build the installer.

```powershell
./build.ps1
./build-installer.ps1 -Version 3.7.0
```

To prepare all stable-release files without publishing them:

```powershell
./build-stable.ps1 -Version 3.7.0
```

To produce a clearly identified local beta:

```powershell
./build-beta.ps1 -Version "3.7.1-beta.1"
```

Local builds are placed in `artifacts/` and are not tracked by Git.

## Validate the catalog

The following script validates WinGet package identifiers without installing or removing software:

```powershell
./tools/Test-OwlSetupCatalog.ps1
```

Destructive testing is intended only for a dedicated test computer or virtual machine. Read the [catalog validation guide](CATALOG-TEST-GUIDE.md) before using it.

## Contributing and support

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change.
- Use the [issue templates](https://github.com/OwlNetGeekFR/OwlSetup/issues/new/choose) for bugs and feature requests.
- For a vulnerability, follow [SECURITY.md](SECURITY.md) and do not disclose details in a public issue.
- Release history is available in [CHANGELOG.md](CHANGELOG.md).

## Support the project

OwlSetup remains free, open source and without paid features. Optional donations help fund testing, hosting and a future digital code-signing certificate.

[![Support OwlSetup on Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20OwlSetup-ff5e5b?logo=kofi&logoColor=white)](https://ko-fi.com/owlsetup)

## License and trademarks

OwlSetup is distributed under the [MIT License](LICENSE). Copyright © 2026 OwlNetGeekFR.

Application names, trademarks and logos belong to their respective owners. They are displayed only to identify the software available in the catalog.
