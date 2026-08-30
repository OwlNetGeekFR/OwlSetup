# OwlSetup 4.0.0-rc.1

Première **Release Candidate** de la version 4.0. Elle regroupe les 54 préversions publiées depuis la 3.7.0. Le canal reste préversion : cette build est destinée aux essais, pas encore au déploiement large.

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
- **accessibilité clavier** : les 19 fenêtres retiennent le focus, Échap ferme celles qui peuvent l'être, et le focus revient à l'élément d'origine ;
- prise en charge de `prefers-reduced-motion` ;
- **interface anglaise complète** — 1 227 chaînes, y compris celles construites avec un nombre (« 3 mises à jour disponibles »).

## Sécurité

- toute **opération élevée** est tracée dans `PC-Setup-Elevations.log`, consultable depuis l'historique : la demande est enregistrée avant le lancement, puis son issue ;
- les chemins reçus de l'interface sont confinés à leur zone autorisée, **points de jonction compris** — un dossier d'installation personnalisé ne peut plus rediriger vers une zone protégée ;
- un identifiant de paquet doit commencer par un caractère alphanumérique, ce qui interdit qu'un argument soit lu comme un drapeau par WinGet ;
- l'interface n'accepte ses commandes internes que depuis son origine locale ;
- l'intégrité SHA-256 des ressources embarquées est vérifiée au démarrage : l'application refuse de s'ouvrir si elles ont été modifiées.

## Confidentialité

Inchangée. Les préférences et l'historique restent sur le PC. Aucun diagnostic n'est envoyé sans choix explicite. Les rapports facultatifs n'incluent ni nom, ni adresse e-mail, ni chemin personnel, ni liste complète des logiciels.

## Essais menés sur un poste réel

En plus des 53 contrôles automatiques rejoués à chaque build, les trois trajets qui ne peuvent pas être automatisés ont été exercés à la main :

- l'**auto-élévation** `--elevate`, invite UAC comprise, avec relais de la sortie et du code vers l'appelant ;
- l'écriture du **journal d'audit des élévations**, de la demande jusqu'à son issue ;
- la **mise en quarantaine d'un dossier résiduel puis sa restauration** à son emplacement d'origine.

Cette build reste une candidate : les retours d'usage sur d'autres configurations Windows sont les bienvenus.

## Vérification

Les empreintes officielles sont fournies dans `SHA256.txt`. Cette version **n'est pas signée numériquement** : Windows affichera un avertissement de réputation (SmartScreen). C'est attendu tant que le projet ne dispose pas d'un certificat reconnu.

Téléchargez uniquement depuis le dépôt GitHub officiel ou `owlsetup.owlnetgeek.fr`, et comparez l'empreinte SHA-256 en cas de doute :

```powershell
Get-FileHash .\OwlSetup.exe -Algorithm SHA256
```
