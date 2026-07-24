# Historique des versions

Les changements importants de OwlSetup sont regroupés dans ce fichier. Le projet suit une numérotation de version de type `MAJEUR.MINEUR.CORRECTIF`.

## [3.6.0] — 2026-07-24

### Ajouté

- Catalogue étendu à 93 applications, notamment les principaux navigateurs et outils d’intelligence artificielle.
- Diagnostic préalable de WinGet, du stockage, de Windows et de chaque paquet sélectionné.
- Centre de notifications local avec progression des installations et désinstallations en arrière-plan.
- Visionneuse intégrée pour les rapports d’opération.
- Recherche ciblée des dossiers résiduels après désinstallation avec quarantaine réversible.
- Profils de sélection facultatifs et paquets WinGet personnalisés conservés après redémarrage.

### Amélioré

- Badges de navigation dynamiques affichés uniquement lorsqu’une action est nécessaire.
- Installation, réparation et désinstallation plus lisibles, avec messages d’erreur détaillés.
- Rapports et journaux techniques ouverts explicitement dans le Bloc-notes.
- Interface des profils repliable avec une explication de leur utilisation.

### Sécurité

- Politique CSP stricte et neutralisation des données dynamiques affichées dans l’interface privilégiée.
- Refus par défaut des permissions WebView2 et limitation de la taille des commandes et imports.
- Résolution de WinGet limitée aux emplacements officiels de Microsoft App Installer.
- Mise à jour automatique non signée désactivée au profit de la Release GitHub officielle et de sa vérification SHA-256.
- Nettoyage AppData automatique sans validation individuelle désactivé.
- Permissions du workflow GitHub limitées au strict nécessaire.

## [3.6.0-beta.12] — 2026-07-24

### Corrigé

- L’ouverture d’un rapport ou journal technique ne dépend plus de l’association de fichiers Windows.
- Les fichiers `.json` et `.log` sont maintenant ouverts explicitement dans le Bloc-notes.
- Une mauvaise association avec `wsl.exe` ne peut donc plus ouvrir un terminal WSL.
- Le bouton du rapport précise qu’il ouvre le JSON technique dans le Bloc-notes.

## [3.6.0-beta.11] — 2026-07-24

### Amélioré

- Les badges « NEW » permanents ont été remplacés par de véritables indicateurs dynamiques.
- Le badge des mises à jour affiche uniquement le nombre réellement disponible.
- Outils système signale uniquement un problème WinGet nécessitant une action.
- Centre de sécurité affiche le nombre de contrôles demandant une attention.
- Dépannage affiche uniquement le nombre d’avertissements non lus.
- Aucun badge n’est affiché lorsqu’il n’y a rien à traiter.

## [3.6.0-beta.10] — 2026-07-24

### Corrigé

- « Tout marquer comme lu » retire maintenant immédiatement la couleur des notifications nouvelles.
- Les notifications lues utilisent un style neutre et le bouton indique « Tout est lu ».
- Ouvrir le centre ne marque plus automatiquement toutes les notifications comme lues.
- Cliquer sur une notification marque uniquement celle-ci comme lue.

## [3.6.0-beta.9] — 2026-07-24

### Amélioré

- Les désinstallations simples et groupées continuent maintenant en arrière-plan sans bloquer la navigation.
- Un bandeau compact affiche l’application en cours, le pourcentage et le résultat de l’opération.
- La progression peut être rouverte à tout moment depuis le bandeau.
- OwlSetup rouvre automatiquement la fenêtre lorsqu’une décision est nécessaire pour des dossiers résiduels.
- Le centre de notifications indique les désinstallations réussies, les avertissements et les résidus à vérifier.

## [3.6.0-beta.8] — 2026-07-24

### Amélioré

- Les rapports d’installation s’ouvrent maintenant dans une visionneuse intégrée à OwlSetup.
- Le résumé présente les réussites, les éléments à vérifier, l’environnement et le détail de chaque application.
- Le fichier JSON technique reste accessible séparément pour le diagnostic ou l’import dans le dashboard.
- L’historique remplace le bouton « JSON » par un bouton « Rapport visuel ».

## [3.6.0-beta.7] — 2026-07-24

### Ajouté

- Centre de notifications intégré avec historique local et compteur d’éléments non lus.
- Alertes détaillées lorsqu’une mise à jour est disponible, lorsqu’une application est installée ou lorsqu’une opération demande une vérification.
- Bandeau compact de progression permettant de rouvrir le détail d’une installation.

### Amélioré

- Les installations continuent en arrière-plan sans bloquer la navigation dans OwlSetup.
- La fenêtre de progression peut être réduite ou fermée pendant l’opération sans interrompre WinGet.
- Un récapitulatif persistant indique le résultat de chaque application et de la session complète.

## [3.6.0-beta.6] — 2026-07-21

### Ajouté

- Recherche ciblée des dossiers résiduels après une désinstallation réussie.
- Aperçu de chaque dossier avec son emplacement et sa taille avant toute action.
- Placement en quarantaine réversible ou conservation au choix de l’utilisateur.

### Sécurité

- Analyse limitée aux dossiers directs `%APPDATA%` et `%LOCALAPPDATA%` portant exactement le nom de l’application.
- Aucun nettoyage automatique de Documents, Bureau, Téléchargements, projets ou sauvegardes.

### Corrigé

- Identifiant WinGet de DBeaver Community actualisé.
- RustDesk et FileZilla passent en installation guidée depuis leur site officiel lorsque WinGet ne les distribue plus.
- L’audit du catalogue distingue désormais les paquets WinGet des services Web et installations guidées.

## [3.6.0-beta.5] — 2026-07-21

### Ajouté

- Diagnostic préalable de WinGet, du stockage, de Windows et de chaque paquet sélectionné.
- Relance ciblée des seules installations en échec.
- Historique enrichi avec le résultat de chaque session.
- Rapport JSON local, sans donnée personnelle, importable dans le catalogue du dashboard privé.

### Sécurité

- Le démarrage de l’installation reste désactivé tant qu’un contrôle bloquant échoue.
- Les rapports n’incluent ni nom d’utilisateur, ni nom du PC, ni chemin personnel, ni identifiant persistant.

## [3.5.1] — 2026-07-19

### Corrigé

- Désinstallation WinGet plus fiable selon le contexte utilisateur ou machine.
- Vérification de la présence réelle du logiciel après une désinstallation.
- Interprétation correcte des codes Windows demandant un redémarrage.
- Sélection des applications installées corrigée dans le catalogue.

### Ajouté

- Outil sécurisé d’audit des identifiants WinGet du catalogue.
- Rapports d’audit dans `%LOCALAPPDATA%\OwlSetup\CatalogTests`.

## [3.5.0] — 2026-07-19

### Ajouté

- Prise en main animée au premier lancement.
- Page dédiée aux applications installées avec recherche et tri.
- Réparation, désinstallation et sélection multiple.
- Repères de risque colorés pour le nettoyage.

## Versions précédentes

Les anciennes versions `3.0.0` à `3.4.1`, publiées initialement sous les noms PC Setup puis OwlSetup, restent disponibles dans les [Releases GitHub](https://github.com/OwlNetGeekFR/OwlSetup/releases).

[3.5.1]: https://github.com/OwlNetGeekFR/OwlSetup/releases/tag/v3.5.1
[3.5.0]: https://github.com/OwlNetGeekFR/OwlSetup/releases/tag/v3.5.0
[3.6.0]: https://github.com/OwlNetGeekFR/OwlSetup/releases/tag/v3.6.0
