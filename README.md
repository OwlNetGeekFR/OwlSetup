# PC Setup

![PC Setup](assets/branding/pc-setup-logo-512.png)

PC Setup est une application Windows 10/11 qui centralise l’installation de logiciels, les mises à jour, le nettoyage du disque et la récupération des résidus d’applications.

## Fonctionnalités

- Catalogue de 31 logiciels validés avec WinGet et liens vers les sites officiels.
- Installation adaptée pour Chrome et Spotify, avec secours officiel contrôlé par signature numérique.
- Installation et désinstallation silencieuses avec WinGet.
- Détection des logiciels déjà installés.
- Aperçu des mises à jour avec comparaison des versions.
- Sélection individuelle des applications à actualiser.
- Recherche Windows Update et pilotes certifiés.
- Nettoyage des fichiers temporaires, caches, Corbeille et composants Windows.
- Quarantaine restaurable pour les anciens dossiers AppData.
- Tableau de santé local : mises à jour, espace disque et redémarrage en attente.
- Mise à jour automatique de PC Setup depuis les Releases GitHub avec contrôle SHA-256.
- Notification visuelle au démarrage lorsqu’une nouvelle version de PC Setup est disponible.
- Rapports rangés dans `%LOCALAPPDATA%\PCSetup\Logs` sans encombrer le Bureau.

## Télécharger

La dernière version publique est disponible dans les [Releases GitHub](../../releases/latest).

Le dépôt contient uniquement les sources nécessaires à la compilation. Les utilisateurs n’ont besoin que de `PC-Setup.exe` disponible dans les Releases.

L’empreinte SHA-256 est publiée avec chaque version dans `SHA256.txt`.

> L’exécutable n’est pas encore signé numériquement. Windows SmartScreen peut donc afficher un avertissement lors du premier lancement.

## Configuration requise

- Windows 10 version 1809 ou ultérieure, ou Windows 11.
- Processeur 64 bits.
- Microsoft Edge WebView2 Runtime.
- WinGet / App Installer pour la gestion des logiciels.
- Droits administrateur pour les opérations système.

## Compiler

Depuis Windows PowerShell :

```powershell
./build.ps1
```

Le script télécharge le package Microsoft WebView2 nécessaire, compile l’application avec le compilateur .NET Framework de Windows et produit `PC-Setup.exe`.

## Sécurité

- Les installations utilisent les identifiants du catalogue WinGet.
- Les liens du catalogue pointent vers les sites des éditeurs.
- Aucune donnée personnelle n’est envoyée par l’application.
- Les documents et le dossier Téléchargements sont exclus du nettoyage.
- Les chemins de quarantaine sont validés avant restauration ou suppression.
- Une confirmation est exigée avant les opérations sensibles.

## Avertissement

PC Setup modifie des logiciels et certaines zones système. Vérifiez les sélections proposées, sauvegardez les documents importants et conservez la quarantaine quelques jours avant toute suppression définitive.
