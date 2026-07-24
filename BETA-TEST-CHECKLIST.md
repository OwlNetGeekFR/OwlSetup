# Validation d'une version bêta

Cette liste doit être vérifiée avant de créer un tag et une Release GitHub.

## Ouverture sûre des rapports — beta.12

- [ ] « Ouvrir le rapport » affiche la visionneuse intégrée à OwlSetup.
- [ ] « Ouvrir le JSON dans le Bloc-notes » lance uniquement le Bloc-notes.
- [ ] Le bouton « Journal » de l’historique ouvre également le Bloc-notes.
- [ ] Aucun terminal CMD, PowerShell ou WSL n’apparaît.
- [ ] Fermer le Bloc-notes n’interrompt pas OwlSetup.

## Badges dynamiques — beta.11

- [ ] Aucun badge « NEW » permanent n’apparaît au démarrage.
- [ ] Le badge des mises à jour est masqué lorsque toutes les applications sont à jour.
- [ ] Le nombre de mises à jour disponibles apparaît après l’analyse.
- [ ] Outils système affiche « ! » uniquement si WinGet demande une intervention.
- [ ] Centre de sécurité affiche uniquement les contrôles qui demandent une attention.
- [ ] Dépannage reflète uniquement les avertissements non lus.
- [ ] Marquer les notifications comme lues actualise immédiatement le badge Dépannage.

## État lu des notifications — beta.10

- [ ] Une notification nouvelle conserve sa couleur et son indicateur tant qu’elle n’est pas lue.
- [ ] « Tout marquer comme lu » rend immédiatement toutes les cartes neutres.
- [ ] Le bouton affiche « Tout est lu » lorsqu’aucune notification ne reste à traiter.
- [ ] Cliquer sur une seule notification ne marque pas les autres comme lues.
- [ ] Ouvrir puis fermer le centre sans action conserve les notifications non lues.

## Désinstallation en arrière-plan — beta.9

- [ ] Une désinstallation simple réduit automatiquement sa fenêtre sans interrompre WinGet.
- [ ] Une désinstallation groupée réduit automatiquement sa fenêtre sans interrompre la file.
- [ ] Le bandeau inférieur affiche le logiciel courant, le pourcentage et permet de rouvrir la progression.
- [ ] Fermer la fenêtre pendant l’opération la réduit au lieu de bloquer ou d’annuler la désinstallation.
- [ ] À la fin, les réussites et avertissements apparaissent dans le centre de notifications.
- [ ] Si des dossiers résiduels sont détectés, la fenêtre se rouvre automatiquement pour demander une décision.
- [ ] Le bouton « Terminer » masque également le bandeau de résultat.

## Visionneuse de rapports — beta.8

- [ ] « Ouvrir le rapport » affiche une fenêtre OwlSetup et ne lance plus l’éditeur JSON.
- [ ] Les compteurs réussite, vérification et total correspondent au rapport.
- [ ] Les noms, logos et messages de chaque application sont lisibles.
- [ ] « Ouvrir le fichier technique JSON » lance uniquement le fichier brut à la demande.
- [ ] Les anciens rapports restent consultables depuis l’historique avec « Rapport visuel ».

## Notifications et installation en arrière-plan — beta.7

- [ ] Une mise à jour détectée apparaît dans le centre de notifications avec un compteur.
- [ ] Cliquer sur une notification de mise à jour ouvre l’onglet correspondant.
- [ ] Après le lancement d’une installation, la fenêtre se réduit et la navigation reste utilisable.
- [ ] Le bandeau inférieur affiche le logiciel courant, le pourcentage et permet de rouvrir la progression.
- [ ] Chaque installation réussie ou échouée crée une notification claire.
- [ ] Fermer la fenêtre de progression pendant l’installation ne coupe pas WinGet.
- [ ] Le bouton « Terminer » masque également le bandeau de résultat.

## Session RC1 du 23 juillet 2026

- [x] Syntaxe JavaScript validée.
- [x] Compilation de `3.6.0-rc.1` réussie.
- [x] Les 93 entrées du catalogue sont classées en 81 paquets WinGet valides et 12 installations guidées.
- [x] Les 6 applications IA installables sont disponibles dans leur source.
- [x] Les 10 navigateurs et leurs logos sont valides.
- [x] Démarrage, version, catalogue et détection des applications installées contrôlés visuellement.
- [x] Fenêtre de désinstallation groupée contrôlée puis annulée avant toute suppression.
- [x] Diagnostic préalable contrôlé avec un paquet disponible puis annulé avant toute installation.
- [x] Aucun journal ni dossier de quarantaine OwlSetup présent sur le Bureau.
- [ ] Cycle installation/désinstallation réel à exécuter sur le PC de test ou une VM avec instantané.
- [ ] Signature numérique à contrôler lorsque SignPath sera disponible.

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

- Désinstaller Audacity puis vérifier que les éventuels dossiers `%APPDATA%\Audacity` ou `%LOCALAPPDATA%\Audacity` sont proposés, jamais supprimés automatiquement.
- Choisir « Conserver les dossiers » et vérifier qu’ils restent en place.
- Refaire le test puis choisir « Placer en quarantaine » et vérifier que leur restauration fonctionne depuis l’onglet Quarantaine.
- Vérifier que le diagnostic préalable contrôle WinGet, l’espace disque, Windows et chaque paquet.
- Vérifier qu’un paquet WinGet inexistant bloque le démarrage et apparaît en erreur.
- Tester « Réessayer les échecs » avec une sélection comprenant au moins un paquet en échec.
- Ouvrir le journal et le rapport JSON depuis l’historique local.
- Importer le rapport JSON dans le catalogue du dashboard et vérifier que les autres lignes restent inchangées.
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
