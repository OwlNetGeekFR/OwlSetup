# OwlSetup 4.0.0

Première version **stable** de la ligne 4.0. Elle regroupe les 65 préversions publiées depuis la 3.7.0, et succède à la `4.0.0-rc.1`.

## Principales nouveautés depuis la 3.7.0

### Catalogue ouvert à la contribution

Le catalogue des 93 applications est sorti du code : il vit dans `beta/catalog/apps.json`, validé par un schéma. Ajouter une application ne demande plus qu'une pull request touchant ce fichier et son logo.

### Mode ligne de commande complet

- `--install`, `--uninstall`, `--apply`, `--update`, `--list`, `--search`, `--check-updates`, `--export-profile` ;
- `--dry-run` simule sans rien modifier, `--silent` réduit la sortie, `--json` produit une sortie exploitable par script ;
- **`--elevate`** relance OwlSetup en administrateur puis rejoue la sortie et le code de sortie vers l'appelant. L'élévation reste **facultative** : sans ce drapeau, aucune invite UAC n'apparaît, pour qu'un script ou un MDM ne se bloque jamais sur une demande qu'il n'a pas faite ;
- codes de sortie documentés, journal écrit dans `%LOCALAPPDATA%\PCSetup\Logs`.

### Entretien planifié

Un panneau des Paramètres crée une **vraie tâche planifiée Windows**, hebdomadaire ou toutes les quatre semaines, jour et heure au choix. La tâche s'exécute sans élévation, sous le compte courant, sans mot de passe stocké. L'état affiché vient toujours du planificateur Windows.

### Mise à jour depuis l'application

OwlSetup vérifie les nouvelles versions sur GitHub, télécharge l'exécutable, contrôle son empreinte **SHA-256** et son en-tête avant de l'installer, puis redémarre. Une case permet de recevoir aussi les préversions.

### Interface

- **thème clair** entièrement retravaillé, avec un mode contraste renforcé ;
- **contrastes WCAG AA** garantis sur les quatre combinaisons de thème : les couleurs de texte passent par des jetons vérifiés à chaque build ;
- **accessibilité clavier** : les fenêtres retiennent le focus, Échap ferme celles qui peuvent l'être, et le focus revient à l'élément d'origine.

## Ce qui a changé depuis la 4.0.0-rc.1

### L'interface anglaise est complète

La RC traduisait l'interface, mais **pas les messages venant du cœur de l'application** : titres d'étape, erreurs, libellés de résultat restaient en français. Un utilisateur anglophone voyait donc une interface anglaise ponctuée de français.

Les **256 chaînes** concernées sont traduites. La couverture est vérifiée à chaque build et se tient à **1488/1488**.

### 41 fautes d'accents, côté français

Des messages étaient affichés sans leurs accents aux utilisateurs francophones — « Operation terminee avec succes », « Le logiciel est deja installe », « Windows a refuse l'acces ». Toutes sont corrigées.

Trois chaînes restent volontairement sans accents : ce ne sont pas des messages, mais des motifs comparés à la sortie française de WinGet.

### Une règle d'identifiant, une seule

La validation des identifiants de paquet était recopiée à trente et un endroits, sous trois formes qui ne disaient pas la même chose : un même identifiant pouvait être accepté à une entrée et refusé à une autre. Il n'en reste **qu'une déclaration**, alignée sur la plus stricte, et un contrôle automatique vérifie que l'interface et le cœur de l'application ne divergent plus.

### Contrôles de qualité

- l'**analyse de sécurité Roslyn** tourne désormais sur chaque proposition de modification, la catégorie sécurité étant traitée en erreur ;
- un test **lance réellement l'application** à chaque build et vérifie que l'interface se charge ;
- les appels natifs sont confinés au dossier système, ce qui interdit le chargement d'une bibliothèque depuis un répertoire modifiable.

## Sécurité

- toute **opération élevée** est tracée dans `PC-Setup-Elevations.log`, consultable depuis l'historique : la demande est enregistrée avant le lancement, puis son issue ;
- les chemins reçus de l'interface sont confinés à leur zone autorisée, **points de jonction compris** — un dossier d'installation personnalisé ne peut plus rediriger vers une zone protégée ;
- un identifiant de paquet doit commencer par un caractère alphanumérique et rester sous 128 caractères, ce qui interdit qu'un argument soit lu comme un drapeau par WinGet ;
- l'interface n'accepte ses commandes internes que depuis son origine locale ;
- les ressources de l'interface sont **réécrites depuis l'exécutable à chaque démarrage**, puis leur empreinte SHA-256 est vérifiée. Une copie locale modifiée est donc remplacée avant d'être servie.

### Un nettoyage qui se défait

OwlSetup ne propose jamais la suppression directe d'un dossier personnel arbitraire. Les dossiers Documents, Bureau et Téléchargements sont exclus, et un cache nettoyé est placé en **quarantaine réversible** avant toute suppression définitive : il se restaure à son emplacement d'origine depuis l'application, tant qu'il n'a pas été purgé.

## Confidentialité

Inchangée. Les préférences et l'historique restent sur le PC. Aucun diagnostic n'est envoyé sans choix explicite. Les rapports facultatifs n'incluent ni nom, ni adresse e-mail, ni chemin personnel, ni liste complète des logiciels.

## Essais

**57 fichiers de contrôles PowerShell** et **248 tests JavaScript** sont rejoués à chaque proposition de modification, avec la compilation, l'analyse de sécurité et le démarrage réel de l'interface.

Les trois trajets qui ne peuvent pas être automatisés ont été exercés à la main sur cette build :

- **installation** d'applications du catalogue, du choix jusqu'au rapport ;
- **désinstallation**, analyse des résidus et mise en quarantaine comprises ;
- **nettoyage** du disque, avec restauration d'un dossier depuis la quarantaine.

La bascule en anglais et les messages réaccentués ont été vérifiés sur la même build.

## À savoir

OwlSetup **n'est pas signé numériquement**. Windows SmartScreen affiche donc un avertissement au premier lancement : choisissez « Informations complémentaires » puis « Exécuter quand même ». La signature viendra quand le logiciel sera suffisamment connu pour qu'un certificat ait du sens.

## Vérification

Téléchargez uniquement depuis le dépôt GitHub officiel ou `owlsetup.owlnetgeek.fr`, et comparez l'empreinte SHA-256 en cas de doute :

```powershell
Get-FileHash .\OwlSetup.exe -Algorithm SHA256
```
