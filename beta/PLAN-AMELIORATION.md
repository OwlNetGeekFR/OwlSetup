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

| Livrable                                                                  | Fichier                                             |
| ------------------------------------------------------------------------- | --------------------------------------------------- |
| `package.json` + scripts (`lint`, `format`, `test`, `catalog:*`, `check`) | `beta/package.json`                                 |
| ESLint 9 (flat config)                                                    | `beta/eslint.config.js`                             |
| Prettier                                                                  | `beta/.prettierrc.json`                             |
| Vitest + seuils de couverture                                             | `beta/vitest.config.js`                             |
| Type-check éditeur (JSDoc + `checkJs`)                                    | `beta/jsconfig.json`                                |
| 5 modules purs extraits + testés (93 tests)                               | `beta/src/modules/*.js`, `beta/test/*`              |
| Test de **parité** avec `app.js` (le module doit égaler l'inline)         | `beta/test/parity.test.js`                          |
| Catalogue externalisé en JSON + schéma + vérif. de dérive                 | `beta/catalog/`, `beta/scripts/extract-catalog.mjs` |
| Projet MSBuild pour l'hôte C# (traduction fidèle de `build.ps1`)          | `beta/csharp/OwlSetup.csproj`                       |
| Workflow CI qualité (prêt, non activé)                                    | `beta/ci/quality.yml`                               |

**Modules extraits (purs, 0 effet de bord) :** `escape-html`, `package-id`,
`winget-brand`, `redaction` (anonymisation des journaux — sensible vie privée),
`theme`.

**Critères d'acceptation :** `npm run check` vert (lint + format + 93 tests +
catalogue synchronisé). ✅ atteint.

**Reste à faire pour clôturer le lot (côté mainteneur) :**

- [ ] Valider `beta/csharp/OwlSetup.csproj` par un premier `msbuild` / `dotnet build`
      et comparer l'octet-à-octet du binaire à celui de `build.ps1`.
- [ ] Copier `beta/ci/quality.yml` → `.github/workflows/quality.yml`.
- [ ] Décider de la position finale du dossier : `beta/` reste, ou son contenu
      remonte à la racine (recommandé une fois adopté).

---

## Lot 1 — Catalogue ouvert et contribuable

**Pourquoi :** c'est l'écart produit n°1 face à UniGetUI / WinUtil. Un catalogue
figé dans `app.js` interdit toute contribution simple.

**Étapes :**

1. `build.ps1` : ajouter la génération `apps.json → catalog.generated.js`
   (`npm run catalog:build`) et l'embarquer **avant** `app.js`
   (`/resource:catalog.generated.js`).
2. `index.html` : `<script src="catalog.generated.js"></script>` avant `app.js`.
   Le point d'entrée `window.PC_SETUP_CATALOG` **existe déjà** dans `app.js`
   (`apps.splice(0, apps.length, ...window.PC_SETUP_CATALOG)`).
3. Supprimer le bloc `const apps` / `apps.push` de `app.js` une fois le test de
   parité catalogue vert avec la source inversée.
4. Étendre le schéma (`beta/catalog/catalog.schema.json`) : champ `addedIn`,
   `verifiedAt`, `officialSignature` (éditeur attendu, cf. `InstallSignedPublisherFallback`).
5. CI : `catalog-health.yml` valide `apps.json` contre le schéma + `winget show`
   (déjà partiellement fait par `tools/check-catalog.mjs` et
   `tools/Test-OwlSetupCatalog.ps1`).
6. `CONTRIBUTING.md` : « pour ajouter une application, éditez `catalog/apps.json` ».
7. **Interface** : autoriser l'installation d'un résultat `SearchWinget` **après
   confirmation explicite** (aujourd'hui bridé depuis la bêta 54), avec marquage
   « hors catalogue vérifié ».

**Risque :** moyen (chemin de build + chargement). **Mitigation :** la parité
catalogue échoue au moindre écart ; `VerifyInterfaceIntegrity` protège le
runtime.

**Effort :** 3–5 j. **Acceptation :** ajouter une app = 1 PR ne touchant que
`apps.json` ; `app.js` ne contient plus de données catalogue ; `catalog:verify`
en CI.

---

## Lot 2 — Découpage du front-end `app.js` en modules + bundler

**Pourquoi :** 4 048 lignes / ~250 fonctions globales / 0 test = coût de
régression élevé (57 bêtas pour la 3.7).

**Étapes :**

1. Ajouter **esbuild** dans `beta/` : `scripts/build-js.mjs` →
   `esbuild src/app/main.js --bundle --format=iife --target=es2019 --outfile=../app.js`.
   Sortie **déterministe**, un seul fichier, compatible CSP `script-src 'self'`
   et compatible `node --check`.
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
   - refuser un identifiant commençant par `-` (`^[A-Za-z0-9.+_-]+$` accepte
     aujourd'hui `--source` ; cf. `beta/test/package-id.test.js`), des deux côtés ;
   - valider systématiquement les chemins reçus (déjà fait pour la plupart via
     jeton `^[a-f0-9]{32}$` — généraliser) ;
   - journaliser toute opération élevée dans l'historique local.
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

**Étapes :**

1. **Signature Authenticode** : certificat OV (ou **Azure Trusted Signing**,
   moins cher, adapté à un projet libre). Signer `OwlSetup.exe` et
   `OwlSetup-Setup.exe` dans `release.yml`. Le Ko-fi finance déjà cet objectif
   (cf. `README`).
2. **Mises à jour in-app** : `check-app-update` existe déjà ; ajouter le
   téléchargement + vérification SHA-256 (présent dans les releases) + signature,
   puis lancement de l'installateur. Jamais d'auto-exécution sans confirmation.
3. **Canal bêta in-app** : case « Recevoir les préversions » dans Paramètres →
   la vérification lit les _prereleases_ GitHub. `build-beta.ps1` existe déjà.
4. **Delta / silencieux** : `OwlSetup-Setup.exe /VERYSILENT` documenté pour le
   déploiement en parc.

**Effort :** 5–8 j (hors délai d'obtention du certificat). **Acceptation :**
binaire signé (`Get-AuthenticodeSignature` = `Valid`), mise à jour in-app
fonctionnelle avec vérification d'empreinte, canal bêta commutable.

---

## Lot 6 — Interface : CSS, i18n, accessibilité

**Étapes :**

1. **CSS** : `styles.css` (208 Ko, lignes très denses) → découpe en partiels +
   `build:css` (esbuild/lightningcss) → un seul `styles.css` minifié
   déterministe. Purge des règles mortes.
2. **i18n complet** : extraire 100 % des chaînes de `app.js` **et**
   `OwlSetupWebView.cs` vers `i18n.js` (ou fichiers `locales/*.json`). Compléter
   l'anglais (`tests/Test-EnglishTranslation.ps1` signale déjà des trous).
   Préparer l'ajout de langues par la communauté (fichier + PR).
3. **Accessibilité** : audit clavier (pièges de focus dans les `dialog`),
   rôles ARIA, contrastes AA dans les 3 thèmes, `prefers-reduced-motion`.
   Ajouter un test axe-core dans l'e2e.
4. **Planification** (fonctionnalité produit) : depuis Paramètres, créer une
   tâche planifiée Windows « mises à jour hebdo » / « nettoyage mensuel »
   pilotée par le mode CLI du lot 7.

**Effort :** 8–12 j. **Acceptation :** `styles.css` généré, 0 chaîne FR en dur
hors `i18n`, EN complet, audit a11y sans violation bloquante.

---

## Lot 7 — Mode CLI / sans interface

**Pourquoi :** techniciens, MDM, déploiement en parc — créneau tenu par Ninite
et Patch My PC.

**Étapes :**

1. `OwlSetup.exe --apply profil.json --silent` : lit un profil (mêmes profils
   que l'UI), applique installation/màj/nettoyage sans WebView, journalise,
   renvoie un code de sortie normalisé.
2. `--export-profile`, `--list-catalog`, `--check-updates` (sortie JSON).
3. Réutilise **exactement** la couche IPC/opérations du lot 3 (aucune logique
   dupliquée).
4. Documenté dans `README` + page dédiée du site.

**Effort :** 6–10 j. **Acceptation :** un profil s'applique de bout en bout sans
interface, codes de sortie documentés, réutilisé par la planification du lot 6.

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
