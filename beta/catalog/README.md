# Catalogue OwlSetup — source de vérité

Depuis **4.0.0-beta.11**, `apps.json` **est** le catalogue. Éditez-le
directement ; `app.js` ne contient plus aucune donnée d'application.

| Fichier                      | Rôle                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps.json`                  | **Source de vérité.** Une entrée par application. L'ordre = l'affichage.                                                               |
| `catalog.schema.json`        | Schéma JSON (draft-07) d'une entrée. Validé par les tests et l'éditeur.                                                                |
| `../../catalog.generated.js` | Script `window.PC_SETUP_CATALOG = [...]` **généré** depuis `apps.json`, chargé avant `app.js`, embarqué et vérifié SHA-256 par l'hôte. |

## Ajouter une application

1. Ajouter l'objet dans `apps.json` (respecter `catalog.schema.json`).
2. Logo : fichier dans `assets/logos/` + entrée dans `appLogos` (`app.js`).
3. `npm run catalog:build` puis `npm run check` (dans `beta/`).

## Commandes

```bash
npm run catalog:build     # apps.json -> ../../catalog.generated.js
npm run catalog:verify    # build:check + schéma + parité apps.json <-> généré
```

`build.ps1` régénère `catalog.generated.js` à chaque build ; ne pas l'éditer.

## Historique

- **beta.2** : `apps.json` extrait de `app.js`, `catalog.generated.js` branché
  au runtime via `window.PC_SETUP_CATALOG` (avec `const apps` inline en repli).
- **beta.11** : inversion terminée. `const apps` retiré de `app.js` ;
  `apps.json` devient canonique ; `tools/check-catalog.mjs` et le test de parité
  lisent le catalogue généré. Migration : `scripts/extract-catalog.mjs`
  (ne fait plus rien en fonctionnement normal).
