# Catalogue OwlSetup — source de vérité

Depuis **4.0.0-beta.11**, `apps.json` **est** le catalogue. Éditez-le
directement ; `app.js` ne contient plus aucune donnée d'application. Depuis
**4.0.0-beta.32**, chaque entrée porte aussi son `logo` — plus de table
`appLogos` à maintenir en parallèle dans le code.

| Fichier                      | Rôle                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `apps.json`                  | **Source de vérité.** Une entrée par application. L'ordre = l'affichage.                                                               |
| `catalog.schema.json`        | Schéma JSON (draft-07) d'une entrée. Validé par les tests et l'éditeur.                                                                |
| `../../catalog.generated.js` | Script `window.PC_SETUP_CATALOG = [...]` **généré** depuis `apps.json`, chargé avant `app.js`, embarqué et vérifié SHA-256 par l'hôte. |

## Ajouter une application

1. Ajouter l'objet dans `apps.json` en respectant `catalog.schema.json` :
   - `id` : identifiant WinGet (ou MS Store avec `"source": "msstore"`) ;
   - `category` : une valeur de la **liste fermée** du schéma ;
   - `site` en `https://` ;
   - `logo` : `"assets/logos/<fichier>.svg"` (ou `.png` / `.ico`).
2. Déposer le fichier logo dans `../../assets/logos/` (SVG de préférence).
3. `npm run catalog:build` puis `npm run check` (dans `beta/`).

`catalog:build` **refuse** : un `id` en double, une `category` hors liste, un
champ `logo` mal formé ou un fichier logo absent du dépôt, un `count`
incohérent.

## Commandes

```bash
npm run catalog:build     # apps.json -> ../../catalog.generated.js (+ contrôles)
npm run catalog:verify    # build --check + schéma + parité apps.json <-> généré
```

`build.ps1` régénère `catalog.generated.js` à chaque build ; ne pas l'éditer.

## Historique

- **beta.2** : `apps.json` extrait de `app.js`, `catalog.generated.js` branché
  au runtime via `window.PC_SETUP_CATALOG` (avec `const apps` inline en repli).
- **beta.11** : inversion terminée. `const apps` retiré de `app.js` ;
  `apps.json` devient canonique ; les tests de parité lisent le catalogue
  généré.
- **beta.32** : le champ `logo` reste dans le catalogue généré (fin de la table
  `appLogos` dans `app.js`) ; `build-catalog.mjs` valide id uniques, catégorie,
  présence des fichiers logo.
