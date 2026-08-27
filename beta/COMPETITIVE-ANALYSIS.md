# Analyse concurrentielle — OwlSetup

_État : v3.7.0 stable (analyse du 2026-08-27, branche `beta/4.0-foundations`)._

## 1. Positionnement

OwlSetup vise un créneau réel et peu occupé : **un centre de maintenance Windows
grand public, en français, sans compte ni publicité**, qui réunit installation,
mise à jour, désinstallation, nettoyage et diagnostics dans une seule interface
avec confirmation explicite des actions sensibles.

Les concurrents se répartissent en trois familles :

| Famille                          | Exemples                                        | Force principale                                                  | Faiblesse exploitable                                                        |
| -------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Gestionnaires WinGet à interface | **UniGetUI** (ex-WingetUI), winget-gui          | Large couverture (WinGet + Scoop + Chocolatey + npm…), moteur mûr | Interface dense, orientée utilisateur avancé, pas de volet « entretien »     |
| Scripts d'optimisation           | **Chris Titus Tech WinUtil**, **Winhance**, WPD | Viraux, tweaks système, debloat agressif                          | Confiance variable, PowerShell brut, peu de garde-fous, réversibilité faible |
| Déploiement d'applications       | **Ninite**, **Patch My PC Home Updater**, Scoop | Simplicité extrême, fiabilité                                     | Catalogue figé, closed-source (Ninite), pas de nettoyage/diagnostic          |

OwlSetup est le seul à **combiner** installation + entretien + diagnostics avec
un modèle « prévisualiser puis confirmer » et une quarantaine réversible. C'est
la différrenciation à protéger.

## 2. Comparaison fonctionnelle

| Capacité                                              | OwlSetup 3.7                  | UniGetUI                        | WinUtil               | Winhance   | Ninite                 | Patch My PC |
| ----------------------------------------------------- | ----------------------------- | ------------------------------- | --------------------- | ---------- | ---------------------- | ----------- |
| Installation par lot                                  | ✅ WinGet + MS Store          | ✅ multi-gestionnaires          | ✅ WinGet             | ✅ WinGet  | ✅ propre CDN          | ✅          |
| Détection des installés                               | ✅                            | ✅                              | ⚠️ partiel            | ⚠️         | ❌                     | ✅          |
| Mises à jour                                          | ✅ + Windows Update + pilotes | ✅ (arrière-plan, planifié)     | ⚠️                    | ⚠️         | ✅ (payant pour auto)  | ✅          |
| Désinstallation + résidus                             | ✅ quarantaine réversible     | ✅ (sans quarantaine)           | ⚠️ debloat            | ✅ debloat | ❌                     | ❌          |
| Nettoyage disque                                      | ✅ avec confirmation          | ❌                              | ✅                    | ⚠️         | ❌                     | ❌          |
| Diagnostics (WinGet, restauration, démarrage, disque) | ✅                            | ⚠️ logs                         | ✅ tweaks             | ⚠️         | ❌                     | ❌          |
| Points de restauration                                | ✅ optionnel avant action     | ❌                              | ✅                    | ✅         | ❌                     | ❌          |
| Sans compte / sans pub                                | ✅                            | ✅                              | ✅                    | ✅         | ✅ (gratuit perso)     | ⚠️          |
| i18n                                                  | ⚠️ FR + EN partiel            | ✅ ~40 langues                  | ⚠️                    | ⚠️         | ✅                     | ✅          |
| Catalogue contribuable                                | ❌ figé dans `app.js`         | ✅ tout WinGet + paquets custom | ✅ JSON communautaire | ⚠️         | ❌                     | ❌          |
| Binaire signé                                         | ❌ (SmartScreen)              | ✅                              | ✅                    | ⚠️         | ✅                     | ✅          |
| Mises à jour auto de l'app                            | ⚠️ vérif. manuelle            | ✅                              | ✅ (relance script)   | ⚠️         | s.o.                   | ✅          |
| Planification                                         | ❌                            | ✅ tâches planifiées            | ❌                    | ❌         | ❌                     | ✅          |
| CLI / sans interface                                  | ❌                            | ✅                              | ✅ (paramètres)       | ⚠️         | ✅ (ligne de commande) | ✅          |

Légende : ✅ solide · ⚠️ partiel/perfectible · ❌ absent.

## 3. Écarts qui empêchent de « rivaliser avec les meilleurs »

### 3.1 Produit

1. **Catalogue figé** (~93 apps codées dans `app.js`). UniGetUI expose tout
   WinGet ; WinUtil a un catalogue JSON que la communauté enrichit par PR.
   OwlSetup a déjà `SearchWinget` mais l'ajout reste bridé. → _Externaliser le
   catalogue (fait dans ce lot) puis autoriser l'installation d'un résultat de
   recherche vérifié._
2. **Pas de mises à jour automatiques de l'application** ni de canal bêta
   in-app. → _Flux de mise à jour signé + case « canal bêta »._
3. **Pas de planification** (mises à jour hebdomadaires, nettoyage mensuel).
   C'est l'argument n°1 de Patch My PC et d'UniGetUI. → _Tâche planifiée
   Windows pilotée depuis Paramètres._
4. **i18n incomplet** : interface pensée FR, EN partiel, chaînes en dur dans
   `app.js` et `OwlSetupWebView.cs`. → _Externaliser 100 % des chaînes,
   compléter EN, préparer l'ajout de langues._
5. **Pas de mode CLI / silencieux** pour les techniciens et le déploiement en
   parc. → _`OwlSetup.exe --apply profil.json --silent`._
6. **Accessibilité** non vérifiée (navigation clavier, lecteurs d'écran,
   contrastes). Les concurrents non plus, mais c'est un différenciateur peu
   coûteux.

### 3.2 Ingénierie (cause racine du reste)

| Sujet           | État OwlSetup                                                                                                    | Standard attendu                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Front-end       | `app.js` 4 048 lignes, ~250 fonctions globales, 0 module, 0 test JS                                              | Modules + tests unitaires + couverture                                  |
| Hôte C#         | `OwlSetupWebView.cs` 3 852 lignes dans **un seul fichier**, compilé par `csc.exe` en ligne de commande           | Projet MSBuild, découpé par responsabilité, analyseurs Roslyn           |
| Tests           | ~45 scripts PowerShell de contrôle **textuel** du source (regex)                                                 | Tests de comportement (Pester réel, unités JS, e2e sur VM)              |
| Lint / format   | Aucun (`node --check` seulement)                                                                                 | ESLint + Prettier + `dotnet format` en CI                               |
| CI              | Build + `Test-ReleaseCandidateReadiness` sur tag/PR                                                              | + lint + tests + audit de dépendances + build reproductible à chaque PR |
| Signature       | Non signé                                                                                                        | Authenticode (certificat OV/EV ou Azure Trusted Signing)                |
| Télémétrie      | Endpoint en dur, opt-in minimal (correct)                                                                        | OK — garder ce niveau, documenter le schéma                             |
| Sécurité entrée | Bonnes listes blanches regex `^[A-Za-z0-9.+_-]+$`, `-EncodedCommand`, CSP stricte, `AreHostObjectsAllowed=false` | Déjà bon ; durcir les cas limites (id en `--`, chemins)                 |

Le point 3.2 est prioritaire : sans base testable, chaque nouvelle
fonctionnalité produit augmente le risque de régression, ce qui explique les
**57 bêtas** pour la 3.7.

## 4. Atouts à conserver absolument

- Modèle **« prévisualiser → confirmer »** sur les actions destructives.
- **Quarantaine réversible** plutôt que suppression définitive.
- **CSP stricte** + `SetVirtualHostNameToFolderMapping` + DevTools désactivés +
  vérification d'intégrité SHA-256 des ressources embarquées au démarrage.
- **Aucun compte, aucune pub, télémétrie opt-in minimale.**
- Validation des identifiants **des deux côtés** (UI et hôte).
- Élévation UAC **par opération**, pas au lancement.

## 5. Verdict

Le concept est compétitif et différencié. Ce qui manque pour « rivaliser avec
les meilleurs » est **d'abord de l'ingénierie** (modularité, tests, CI, signature)
et **ensuite quatre fonctionnalités** : catalogue ouvert, mises à jour
automatiques de l'app, planification, i18n complet. Le plan
(`PLAN-AMELIORATION.md`) séquence tout cela.
