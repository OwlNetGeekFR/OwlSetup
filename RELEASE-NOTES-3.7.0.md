# OwlSetup 3.7.0

OwlSetup 3.7.0 regroupe l’installation, la mise à jour, la désinstallation et l’entretien de Windows dans une interface plus claire et plus sûre.

## Principales nouveautés

- configuration guidée au premier démarrage et choix de la langue ;
- navigation réorganisée et interface adaptée aux fenêtres réduites ;
- installation groupée avec choix du dossier lorsque le logiciel le permet ;
- mises à jour et installations suivies en arrière-plan ;
- meilleure détection des applications installées et des processus bloquants ;
- centre des opérations avec résolution automatique des anciennes erreurs ;
- vérification réelle après installation et mise à jour avant d'afficher un succès ou une erreur ;
- regroupement des erreurs répétées afin de garder un centre des opérations lisible ;
- suivi séparé des mises à jour d'applications et du déclenchement de Windows Update, sans faux échec ;
- historique et journaux consultables dans OwlSetup ;
- télémétrie d’erreur facultative, minimale et désactivée par défaut ;
- sécurité renforcée et points de restauration entièrement facultatifs ;
- messages explicites lorsqu’un redémarrage complet du PC est nécessaire.
- thème sombre, clair ou synchronisé avec Windows ;
- catalogue enrichi de 93 applications avec leurs logos en couleur et leurs sites officiels ;
- recherche globale : OwlSetup consulte d’abord son catalogue puis étend automatiquement la recherche à la source officielle WinGet ;
- vues séparées pour le catalogue OwlSetup, les applications réellement installées sur le PC et les composants système ;
- désinstallation proposée uniquement lorsque le paquet WinGet exact a été vérifié, avec renvoi vers Windows dans les autres cas ;
- nettoyage des navigateurs avec analyse préalable, sélection par profil et protection explicite des mots de passe, favoris, extensions et sessions ;
- accès direct aux dossiers volumineux détectés par l’analyse du disque ;
- nettoyage prudent du cache `.cache`, placé en quarantaine réversible avant toute suppression définitive.

## Sécurité du stockage

OwlSetup ne propose jamais la suppression directe d’un dossier personnel arbitraire. Les dossiers Documents, Bureau, Téléchargements, Nextcloud et les dossiers de travail restent protégés. Seuls les caches explicitement reconnus peuvent afficher l’action « Nettoyer », après confirmation, avec passage préalable par la quarantaine.

## Confidentialité

Les préférences et l’historique restent sur le PC. Aucun diagnostic n’est envoyé sans le choix explicite de l’utilisateur. Les rapports facultatifs n’incluent ni nom, ni adresse e-mail, ni chemin personnel, ni liste complète des logiciels.

## Vérification

Les empreintes officielles des fichiers sont fournies dans `SHA256.txt`. Cette version n’est pas encore signée numériquement : Windows peut donc afficher un avertissement de réputation. Téléchargez OwlSetup uniquement depuis le dépôt GitHub officiel ou le site `owlsetup.owlnetgeek.fr` et comparez l’empreinte SHA-256 en cas de doute.
