# Audit de préparation — OwlSetup 3.7.0

Date : 2 août 2026  
Version auditée : `3.7.0`  
Décision : **version stable compilée localement et prête pour le dernier essai sur le PC de test ; publication GitHub encore suspendue**.

## Résultat exécutif

La compilation stable et les 34 contrôles automatisés ont réussi. Aucun secret connu n'a été détecté dans les fichiers sources analysés. La télémétrie d'erreur facultative est compatible avec les anciens rapports, fournit désormais un diagnostic exploitable dans le dashboard et conserve un périmètre minimal.

La version ne doit toutefois pas être publiée comme stable avant les essais réels d'installation, mise à jour, désinstallation et nettoyage sur le PC secondaire.

## Télémétrie facultative v2

Les rapports peuvent maintenant indiquer :

- la catégorie de l'action : installation, mise à jour, désinstallation, réparation, nettoyage, système ou sécurité ;
- l'étape de l'échec : prérequis, téléchargement, processus bloquant, réseau, autorisations, vérification ou exécution ;
- l'identifiant du seul paquet concerné, lorsqu'il peut être déterminé sans ambiguïté ;
- la famille technique de l'erreur, son code, la version d'OwlSetup et le canal ;
- si une nouvelle tentative a ensuite réussi.

Ne sont pas transmis : nom, adresse e-mail, adresse IP volontairement ajoutée par OwlSetup, chemins personnels, texte libre de l'erreur, journal complet ou inventaire des applications. Le choix reste `Jamais`, `Demander avant l'envoi` ou `Automatique`.

Le serveur refuse les champs inconnus, les charges trop volumineuses, les catégories non reconnues et les identifiants de paquet contenant des caractères interdits. La limitation de débit et l'origine WebView2 verrouillée restent actives.

## Dashboard

Le dashboard affiche maintenant pour chaque diagnostic :

- une explication en langage clair ;
- la catégorie, l'étape, le paquet concerné et la famille technique ;
- le code, la version, le canal, la langue et les occurrences ;
- l'état `ouvert` ou `résolu après nouvelle tentative` ;
- la compatibilité avec les rapports v1 déjà enregistrés.

Compilation du dashboard : **0 avertissement, 0 erreur**.

## Contrôles automatisés réussis

- syntaxe JavaScript de l'application et de l'internationalisation ;
- intégrité du catalogue : 93 applications, 93 sites officiels, 89 logos, aucune erreur ni alerte ;
- navigateurs et applications IA ;
- configuration initiale et traduction anglaise ;
- profils, choix du dossier d'installation et fin d'installation ;
- mise à jour en arrière-plan et récupération WinGet ;
- historique local, rétention et suppression ;
- suppression des opérations fantômes ;
- désinstallation limitée aux correspondances WinGet exactes ;
- sécurité statique, protection de restauration facultative et guidage UAC ;
- interface responsive, typographie et icônes ;
- ouverture sécurisée des dossiers volumineux et nettoyage du seul cache `.cache` reconnu, via quarantaine réversible ;
- télémétrie facultative v1/v2, confidentialité et validation serveur ;
- `git diff --check` sans erreur de formatage bloquante.

## Exécutables audités

- Application portable : `artifacts/stable/3.7.0/OwlSetup.exe`
- Taille : 3 138 048 octets
- Version intégrée : `3.7.0`
- SHA-256 : `EFE730FC291FE32E2A9ECB93AAC4F09B2A69AC0B436EF2D714EB6CBBC57C9E60`
- Alias historique : `artifacts/stable/3.7.0/PC-Setup.exe`
- Taille : 3 138 048 octets
- SHA-256 : `EFE730FC291FE32E2A9ECB93AAC4F09B2A69AC0B436EF2D714EB6CBBC57C9E60`
- Installateur : `artifacts/stable/3.7.0/OwlSetup-Setup.exe`
- Taille : 3 487 751 octets
- SHA-256 : `924BD9C53D8BD231DE7CD97460273DF74550C7A5E59FC5A0F2A3CE20B1661B10`
- Statut : local, non publié, non signé

## Validation manuelle obligatoire

Sur le PC de test, avec un point de restauration ou un instantané de VM :

1. démarrer l'application, choisir la langue et terminer ou ignorer le guide ;
2. vérifier les trois choix de télémétrie et envoyer un diagnostic de test ;
3. installer une application WinGet et une application portable ;
4. mettre à jour une application fermée, puis une application volontairement laissée ouverte ;
5. vérifier que la correction ferme le processus seulement après confirmation ;
6. désinstaller une application WinGet puis vérifier sa détection ;
7. simuler et exécuter un petit nettoyage sans sélectionner les dossiers protégés ;
8. analyser l’occupation du disque, ouvrir un dossier puis placer uniquement `.cache` en quarantaine et le restaurer ;
9. vérifier dans le dashboard le détail du diagnostic et son passage automatique à l'état résolu après une nouvelle tentative réussie ;
10. redémarrer OwlSetup et confirmer l'absence de notification répétée ou d'opération fantôme ;
11. vérifier l'interface à fenêtre normale, réduite et maximisée.

## Conditions avant publication stable

- tous les essais manuels ci-dessus sont concluants ;
- aucune régression critique ou perte de données n'est observée ;
- le dashboard déployé accepte bien la télémétrie v2 ;
- la version stable est recompilée depuis les mêmes sources validées ;
- le SHA-256 publié correspond exactement à l'exécutable final ;
- le changelog et la page de téléchargement sont mis à jour au même moment.

La signature de code reste indisponible à ce stade. Elle n'empêche pas techniquement la publication, mais Windows peut afficher un avertissement de réputation. La page de téléchargement doit l'expliquer clairement sans demander de désactiver les protections Windows.
