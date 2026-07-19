<div align="center">
  <img src="assets/branding/owlsetup-logo-512.png" width="150" alt="Logo OwlSetup">

  # OwlSetup

  **Installer, mettre à jour et entretenir Windows depuis une seule application.**

  [![Version](https://img.shields.io/github/v/release/OwlNetGeekFR/OwlSetup?display_name=tag&sort=semver)](https://github.com/OwlNetGeekFR/OwlSetup/releases/latest)
  [![Publication](https://github.com/OwlNetGeekFR/OwlSetup/actions/workflows/release.yml/badge.svg)](https://github.com/OwlNetGeekFR/OwlSetup/actions/workflows/release.yml)
  [![Licence MIT](https://img.shields.io/github/license/OwlNetGeekFR/OwlSetup)](LICENSE)
  [![Windows 10/11](https://img.shields.io/badge/Windows-10%20%7C%2011-1473e6)](#configuration-requise)

  [Télécharger](https://github.com/OwlNetGeekFR/OwlSetup/releases/latest) · [Site officiel](https://owlnetgeekfr.github.io/OwlSetup-Website/) · [Signaler un problème](https://github.com/OwlNetGeekFR/OwlSetup/issues/new/choose) · [Confidentialité](PRIVACY.md)
</div>

---

OwlSetup est une application Windows open source qui centralise l’installation et la désinstallation de logiciels, les mises à jour, le nettoyage du disque et plusieurs outils de maintenance. Les actions sensibles sont présentées à l’utilisateur avant leur exécution.

## Installation rapide

1. Téléchargez **`OwlSetup-Setup.exe`** depuis la [dernière Release officielle](https://github.com/OwlNetGeekFR/OwlSetup/releases/latest).
2. Vérifiez, si vous le souhaitez, son empreinte avec le fichier `SHA256.txt` fourni dans la même Release.
3. Lancez l’installateur et suivez les instructions.

> OwlSetup n’est pas encore signé numériquement. Windows SmartScreen peut afficher un avertissement au premier lancement. Ne téléchargez l’application que depuis ce dépôt officiel.

## Fonctionnalités principales

| Domaine | Fonctionnalités |
| --- | --- |
| Logiciels | Catalogue WinGet, liens officiels, profils, détection des applications installées |
| Gestion | Installation, réparation, désinstallation individuelle ou groupée |
| Mises à jour | Comparaison des versions, sélection individuelle, Windows Update et pilotes certifiés |
| Nettoyage | Fichiers temporaires, caches, Corbeille, composants Windows et résidus d’applications |
| Sécurité | Simulation et confirmation des actions sensibles, quarantaine restaurable, contrôles de chemins |
| Diagnostic | WinGet, point de restauration, démarrage Windows, occupation du disque et rapports locaux |

Les journaux et données de travail restent sur l’ordinateur, dans `%LOCALAPPDATA%\PCSetup`. OwlSetup ne contient ni publicité ni télémétrie.

## Configuration requise

- Windows 10 version 1809 ou ultérieure, ou Windows 11 ;
- processeur 64 bits ;
- Microsoft Edge WebView2 Runtime ;
- WinGet / App Installer ;
- droits administrateur pour certaines opérations système.

## Compiler le projet

Prérequis : Windows PowerShell, .NET Framework et [Inno Setup 6](https://jrsoftware.org/isinfo.php) pour produire l’installateur.

```powershell
./build.ps1
./build-installer.ps1 -Version 3.5.1
```

Pour préparer tous les fichiers d’une version stable sans les publier :

```powershell
./build-stable.ps1 -Version 3.5.1
```

Pour produire une bêta locale clairement identifiée :

```powershell
./build-beta.ps1 -Version "3.5.2-beta.1"
```

Les constructions locales sont placées dans `artifacts/` et ne sont pas suivies par Git.

## Vérifier le catalogue

Le script suivant contrôle les identifiants WinGet sans installer ni supprimer de logiciel :

```powershell
./tools/Test-OwlSetupCatalog.ps1
```

Le mode destructif est réservé à une machine de test ou une machine virtuelle. Consultez le [guide de validation du catalogue](CATALOG-TEST-GUIDE.md) avant de l’utiliser.

## Contribuer et obtenir de l’aide

- Consultez [CONTRIBUTING.md](CONTRIBUTING.md) avant de proposer une modification.
- Utilisez les [modèles de signalement](https://github.com/OwlNetGeekFR/OwlSetup/issues/new/choose) pour un bug ou une suggestion.
- Pour une vulnérabilité, suivez impérativement [SECURITY.md](SECURITY.md) et ne publiez pas les détails dans une Issue publique.
- L’historique fonctionnel est disponible dans [CHANGELOG.md](CHANGELOG.md).

## Soutenir le projet

OwlSetup reste gratuit, open source et sans fonctionnalité payante. Les dons facultatifs contribuent aux tests, à l’hébergement et à la future signature numérique de l’application.

[![Soutenir OwlSetup sur Ko-fi](https://img.shields.io/badge/Ko--fi-Soutenir%20OwlSetup-ff5e5b?logo=kofi&logoColor=white)](https://ko-fi.com/owlsetup)

## Licence et marques

OwlSetup est distribué sous [licence MIT](LICENSE). Copyright © 2026 OwlNetGeekFR.

Les noms, marques et logos des applications du catalogue appartiennent à leurs éditeurs respectifs. Leur présence sert uniquement à identifier les logiciels proposés.
