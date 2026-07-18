# OwlSetup

![OwlSetup](assets/branding/owlsetup-logo-512.png)

OwlSetup est une application Windows 10/11 qui centralise l’installation de logiciels, les mises à jour, le nettoyage du disque et la récupération des résidus d’applications.

## Fonctionnalités

- Catalogue étendu de logiciels avec validation WinGet avant installation et liens vers les sites officiels.
- Installation adaptée pour Chrome et Spotify, avec secours officiel contrôlé par signature numérique.
- Installation et désinstallation silencieuses avec WinGet.
- Réparation des applications compatibles avec `winget repair`.
- Sauvegarde et restauration locale de la liste des logiciels dans un fichier de configuration.
- Profils personnalisés et installation d'un identifiant WinGet saisi manuellement.
- Désinstallation groupée des applications sélectionnées.
- Détection des logiciels déjà installés.
- Aperçu des mises à jour avec comparaison des versions.
- Sélection individuelle des applications à actualiser.
- Recherche Windows Update et pilotes certifiés.
- Nettoyage des fichiers temporaires, caches, Corbeille et composants Windows.
- Analyse sans suppression avec estimation de l'espace récupérable et affichage des dossiers protégés.
- Quarantaine restaurable pour les anciens dossiers AppData.
- Tableau de santé local : mises à jour, espace disque et redémarrage en attente.
- Mise à jour automatique de OwlSetup depuis les Releases GitHub avec contrôle SHA-256.
- Notification visuelle au démarrage lorsqu’une nouvelle version de OwlSetup est disponible.
- Centre d'outils avec diagnostic et réparation de WinGet, point de restauration, historique local, programmes au démarrage et analyse en lecture seule du disque.
- Rapports rangés dans `%LOCALAPPDATA%\PCSetup\Logs` sans encombrer le Bureau.

## Télécharger

La dernière version publique est disponible dans les [Releases GitHub](../../releases/latest).

Le dépôt contient uniquement les sources nécessaires à la compilation. Les utilisateurs n’ont besoin que de `OwlSetup.exe` disponible dans les Releases.

La signature de code des futures versions signées sera fournie gratuitement par [SignPath.io](https://signpath.io/), avec un certificat délivré par la [SignPath Foundation](https://signpath.org/).

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

Le script télécharge le package Microsoft WebView2 nécessaire, compile l’application avec le compilateur .NET Framework de Windows et produit `OwlSetup.exe`.

### Tester une bêta avant publication

Pour produire une version locale clairement identifiée, sans créer de Release GitHub :

```powershell
./build-beta.ps1 -Version "3.3.2-beta.1"
```

L’exécutable de test est créé dans `artifacts\beta` avec son numéro de version dans le nom. Ce dossier est ignoré par Git et la mise à jour automatique est désactivée dans les constructions bêta. Une fois les essais validés, la version publique est compilée depuis un tag GitHub stable.

## Sécurité

- Les installations utilisent les identifiants du catalogue WinGet.
- Les liens du catalogue pointent vers les sites des éditeurs.
- Aucune donnée personnelle n’est envoyée par l’application.
- Les documents et le dossier Téléchargements sont exclus du nettoyage.
- Les chemins de quarantaine sont validés avant restauration ou suppression.
- Une confirmation est exigée avant les opérations sensibles.

## Avertissement

OwlSetup modifie des logiciels et certaines zones système. Vérifiez les sélections proposées, sauvegardez les documents importants et conservez la quarantaine quelques jours avant toute suppression définitive.

## Licence

Le code source de OwlSetup est distribué gratuitement sous [licence MIT](LICENSE). Copyright © 2026 OwlNetGeekFR.

Les noms, marques et logos des applications proposées dans le catalogue restent la propriété de leurs éditeurs respectifs.

Consultez également la [politique de confidentialité](PRIVACY.md).
