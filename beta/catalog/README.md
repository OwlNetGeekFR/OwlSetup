# Catalogue externalisé

`apps.json` est la version **données** du catalogue d'applications aujourd'hui
codé en dur dans `../../app.js` (`const apps`, `apps.push(...)`, table
`appLogos`).

| Fichier                | Rôle                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `apps.json`            | Catalogue généré depuis `app.js`. Source de vérité temporaire = `app.js`.                 |
| `catalog.schema.json`  | Schéma JSON (draft-07) d'une entrée. Utilisé par les tests et exploitable dans l'éditeur. |
| `catalog.generated.js` | Script `window.PC_SETUP_CATALOG = [...]` produit depuis `apps.json` (non versionné).      |

## Commandes

```bash
npm run catalog:extract   # app.js        -> apps.json
npm run catalog:build     # apps.json     -> catalog.generated.js
npm run catalog:verify    # échoue si apps.json a dérivé de app.js
```

## Cible (voir `../PLAN-AMELIORATION.md`, lot 1)

1. `build.ps1` génère `catalog.generated.js` et l'embarque avant `app.js`.
2. `index.html` charge `catalog.generated.js` puis `app.js` ; le point d'entrée
   `window.PC_SETUP_CATALOG` existe déjà dans `app.js`.
3. Le bloc `const apps` / `apps.push` disparaît de `app.js`.
4. `apps.json` devient la source de vérité ; `catalog:verify` inverse alors sa
   comparaison (JSON → interface plutôt que interface → JSON).

À ce stade, ajouter une application = éditer `apps.json` (validé par le schéma
et la CI), sans toucher au JavaScript.
