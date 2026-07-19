# Historique des versions

Les changements importants de OwlSetup sont regroupés dans ce fichier. Le projet suit une numérotation de version de type `MAJEUR.MINEUR.CORRECTIF`.

## [3.5.1] — 2026-07-19

### Corrigé

- Désinstallation WinGet plus fiable selon le contexte utilisateur ou machine.
- Vérification de la présence réelle du logiciel après une désinstallation.
- Interprétation correcte des codes Windows demandant un redémarrage.
- Sélection des applications installées corrigée dans le catalogue.

### Ajouté

- Outil sécurisé d’audit des identifiants WinGet du catalogue.
- Rapports d’audit dans `%LOCALAPPDATA%\OwlSetup\CatalogTests`.

## [3.5.0] — 2026-07-19

### Ajouté

- Prise en main animée au premier lancement.
- Page dédiée aux applications installées avec recherche et tri.
- Réparation, désinstallation et sélection multiple.
- Repères de risque colorés pour le nettoyage.

## Versions précédentes

Les anciennes versions `3.0.0` à `3.4.1`, publiées initialement sous les noms PC Setup puis OwlSetup, restent disponibles dans les [Releases GitHub](https://github.com/OwlNetGeekFR/OwlSetup/releases).

[3.5.1]: https://github.com/OwlNetGeekFR/OwlSetup/releases/tag/v3.5.1
[3.5.0]: https://github.com/OwlNetGeekFR/OwlSetup/releases/tag/v3.5.0
