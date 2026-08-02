# Validation de la Release Candidate OwlSetup 3.7.0

Les fichiers stables sont préparés localement mais restent **non publiés** jusqu’à la validation complète sur le PC de test.

## Contrôles automatisés

- [x] Exécuter `tests\Test-ReleaseCandidateReadiness.ps1` sans erreur.
- [x] Compiler avec `build-stable.ps1 -Version 3.7.0`.
- [x] Vérifier que la version intégrée correspond à `3.7.0`.
- [x] Comparer les trois empreintes avec `artifacts\stable\3.7.0\SHA256.txt`.

## Test visuel sans modification du PC

- [ ] Premier démarrage : choix de la langue, configuration initiale et guide visibles.
- [ ] Accueil lisible en fenêtre maximisée et réduite.
- [ ] Menus, sous-menus, badges et paramètres correctement alignés.
- [ ] Centre des opérations sans tâche fantôme ni ancien avertissement déjà résolu.
- [ ] Catalogue, applications installées, historique et visionneuse de rapports accessibles.

## Test réel sur le PC secondaire

- [ ] Créer un point de restauration ou un instantané de la VM.
- [ ] Installer une application légère absente du PC.
- [ ] Vérifier que la réussite est détectée même si WinGet renvoie un avertissement tardif.
- [ ] Mettre à jour une application fermée, puis une application initialement ouverte.
- [ ] Vérifier la proposition d’arrêt du processus sans arrêt automatique non confirmé.
- [ ] Désinstaller l’application de test et vérifier les résidus proposés.
- [ ] Lancer une analyse de nettoyage, contrôler les chemins puis annuler.
- [ ] Ouvrir un dossier volumineux depuis l’analyse du disque.
- [ ] Placer uniquement `.cache` en quarantaine, puis vérifier sa restauration.
- [ ] Confirmer que Documents, Bureau, Téléchargements, Nextcloud et les dossiers protégés ne sont jamais supprimés.
- [ ] Redémarrer OwlSetup et vérifier que l’historique, les notifications lues et la langue sont conservés.

## Décision de publication

- [ ] Aucun défaut bloquant ou perte de données.
- [ ] Aucun faux échec persistant dans le centre des opérations.
- [ ] Aucun terminal externe lors de l’ouverture d’un rapport.
- [ ] Notes de version et documentation mises à jour.
- [ ] Seulement après ces validations : compiler la version stable et préparer la Release GitHub.
