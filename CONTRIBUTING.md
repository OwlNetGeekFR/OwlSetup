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

Contrôles recommandés :

```powershell
node --check app.js
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
