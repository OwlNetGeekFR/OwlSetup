# Plan d'amélioration OwlSetup — vers la version 4.0

_Branche : `beta/4.0-foundations` · base : v3.7.0 stable · date : 2026-08-27_

> Ce document accompagne le dossier `beta/`. Le **lot 0** (outillage) est déjà
> réalisé et vérifiable ici (`cd beta && npm install && npm run check`). Les
> autres lots sont séquencés, chiffrés et assortis de critères d'acceptation.
> Résumé anglais en fin de document (§ English summary).

---

## 0. Principes directeurs

1. **Ne rien casser.** L'application stable à la racine du dépôt continue de se
   construire avec `build.ps1` sans modification tant qu'un lot n'est pas fusionné
   explicitement.
2. **Comportement d'abord préservé.** Les refactors sont couverts par un test de
   parité (le nouveau code doit produire le même résultat que l'ancien) avant
   toute suppression de l'ancien.
3. **Interface et messages en français** (règle `CONTRIBUTING.md`). Le code, les
   commentaires et les identifiants techniques peuvent passer en anglais.
4. **Chaque lot = une PR autonome**, réversible, avec critères d'acceptation
   mesurables et mise à jour du `CHANGELOG.md`.
5. **La contrainte d'intégrité reste respectée.** `OwlSetupWebView.cs` vérifie au
   démarrage le SHA-256 de `index.html`, `i18n.js`, `app.js`, `styles.css`
   embarqués. Toute la chaîne de build doit donc produire **un seul** `app.js`,
   **un seul** `styles.css`, **un seul** `index.html` déterministes.

---

## Lot 0 — Fondations d'outillage ✅ (livré dans `beta/`)

**Objectif :** rendre le code JavaScript mesurable et testable sans changer le
comportement de l'application.

| Livrable                                                                  | Fichier                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| `package.json` + scripts (`lint`, `format`, `test`, `catalog:*`, `check`) | `beta/package.json`                               |
| ESLint 9 (flat config)                                                    | `beta/eslint.config.js`                           |
| Prettier                                                                  | `beta/.prettierrc.json`                           |
| Vitest + seuils de couverture                                             | `beta/vitest.config.js`                           |
| Type-check éditeur (JSDoc + `checkJs`)                                    | `beta/jsconfig.json`                              |
| 7 modules purs extraits + testés (121 tests)                              | `beta/src/modules/*.js`, `beta/test/*`            |
| Test de **parité** avec `app.js` (le module doit égaler l'inline)         | `beta/test/parity.test.js`                        |
| Catalogue externalisé en JSON + schéma + validation (id, catégorie, logo) | `beta/catalog/`, `beta/scripts/build-catalog.mjs` |
| Projet MSBuild pour l'hôte C# (traduction fidèle de `build.ps1`)          | `beta/csharp/OwlSetup.csproj`                     |
| Workflow CI qualité **activé**                                            | `.github/workflows/quality.yml`                   |

**Modules extraits (purs, 0 effet de bord) :** `escape-html`, `package-id`,
`winget-brand`, `redaction` (anonymisation des journaux — sensible vie privée),
`theme`.

**Critères d'acceptation :** `npm run check` vert (lint + format + 121 tests +
catalogue synchronisé). ✅ atteint. `Test-ReleaseCandidateReadiness.ps1` reste
verte. ✅

**Reste à faire pour clôturer le lot (côté mainteneur) :**

- [ ] Valider `beta/csharp/OwlSetup.csproj` par un premier `msbuild` / `dotnet build`
      et comparer l'octet-à-octet du binaire à celui de `build.ps1`.
- [x] Copier `beta/ci/quality.yml` → `.github/workflows/quality.yml`. _(fait en 4.0.0-beta.2)_
- [ ] Décider de la position finale du dossier : `beta/` reste, ou son contenu
      remonte à la racine (recommandé une fois adopté).

---

## Lot 1 — Catalogue ouvert et contribuable — ✅ (4.0.0-beta.2 → beta.11)

**Pourquoi :** c'est l'écart produit n°1 face à UniGetUI / WinUtil. Un catalogue
figé dans `app.js` interdit toute contribution simple.

**Fait :**

- [x] _(beta.2)_ `build.ps1` génère `catalog.generated.js` depuis
      `beta/catalog/apps.json` et l'embarque avant `app.js` ; `index.html` le
      charge ; `OwlSetupWebView.cs` l'extrait et **vérifie son intégrité SHA-256**.
- [x] _(beta.11)_ **Inversion terminée** : le bloc `const apps` / `apps.push` est
      retiré de `app.js` (qui lit `window.PC_SETUP_CATALOG`). `apps.json` est la
      source de vérité, éditée à la main, validée par `catalog.schema.json`.
- [x] _(beta.11)_ `tools/check-catalog.mjs` valide `apps.json` + sa cohérence
      avec `catalog.generated.js`. Le test de parité `beta/` compare
      `apps.json` ↔ `catalog.generated.js` (nombre, ordre, champs).
- [x] _(beta.11)_ `CONTRIBUTING.md` : section « Ajouter ou modifier une
      application du catalogue ».
- [x] _(beta.11)_ `beta/csharp/OwlSetup.csproj` **validé** par `dotnet build`
      (0 warning, exe démarre, intégrité OK) — corrections : refs
      `System.IO.Compression*`, ressource `catalog.generated.js`, DLL WebView2
      embarquées.

**Reste (optionnel, non bloquant) :**

- [ ] Étendre le schéma : `addedIn`, `verifiedAt`, `officialSignature` (éditeur
      attendu, cf. `InstallSignedPublisherFallback`).
- [ ] `catalog-health.yml` : valider `apps.json` + `winget show` en CI.
- [ ] **Interface** : autoriser l'installation d'un résultat `SearchWinget`
      **après confirmation explicite** (bridé depuis la bêta 54), avec marquage
      « hors catalogue vérifié ».

**Acceptation :** ajouter une app = 1 PR ne touchant que `apps.json` (+ logo).
`app.js` ne contient plus de données catalogue. ✅

---

## Lot 2 — Découpage du front-end `app.js` en modules + bundler

**Pourquoi :** 4 048 lignes / ~250 fonctions globales / 0 test = coût de
régression élevé (57 bêtas pour la 3.7).

**Étapes :**

1. ✅ _(4.0.0-beta.22)_ **Pipeline d'assemblage en place.** `app.js` (racine)
   est désormais **généré** par `beta/scripts/build-js.mjs` : concaténation
   déterministe `modules purs → legacy.js` dans une IIFE (pas de bundler pour
   l'instant — `legacy.js` apparaît verbatim, ce qui préserve les 34 contrôles
   PowerShell et les 53 tests de parité). `build.ps1` régénère `app.js` si Node
   est présent. Garde-fou `beta/test/bundle.test.js`. Voir
   `beta/src/app/README.md`. _Le passage à esbuild/rollup viendra quand
   `legacy.js` aura fondu._
2. Découper progressivement, par domaine (un module + ses tests par PR) :
   `core/` (dom, state, ipc, storage, i18n-bridge, telemetry),
   `features/` (catalog, install, updates, uninstall, cleanup, browser,
   diagnostics, security, history, onboarding).
3. Pour **chaque** fonction déplacée : test de parité (`beta/test/parity.test.js`
   est le patron) avant de retirer la version inline.
4. `build.ps1` appelle `npm run build:js` (et `build:css`, cf. lot 6) avant le
   `csc` / MSBuild.
5. Quand `app.js` n'est plus qu'un artefact de build : le retirer du contrôle de
   version, l'ajouter à `.gitignore`, adapter `VerifyInterfaceIntegrity` (le SHA
   attendu est calculé à partir de l'artefact fraîchement bundlé — déjà le cas).
6. Activer le profil ESLint strict sur `src/app/**`.

**Risque :** élevé (surface énorme). **Mitigation :** incrémental, parité
systématique, `git bisect` facile car 1 domaine par PR. Un test e2e minimal
(lot 4) sécurise les régressions d'intégration.

**Effort :** 15–25 j étalés. **Acceptation :** `app.js` généré, aucune fonction
métier écrite à la main dans un fichier de 4 000 lignes, couverture ≥ 70 % sur
`src/app/core`.

---

## Lot 3 — Durcissement de l'hôte C#

**Pourquoi :** un fichier de 3 852 lignes compilé par `csc.exe` en ligne de
commande, sans analyseur ni découpage.

**Étapes :**

1. Adopter `beta/csharp/OwlSetup.csproj` comme chemin de build officiel (garder
   `build.ps1` en repli), activer `TreatWarningsAsErrors`, les analyseurs .NET et
   `dotnet format` en CI.
2. Découper `WebAppForm` par responsabilité (fichiers `partial` puis classes
   dédiées) : `Ipc/` (routage `OnWebMessage`), `Winget/` (invocations + parsing
   colonnes), `Cleanup/`, `Security/`, `Process/` (élévation, jetons),
   `Quarantine/`, `Diagnostics/`.
3. Centraliser la construction des arguments `winget` : un unique
   `WingetCommand` avec échappement et tests (Pester) sur les cas limites.
4. **Corrections de sécurité ciblées :**
   - [x] refuser un identifiant commençant par un non-alphanumérique — regex
         passée à `^[A-Za-z0-9][A-Za-z0-9.+_-]*$` dans `app.js`, `OwlSetupWebView.cs`
         (20 occurrences), `tools/check-catalog.mjs` et `beta/` _(4.0.0-beta.2)_ ;
   - [ ] valider systématiquement les chemins reçus (déjà fait pour la plupart via
         jeton `^[a-f0-9]{32}$` — généraliser) ;
   - [ ] journaliser toute opération élevée dans l'historique local.
5. Envisager la migration `net462 → net48` (toujours sans redistribuable) puis
   étudier `.NET 8 + WebView2` auto-contenu (gros chantier, lot ultérieur).

**Risque :** moyen. **Mitigation :** le `.csproj` reproduit exactement l'appel
`csc` ; comparaison binaire avant bascule.

**Effort :** 10–15 j. **Acceptation :** build MSBuild reproductible en CI,
0 warning, aucun fichier C# > 800 lignes, cas limites `winget` couverts par
Pester.

---

## Lot 4 — Tests de comportement (et non plus de texte)

**Pourquoi :** les ~45 `tests/Test-*.ps1` vérifient surtout la **présence de
chaînes** dans le source (ex. `Select-String`), pas le comportement.

**Étapes :**

1. **JS unitaires** : poursuivre la couverture Vitest au fil du lot 2.
2. **PowerShell** : réécrire les scripts d'opération
   (`Mettre-a-jour-mon-PC.ps1`, `Liberer-espace-disque.ps1`,
   `Nettoyer-residus-applications.ps1`, `Installer-selection.ps1`) en fonctions
   importables + suite **Pester** avec `winget` / système simulés.
3. **e2e** : conteneur/VM Windows jetable + WebView2, script qui lance
   `OwlSetup.exe`, pilote l'IPC et vérifie les parcours clés (install simulé,
   scan, nettoyage annulé). Cible : GitHub Actions `windows-latest` nocturne.
4. Garder les tests « garde-fou » utiles (catalogue, logos, CSP) mais les
   étiqueter `lint` et non `test`.

**Effort :** 8–12 j. **Acceptation :** couverture JS ≥ 70 %, Pester réel sur les
4 scripts, 1 parcours e2e vert en nocturne.

---

## Lot 5 — Distribution : signature, mises à jour auto, canal bêta

**Pourquoi :** SmartScreen à chaque lancement (non signé) et mise à jour
manuelle = friction que tous les concurrents ont réglée.

**Déjà fait (fiabilité des mises à jour d'applications) :**

- [x] _(4.0.0-beta.3)_ Lanceurs à mise à jour intégrée (Ankama…) : plus comptés
      comme un échec, badge « ⟳ se met à jour seule », message dédié.
- [x] _(4.0.0-beta.4)_ « Ne plus proposer » par application, liste d'ignorés
      persistante (`owlsetup-update-ignore-v1`) + barre « Réafficher » — comme
      l'option _ignore updates_ d'UniGetUI. `getIgnoredUpdateIds` reprend la
      logique de `sanitizePackageIds` (module `beta/`).
- [ ] Option secondaire : ignorer **une version précise** plutôt que le paquet
      entier (`winget pin add --version`).

**Étapes :**

1. **Signature Authenticode** : certificat OV (ou **Azure Trusted Signing**,
   moins cher, adapté à un projet libre). Signer `OwlSetup.exe` et
   `OwlSetup-Setup.exe` dans `release.yml`. Le Ko-fi finance déjà cet objectif
   (cf. `README`). _(En attente : le logiciel n'est pas encore public.)_
2. [x] _(4.0.0-beta.33)_ **Mise à jour in-app activée, sans signature.**
       `InstallAppUpdate` (déjà écrit) n'est plus bloqué : téléchargement de l'exe
       de la Release, **vérification SHA-256** contre l'asset `SHA256.txt`, préfixe
       d'URL `github.com/OwlNetGeekFR/OwlSetup` verrouillé, en-tête `MZ`,
       confirmation explicite via la modale, puis remplacement + redémarrage. Le
       comparateur `CompareAppVersions` (module `app-version`, miroir C#) gère les
       préversions `X.Y.Z-beta.N` — `System.Version` en était incapable.
       `tests/Test-SelfUpdate.ps1` garde les contrôles d'intégrité.
3. [x] _(4.0.0-beta.34)_ **Canal bêta in-app.** Case « Recevoir les
       préversions » dans Paramètres (`owlsetup-prerelease-v1`), drapeau transmis à
       `check-app-update` / `install-app-update`, surcharge
       `GetLatestRelease(bool includePrerelease)` qui liste `/releases` et retient
       le tag le plus récent via `CompareAppVersions`. `release.yml` accepte les
       tags `vX.Y.Z-(alpha|beta|rc).N` et les publie en _prerelease_ GitHub.
       **Pratique retenue :** on ne tague que les `rc.N` avant une stable, pas
       chaque bêta ; `build-beta.ps1` reste local.
4. **Delta / silencieux** : `OwlSetup-Setup.exe /VERYSILENT` documenté pour le
   déploiement en parc.

**Effort :** 5–8 j (hors délai d'obtention du certificat). **Acceptation :**
binaire signé (`Get-AuthenticodeSignature` = `Valid`), mise à jour in-app
fonctionnelle avec vérification d'empreinte, canal bêta commutable.

---

## Lot 6 — Interface : CSS, i18n, accessibilité

**Étapes :**

1. [~] _(4.0.0-beta.48)_ **CSS** : `styles.css` formaté puis découpé en
   **10 partiels** dans `beta/src/styles/`, réassemblés par
   `beta/scripts/build-css.mjs` (concaténation déterministe, appelée par
   `build.ps1`). Garde : `beta/test/styles-bundle.test.js`.
   **Pas de minification** : la feuille est chargée depuis l'hôte virtuel local
   par WebView2, jamais sur le réseau — minifier ne gagnerait rien et
   compliquerait le débogage (même raisonnement que `build-js.mjs`).
   **Reste** : purge des règles mortes.
2. [~] _(4.0.0-beta.44)_ **i18n** : 343 traductions ajoutées — `index.html` est
   à **100 %** (0 chaîne française à l'écran en anglais). Outil
   `beta/scripts/audit-i18n.mjs` + garde dans `tests/Test-EnglishTranslation.ps1`.
   **Reste** : les chaînes rendues par `app.js` et celles d'`OwlSetupWebView.cs`,
   puis préparer l'ajout de langues par la communauté.
3. [~] _(4.0.0-beta.46, beta.47)_ **Accessibilité** : piège de focus générique
   sur les 19 boîtes, Échap, retour du focus, `prefers-reduced-motion` global et
   anneau de focus visible (beta.46). **Contrastes AA** (beta.47) : les couleurs
   de texte passent par les tokens `--muted` et `--text-*`, garantis ≥ 4,5:1 sur
   les 4 combinaisons de thème ; 0 échec sur 3 947 éléments mesurés.
   Gardes : `tests/Test-Accessibility.ps1`, `beta/test/contrast.test.js`.
   **Reste** : test axe-core dans l e2e.
4. [x] _(4.0.0-beta.42)_ **Planification** : panneau « Entretien planifié » dans
       Paramètres — crée une **vraie tâche planifiée Windows** qui rappelle le mode
       CLI du lot 7 (`--check-updates` ou `--update --silent`), chaque semaine ou
       toutes les 4 semaines, jour et heure au choix. Tâche **non élevée**, sous le
       compte courant, sans mot de passe stocké. L état affiché vient toujours du
       planificateur Windows. Garde : `tests/Test-ScheduledMaintenance.ps1`.

**Effort :** 8–12 j. **Acceptation :** `styles.css` généré, 0 chaîne FR en dur
hors `i18n`, EN complet, audit a11y sans violation bloquante.

---

## Lot 7 — Mode CLI / sans interface

**Pourquoi :** techniciens, MDM, déploiement en parc — créneau tenu par Ninite
et Patch My PC.

**Amorcé (4.0.0-beta.18-19) :** `OwlSetup.exe` accepte `--install`,
`--uninstall`, `--apply <config.pcsetup.json>`, `--list [--json]`, `--search`,
`--version`, `--help`. Sans argument → interface. Codes de sortie 0/1/2/3,
identifiants validés, boucle WinGet silencieuse. Shim console `OwlSetup.com`
livré à côté de l'exe (`& OwlSetup` attend et renseigne `$LASTEXITCODE`).
Garde-fou `tests/Test-CliMode.ps1`.

**Reste à faire :**

1. [x] _(beta.20 / beta.41)_ `--apply` gère l'installation, la **mise à jour** des
       paquets déjà présents et le nettoyage ; `--silent` / `--dry-run` ; journal
       fichier dans `%LOCALAPPDATA%\PCSetup\Logs`.
2. [x] _(beta.41)_ `--export-profile <fichier>` (profil rejouable par `--apply`,
       même format que l'export de l'interface), `--check-updates [--json]` (code de
       sortie 1 s'il existe des mises à jour) et `--update [<id>,...]`.
3. Auto-élévation propre (relais de sortie vers l'appelant) pour les
   installations machine.
4. [x] _(beta.41)_ Documenté dans le `README` (section « Command line »). Page
       dédiée du site : à faire.

**Acceptation :** un profil s'applique de bout en bout sans interface, codes de
sortie documentés, réutilisé par la planification du lot 6.

---

## Séquencement et jalons

| Version      | Contenu                                                   | Pré-requis          |
| ------------ | --------------------------------------------------------- | ------------------- |
| **3.8**      | Lot 1 (catalogue ouvert) + clôture lot 0 en CI            | Lot 0               |
| **3.9**      | Lot 5 (signature + màj auto + canal bêta)                 | —                   |
| **4.0-beta** | Lot 2 (front modulaire) + Lot 3 (hôte C#) + Lot 4 (tests) | Lots 1, 5           |
| **4.0**      | Lot 6 (CSS/i18n/a11y/planification) + Lot 7 (CLI)         | 4.0-beta stabilisée |

Ordre de valeur/risque : **Lot 1** (fort impact, risque maîtrisé) →
**Lot 5** (friction utilisateur) → **Lot 4** en parallèle du **Lot 2** →
**Lot 3** → **Lots 6–7**.

## Indicateurs de réussite

- Contribution catalogue : < 10 min, 1 fichier, sans connaissance JS.
- Régressions : diviser par 2 le nombre de bêtas par version mineure.
- Démarrage sans avertissement SmartScreen.
- Couverture de tests JS ≥ 70 %, hôte C# : cas `winget` critiques couverts.
- Parité de comportement prouvée à chaque refactor (jamais de suppression
  d'ancien code sans test de parité vert).

---

## English summary

**Goal:** bring OwlSetup to parity with UniGetUI / WinUtil / Patch My PC without
losing its differentiators (preview-then-confirm, reversible quarantine, strict
CSP, no account/ads, per-operation UAC).

- **Batch 0 — Tooling foundations (DONE, in `beta/`):** ESLint + Prettier +
  Vitest, 5 pure modules extracted from `app.js` with 93 tests, a **parity test**
  that fails if a module diverges from the still-inline version, the 93-app
  catalog externalised to `catalog/apps.json` + JSON schema + drift check, an
  MSBuild `.csproj` mirroring `build.ps1`, and a ready-to-activate CI workflow.
  Run `cd beta && npm install && npm run check`.
- **Batch 1 — Open catalog:** ship the JSON catalog via the existing
  `window.PC_SETUP_CATALOG` hook; adding an app becomes a one-file PR.
- **Batch 2 — Modularise `app.js`** (4 048 lines → modules) behind an esbuild
  bundle that still emits a single deterministic `app.js` (required by the
  runtime SHA-256 integrity check).
- **Batch 3 — Harden the C# host:** adopt the `.csproj`, split the 3 852-line
  file, centralise `winget` argument building, fix edge cases (reject ids
  starting with `-`).
- **Batch 4 — Behaviour tests** (real Pester + JS units + a nightly Windows e2e)
  replacing today's source-text `Select-String` checks.
- **Batch 5 — Distribution:** Authenticode signing (Azure Trusted Signing),
  in-app updates with hash+signature verification, in-app beta channel.
- **Batch 6 — UI:** split/minify `styles.css`, full i18n (also from the C#),
  accessibility audit, Windows scheduled-task feature.
- **Batch 7 — CLI / headless mode** (`--apply profile.json --silent`) reusing the
  same operation layer, feeding Batch 6 scheduling.

Milestones: 3.8 = Batch 1 · 3.9 = Batch 5 · 4.0-beta = Batches 2+3+4 ·
4.0 = Batches 6+7.
