# Revue de l'onglet « Maintenance » — point d'amélioration

_Branche `beta/4.0-foundations` · base 4.0.0-beta.4 · 2026-08-27_

Analyse du code des cinq entrées du menu **Maintenance** : Tout mettre à jour ·
Libérer de l'espace · Nettoyer les navigateurs · Outils système · Centre des
opérations.

Sources lues : `OwlSetupWebView.cs` (handlers `Run*/Scan*/Analyze*/Diagnose*`),
`app.js` (rendu + réconciliation), `Mettre-a-jour-mon-PC.ps1`,
`Liberer-espace-disque.ps1`, `Nettoyer-residus-applications.ps1`, `index.html`.

---

## Vue d'ensemble

| Fonctionnalité           | Verdict                                   | Écart n°1 à corriger                                                            |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------- |
| Tout mettre à jour       | Fonctionnel mais **sur-promet**           | « Pilotes » annoncés partout, jamais réellement traités                         |
| Libérer de l'espace      | Solide et prudent, mais **partiel**       | `components` sans estimation, `app-leftovers` inactif en intégré                |
| Nettoyer les navigateurs | **Le mieux fini** des cinq                | Options qui ne font rien selon le moteur (historique Firefox)                   |
| Outils système           | **Le plus superficiel**                   | « Stockage » ignore AppData = rate les vrais Go ; démarrage en lecture seule    |
| Centre des opérations    | Concept **en avance** sur les concurrents | 100 % `localStorage`, pas de reprise partielle, correctif « WinGet » trop lourd |

Cause racine commune : **le parsing de la sortie `winget` est réécrit 4 fois** à
la main (colonnes + regex + codes ANSI). C'est la principale source de fragilité
de tout l'onglet.

---

## 1. Tout mettre à jour

### Ce qui existe

- `ScanUpdates` → `QueryAvailableUpdates()` : lance `winget upgrade` (nu), retire
  les codes ANSI, parse les colonnes par regex `^(.+?)\s{2,}([^\s]+)…`.
- `RunUpdate` : `winget source update`, puis **boucle** `winget upgrade --id "X"
--exact --silent …` paquet par paquet, re-scan complet pour calculer les
  « encore proposées », puis `Microsoft.Update.AutoUpdate.DetectNow()` +
  ouverture de `ms-settings:windowsupdate`.
- Flux de récupération élaboré si des fichiers sont verrouillés (inspection des
  processus, fermeture propre/forcée, relance ciblée).
- 4.0.0-beta.3/4 : lanceurs auto-updatés reconnus + liste d'ignorés.

### Faiblesses et bugs

| #   | Constat                                                                                                                                  | Impact                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1.1 | `QueryAvailableUpdates` n'utilise **pas `--include-unknown`** alors que `Mettre-a-jour-mon-PC.ps1` l'utilise                             | La liste cache des paquets ; « tout mettre à jour » en traite plus que ce que l'utilisateur a vu |
| 1.2 | **Pilotes** : le code appelle seulement `DetectNow()` + ouvre les Paramètres. Aucune énumération/installation de pilotes                 | L'UI (accueil, carte, guide, modale) promet « pilotes certifiés Microsoft » — non tenu           |
| 1.3 | `TriggerWindowsUpdate` : `success=true` = « le COM n'a pas levé d'exception ». Rien n'est téléchargé/installé, aucun état ni progression | L'utilisateur croit Windows à jour                                                               |
| 1.4 | Parsing colonnes fragile : noms longs, lignes repliées, sortie localisée, versions avec espaces                                          | Mises à jour manquées ou mal lues (déjà corrigé au cas par cas, bêta 57)                         |
| 1.5 | Boucle séquentielle `--id` ; pas de `winget upgrade --all` en chemin rapide ; re-scan complet coûteux après coup                         | Lent quand il y a 10+ mises à jour                                                               |
| 1.6 | Chaînes codées en dur très spécifiques (« processus qui verrouille les fichiers **OBS** »)                                               | Message faux pour tout autre logiciel                                                            |
| 1.7 | Aucun lien « nouveautés / notes de version » par paquet                                                                                  | Moins informatif que Patch My PC                                                                 |

### Concurrents

UniGetUI s'appuie sur le module PowerShell **`Microsoft.WinGet.Client`** (objets
typés, plus de parsing) et gère `pin`/`hold`. Patch My PC affiche les notes de
version. Windows Update natif fait réellement les pilotes.

### Propositions

| Action                                                                                                                                                      | Prio   | Risque | Effort                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------- |
| Ajouter `--include-unknown` à `QueryAvailableUpdates` (aligner sur le script)                                                                               | ⭐⭐⭐ | faible | 5 min                                    |
| Centraliser tout l'accès WinGet dans une classe `Winget` + migrer vers `Microsoft.WinGet.Client` (fallback parsing)                                         | ⭐⭐⭐ | moyen  | 4–6 j                                    |
| Windows Update **réel** : `IUpdateSearcher`/`IUpdateDownloader`/`IUpdateInstaller` (ou module `PSWindowsUpdate`), lister/installer, remonter la progression | ⭐⭐⭐ | moyen  | 5–8 j                                    |
| Pilotes : recherche `Type='Driver'` séparée + case « inclure les pilotes » (opt-in) ; sinon **retirer « pilotes »** de tous les textes                      | ⭐⭐⭐ | moyen  | 3 j (ou 30 min pour retirer la promesse) |
| Chemin rapide `winget upgrade --all --include-unknown` quand tout est sélectionné et ≥ 5 paquets                                                            | ⭐⭐   | faible | 1 j                                      |
| Généraliser les messages de blocage (nom réel du processus, pas « OBS »)                                                                                    | ⭐⭐   | faible | 0,5 j                                    |
| Lien « notes de version » depuis le manifeste WinGet (`PackageUrl`/`ReleaseNotesUrl`)                                                                       | ⭐     | faible | 1 j                                      |

---

## 2. Libérer de l'espace

### Ce qui existe

- `AnalyzeCleanup` mesure 6 zones : `user-temp`, `windows-temp`, `recycle-bin`,
  `delivery`, `components`, `app-leftovers`. Jeton de simulation 5 min.
- `RunCleanup` re-exécute `OwlSetup.exe --elevated-cleanup` (worker isolé,
  `WorkingDirectory` verrouillé, nom de log validé par regex) →
  `Liberer-espace-disque.ps1 -Integrated`.
- `recycle-bin` : `Clear-RecycleBin -Force` (tous lecteurs). `components` :
  `dism /Online /Cleanup-Image /StartComponentCleanup`. `delivery` :
  `Delete-DeliveryOptimizationCache`.
- `Nettoyer-residus-applications.ps1` : dossiers AppData > 90 j sans app
  correspondante → quarantaine réversible, **confirmation individuelle**.

### Faiblesses et bugs

| #   | Constat                                                                                                                                                                                                    | Impact                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 2.1 | En mode intégré, `app-leftovers` n'exécute **rien** (juste un `Write-Warning`) — mais la case reste proposée, étiquetée « Réversible »                                                                     | Option trompeuse : l'utilisateur coche, rien ne se passe |
| 2.2 | `components` renvoie `bytes=0` (note « Taille déterminée par DISM »)                                                                                                                                       | Aucune estimation avant une opération de 10–30 min       |
| 2.3 | `dism … -Wait -NoNewWindow` sans lecture de sortie                                                                                                                                                         | Aucune progression ; l'UI paraît figée                   |
| 2.4 | `MeasurePath` plafonne à 200 000 fichiers                                                                                                                                                                  | Sous-estime les gros `Temp`                              |
| 2.5 | Cibles modernes absentes : cache Windows Update (`SoftwareDistribution\Download`), `*.dmp` / `LocalDumps` / WER, cache miniatures, Prefetch, `Windows.old`, logs CBS, cache shaders DirectX, cache polices | Récupère moins que Disk Cleanup / BleachBit              |
| 2.6 | Pas de **liste détaillée** de ce qui sera supprimé, seulement des totaux par catégorie                                                                                                                     | Moins rassurant                                          |
| 2.7 | Delta d'espace calculé pour `C:` seulement, côté script                                                                                                                                                    | Multi-disque non reflété                                 |
| 2.8 | Aucune intégration **Storage Sense / `cleanmgr`** (pourtant sûrs et natifs)                                                                                                                                | Réinvente la roue partiellement                          |

### Concurrents

BleachBit : liste par élément + aperçu. Disk Cleanup / Storage Sense : couvre
WU cache, miniatures, livraison, `Windows.old`, WER. WinUtil : profils agressifs
(à ne pas copier tels quels).

### Propositions

| Action                                                                                                                                                                           | Prio   | Risque | Effort  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------- |
| Retirer `app-leftovers` du nettoyage intégré (le garder comme action dédiée « Résidus » lancée séparément) **ou** l'implémenter vraiment avec confirmation par dossier dans l'UI | ⭐⭐⭐ | faible | 0,5–3 j |
| `components` : lancer `DISM /Online /Cleanup-Image /AnalyzeComponentStore` d'abord et afficher « récupérable ≈ X »                                                               | ⭐⭐⭐ | faible | 1 j     |
| Streamer la sortie DISM/winget ligne à ligne vers la barre de progression (le callback `onLine` de `RunHiddenProcess` existe déjà)                                               | ⭐⭐   | faible | 1–2 j   |
| Ajouter des cibles sûres : cache Windows Update (après arrêt `wuauserv`), `*.dmp`/WER, cache miniatures, Prefetch, `Windows.old` (avec avertissement 10 j)                       | ⭐⭐   | moyen  | 3–4 j   |
| Aperçu « N fichiers, X Mo, exemples : … » par catégorie avant confirmation                                                                                                       | ⭐⭐   | faible | 1–2 j   |
| Option « Utiliser aussi le nettoyage Windows (`cleanmgr /sagerun`) »                                                                                                             | ⭐     | faible | 1 j     |
| Lever le plafond 200 000 (ou le rendre visible : « ≥ 200 k fichiers, mesure partielle »)                                                                                         | ⭐     | faible | 0,5 j   |

---

## 3. Nettoyer les navigateurs

### Ce qui existe

- `ScanBrowserData` : détecte les navigateurs du compte, compte les profils,
  indique s'ils tournent.
- `AnalyzeBrowserData` : plan de nettoyage horodaté (jeton 32 hex, 5 min),
  catégories `cache / media-cache / crash / cookies / site-data / history`,
  garde-fous **reparse-point** (`EnsureNoReparsePoints`), liste des données
  **jamais touchées** (mots de passe, favoris, extensions, téléchargements,
  sessions, profils).
- `RunBrowserCleanup` : refuse si le navigateur tourne (option « fermer » →
  `CloseMainWindow` + 1,8 s), suppression par cible, log `SUPPRIME/IGNORE`.

### Faiblesses et bugs

| #   | Constat                                                                                                                                                 | Impact                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 3.1 | **Firefox + « Historique » = no-op** (`BrowserRelativeTargets` renvoie `[]` car `places.sqlite` mélange historique et favoris) ; la case reste proposée | L'utilisateur croit son historique effacé       |
| 3.2 | Firefox « media-cache » aussi vide ; côté Chromium, « history » supprime aussi la saisie semi-automatique de la barre d'adresse sans le dire            | Effet de bord non annoncé                       |
| 3.3 | Aucune **liste blanche de sites** à conserver pour les cookies                                                                                          | Déconnecte de tout ; BleachBit/uBO le proposent |
| 3.4 | `DeleteBrowserTree` récursif mono-thread, pas de progression par cible (juste start/complete)                                                           | Long sur un cache de plusieurs Go               |
| 3.5 | Catégories « cookies / site-data / history » marquées `warning` mais **sans phrase de conséquence** (« vous serez déconnecté des sites »)               | Consentement moins éclairé                      |
| 3.6 | Fermeture : `CloseMainWindow` + 1,8 s fixe ; pas de nouvelle vérification fiable ni de délai adaptatif                                                  | Peut échouer sur machine lente                  |
| 3.7 | Profils hors emplacements connus / installations portables non couverts                                                                                 | Détection incomplète                            |

### Propositions

| Action                                                                                                                                                            | Prio   | Risque | Effort |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ |
| Masquer/désactiver une catégorie quand elle ne fait rien pour le moteur détecté (piloté par `BrowserRelativeTargets`)                                             | ⭐⭐⭐ | faible | 1 j    |
| Ajouter une phrase de conséquence explicite par catégorie `warning` dans l'UI et l'écran de confirmation                                                          | ⭐⭐⭐ | faible | 0,5 j  |
| Historique Firefox : vraie prise en charge via `DELETE FROM moz_places …` (garder `moz_bookmarks`) avec `System.Data.SQLite`, ou l'assumer « non pris en charge » | ⭐⭐   | moyen  | 2–3 j  |
| Liste blanche de domaines pour les cookies (Chromium : filtrer `Cookies` SQLite ; Firefox : `cookies.sqlite`)                                                     | ⭐⭐   | moyen  | 3 j    |
| Progression par cible + total pendant `RunBrowserCleanup`                                                                                                         | ⭐     | faible | 1 j    |
| Boucle d'attente de fermeture (jusqu'à ~8 s) au lieu d'un `Sleep` fixe                                                                                            | ⭐     | faible | 0,5 j  |

---

## 4. Outils système

### Ce qui existe

- **Diagnostic WinGet** : `winget --version` + `winget source list`.
- **Réparer WinGet** : re-`Add-AppxPackage` de `Microsoft.DesktopAppInstaller`
  puis `winget source reset --force` + `source update`.
- **Point de restauration** : `Checkpoint-Computer -RestorePointType
MODIFY_SETTINGS` (élevé) ; UI de secours si la protection est désactivée.
- **Démarrage** : lit `…\CurrentVersion\Run` (HKCU/HKLM × 2 vues) + dossiers
  Démarrage, dédoublonne, puis renvoie vers `ms-settings:startupapps`.
- **Occupation du disque** : mesure les dossiers **de premier niveau de
  `%USERPROFILE%`** (hors `AppData`), top 15 ; `canClean` vrai seulement pour un
  dossier nommé `.cache` → quarantaine.
- **Auto-diagnostic** : intégrité UI, WinGet, WebView2, stockage, écriture logs.

### Faiblesses et bugs

| #   | Constat                                                                                                                                                                                                         | Impact                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 4.1 | `Checkpoint-Computer` est **limité par Windows à 1 point / 24 h** (`SystemRestorePointCreationFrequency`). S'il y en a eu un récemment, l'appel **ne fait rien et renvoie 0** → OwlSetup affiche « Point créé » | Fausse sécurité avant une opération risquée       |
| 4.2 | Pas de pré-contrôle « protection système activée sur C: » avant de tenter (seulement une UI après échec)                                                                                                        | Étape inutile                                     |
| 4.3 | `source reset --force` **supprime les sources personnalisées** sans le dire                                                                                                                                     | Perte de configuration WinGet                     |
| 4.4 | Diagnostic WinGet superficiel : pas de version d'App Installer, pas de test de **joignabilité** des sources, pas de `winget --info`                                                                             | Rate les vraies causes                            |
| 4.5 | Démarrage : **rien** sur `RunOnce`, tâches planifiées au logon, services `Automatic`, `Winlogon\Shell/Userinit`, ni l'état activé/désactivé (`StartupApproved`). Lecture seule + renvoi aux Paramètres          | Très en deçà d'Autoruns / Gestionnaire des tâches |
| 4.6 | Disque : **exclut `AppData`** — or `AppData\Local` (Electron, npm, Docker, jeux, caches) est souvent le plus gros. Ignore `C:\ProgramData`, `Program Files`, autres lecteurs, `hiberfil/pagefile`, WinSxS       | « Stockage » rate les vrais Go                    |
| 4.7 | Pas de vue « plus gros fichiers », pas de drill-down/treemap                                                                                                                                                    | Moins utile que TreeSize/WizTree                  |
| 4.8 | `MeasurePath` plafond 200 k (idem §2.4)                                                                                                                                                                         | Sous-estimation                                   |

### Propositions

| Action                                                                                                                                                                                                              | Prio   | Risque | Effort |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ |
| Point de restauration : lire/afficher le dernier point (`Get-ComputerRestorePoint`), détecter le no-op 24 h, proposer de contourner via `SystemRestorePointCreationFrequency=0` **temporairement** puis le remettre | ⭐⭐⭐ | moyen  | 1–2 j  |
| Vérifier `Enable-ComputerRestore` / l'état de protection **avant** de tenter                                                                                                                                        | ⭐⭐⭐ | faible | 0,5 j  |
| `RepairWinget` : sauvegarder `winget source export`, prévenir avant `reset --force`, réimporter les sources tierces                                                                                                 | ⭐⭐   | faible | 1 j    |
| Disque : ajouter un mode « analyse approfondie » qui inclut `AppData\Local/Roaming`, `ProgramData`, tous les lecteurs fixes, et liste les 20 plus gros dossiers **et** fichiers                                     | ⭐⭐⭐ | moyen  | 3–5 j  |
| Démarrage : ajouter `RunOnce`, tâches planifiées (logon), et l'état activé/désactivé via `StartupApproved` + bouton activer/désactiver                                                                              | ⭐⭐   | moyen  | 3–4 j  |
| Diagnostic WinGet : + version App Installer, + `winget source list` avec test HTTP des URL, + `winget --info` dans le rapport                                                                                       | ⭐⭐   | faible | 1 j    |
| Signature/éditeur des entrées de démarrage (`Get-AuthenticodeSignature`)                                                                                                                                            | ⭐     | faible | 1 j    |

---

## 5. Centre des opérations

> **4.0.0-beta.6** : 5.5 réglé — à l'ouverture du Centre, les échecs de mise à
> jour « faux positifs » (lanceurs auto-updatés, mises à jour masquées, alertes
>
> > 14 j) sont classés `resolved` automatiquement ; ajout de « Marquer résolu »
> > par ligne, « ✓ Tout classer résolu », « Effacer les terminées » et ✕ par
> > ligne ; les notifications liées suivent. Restent : 5.1 (persistance hôte),
> > 5.2 (reprise partielle), 5.3 (« Corriger » générique), 5.6 (empreinte).

### Ce qui existe

- Fil persistant (`owlsetup-operations-v1`, 50 max) : statuts `running /
success / failed / interrupted / resolved`.
- **Dédoublonnage** des échecs par empreinte (`type|failureKind|code|packages`),
  regroupement avec compteur d'occurrences.
- **Auto-réconciliation** : un échec passe `resolved` si un scan ultérieur
  montre l'app installée / plus de mise à jour proposée / une réussite postérieure
  couvrant les mêmes paquets. Les notifications liées passent aussi en « résolu ».
- Reprise après interruption : ramène à l'écran de **confirmation** (ne relance
  jamais tout seul).
- « Corriger » : 3 familles — `files-in-use` (inspection/fermeture de processus),
  `restart-required` (guidage), sinon « Corriger WinGet ».

C'est **conceptuellement en avance** : peu de concurrents grand public tiennent
un journal d'opérations réconcilié.

### Faiblesses et bugs

| #   | Constat                                                                                                                                   | Impact                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 5.1 | Tout est dans `localStorage` : perdu au nettoyage navigateur / changement de PC / réinstallation. Aucun export du fil lui-même            | Traçabilité fragile                                  |
| 5.2 | Reprise = ré-ouverture de la modale de confirmation ; **aucune mémoire de l'avancement** (3/10 déjà faits)                                | Refait tout, ou l'utilisateur doit trier             |
| 5.3 | « Corriger » d'un échec générique lance directement `repair-winget` (donc `source reset --force`, cf. 4.3)                                | Correction disproportionnée et destructive de config |
| 5.4 | Chaînes **OBS** en dur dans `closeUpdateBlockingProcesses`                                                                                | Message faux pour un autre logiciel                  |
| 5.5 | Réconciliation dépend d'un nouveau scan déclenché par l'utilisateur ; sinon l'échec reste rouge indéfiniment                              | Alarme qui ne s'éteint pas                           |
| 5.6 | Empreinte de dédoublonnage inclut `code` : beaucoup d'échecs WinGet partagent le même code → sur-regroupement possible d'échecs distincts | Historique trompeur                                  |
| 5.7 | Pas de bouton **« relancer tous les échecs »**, pas de durée par opération (pourtant `startedAt`/`completedAt` sont stockés)              | Ergonomie                                            |

### Propositions

| Action                                                                                                                                                  | Prio   | Risque | Effort |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ |
| Écrire aussi le fil dans un JSON local (`%LOCALAPPDATA%\PCSetup\operations.json`) via l'hôte + l'inclure dans l'export de support                       | ⭐⭐⭐ | faible | 1–2 j  |
| « Corriger » générique : proposer d'abord **relancer** / **diagnostiquer** ; ne lancer `repair-winget` que sur choix explicite et après `source export` | ⭐⭐⭐ | faible | 1 j    |
| Généraliser les libellés de processus bloquants (nom réel)                                                                                              | ⭐⭐   | faible | 0,5 j  |
| Persister l'avancement (`done: [...ids]`) pendant `install`/`update` pour une vraie reprise « il reste 7 sur 10 »                                       | ⭐⭐   | moyen  | 2–3 j  |
| Bouton « Relancer tous les échecs » + affichage de la durée                                                                                             | ⭐⭐   | faible | 1 j    |
| Re-scanner automatiquement (silencieux) les paquets d'un échec quand on ouvre le Centre des opérations, pour tenter la réconciliation sans action       | ⭐     | faible | 1 j    |
| Empreinte : ajouter un hash court du message pour éviter le sur-regroupement                                                                            | ⭐     | faible | 0,5 j  |

---

## Chantiers transverses

| Sujet                             | Détail                                                                                                                                                                     | Prio   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Classe `Winget` unique**        | Un seul point d'accès (résolution du chemin, `--include-unknown`, parsing OU `Microsoft.WinGet.Client`), testé (Pester + mock). Supprime 4 parsings maison.                | ⭐⭐⭐ |
| **Progression des scripts longs** | Câbler `RunHiddenProcess(onLine:)` sur DISM et `winget upgrade` → barre réelle.                                                                                            | ⭐⭐   |
| **i18n**                          | `ExplainWingetFailure`, `BrowserCategoryLabel`, titres d'étapes, messages du Centre des opérations : ~150 chaînes FR en dur dans le C#. À sortir vers `i18n.js`/`locales`. | ⭐⭐   |
| **UAC groupé**                    | Point de restauration + nettoyage = 2 invites. Proposer « préparer la maintenance » qui élève une fois.                                                                    | ⭐     |
| **Tests de comportement**         | Réécrire `Mettre-a-jour-mon-PC.ps1` / `Liberer-espace-disque.ps1` en fonctions importables + Pester avec `winget`/`dism` simulés (cf. lot 4 du plan).                      | ⭐⭐   |
| **Honnêteté de l'UI**             | Retirer « pilotes » tant que non implémenté ; ne pas afficher une case qui ne fait rien (Firefox historique, `app-leftovers` intégré).                                     | ⭐⭐⭐ |

---

## Backlog priorisé

### Gains rapides — ✅ livrés en 4.0.0-beta.5

1. [x] `--include-unknown` dans `QueryAvailableUpdates` + traitement prudent des
       versions inconnues (1.1)
2. [x] Textes « pilotes » corrigés : OwlSetup **ouvre** Windows Update (1.2)
3. [x] Catégories navigateur sans effet grisées/décochées selon le moteur
       (3.1, 3.2) — la phrase de conséquence cookies/historique existait déjà (3.5)
4. [x] `app-leftovers` retiré du nettoyage intégré + carte d'accueil repointée
       vers la désinstallation vérifiée (2.1)
5. [x] Point de restauration : contrôle protection système, neutralisation
       temporaire de la limite 24 h, vérification de création réelle (4.1, 4.2)
6. [x] Messages « processus bloquant » génériques (plus de « OBS » en dur)
       (1.6, 5.4)
7. [x] Plafond 200 000 fichiers rendu visible (« mesure partielle ») (2.4, 4.8)

### Moyen terme (1–5 j) — 4.0.0-beta.6 → 3.9

8. Classe `Winget` unique + `Microsoft.WinGet.Client` (transverse, 1.4)
9. Windows Update réel + pilotes opt-in (1.2, 1.3)
10. `components` : estimation via `DISM /AnalyzeComponentStore` + progression (2.2, 2.3)
11. Point de restauration : détection du no-op 24 h (4.1)
12. `RepairWinget` non destructif pour les sources (4.3)
13. Persistance JSON + export du Centre des opérations (5.1)
14. « Corriger » générique moins agressif (5.3)

### Gros chantiers (semaines) — 4.0

15. Analyse disque approfondie (AppData, tous lecteurs, plus gros fichiers) (4.6, 4.7)
16. Gestion complète du démarrage (tâches, services, activer/désactiver) (4.5)
17. Nouvelles cibles de nettoyage + aperçu détaillé (2.5, 2.6)
18. Reprise partielle réelle des opérations (5.2)
19. Liste blanche cookies + historique Firefox (3.3, 3.1)

---

## English summary

Review of the five **Maintenance** entries.

- **Update all** — works but **over-promises**: "drivers" advertised everywhere,
  never actually handled; `TriggerWindowsUpdate` only calls `DetectNow()` and
  reports success on a no-op; `QueryAvailableUpdates` misses `--include-unknown`
  (the standalone script has it). Fix: centralise WinGet access
  (`Microsoft.WinGet.Client`), do real Windows Update, make drivers opt-in or
  drop the claim.
- **Free up space** — safe but partial: `components` shows no size estimate and no
  progress during a 10–30 min DISM run; `app-leftovers` does nothing in
  integrated mode yet is still offered; missing modern targets (WU cache, crash
  dumps, thumbnails, `Windows.old`).
- **Clean browsers** — the most polished, but offers categories that are no-ops
  per engine (Firefox history) and lacks explicit "you will be signed out"
  consequences and a cookie allowlist.
- **System tools** — the shallowest: disk view **excludes AppData** (where the GB
  actually are), startup is read-only and misses tasks/services/RunOnce, restore
  point silently no-ops under Windows' 24 h limit while reporting success,
  `winget source reset --force` wipes custom sources.
- **Operations center** — concept **ahead of competitors** (reconciled operation
  log). Weaknesses: `localStorage`-only, no partial-resume, generic "Fix" jumps
  to a destructive WinGet repair, hardcoded "OBS" strings.

Cross-cutting: one `Winget` class instead of four hand-rolled parsers; stream
long-script progress; move ~150 hardcoded FR strings out of the C#; stop showing
controls that do nothing.

Quick wins for **4.0.0-beta.5** listed above (items 1–7).
