# Validation d'une version bêta

Cette liste doit être vérifiée avant de créer un tag et une Release GitHub.

## Applications d’intelligence artificielle

- [ ] La catégorie « Intelligence artificielle » apparaît dans le catalogue.
- [ ] ChatGPT utilise la source Microsoft Store et s’installe correctement.
- [ ] Claude s’installe, est détecté puis peut être désinstallé.
- [ ] Ollama s’installe, est détecté puis peut être désinstallé.
- [ ] LM Studio s’installe, est détecté puis peut être désinstallé.
- [ ] Jan s’installe, est détecté puis peut être désinstallé.
- [ ] Gemini, Copilot, Perplexity et Mistral affichent « Service Web » et ouvrent uniquement leur site officiel.
- [ ] AnythingLLM, GPT4All, Pinokio, ChatRTX et Stability Matrix affichent un guide générique adapté.
- [ ] ComfyUI Desktop s’installe avec l’identifiant `Comfy.ComfyUI-Desktop`.
- [ ] La fenêtre guidée VMware conserve ses instructions spécifiques.
- [ ] Sur le PC de test, lancer `tests\Test-AiCatalog.ps1 -Mode Verify` pour contrôler les identifiants sans installation.
- [ ] Sur un PC jetable uniquement, lancer `tests\Test-AiCatalog.ps1 -Mode Lifecycle -IUnderstandThisInstallsSoftware` ; les applications déjà présentes doivent être ignorées.
- [ ] Le script PowerShell généré utilise la bonne source pour chaque application.

## Interface

- [ ] Les 10 navigateurs apparaissent avec leur logo : Chrome, Firefox, Brave, Vivaldi, Opera, Opera GX, LibreWolf, Floorp, Tor Browser et Waterfox.
- [ ] Microsoft Edge n’est pas proposé à la désinstallation.
- [ ] Sur le PC de test, lancer `tests\Test-BrowserCatalog.ps1 -Mode Verify` pour contrôler les identifiants sans installation.
- [ ] Sur un PC jetable uniquement, lancer `tests\Test-BrowserCatalog.ps1 -Mode Lifecycle -IUnderstandThisInstallsSoftware`.

- Le badge `BÊTA` et le numéro de version sont visibles.
- La navigation et toutes les fenêtres s'affichent correctement.
- Le bouton de mise à jour indique que la publication est désactivée.
- La prise en main apparaît au premier lancement, peut être ignorée et se relance depuis le guide.

## Installation et désinstallation

- Installer au moins une application légère.
- Vérifier que l'application est ensuite marquée comme installée.
- Désinstaller cette application depuis OwlSetup.
- Utiliser le bouton Réparer sur une application compatible.
- Vérifier qu'une application non compatible affiche un avertissement compréhensible.
- Tester un échec d'installation et vérifier que le message reste compréhensible.

## Sauvegarde et restauration

- Sauvegarder la configuration dans un fichier `.pcsetup.json`.
- Vérifier que le fichier contient la liste des logiciels et les choix de nettoyage.
- Restaurer ce fichier et vérifier que les logiciels disponibles reviennent dans la sélection.
- Créer, enregistrer puis charger un profil personnalisé.
- Ajouter un identifiant WinGet personnalisé.

## Outils système

- Lancer le diagnostic WinGet.
- Tester la réparation WinGet uniquement si le diagnostic signale un problème.
- Créer un point de restauration et vérifier le résultat.
- Afficher l'historique puis ouvrir un journal.
- Analyser les applications au démarrage et ouvrir la page Windows correspondante.
- Lancer l'analyse du disque et vérifier qu'aucun fichier n'est supprimé.
- Sélectionner plusieurs applications installées et vérifier la confirmation de désinstallation groupée sans forcément la valider.
- Vérifier la recherche, le tri, la réparation et la sélection multiple dans l'onglet Applications installées.

## Mises à jour

- Rechercher les mises à jour disponibles.
- Installer une seule mise à jour sélectionnée.
- Vérifier le rapport dans `%LOCALAPPDATA%\PCSetup\Logs`.

## Nettoyage et quarantaine

- Lancer une analyse avec les options recommandées.
- Vérifier l'estimation de l'espace et les chemins affichés avant le nettoyage.
- Vérifier que le bouton de suppression reste désactivé tant que l'analyse n'est pas terminée.
- Vérifier que Documents, Téléchargements, Images, Vidéos et Bureau ne sont pas touchés.
- Restaurer un élément de quarantaine.
- Ne supprimer définitivement la quarantaine qu'après contrôle.

## Publication

- Aucun fichier de test ne doit se trouver dans le dépôt Git.
- La version finale ne doit plus afficher le badge `BÊTA`.
- Le SHA-256 de l'exécutable final doit être publié.
- Lorsque SignPath sera disponible, la signature doit être vérifiée avant la Release.
