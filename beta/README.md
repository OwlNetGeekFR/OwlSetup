# OwlSetup — dossier `beta/` (fondations 4.0)

Couche d'**outillage qualité** posée au-dessus du code stable. Elle
**n'altère pas** l'application à la racine du dépôt : `build.ps1` continue de
fonctionner à l'identique.

## Contenu

| Chemin                                 | Rôle                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `PLAN-AMELIORATION.md`                 | Plan d'amélioration complet vers la 4.0 (lots 0 → 7).                            |
| `COMPETITIVE-ANALYSIS.md`              | Comparaison avec UniGetUI, WinUtil, Winhance, Ninite, Patch My PC.               |
| `package.json`                         | Scripts qualité (`lint`, `format`, `test`, `catalog:*`, `check`).                |
| `eslint.config.js`, `.prettierrc.json` | Lint + format JavaScript.                                                        |
| `vitest.config.js`, `test/`            | Tests unitaires + **test de parité** avec `../app.js`.                           |
| `src/modules/`                         | 7 fonctions pures extraites de `../app.js` (dont réconciliation des opérations). |
| `catalog/`                             | Catalogue des 93 applications externalisé en JSON + schéma.                      |
| `scripts/`                             | Extraction / génération / vérification du catalogue.                             |
| `csharp/OwlSetup.csproj`               | Projet MSBuild équivalent à l'appel `csc` de `build.ps1`.                        |
| `ci/quality.yml`                       | Copie de référence ; le workflow actif est `.github/workflows/quality.yml`.      |

## Démarrage

```bash
cd beta
npm install
npm run check      # lint + format + 137 tests + catalogue synchronisé
```

Scripts utiles :

```bash
npm run test:watch        # tests en continu
npm run catalog:extract   # régénère catalog/apps.json depuis ../app.js
npm run lint:root         # node --check ../app.js ../i18n.js
npm run format            # applique Prettier sur beta/
```

## Ce qui a été fait

### Lot 0 — fondations

- Outillage lint/format/test opérationnel, **137 tests verts**.
- 8 modules purs extraits de `app.js` / `OwlSetupWebView.cs` : `escape-html`,
  `package-id`, `winget-brand`, `redaction` (anonymisation des journaux),
  `theme`, `update-heuristics` (lanceurs auto-gérés), `operations-reconcile`
  (faux échecs du Centre des opérations), `winget-table` (analyse de la sortie
  tabulaire de `winget`, portée en C#).
- **Test de parité** : chaque module doit produire exactement le même résultat
  que la version encore présente dans `app.js`. Il échoue à la moindre
  divergence — c'est le garde-fou pendant la modularisation (lot 2).
- Listes critiques (lanceurs auto-gérés) vérifiées **triple parité** :
  module ≡ `OwlSetupWebView.cs` ≡ `app.js`.
- `csharp/OwlSetup.csproj` : traduction fidèle de `build.ps1` pour obtenir
  IntelliSense, analyseurs Roslyn et restauration NuGet.
- Workflow CI qualité **activé** (`.github/workflows/quality.yml`).

### Consolidation (4.0.0-beta.10)

- Deux garde-fous côté racine : `tests/Test-MaintenanceHardening.ps1` et
  `tests/Test-SecurityHardening.ps1` — vérifient que les correctifs des
  bêtas 2 → 9 sont toujours présents (exécutés par
  `Test-ReleaseCandidateReadiness.ps1`, donc en CI).

### Lot 1 (amorcé, 4.0.0-beta.2) — catalogue externalisé et branché

- Les 93 applications sortent de `app.js` vers `catalog/apps.json` (schéma JSON).
- `build.ps1` génère `catalog.generated.js`, `index.html` le charge avant
  `app.js`, l'hôte C# l'extrait et **vérifie son intégrité SHA-256**.
- Le bloc `const apps` **reste** dans `app.js` comme repli : bascule sans risque.
- Vérifié : la bêta 4.0.0-beta.2 démarre, la vérification d'intégrité passe, la
  suite `Test-ReleaseCandidateReadiness.ps1` reste verte.

### Durcissement (4.0.0-beta.2)

- Identifiants de paquet : premier caractère forcément alphanumérique
  (`^[A-Za-z0-9][A-Za-z0-9.+_-]*$`) des deux côtés interface / hôte.

## Ce qui n'est pas encore fait

- Les modules de `src/modules/` ne sont **pas encore** importés par `app.js` :
  ils en sont la copie testée. Le branchement se fait au lot 2 via un bundler
  (esbuild) qui reproduira **un seul** `app.js` déterministe — contrainte
  imposée par la vérification d'intégrité SHA-256 de l'hôte.
- `apps.json` n'est pas encore la source de vérité (c'est encore `app.js`).
- `beta/csharp/OwlSetup.csproj` n'a pas encore été validé par un build MSBuild
  réel comparé à `build.ps1`.

## Suite

Voir `PLAN-AMELIORATION.md`. Prochain lot recommandé : **lot 1 — catalogue
ouvert** (fort impact produit, risque maîtrisé).
