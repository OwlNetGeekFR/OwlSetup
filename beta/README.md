# OwlSetup — dossier `beta/` (fondations 4.0)

Couche d'**outillage qualité** posée au-dessus du code stable. Elle
**n'altère pas** l'application à la racine du dépôt : `build.ps1` continue de
fonctionner à l'identique.

## Contenu

| Chemin                                 | Rôle                                                               |
| -------------------------------------- | ------------------------------------------------------------------ |
| `PLAN-AMELIORATION.md`                 | Plan d'amélioration complet vers la 4.0 (lots 0 → 7).              |
| `COMPETITIVE-ANALYSIS.md`              | Comparaison avec UniGetUI, WinUtil, Winhance, Ninite, Patch My PC. |
| `package.json`                         | Scripts qualité (`lint`, `format`, `test`, `catalog:*`, `check`).  |
| `eslint.config.js`, `.prettierrc.json` | Lint + format JavaScript.                                          |
| `vitest.config.js`, `test/`            | Tests unitaires + **test de parité** avec `../app.js`.             |
| `src/modules/`                         | Fonctions pures extraites de `../app.js`, testées à 100 %.         |
| `catalog/`                             | Catalogue des 93 applications externalisé en JSON + schéma.        |
| `scripts/`                             | Extraction / génération / vérification du catalogue.               |
| `csharp/OwlSetup.csproj`               | Projet MSBuild équivalent à l'appel `csc` de `build.ps1`.          |
| `ci/quality.yml`                       | Workflow CI qualité, **prêt mais non activé**.                     |

## Démarrage

```bash
cd beta
npm install
npm run check      # lint + format + 93 tests + catalogue synchronisé
```

Scripts utiles :

```bash
npm run test:watch        # tests en continu
npm run catalog:extract   # régénère catalog/apps.json depuis ../app.js
npm run lint:root         # node --check ../app.js ../i18n.js
npm run format            # applique Prettier sur beta/
```

## Ce qui a été fait (lot 0)

- Outillage lint/format/test opérationnel, **93 tests verts**.
- 5 modules purs extraits de `app.js` : `escape-html`, `package-id`,
  `winget-brand`, `redaction` (anonymisation des journaux), `theme`.
- **Test de parité** : chaque module doit produire exactement le même résultat
  que la version encore présente dans `app.js`. Il échoue à la moindre
  divergence — c'est le garde-fou pendant la modularisation (lot 2).
- Catalogue des 93 apps sorti de `app.js` vers `catalog/apps.json`, validé par
  un schéma JSON et un contrôle de dérive (`npm run catalog:verify`).
- `csharp/OwlSetup.csproj` : traduction fidèle de `build.ps1` pour obtenir
  IntelliSense, analyseurs Roslyn et restauration NuGet.

## Ce que le lot 0 ne fait pas

- Il **ne modifie aucun fichier** de la racine (`app.js`, `OwlSetupWebView.cs`,
  `build.ps1`, `index.html`, `styles.css` sont intacts).
- Les modules de `src/modules/` ne sont **pas encore** importés par `app.js` :
  ils en sont la copie testée. Le branchement se fait au lot 2 via un bundler
  (esbuild) qui reproduira **un seul** `app.js` déterministe — contrainte
  imposée par la vérification d'intégrité SHA-256 de l'hôte.

## Suite

Voir `PLAN-AMELIORATION.md`. Prochain lot recommandé : **lot 1 — catalogue
ouvert** (fort impact produit, risque maîtrisé).
