# `src/app/` — assemblage de l'interface (lot 2)

`../../app.js` (racine du dépôt) n'est plus édité à la main : il est **généré**
par `../scripts/build-js.mjs`, qui concatène dans une IIFE :

1. les modules purs de `../modules/` listés dans `MODULES` (vide pour l'instant) ;
2. `legacy.js` — le corps historique de l'interface, déplacé **tel quel** depuis
   l'ancien `app.js`.

## Pourquoi une concaténation et pas un bundler

- La sortie reste lisible et le diff minimal (juste l'enveloppe IIFE).
- `legacy.js` apparaît **verbatim** dans `app.js` : les ~34 contrôles de présence
  PowerShell (`tests/Test-*.ps1`) et les 53 tests de parité
  (`test/parity.test.js`, qui extraient `function X` / `const Y` de `app.js`)
  continuent de fonctionner sans réécriture pendant la migration.
- Déterministe (contrainte : l'hôte C# vérifie le SHA-256 de `app.js` au
  démarrage). `build.ps1` régénère `app.js` quand Node est présent ; sinon le
  fichier versionné sert de repli.
- Pas de `"use strict"` ajouté : `legacy.js` est un script « sloppy », l'IIFE ne
  fait que fermer le scope.

## Migrer un domaine (étapes suivantes du lot 2)

1. Choisir une fonction / un groupe de `legacy.js` déjà dupliqué dans un module
   pur de `../modules/` (ex. `escape-html`, `package-id`, `winget-table`,
   `windows-update`, `update-heuristics`, `operations-reconcile`).
2. Ajouter le module à `MODULES` dans `build-js.mjs`.
3. **Retirer** le code équivalent de `legacy.js` (sinon double déclaration).
4. `npm run build:js` puis `npm run check` + `tests/Test-ReleaseCandidateReadiness.ps1`.
5. Vérifier l'interface dans l'application Windows.

Quand `legacy.js` a suffisamment fondu, on pourra basculer sur un vrai bundler
(esbuild/rollup) et retirer `app.js` du contrôle de version.
