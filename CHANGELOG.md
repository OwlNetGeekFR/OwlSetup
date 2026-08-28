# Historique des versions

## [4.0.0-beta.29] - 2026-08-28

### Corrections signalées sur la bêta 28

- **Badge de navigation fantôme.** `renderHealth` écrivait dans
  `#updatesNavBadge` (et la carte « Applications » de la santé) le compteur
  **brut** `message.updateCount` venu de WinGet, sans retirer les mises à jour
  masquées (« Ne plus proposer »). Résultat : une pastille « Maintenance 2 »
  alors que la liste des mises à jour n'affichait rien. `renderHealth` calcule
  désormais `visibleUpdateCount` en filtrant `availableUpdates` avec
  `getIgnoredUpdateIds()`, comme `renderAvailableUpdates` et la sélection du
  plan. `#healthUpdates`, `#healthUpdatesDetail` et `setNavAlert` utilisent ce
  compteur filtré.
- **Thème clair des panneaux Windows Update.** L'inventaire et la barre
  d'installation ajoutés en bêta 15/16 n'avaient que des couleurs sombres
  codées en dur (`#16283f`, `#2c1e10`, `#8fb6e6`…), d'où des bandeaux sombres en
  thème clair. Ajout des règles `:root[data-theme="light"]` pour
  `.windows-update-row` (+ `.wu-kind`, `.wu-driver`, `.wu-sev`, `.wu-check`,
  `.wu-check-disabled`, `.wu-optional`), `.windows-update-install-bar` et
  `.windows-update-reboot-bar`.
- Le **score** de maintenance (calculé côté C#) continue de compter toutes les
  mises à jour, y compris masquées ; l'aligner sur les ignorées demande de
  transmettre la liste au natif et reste un incrément séparé.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  122 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts
  (`Test-HealthScoreTransparency` et `Test-ThemePreference` inclus).

## [4.0.0-beta.28] - 2026-08-28

### Lot 2 — module `theme` branché

- La **décision** du thème (`normalizeThemePreference`, `resolveTheme`,
  `THEME_PREFERENCES`) vient du module `beta/src/modules/theme.js` (5ᵉ entrée
  de `MODULES`). `getThemePreference` / `applyThemePreference` /
  `saveThemePreference` gardent leurs **effets de bord** dans `app.js`
  (`localStorage`, `matchMedia`, `dataset` du document, sélecteurs) mais
  délèguent la logique au module.
- Le module est pur (0 DOM / stockage) et couvert par
  `beta/test/theme.test.js`.
- Aucun changement de comportement : « Selon Windows » suit toujours
  `prefers-color-scheme`, un thème imposé l'ignore, une valeur invalide
  retombe sur « system ».
- Vérifié : `tests/Test-ThemePreference.ps1` vert (application du thème résolu,
  suivi des changements Windows, export de la préférence), intégrité SHA-256
  des 5 ressources OK, l'application démarre, 122 tests beta.

## [4.0.0-beta.27] - 2026-08-28

### Lot 2 — module `redaction` branché

- `redactLogDiagnostic` et `telemetryFingerprint` n'ont plus de copie inline
  dans `app.js` : ils viennent du module `beta/src/modules/redaction.js`
  (4ᵉ entrée de `MODULES`). C'est du code **sensible à la vie privée**
  (anonymisation des journaux avant tout signalement) — le module est pur et
  couvert à 100 % par `beta/test/redaction.test.js`.
- Les règles de masquage (chemins profil, e-mails, `DOMAINE\compte`, noms de
  machine) et la longueur max (420) deviennent des constantes du module.
- `test/parity.test.js` : tous les blocs sont désormais des contrôles
  « migré » (plus d'extraction de fonction depuis `app.js`).
- Aucun changement de comportement : mêmes masquages, même empreinte
  déterministe d'incident.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  122 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.

## [4.0.0-beta.26] - 2026-08-28

### Lot 2 — module `winget-brand` branché

- `wingetInitials`, `normalizeWingetBrand`, `wingetFallbackColor` n'ont plus de
  copie inline dans `app.js` : elles viennent du module
  `beta/src/modules/winget-brand.js` (3ᵉ entrée de `MODULES`). La palette de
  couleurs de repli devient une constante partagée au lieu d'être recréée à
  chaque appel.
- `resolveWingetBrand` (reconnaissance locale des logos) reste dans `legacy.js`
  et utilise les fonctions du module.
- Test de parité `winget-brand` → contrôle « migré » ; comportement couvert par
  `beta/test/winget-brand.test.js`.
- Aucun changement de comportement : mêmes initiales, même normalisation de
  marque, même couleur déterministe.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  130 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.

## [4.0.0-beta.25] - 2026-08-28

### Correctif : désinstallation bloquée pour certains logiciels (Docker, …)

Régression introduite en 4.0.0-beta.12 avec l'analyseur de tableau winget
unique. Symptôme : « Paquet non détecté par WinGet · par identifiant exact : 0 »
à la désinstallation, alors que `winget list --id X --exact` trouve bien le
logiciel.

- Cause : sur la sortie **étroite** de `winget list --id X --exact` (version
  courte), il n'y a qu'**un seul espace** entre les en-têtes `Version` et
  `Source`. Le tokenizer d'en-tête tolérait un espace simple dans un « token »
  (pour les valeurs type `< 1.2.3`) et fusionnait donc `Version Source` → la
  colonne **ID** débordait jusqu'au bout de la ligne
  (`Docker.DockerDesktop 4.88.1  winget`) et était rejetée.
- Correctif : la ligne d'**en-tête** est désormais découpée sur **n'importe quel
  espace** (les titres winget sont toujours des mots simples). Le découpage des
  **lignes de données** reste par position et tolère toujours les espaces dans
  les valeurs (`< 173.0.0.13316`, `Unknown`, ids `MSIX\ …`).
- Corrigé côté C# (`WingetHeaderColumns`) **et** côté module JS
  (`beta/src/modules/winget-table.js`).
- Nouvelle capture `winget-list-narrow-fr.txt` + tests (module + réflexion sur
  l'exécutable + `tests/Test-WingetParsing.ps1`). Vérifié : sur la machine de
  test, `Docker.DockerDesktop` se résout maintenant correctement.
- 160 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.
## [4.0.0-beta.24] - 2026-08-28

### Lot 2 — module `package-id` branché

- `isValidPackageId` n'a plus de copie inline dans `app.js` : la fonction et le
  motif `PACKAGE_ID_PATTERN` viennent du module
  `beta/src/modules/package-id.js` (2ᵉ entrée de `MODULES`).
- Le test regex inline de la télémétrie
  (`/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,95}$/.test(targetPackage)`) est remplacé par
  `telemetrySafePackageId(targetPackage)` — même règle, une seule définition.
- Test de parité `isValidPackageId` → contrôle « migré » ; le comportement
  reste couvert par `beta/test/package-id.test.js` (9 tests).
- Aucun changement de comportement : même frontière de confiance UI ↔
  `winget.exe` (1ᵉʳ caractère alphanumérique obligatoire).
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  149 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.

## [4.0.0-beta.23] - 2026-08-28

### Lot 2 — premier module branché : `escapeHtml`

- `escapeHtml` n'a plus de copie inline dans `app.js` : la fonction vient
  désormais du module `beta/src/modules/escape-html.js`, inliné en tête de
  `app.js` par `build-js.mjs` (`MODULES` passe de `[]` à cette entrée).
- `stripExports` du script d'assemblage gère aussi `export default`.
- Le test de parité correspondant devient un contrôle « migré » : `app.js` ne
  contient plus `const escapeHtml =`, il contient la fonction du module.
- `tests/Test-SecurityControls.ps1` accepte les deux formes (`const` /
  `function`) pour la garantie « neutralisation HTML présente ».
- Aucun changement de comportement : même échappement des 5 caractères
  `& < > " '`.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  157 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.

## [4.0.0-beta.22] - 2026-08-28

### Lot 2 — `app.js` devient un fichier généré

Première étape du découpage du front-end. Aucun changement de comportement
attendu : c'est de l'outillage.

- `app.js` (racine) n'est plus édité à la main. Il est **assemblé** par
  `beta/scripts/build-js.mjs` : concaténation déterministe des modules purs de
  `beta/src/modules/` (aucun pour l'instant) puis de
  `beta/src/app/legacy.js` — le corps historique, déplacé **tel quel** —, le
  tout enveloppé dans une IIFE.
- Concaténation volontaire plutôt qu'un bundler : `legacy.js` apparaît
  **verbatim** dans `app.js`, ce qui préserve les 34 contrôles de présence
  PowerShell et les 53 tests de parité pendant la migration incrémentale.
- Pas de `"use strict"` ajouté : sémantique identique à l'ancien script.
- `build.ps1` régénère `app.js` quand Node est disponible (comme
  `catalog.generated.js`) ; sinon le fichier versionné sert de repli.
- Garde-fou `beta/test/bundle.test.js` : sortie déterministe, IIFE présente,
  `legacy.js` inclus verbatim, repères clés conservés. 161 tests beta.
- `beta/src/app/README.md` décrit la marche à suivre pour migrer un domaine.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  `Test-ReleaseCandidateReadiness.ps1` verte. **Le rendu de l'interface reste
  à confirmer sur le PC de test** (l'IIFE change la portée des symboles).

## [4.0.0-beta.21] - 2026-08-28

### CLI : la sortie s'affiche enfin dans une vraie console

Correctif du mode ligne de commande signalé par un test réel : lancé via le shim
`OwlSetup.com` **dans une invite de commandes ou PowerShell**, `--apply`,
`--list`, etc. n'affichaient **rien du tout** (l'opération se déroulait, sans
retour visible).

- `CliAttachConsole` distinguait mal « sortie redirigée » et « aucun handle
  standard ». Un `winexe` lancé par le shim n'hérite pas de handles utilisables :
  il était traité comme redirigé et on n'écrivait nulle part.
- Désormais on ne s'abstient **que** si les deux flux vont vers un vrai tube ou
  fichier (`GetFileType` = `FILE_TYPE_PIPE` / `FILE_TYPE_DISK`). Sinon — console
  interactive ou handle nul — on rattache la console (`AttachConsole`) et on
  écrit sur le périphérique `CONOUT$` avec son encodage réel (accents corrects).
- Les redirections voulues (`OwlSetup.com … > sortie.txt`, capture par un
  script) restent intactes.
- `tests/Test-CliMode.ps1` : marqueurs `CliStdIsRealRedirect` / `CONOUT$`.
- Vérifié : sortie capturée par tube toujours OK, interface graphique OK sans
  argument, intégrité des 5 ressources OK, `Test-ReleaseCandidateReadiness.ps1`
  verte. L'affichage en console interactive est à confirmer côté testeur.

## [4.0.0-beta.20] - 2026-08-28

### CLI : `--apply` complet — simulation, nettoyage, journal

- **`--dry-run`** (sur `--install`, `--uninstall`, `--apply`) : affiche le plan
  (applications, zones de nettoyage) **sans rien changer**, code de sortie 0.
- **`--silent`** (alias `--quiet`) : sortie minimale — plus de détail ligne à
  ligne de WinGet, seulement l'état par application et le résumé ; le détail
  d'un échec reste affiché.
- **`--apply` exécute maintenant les zones de nettoyage** de la configuration
  (`cleanupChoices`) : filtrées et réordonnées sur la liste autorisée
  (`user-temp`, `windows-temp`, `recycle-bin`, `delivery`, `components`), puis
  passées au même moteur élevé que l'interface (`RunElevatedCleanupWorker`).
  Si la session n'est pas administrateur, le nettoyage est **ignoré avec un
  message** (l'installation, elle, se poursuit).
- **`--apply` écrit un journal** complet de l'opération dans
  `%LOCALAPPDATA%\PCSetup\Logs\PC-Setup-CLI-<horodatage>.log` (transcription
  intégrale, y compris le détail WinGet masqué par `--silent`).
- `--install` : `winget install` met aussi à jour un paquet déjà présent mais
  périmé (comportement WinGet) — libellé et aide ajustés.
- `tests/Test-CliMode.ps1` étendu : `--dry-run` (plan affiché, rien d'installé,
  entrées invalides filtrées), marqueurs `--silent` / nettoyage / journal.
- Vérifié : `--apply --dry-run` et `--apply --silent` (installation +
  désinstallation réelles de 7zr en test), interface OK sans argument,
  intégrité des 5 ressources OK, `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.19] - 2026-08-27

### CLI : `--apply`, `--list --json`, et un shim console qui « juste marche »

Deuxième incrément du mode ligne de commande.

- **`OwlSetup.exe --apply <config.pcsetup.json>`** rejoue une configuration
  exportée par l'interface : installe `selectedPackages` (repli sur
  `installedPackages`), ignore les zones de nettoyage avec un message. Le
  format `pc-setup-configuration` est validé ; les identifiants passent la même
  regex que partout ailleurs.
- **`OwlSetup.exe --list --json`** : catalogue intégré en JSON compact
  (`[{"id","name","category"}, …]`), pour MDM / scripts.
- **`OwlSetup.com`** — nouveau shim console livré à côté de `OwlSetup.exe`.
  `.com` passe avant `.exe` dans `PATHEXT`, donc `OwlSetup --install X` exécute
  le shim, qui relaie vers l'exe voisin et **attend sa fin** : depuis
  PowerShell, `& OwlSetup …` renseigne enfin `$LASTEXITCODE` sans
  `Start-Process -Wait`. `build.ps1` le compile ; `build-beta.ps1` le signale
  dans `BETA-INFO.txt`.
- `CliAttachConsole` ne rattache plus de console quand la sortie est déjà
  redirigée (tube / fichier / shim) — sinon l'affichage partait dans un tampon
  invisible.
- `tests/Test-CliMode.ps1` étendu : `--apply` (fichier absent / mauvais format
  → code 2, aucune installation), `--list --json` (JSON valide), shim `.com`
  (`& OwlSetup.com --version` → `$LASTEXITCODE` = 0).
- Vérifié : les verbes fonctionnent (`--apply` a installé puis désinstallé
  7zr + Notepad++ en test), l'interface démarre toujours sans argument,
  intégrité des 5 ressources OK, `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.18] - 2026-08-27

### Mode ligne de commande (sans interface) — style Ninite

`OwlSetup.exe` accepte désormais des options : lancé sans argument il ouvre son
interface, lancé avec une option il agit en console et rend un code de sortie.

```
OwlSetup.exe --install VideoLAN.VLC,7zip.7zip,Mozilla.Firefox
OwlSetup.exe --uninstall 7zip.7zip
OwlSetup.exe --list [filtre]        # catalogue intégré
OwlSetup.exe --search vlc           # source WinGet
OwlSetup.exe --version | --help
```

- `--install` / `--uninstall` : boucle WinGet silencieuse
  (`--silent --accept-package-agreements --accept-source-agreements
  --disable-interactivity`), résumé `N réussie(s), M en échec`, code de sortie
  `0` (succès), `1` (au moins un échec), `2` (usage), `3` (WinGet absent).
  Identifiants validés par la même regex que le reste de l'hôte.
- `--list` lit le catalogue **embarqué** (aucune connexion) ; filtre par
  sous-chaîne sur id / nom / catégorie.
- L'exécutable reste `winexe` : il **rattache la console** de l'appelant pour
  écrire sa sortie. Depuis un script PowerShell, utiliser
  `Start-Process … -Wait -PassThru` pour attendre la fin et lire `.ExitCode`
  (rappel affiché par `--help`).
- Nouveau `tests/Test-CliMode.ps1` : marqueurs + exécution réelle des verbes
  sans effet de bord (`--version`, `--help`, `--list`, options invalides).
- Vérifié : `--install`/`--search`/`--list` fonctionnels ; l'interface
  graphique démarre toujours sans argument ; intégrité des 5 ressources OK ;
  suite `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.17] - 2026-08-27

### Windows Update : préversions « seeker » écartées, succès vérifié

Correctif de fond sur l'installation ajoutée en beta.16, révélé par un test réel :
une **mise à jour de préversion optionnelle** (« Télécharger et installer » dans
les Paramètres) était acceptée par l'API WUA (`resultCode 2`) **sans jamais être
appliquée** — Windows ne pilote ce type de mise à jour que par son propre
orchestrateur.

- Les mises à jour **`BrowseOnly`** (préversions / cumulatives optionnelles) sont
  désormais **listées mais non installables** dans OwlSetup : pas de case à
  cocher, badge « optionnel · Windows Update », exclues de la sélection par
  défaut. Le script d'installation élevé les refuse aussi (garde-fou).
- **Succès vérifié** : après `Install()`, l'hôte contrôle l'état réel
  (`IUpdate.IsInstalled`) de chaque mise à jour. Un `resultCode 2` sans
  installation effective **ni** redémarrage en attente est signalé comme
  « Windows a signalé un succès mais la mise à jour n'est pas appliquée »
  au lieu d'un faux succès.
- **Détection de redémarrage fiabilisée** : on croise le drapeau de
  `IInstallationResult` avec `Microsoft.Update.SystemInfo.RebootRequired` et la
  clé de registre `…\WindowsUpdate\Auto Update\RebootRequired`.
- Module `windows-update.js` : `defaultWindowsUpdateSelection` exclut
  `browseOnly` ; `parseWindowsUpdateInstallMarkers` distingue `ok` (réellement
  appliqué) de `notApplied`. 157 tests beta.
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.16] - 2026-08-27

### Windows Update : installer une sélection (composants + pilotes au choix)

Deuxième incrément du lot « Windows Update réel ». OwlSetup peut maintenant
**télécharger et installer** des mises à jour Windows, pas seulement les lister.

- Panneau **« Composants et pilotes Microsoft »** : chaque ligne a une case à
  cocher. **Les composants sont cochés par défaut, pas les pilotes** (choix
  explicite, un pilote de Windows Update pouvant être plus ancien que celui du
  fabricant). Bouton **« Installer la sélection »** avec la taille cumulée.
- `InstallWindowsUpdates` (hôte) : télécharge (`IUpdateDownloader`) puis installe
  (`IUpdateInstaller`) via l'API WUA **avec élévation** (relance UAC). Le travail
  est délégué à un script PowerShell élevé qui journalise un résultat par mise à
  jour (`PCSETUP_WUI_ITEM|` / `PCSETUP_WUI_END|`), repris ensuite par
  l'application. Les identifiants sont validés comme GUID avant l'élévation.
- **Bannière « redémarrage nécessaire »** affichée quand au moins une mise à
  jour l'exige.
- L'installation est protégée par le **point de restauration optionnel**
  (comme la désinstallation / le nettoyage).
- Module `beta/src/modules/windows-update.js` étendu :
  `defaultWindowsUpdateSelection` (pilotes exclus), `parseWindowsUpdateInstallMarkers`.
  155 tests beta. `tests/Test-WindowsUpdateInventory.ps1` couvre aussi le chemin
  d'installation (marqueurs, élévation, GUID, redémarrage, pilotes non cochés).
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte. L'installation réelle reste à
  valider sur le PC de test.

## [4.0.0-beta.15] - 2026-08-27

### Windows Update : inventaire réel (composants + pilotes)

Premier incrément du lot « Windows Update réel ». Jusqu'ici OwlSetup se
contentait de **déclencher** une recherche Windows Update à l'aveugle
(`DetectNow`) sans jamais dire ce qui était en attente.

- Nouveau `SearchWindowsUpdates` (hôte) : interroge l'API WUA
  (`Microsoft.Update.Session`) en **lecture seule** — ne télécharge ni
  n'installe rien — et renvoie la liste des mises à jour en attente :
  titre, article KB, taille, gravité, déjà téléchargée ou non, et
  **composant / pilote**. Sortie du script forcée en ASCII (`\uXXXX`) pour
  ne pas casser les accents sur un flux redirigé.
- Onglet **Tout mettre à jour** : nouveau panneau « Composants et pilotes
  Microsoft » avec bouton *Analyser* et *Ouvrir Windows Update*. La liste
  distingue visuellement composants et pilotes. L'installation reste faite
  par Windows Update (l'écriture arrivera dans un incrément suivant).
- L'étape Windows Update de « Tout mettre à jour » annonce désormais le
  nombre réel de mises à jour en attente (dont pilotes) au lieu d'un simple
  « recherche lancée ».
- Module testé `beta/src/modules/windows-update.js` (11 tests) +
  `tests/Test-WindowsUpdateInventory.ps1` (marqueurs, câblage interface, et
  recherche WUA réelle par réflexion). 148 tests beta.
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.14] - 2026-08-27

### WinGet : un seul point d'entrée pour le CLI

- Les ~24 appels dispersés à `RunHiddenProcess("winget.exe", …)` passent
  désormais par **`RunWingetCli(arguments, report)`** (+ surcharge *streaming*
  `onLine`). Un seul endroit où brancher plus tard journalisation, délai
  maximal ou télémétrie, et plus de risque qu'un nouvel appel oublie de
  résoudre le vrai `winget.exe`.
- La résolution du chemin (`ResolveWingetPath` : alias `WindowsApps` puis
  paquet `Microsoft.DesktopAppInstaller`, avec message explicite si absent)
  est retirée de `RunHiddenProcess` — qui redevient un simple lanceur de
  processus — et centralisée dans `RunWingetCli`. Comportement identique :
  `winget` introuvable lève la même exception qu'avant.
- `tests/Test-WingetParsing.ps1` : vérifie qu'aucun appel ne contourne
  `RunWingetCli` (zéro `RunHiddenProcess("winget.exe", …)` restant) et que les
  deux surcharges existent (contrôle par réflexion sur l'exécutable).
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.13] - 2026-08-27

### WinGet : les vérifications d'installation passent par la colonne ID

- Suite du chantier « analyseur unique » : les derniers points qui lisaient la
  sortie de `winget list` à la main sont migrés sur `ParseWingetTable`.
  - `ParseWingetListPackageIds` (résolution de l'identifiant à désinstaller)
    n'utilise plus `Regex.Split(\s{2,})` — fragile dès qu'un nom contient deux
    espaces consécutifs.
  - `VerifyPackageInstallation`, `IsPackageStillInstalled` et
    `PromoteVerifiedWingetPackages` ne cherchent plus l'identifiant par
    `IndexOf` / regex sur le texte brut mais via un nouveau contrôle
    `WingetTableContainsId` qui compare **la colonne ID** ligne par ligne.
    Un identifiant apparaissant dans un nom d'application ou un chemin ne
    déclenche plus de faux positif.
- Miroir JS : `wingetTableHasId(output, id)` dans
  `beta/src/modules/winget-table.js` (+ 3 tests). 137 tests beta.
- `tests/Test-WingetParsing.ps1` étendu : marqueurs des sites migrés +
  vérification par réflexion de `WingetTableContainsId` sur une capture réelle.
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.12] - 2026-08-27

### WinGet : un seul analyseur de sortie tabulaire

- Les analyseurs regex maison de `winget upgrade` et `winget search` sont
  remplacés par **un analyseur unique** (`ParseWingetTable`) qui lit la ligne
  d'en-tête pour retrouver la position de chaque colonne, puis découpe par
  positions. Miroir JS testé sur de vraies captures
  (`beta/src/modules/winget-table.js`, 12 tests).
- Corrige au passage : les paquets dont la **version installée contient un
  espace** (`< 173.0.0.13316`, ex. Ubisoft Connect) n'étaient pas listés du tout
  par l'ancienne regex ; ils apparaissent maintenant (et sont gérés comme les
  autres lanceurs auto-gérés).
- Gère les en-têtes localisés (Nom/ID/Version/Disponible/Source/Correspondance),
  `Unknown`, les colonnes vides et les identifiants `MSIX\` / `ARP\`.

## [4.0.0-beta.11] - 2026-08-27

### Catalogue : `apps.json` devient la source de vérité

- Le bloc de ~90 applications codé en dur dans `app.js` est **retiré**.
  `app.js` charge désormais le catalogue depuis `catalog.generated.js`
  (`window.PC_SETUP_CATALOG`), lui-même généré depuis
  `beta/catalog/apps.json` et vérifié par le contrôle d'intégrité SHA-256.
- Ajouter ou modifier une application = éditer **un seul fichier de données**
  (`beta/catalog/apps.json`, validé par un schéma JSON) + son logo. Plus rien à
  toucher dans `app.js`. Voir `CONTRIBUTING.md`.
- `tools/check-catalog.mjs` valide `apps.json` et sa cohérence avec le script
  généré. Nouveau test de parité `apps.json` ↔ `catalog.generated.js`
  (nombre, ordre d'affichage, champs).
- `beta/csharp/OwlSetup.csproj` **validé** par `dotnet build` : compile sans
  avertissement, l'exécutable démarre et passe le contrôle d'intégrité.
  Corrections : références `System.IO.Compression` manquantes, ressource
  `catalog.generated.js` absente, DLL WebView2 désormais embarquées.
- Vérifié : la bêta démarre (3/3), intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.10] - 2026-08-27

### Consolidation + tests

- Ajoute des tests de comportement pour les correctifs des bêtas précédentes :
  - `beta/` : nouveau module pur `operations-reconcile` (résolution automatique
    des faux échecs du Centre des opérations) avec tests unitaires + parité avec
    `app.js` ; la liste des lanceurs auto-gérés est désormais vérifiée en
    **triple parité** (module ≡ hôte C# ≡ `app.js`). 121 tests.
  - `tests/Test-MaintenanceHardening.ps1` et `tests/Test-SecurityHardening.ps1`
    gardent la présence des correctifs (identifiants durcis, `--include-unknown`,
    lanceurs auto-gérés, liste d'ignorés, réconciliation des opérations,
    détection AV/pare-feu indéterminée, suppression robuste de quarantaine,
    `longPathAware`, etc.). Exécutés par la suite de préparation, donc en CI.
- Retire `app-leftovers` de la dernière liste où elle subsistait
  (`RunElevatedCleanupWorker`).

## [4.0.0-beta.9] - 2026-08-27

### Consolidation : trois finitions

- **Notifications** : les messages d'échec s'affichent avec une icône rouge « ✕ »
  (et non plus le « ✓ » vert générique). L'icône suit le type : succès,
  information, avertissement, erreur.
- **Réparer WinGet** ne réinitialise plus les sources en aveugle : une simple
  actualisation est tentée d'abord ; la réinitialisation complète n'intervient
  qu'en cas d'échec, et les **sources personnalisées** sont sauvegardées puis
  ré-ajoutées automatiquement (celles qui échouent sont listées).
- **Point de restauration** : plus de modification du registre pour contourner
  la limite Windows de 1 point / 24 h (fragile si le processus est interrompu).
  Quand Windows refuse pour cette raison, OwlSetup indique qu'un point récent
  protège déjà le PC, et une opération protégée se poursuit normalement.

## [4.0.0-beta.8] - 2026-08-27

### Quarantaine : suppression et restauration robustes

- Corrige « Action impossible · Impossible de trouver une partie du chemin
  d'accès » lors de la suppression ou de la restauration d'un dossier en
  quarantaine (constaté sur des caches CapCut). Causes traitées : fichiers en
  **lecture seule / cachés / système**, arborescences **très profondes**
  (> 260 caractères), fichiers verrouillés.
- Nouvelle suppression récursive en trois temps : voie normale, puis récursion
  manuelle avec remise à zéro des attributs, puis `rd /s /q` en préfixe `\\?\`.
- La restauration bascule sur `robocopy /MOVE` quand le déplacement direct
  échoue à cause de la profondeur du dossier.
- Quand des fichiers restent (application encore ouverte), le message le dit
  clairement au lieu d'un échec générique.
- `OwlSetup.manifest` : `longPathAware` activé.

## [4.0.0-beta.7] - 2026-08-27

### Onglet Sécurité : corrections et améliorations

- **Antivirus / pare-feu** : quand ni le Centre de sécurité Windows ni le
  registre ne permettent de conclure, OwlSetup affiche « État indéterminé » au
  lieu d'un faux « Protection active ». Aucun avertissement n'est créé dans ce
  cas ; le détail explique comment vérifier soi-même.
- **Quarantaine** : le badge du menu se masque quand elle est vide (au lieu
  d'afficher « 0 »). Les éléments sont triés par date réelle et affichent leur
  **taille** et leur **ancienneté**.
- **Quarantaine** : nouveau bouton « Supprimer les éléments de plus de 30 jours »
  (avec confirmation) pour vider l'ancienne quarantaine d'un coup.
- **Centre de sécurité** : la version de WinGet n'est plus relue en lançant
  `winget.exe` à chaque rafraîchissement (mise en cache 10 min). Le panneau
  indique l'heure de la dernière vérification.
- Le score n'attribue plus les points antivirus / pare-feu quand leur état n'a
  pas pu être déterminé.

## [4.0.0-beta.6] - 2026-08-27

### Centre des opérations : effacer les erreurs qui n'en sont plus

- À l'ouverture du Centre des opérations, les échecs de mise à jour qui ne sont
  pas de vraies erreurs sont **classés « résolu » automatiquement** : logiciels
  qui se mettent à jour eux-mêmes (Ankama Launcher…), mises à jour masquées via
  « Ne plus proposer », ou alertes de plus de 14 jours sans récidive.
- Chaque échec propose maintenant **« Marquer résolu »** à côté de « Corriger ».
- Bouton d'en-tête **« ✓ Tout classer résolu »** (visible s'il reste des échecs)
  et **« Effacer les terminées »** pour alléger l'historique.
- Une croix **✕** retire une opération terminée, résolue ou interrompue de la
  liste.
- Quand une opération est classée résolue, la **notification d'avertissement
  liée** passe en « résolu » au lieu de rester affichée.
- Le compteur du menu Maintenance reflète ces changements immédiatement.

## [4.0.0-beta.5] - 2026-08-27

### Onglet Maintenance : 7 correctifs rapides (voir REVUE-MAINTENANCE.md)

- **Mises à jour** : `winget upgrade` est désormais interrogé avec
  `--include-unknown`. Les logiciels dont WinGet ignore la version installée sont
  affichés (« version installée : inconnue ») et traités sans erreur, comme les
  lanceurs auto-updatés.
- **Pilotes** : les textes n'affirment plus qu'OwlSetup installe les pilotes. Ils
  indiquent qu'OwlSetup **ouvre Windows Update**, où Microsoft propose composants
  et pilotes.
- **Nettoyage des navigateurs** : une catégorie sans effet pour le moteur
  sélectionné (cache multimédia et historique côté Firefox) est désormais
  grisée et décochée au lieu d'être proposée pour rien.
- **Libérer de l'espace** : l'option « Résidus d'applications » — inactive dans
  le nettoyage intégré — est retirée. La désinstallation vérifiée (onglet
  Applications) reste le chemin pour les résidus.
- **Point de restauration** : contrôle de la protection système, neutralisation
  temporaire de la limite Windows de 1 point / 24 h, et vérification que le point
  a réellement été créé (fini le « Point créé » quand rien n'a été fait).
- **Messages de blocage** : plus de référence codée en dur à « OBS » ; le libellé
  s'adapte au logiciel réellement concerné.
- **Mesure de taille** : quand un dossier dépasse 200 000 fichiers, l'analyse
  l'indique (« mesure partielle ») au lieu de sous-estimer en silence.

## [4.0.0-beta.4] - 2026-08-27

### Masquer une mise à jour définitivement

- Chaque mise à jour proposée peut être masquée (bouton ✕ « Ne plus proposer »).
  Le choix est conservé localement (`owlsetup-update-ignore-v1`).
- Les mises à jour masquées ne comptent plus dans le badge de navigation, la
  sélection ni la notification.
- Une barre « N mise(s) à jour masquée(s) · Réafficher » permet de tout
  restaurer d'un clic.
- Utile pour les logiciels qui se mettent à jour eux-mêmes (Ankama Launcher…)
  que WinGet reproposera toujours.

## [4.0.0-beta.3] - 2026-08-27

### Mises à jour : logiciels qui se mettent à jour eux-mêmes

- Reconnaît les lanceurs à mise à jour intégrée (Ankama Launcher, EA app,
  Battle.net, Epic Games, Ubisoft Connect, GOG Galaxy, Steam, Discord, Riot,
  CurseForge, Amazon Games, Logitech G HUB) ainsi que les écarts de schéma de
  version (installée `3.15.2`, proposée `3.15.2.20509`).
- Pour ces logiciels, `winget upgrade` n'est plus compté comme un échec : la
  mise à jour se termine « sans avertissement » avec le message « Ouvrez
  l'application une fois pour finaliser ».
- La liste des mises à jour affiche un badge « ⟳ se met à jour seule » sur ces
  applications.
- Nouveau module testé `beta/src/modules/update-heuristics.js` (miroir de la
  logique C#, vérifié par un test de parité de la liste).

## [4.0.0-beta.2] - 2026-08-27

### Fondations 4.0 : catalogue externalisé et durcissement

- Sort le catalogue des 93 applications de `app.js` vers `beta/catalog/apps.json`
  (validé par un schéma JSON) et l'injecte au démarrage via
  `catalog.generated.js`. Le bloc `const apps` reste dans `app.js` comme repli.
- Ajoute `catalog.generated.js` à la vérification d'intégrité SHA-256 des
  ressources embarquées et à sa génération automatique dans `build.ps1`.
- Durcit la validation des identifiants de paquet : le premier caractère doit
  être alphanumérique (`^[A-Za-z0-9][A-Za-z0-9.+_-]*$`), des deux côtés de la
  frontière interface / hôte, pour écarter toute confusion avec un argument
  `winget`.
- Ajoute la couche d'outillage qualité `beta/` : ESLint, Prettier, Vitest
  (97 tests, dont un test de parité qui compare chaque module extrait à la
  version encore présente dans `app.js`), un projet MSBuild pour l'hôte C# et le
  workflow CI `.github/workflows/quality.yml`.
- Documente le plan de modernisation complet dans `beta/PLAN-AMELIORATION.md` et
  l'analyse concurrentielle dans `beta/COMPETITIVE-ANALYSIS.md`.
- Aucune modification de comportement de l'application : la suite
  `Test-ReleaseCandidateReadiness.ps1` reste verte.

## [3.7.0-beta.57] - 2026-08-02

### Désinstallation vérifiée après installation

- Corrige le bouton « Désinstaller la sélection » lorsque la sortie de `winget list` ne respecte pas exactement la mise en colonnes attendue.
- Affiche « Vérification WinGet… » pendant le contrôle, bloque les doubles clics et rétablit automatiquement le bouton en cas d’échec ou de délai dépassé.
- Écarte explicitement les applications qui ne sont plus installées ou qui ne sont pas confirmées comme gérables par WinGet.
- Ajoute une vérification rapide à la fin d’une installation et affiche les applications effectivement détectées.
- Permet de lancer immédiatement leur désinstallation individuelle depuis le résultat d’installation, avec la simulation et la confirmation de sécurité habituelles.
- Actualise automatiquement la liste des applications installées après la fin de l’opération.

## [3.7.0] - 2026-08-02

### Version stable prête à publier

- Regroupe les correctifs et améliorations validés des bêta 1 à 57 dans le canal stable.
- Ajoute la configuration initiale, le choix de la langue et du thème, ainsi qu’une navigation responsive avec menus regroupés.
- Améliore l’installation, la mise à jour et la désinstallation avec suivi en arrière-plan, réconciliation des résultats WinGet et gestion confirmée des processus bloquants.
- Ajoute le centre des opérations, l’historique local, la visionneuse de journaux et les diagnostics facultatifs anonymisés.
- Renforce les contrôles de chemins, la quarantaine réversible, la protection facultative par point de restauration et la reconnaissance des protections Windows ou tierces.
- Valide le catalogue de 93 applications, leurs sites officiels et leurs logos en couleur.
- Permet d’ouvrir les dossiers volumineux dans l’Explorateur et limite le nettoyage direct au cache `.cache`, toujours placé en quarantaine après confirmation.
- Prépare des exécutables stables sans signature numérique, accompagnés de leurs empreintes SHA-256.

## [3.7.0-beta.56] - 2026-08-02

### Gestion prudente du stockage

- Ajoute un bouton « Ouvrir » sur chaque dossier volumineux détecté afin de l'afficher directement dans l'Explorateur Windows.
- Propose « Nettoyer » uniquement pour le cache `.cache` explicitement reconnu comme sûr, jamais pour Documents, Nextcloud ou les dossiers de travail.
- Place le cache en quarantaine réversible après confirmation au lieu de le supprimer définitivement.
- Verrouille les actions natives sur les chemins issus de la dernière analyse, limités aux dossiers directs du profil et sans lien de réanalyse.
- Actualise automatiquement l'analyse du disque et la quarantaine après l'opération.

## [3.7.0-beta.55] - 2026-08-02

### Icônes des outils système

- Remplace les caractères génériques par quatre pictogrammes SVG explicites et homogènes.
- Distingue visuellement le diagnostic WinGet, la restauration, le démarrage et l’occupation du disque.
- Renforce la lisibilité grâce à des contours, dégradés et contrastes propres à chaque outil.

## [3.7.0-beta.54] - 2026-08-02

### Catalogue contrôlé

- Retire l’option avancée permettant d’ajouter librement un identifiant WinGet.
- Supprime automatiquement les anciens paquets personnalisés mémorisés localement.
- Empêche les profils de recréer des applications absentes du catalogue OwlSetup.
- Conserve les profils de sélection uniquement pour les logiciels vérifiés du catalogue.

## [3.7.0-beta.53] - 2026-08-02

### Détection des paquets personnalisés

- Un complément ou module Windows portant un nom proche n’est plus confondu avec l’application personnalisée exacte.
- Microsoft Teams Meeting Add-in n’est notamment plus présenté comme l’application Microsoft Teams installée.
- La carte affiche désormais « Composant associé » avec une explication lorsque seul un élément apparenté est trouvé.
- Les paquets personnalisés ne deviennent désinstallables qu’après confirmation de leur identifiant exact par WinGet.

## [3.7.0-beta.52] - 2026-08-02

### Corrigé

- Les paquets ajoutés manuellement acceptent désormais un identifiant seul ou une commande WinGet complète collée dans le champ.
- La désinstallation résout l’identifiant réellement installé par WinGet avant toute suppression, avec une correspondance exacte et unique.
- Les doublons personnalisés comme `Teams` et `Microsoft.Teams` sont fusionnés lorsque l’unique paquet installé est confirmé.
- La désinstallation groupée écarte les paquets non confirmés au lieu de lancer une suppression ambiguë.

## [3.7.0-beta.51] - 2026-08-02

### Apparence claire et automatique
- Ajoute les thèmes « Selon Windows », « Sombre » et « Clair » dans Paramètres.
- Propose le choix du thème dès le guide de première configuration, sans l’imposer.
- Applique le thème clair à toute l’interface, aux menus, formulaires, fenêtres d’opération et écrans du guide.
- Conserve le choix localement et l’inclut dans l’export et la restauration des réglages.

### Logo OwlSetup embarqué
- Corrige le chemin du logo principal utilisé dans la barre latérale de l’application.
- Aligne toutes les vues sur le nom réellement extrait depuis les ressources de l’exécutable.
- Ajoute un contrôle automatique empêchant la création d’une bêta dont le logo de marque ne peut pas être chargé.

## [3.7.0-beta.50] - 2026-08-02

### Audit complet des logos
- Contrôle les 93 associations entre applications et fichiers de logo.
- Corrige les icônes identiques de CrystalDiskInfo et CrystalDiskMark avec les fichiers des dépôts officiels.
- Remplace Microsoft Copilot et Stability Matrix par leurs visuels colorés.
- Rétablit les couleurs de marque de Malwarebytes, TeamViewer, Tor Browser, Opera GX, Waterfox et Visual C++.
- Ajoute un test automatique qui bloque une bêta si un logo est absent, vide ou possède une fausse extension PNG.

## [3.7.0-beta.49] - 2026-08-02

### Logos restants et contraste
- Utilise les icônes officielles de GitHub Desktop et DBeaver Community.
- Ajoute un support clair neutre aux logos officiellement sombres (Tailscale, EA app, Rustup et Ollama).
- Conserve les couleurs et les proportions originales dans le catalogue, les mises à jour et les rapports.

## [3.7.0-beta.48] - 2026-08-02

### Logos officiels en couleur
- Remplace 52 pictogrammes monochromes par leurs variantes en couleur.
- Conserve les couleurs originales sans filtre CSS ni recoloration automatique.
- Maintient un fond neutre et des dimensions homogènes dans tout le catalogue.

## [3.7.0-beta.47] - 2026-08-02

### Couleurs officielles des applications
- Retire toute modification de saturation, de contraste ou de couleur appliquée aux logos.
- Utilise un fond neutre commun afin d’afficher fidèlement les fichiers officiels.
- Conserve uniquement une taille, un alignement et un espacement homogènes.

## [3.7.0-beta.46] - 2026-08-02

### Note de maintenance et logos
- Remplace l’ancien cercle décoratif fixe par un anneau strictement proportionnel à la note sur 100.
- Synchronise immédiatement la longueur et la couleur de l’anneau après chaque analyse.
- Uniformise le cadre, la taille, le contraste et l’ombre des logos du catalogue sans remplacer leurs couleurs officielles.
- Applique le même traitement aux mises à jour, rapports et aperçus de sélection.

## [3.7.0-beta.45] - 2026-08-02

### Protection Windows et lisibilité
- Détecte l’état agrégé des antivirus enregistrés auprès du Centre de sécurité Windows, y compris les solutions tierces.
- Détecte de la même façon les pare-feu Windows ou tiers sans modifier leur configuration.
- Conserve un contrôle de secours local lorsque le Centre de sécurité Windows est indisponible.
- Remplace les libellés spécifiques à Defender et au pare-feu Windows par des intitulés génériques et explicites.
- Simplifie la carte système avec « Redémarrage : Nécessaire » afin d’éviter la répétition « PC à redémarrer ».

## [3.7.0-preparation.1] - 2026-08-01

### Version stable préparée
- Finalise la nouvelle navigation, la configuration guidée et l’interface adaptative.
- Améliore l’installation, la désinstallation, le nettoyage et les mises à jour en arrière-plan.
- Corrige les fausses alertes WinGet, les opérations fantômes et les notifications répétées.
- Ajoute l’historique local, le centre des opérations et les diagnostics facultatifs anonymisés.
- Renforce la sécurité, la protection de restauration facultative et les explications utilisateur.
- Précise explicitement lorsqu’un redémarrage complet du PC est nécessaire.
- Valide le catalogue de 93 applications, 93 sites officiels et 89 logos sans avertissement.

## [3.7.0-rc.5] - 2026-08-01

### Confidentialité et assistance
- Conserve l’onglet « Aide et dépannage » pour le diagnostic manuel, le signalement et le suivi des réponses.
- Ajoute des rapports d’erreurs facultatifs avec trois choix : aucun envoi, confirmation préalable ou diagnostic minimal automatique.
- Désactive tout envoi par défaut et présente le choix pendant la première configuration ainsi que dans les Paramètres.
- Exclut les journaux complets, chemins de fichiers, noms d’utilisateur, listes de logiciels, documents et adresses IP du contenu enregistré.
- Ajoute au dashboard privé une vue « Diagnostics » regroupée par empreinte technique, version et opération.
- Protège la réception par validation stricte, limite de taille, limitation de débit et stockage privé existant du dashboard.

## [3.7.0-rc.4] - 2026-08-01

### Prise en main et opérations
- Corrige l’icône principale absente dans l’étape « Entretien » du parcours de première utilisation.
- Replie automatiquement les mises à jour dans un suivi compact en bas à droite après leur lancement.
- Laisse l’interface visible et utilisable pendant la mise à jour, avec réouverture du détail en un clic.
- Synchronise dans le suivi compact le titre, l’étape, le pourcentage et le résultat final de l’opération.

## [3.7.0-rc.3] - 2026-08-01

### Prise en main
- Présente la création automatique des points de restauration comme un choix facultatif, avec « Pas maintenant » sélectionné par défaut.
- Remplace les caractères génériques du parcours animé par des icônes SVG cohérentes avec l’identité visuelle d’OwlSetup.
- Précise dans l’étape Sécurité que le point de restauration reste facultatif.

## [3.7.0-rc.2] - 2026-08-01

### Stabilité et ergonomie
- Remplace le message ambigu lié aux points de restauration par une aide guidée et sans modification silencieuse de Windows.
- Distingue une demande administrateur annulée d’une protection du système désactivée.
- Ajoute un accès direct au panneau officiel « Protection du système » et un choix explicite pour désactiver l’automatisation.
- Corrige l’alignement des Paramètres lorsque la fenêtre est réduite ou que l’espace utile devient insuffisant.
- Modernise les icônes du guide d’installation avec une iconographie vectorielle cohérente.

## [3.7.0-beta.36] - 2026-08-01

### Interface
- Applique un véritable thème sombre au menu de tri des applications installées.
- Réorganise les cartes installées sur deux lignes afin que le nom et le logo restent toujours visibles.
- Les catégories deviennent des badges compacts et les actions passent automatiquement sous la fiche lorsque l'espace diminue.

## [3.7.0-beta.35] - 2026-08-01

### Corrigé
- La notification « Rufus est prêt » n'est plus affichée à chaque démarrage.
- Une application portable ne déclenche désormais cette notification que lorsqu'un raccourci absent vient réellement d'être recréé.

## [3.7.0-beta.34] - 2026-08-01

### Interface
- Améliore l'espacement et le thème sombre du sélecteur de conservation des journaux.
- Agrandit la jauge de sécurité et rend l'action « Voir le calcul » visible en permanence.
- Renforce le contraste des boutons d'aide contextuelle avec une couleur ambre identifiable.

## [3.7.0-beta.33] - 2026-08-01

### Corrigé
- Aligne les filtres et les actions de l'historique sur une même ligne et une même hauteur.
- Remplace la barre de titre Windows claire par une barre sombre assortie à OwlSetup, avec bordure et texte harmonisés.

## [3.7.0-beta.32] - 2026-08-01

### Historique et aide contextuelle

- La durée de conservation est synchronisée entre Outils système et Centre de sécurité.
- L’application distingue maintenant la suppression des anciens rapports et l’effacement complet de l’historique.
- Une confirmation dédiée protège l’effacement définitif des journaux et rapports.
- Des boutons d’aide contextuelle expliquent les durées et le stockage local des journaux.

## [3.7.0-beta.31] - 2026-08-01

### Anglais enrichi

- Les pages Applications, Mises à jour, Maintenance, Nettoyage, Quarantaine, Outils, Sécurité, Assistance et Paramètres disposent de traductions anglaises supplémentaires.
- Les textes ajoutés dynamiquement et les libellés contenant des quantités sont maintenant traduits à leur apparition.
- Plusieurs formulations anglaises ont été réécrites pour être plus naturelles et cohérentes.

## [3.7.0-beta.30] - 2026-08-01

### Illustration des applications installées

- Le symbole carré de la page Applications installées est remplacé par une icône SVG d'application validée.
- Le cadre, la lumière et les couleurs de l'illustration sont harmonisés avec les autres pages d'OwlSetup.

## [3.7.0-beta.29] - 2026-08-01

### Barre de navigation et illustrations

- Le lien Ko-fi rejoint la barre de navigation horizontale avec une icône tasse et coeur.
- Les illustrations des pages Catalogue, Mises à jour, Nettoyage, Quarantaine et Dépannage utilisent maintenant des SVG homogènes.
- La carte Windows et les catégories de nettoyage abandonnent les anciens caractères typographiques.
- Les séparateurs utilisent le même bleu sombre dans toute l'interface.

## [3.7.0-beta.28] - 2026-08-01

### Iconographie de l'accueil

- Les symboles typographiques de l'accueil sont remplacés par des icônes SVG homogènes.
- Les indicateurs système, les quatre outils principaux et les garanties locales utilisent le même style que les menus.
- Les contours, couleurs et effets au survol ont été harmonisés.

## [3.7.0-beta.27] - 2026-08-01

### Interface adaptative dans une fenêtre réduite

- La page Paramètres passe automatiquement sur une colonne lorsque la largeur disponible diminue.
- Les commandes de langue, de prise en main et d'accessibilité se réorganisent sans chevauchement.
- La barre de navigation masque correctement le contenu qui défile dessous.
- Les espacements et la largeur des cartes s'adaptent progressivement aux petites fenêtres.

## [3.7.0-beta.26] — 2026-08-01

### Configuration guidée au premier démarrage

- Après le choix de la langue, une page de configuration initiale présente les préférences essentielles.
- L'utilisateur choisit la taille du texte, le contraste, les animations et la protection par point de restauration.
- La validation ouvre automatiquement le guide interactif des fonctions principales.
- Le guide reste facultatif et tout le parcours peut être relancé ou modifié depuis Paramètres.
- Les choix sont enregistrés uniquement pour l'utilisateur Windows courant.

## [3.7.0-beta.25] — 2026-08-01

### Suppression d'une fausse alerte WinGet

- Le code WinGet `0x8A15002B` est désormais interprété correctement comme « aucune mise à jour applicable ».
- Un logiciel déjà à jour n'est plus présenté comme une mise à jour en échec.
- Les anciennes opérations enregistrées avec ce code sont automatiquement reclassées comme résolues au démarrage.

## [3.7.0-beta.24] — 2026-08-01

### Alias des paquets dans l'historique

- Les identifiants abrégés enregistrés par certaines anciennes opérations sont rapprochés de leur identifiant WinGet officiel.
- `OBSStudio`, `OBS Studio` et `OBSProject.OBSStudio` désignent désormais la même application lors de la résolution automatique.
- Une ancienne erreur de mise à jour OBS ne reste donc plus active après une nouvelle tentative réussie.

## [3.7.0-beta.23] — 2026-08-01

### Résolution automatique des anciennes alertes

- Une mise à jour réussie clôt désormais automatiquement les erreurs antérieures concernant les mêmes paquets.
- Les anciennes erreurs restent consultables avec l'état « Résolu automatiquement » au lieu d'être supprimées.
- Les compteurs « À vérifier », les badges Maintenance et les notifications actives sont recalculés sans intervention manuelle.
- Le rapprochement s'applique aussi rétroactivement à l'historique local déjà présent au démarrage.

## [3.7.0-beta.22] — 2026-08-01

### Mise à jour silencieuse d'OBS

- OwlSetup recherche désormais les processus tiers qui chargent un module OBS ou OBS Virtual Camera.
- Le nom réel du verrou est présenté à l'utilisateur ; sur le poste de test, Brave chargeait `obs-virtualcam-module64.dll`.
- Le bouton ferme l'application détectée après consentement, attend la libération des fichiers puis relance silencieusement uniquement OBS.
- Les processus partageant le même exécutable sont regroupés afin de fermer proprement les applications multiprocessus comme les navigateurs.

## [3.7.0-beta.21] — 2026-08-01

### Action directe après un blocage WinGet

- Le résultat de mise à jour affiche désormais un bouton « Fermer [application] » lorsque WinGet détecte des fichiers utilisés.
- La fermeture normale est tentée directement depuis la fenêtre de résultat.
- Une fermeture forcée, accompagnée d'un avertissement, n'apparaît que si le processus résiste.
- Après la fermeture, le même emplacement propose de relancer uniquement la mise à jour en échec.

## [3.7.0-beta.20] — 2026-08-01

### Fermeture sécurisée des applications bloquantes

- Le centre des opérations recherche les processus connus associés au paquet WinGet en échec.
- L'utilisateur peut demander une fermeture normale, fermer lui-même le logiciel ou confirmer séparément une fermeture forcée.
- Les processus critiques de Windows et OwlSetup sont systématiquement protégés.
- Après fermeture, seule la mise à jour concernée est présélectionnée et la confirmation reste obligatoire.
- Les titres et identifiants des processus sont affichés avant toute action afin d'éviter les fermetures surprises.

## [3.7.0-beta.19] — 2026-08-01

### Correctif WinGet

- Reconnaissance explicite du code WinGet `0x8A150111` lorsqu'une application ou ses fichiers sont encore utilisés.
- Le centre des opérations propose une relance ciblée du seul logiciel en échec au lieu de réparer inutilement les sources WinGet.
- Aucun processus utilisateur n'est fermé automatiquement : OwlSetup indique l'application à fermer avant la nouvelle tentative.
- Les rapports WinGet sont lus en UTF-8 pour éviter les caractères illisibles et fiabiliser l'analyse des erreurs en français.
- Les résultats conservent le paquet, la catégorie d'erreur et le code technique nécessaires au dépannage.

Les changements importants de OwlSetup sont regroupés dans ce fichier. Le projet suit une numérotation de version de type `MAJEUR.MINEUR.CORRECTIF`.

## [3.7.0-beta.18] — 2026-08-01

### Ergonomie

- Catalogue allégé grâce à une section repliable pour les sauvegardes, profils et identifiants WinGet personnalisés.
- Boutons « Réparer » et « Désinstaller » explicitement nommés dans la liste des applications installées.
- Actions de dépannage renforcées visuellement et ouverture des sous-menus accélérée.
- Commandes « Tout sélectionner » et « Tout désélectionner » ajoutées aux mises à jour disponibles.

### Compréhension et aide

- Explication interactive du calcul du score de sécurité.
- Guide enrichi avec les vérifications à effectuer en cas d’échec.
- Notifications lues supprimables et automatiquement purgées après quatorze jours.
- Notifications temporaires des applications portables dédupliquées pendant la session.

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
# 3.7.0-beta.13 — 2026-07-31

- Diagnostic intelligent des journaux avec suggestions et relance ciblée des installations en échec.
- Aperçu de confidentialité obligatoire avant l’ouverture d’un signalement GitHub.
- Suivi local des signalements et consultation de leur état public sans jeton GitHub.
- Export ZIP d’assistance anonymisé, sans journal complet ni fichier personnel automatique.
- Filtres et durée de conservation configurable pour l’historique local.
- Point de restauration automatique facultatif avant maintenance sensible.
- Réglages d’accessibilité : taille du texte, contraste renforcé et animations réduites.
- Autodiagnostic interne de l’intégrité, WinGet, WebView2, du stockage et des permissions.
- Signalement direct depuis les résultats d’installation et de mise à jour en avertissement.

# 3.7.0-beta.14 — 2026-07-31

- Centre des opérations avec résultats, erreurs et reprise contrôlée après interruption.
- Vérification réelle de la présence d’une application après installation WinGet.
- Détection des applications ouvertes avant une installation et messages d’erreur plus explicites.
- Analyse locale de la santé des applications installées.
- Sauvegarde complète des profils, préférences, accessibilité et réglages OwlSetup.
- Mode expert facultatif affichant les commandes préparées avant leur exécution.
- Correction guidée de WinGet depuis une opération en échec.
- Contrôle automatique de la structure du catalogue, des liens HTTPS et des logos via GitHub Actions.

# 3.7.0-beta.15 — 2026-07-31

- Nouveau score de sécurité local sur 100 avec explication de chaque contrôle.
- Cartes détaillées pour l’intégrité, l’origine WebView2, la signature, WinGet, WebView2 et les privilèges.
- Lecture seule de l’état apparent de Microsoft Defender et des profils du pare-feu Windows.
- Distinction claire entre bêta locale non signée, exécutable non signé et signature invalide.
- Actions recommandées contextualisées sans transformer OwlSetup en antivirus.
- Export JSON anonymisé du diagnostic de sécurité, sans compte, document ni contenu de journal.
- Conservation configurable des journaux de sécurité sur 7, 30 ou 90 jours.
# 3.7.0-beta.16 — 2026-08-01

- Détection des applications installées consolidée à partir de WinGet, du registre Windows, des paquets MSIX et des applications portables gérées par OwlSetup.
- Distinction claire entre une application installée et une application réellement gérable par WinGet.
- Les installations reconnues par Windows mais non associées à WinGet ne sont plus présentées comme absentes ou défectueuses.
- Ajout d’un état « Détectée via Windows/MSIX » et d’un accès sûr à la page Applications installées de Windows.
- Les actions groupées, la réparation et la désinstallation WinGet sont réservées aux paquets dont l’identifiant a été vérifié.
- Amélioration des correspondances pour Battle.net, Brave, GitHub Desktop, Node.js, Python et qBittorrent.
# 3.7.0-beta.17 — 2026-08-01

- Réorganisation visuelle légère de la page Paramètres.
- Ajout d’un résumé local, privé et réversible en tête de page.
- Icônes harmonisées avec la navigation OwlSetup et états de sécurité mieux différenciés.
- Cartes, espacements et comportements adaptatifs améliorés.
- Correction de l’affichage de la version longue dans la carte À propos.
## [3.7.0-beta.37] - 2026-08-01

- fonctionnement hors ligne complet : suppression de la police distante Google Fonts ;
- erreurs natives affichées dans une carte non bloquante avec copie du diagnostic et accès au dépannage ;
- catalogue plus compact au retour, filtres adaptatifs et suppression du défilement horizontal ;
- navigation adaptée aux fenêtres plus étroites et taille minimale réduite sans casser la mise en page ;
- traduction anglaise étendue aux catégories et descriptions du catalogue ;
- ancien moteur de mise à jour automatique maintenu désactivé tant que l'application ne peut pas être signée ;
- export du script personnalisé renommé `OwlSetup-Installer.ps1`.

## [3.7.0-beta.38] - 2026-08-01

- choix entre l’emplacement automatique recommandé et un dossier d’installation personnalisé ;
- sélecteur Windows natif et validation des chemins locaux protégés ;
- création d’un sous-dossier distinct pour chaque application sélectionnée ;
- contrôle de l’espace disponible sur le disque réellement choisi ;
- transmission de l’emplacement à WinGet avec avertissement lorsque l’installateur de l’éditeur l’ignore ;
- mémorisation du dossier des applications portables pour conserver des raccourcis fonctionnels.

## [3.7.0-beta.39] - 2026-08-01

- fenêtre d’installation replacée au centre de l’écran ;
- largeur augmentée et défilement interne conservé sur les petits écrans ;
- titres, diagnostics, champs, explications et boutons agrandis pour une meilleure lisibilité.

## [3.7.0-beta.40] - 2026-08-01

- blocage des doubles demandes d’installation pendant qu’une première opération continue ;
- une nouvelle demande reçue par le moteur natif devient une information et non une erreur ;
- vérification différée et répétée de la présence réelle du logiciel dans Windows ;
- correction automatique d’un code WinGet trompeur lorsque l’application est finalement bien installée.

## [3.7.0-beta.41] - 2026-08-01

- typographie harmonisée dans l’ensemble de l’interface avec une police Windows locale unique ;
- boutons, champs, listes, titres, cartes, notifications et fenêtres alignés sur la même famille ;
- police technique distincte conservée uniquement pour les commandes, codes et journaux ;
- aucun téléchargement de police requis : le rendu reste cohérent hors ligne.

## [3.7.0-beta.42] - 2026-08-01

- seconde vérification exacte des applications détectées par Windows ou MSIX lorsque l’export WinGet ne suffit pas ;
- activation de la désinstallation uniquement lorsque WinGet confirme précisément l’identifiant du paquet installé ;
- conservation du bouton « Gérer dans Windows » lorsque la correspondance reste incertaine ;
- aucune commande de désinstallation issue du registre n’est exécutée sans validation par le gestionnaire officiel Microsoft.

## [3.7.0-beta.43] - 2026-08-01

- suppression automatique des faux compteurs « En cours » lorsque plus aucune tâche OwlSetup n’existe ;
- récupération du dernier suivi actif lorsqu’un message de fin arrive sans référence locale ;
- anciennes tâches fantômes classées comme interrompues avec une explication claire ;
- badge du Centre des opérations limité aux opérations réellement actives ou aux erreurs à corriger.
# 3.7.0-rc.1 - stabilisation locale

- Gel des nouvelles fonctionnalités avant la prochaine version stable.
- Ajout d'un contrôle global de préparation à la release : syntaxe, catalogue, sécurité, interface et tests de régression.
- Ajout d'une compilation Release Candidate séparée des bêtas et des versions stables.
- Ajout d'une checklist obligatoire pour les essais réels sur le PC secondaire.
- La Release Candidate reste locale et ne sera pas publiée comme stable avant validation complète.
## [3.7.0-beta.44] - 2026-08-02

- Le statut sans signature reste visible comme information, sans badge d'action permanent.
- Les neuf contrôles du Centre de sécurité utilisent désormais des pictogrammes SVG cohérents et accessibles.
