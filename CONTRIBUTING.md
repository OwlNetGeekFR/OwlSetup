# Contribuer à OwlSetup

Merci de vouloir améliorer OwlSetup. Les contributions simples, ciblées et vérifiables sont les plus faciles à examiner.

## Avant de commencer

1. Recherchez une Issue existante décrivant le même problème ou la même idée.
2. Pour une modification importante, ouvrez d’abord une proposition afin de valider le besoin.
3. Ne publiez jamais de secret, jeton, donnée personnelle ou journal contenant des informations sensibles.

## Développement

1. Créez une branche depuis `main`.
2. Limitez chaque branche à un sujet cohérent.
3. Conservez l’interface et les messages en français.
4. Utilisez uniquement des sources officielles et des identifiants WinGet vérifiables.
5. Ne placez aucun exécutable compilé dans le dépôt.

### Ajouter ou modifier une application du catalogue

Le catalogue est un fichier de données : **`beta/catalog/apps.json`**. Il n’y a
plus rien à modifier dans `app.js` pour cela.

1. Ajoutez ou modifiez l’entrée dans `beta/catalog/apps.json` (schéma :
   `beta/catalog/catalog.schema.json` — `site` en `https://`, identifiant
   commençant par un caractère alphanumérique, `category` dans la liste fermée
   du schéma, etc.).
2. Déposez le logo dans `assets/logos/` (SVG de préférence, sinon PNG/ICO) et
   renseignez le champ `logo` de l’entrée : `"logo": "assets/logos/<fichier>"`.
   C’est la seule source de vérité — il n’y a plus de table `appLogos`.
3. Vérifiez, dans `beta/` : `npm run catalog:build && npm run check`.
   `catalog:build` refuse un identifiant en double, une catégorie inconnue ou
   un fichier logo absent.

`catalog.generated.js` est régénéré automatiquement par `build.ps1` ; ne l’éditez
pas à la main.

Contrôles recommandés :

```powershell
node --check app.js
node tools/check-catalog.mjs
./build.ps1 -AppVersion 0.0.0 -Channel stable
./tools/Test-OwlSetupCatalog.ps1
```

Le dernier script réalise uniquement un audit du catalogue par défaut.

## Demande de fusion

Décrivez clairement :

- le problème résolu ;
- le comportement avant et après la modification ;
- les contrôles effectués ;
- les impacts éventuels sur Windows, WinGet ou les données utilisateur.

Les contributions doivent respecter le [Code de conduite](CODE_OF_CONDUCT.md) et la [licence MIT](LICENSE).
