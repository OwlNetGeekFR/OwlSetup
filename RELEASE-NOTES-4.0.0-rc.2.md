# OwlSetup 4.0.0-rc.2

Seconde **Release Candidate** de la version 4.0. Elle succède à la `4.0.0-rc.1` publiée le 30 août, et devrait devenir la `4.0.0` stable une fois qu'elle aura tourné quelques jours sur d'autres configurations Windows.

Le canal reste préversion : cette build est destinée aux essais.

## Pourquoi une seconde candidate

La `rc.1` était la dernière build validée à la main. Douze changements ont abouti depuis, dont deux qui touchent directement ce que voit l'utilisateur — il aurait été malhonnête de les publier en stable sans les faire éprouver d'abord.

## Ce qui change depuis la rc.1

### L'interface anglaise est complète

La `rc.1` traduisait l'interface, mais **pas les messages venant du cœur de l'application** : titres d'étape, erreurs, libellés de résultat restaient en français. Un utilisateur anglophone voyait donc une interface anglaise ponctuée de français.

Les **256 chaînes** concernées sont traduites. La couverture est vérifiée à chaque build et se tient à **1488/1488**.

### 41 fautes d'accents, côté français

Des messages étaient affichés sans leurs accents aux utilisateurs francophones — « Operation terminee avec succes », « Le logiciel est deja installe », « Windows a refuse l'acces ». Toutes sont corrigées.

### Une règle d'identifiant, une seule

La validation des identifiants de paquet était recopiée à trente et un endroits, sous trois formes qui ne disaient pas la même chose : un même identifiant pouvait être accepté à une entrée et refusé à une autre. Il n'en reste **qu'une déclaration**, alignée sur la plus stricte.

### Contrôles de qualité

- l'**analyse de sécurité Roslyn** tourne désormais sur chaque proposition de modification, la catégorie sécurité étant traitée en erreur ;
- un test **lance réellement l'application** à chaque build et vérifie que l'interface se charge ;
- les appels natifs sont confinés au dossier système.

## Ce qui a été éprouvé

**57 fichiers de contrôles PowerShell** et **248 tests JavaScript** sont rejoués à chaque proposition de modification, avec la compilation, l'analyse de sécurité et le démarrage réel de l'interface.

Les trois trajets qui ne peuvent pas être automatisés ont été exercés à la main sur cette build : **installation** d'applications du catalogue, **désinstallation** avec analyse des résidus et quarantaine, **nettoyage** du disque avec restauration depuis la quarantaine. La bascule en anglais et les messages réaccentués ont été vérifiés sur la même build.

## Ce sur quoi les retours sont les plus utiles

- l'**interface en anglais** : un message resté en français est un vrai défaut, signalez-le ;
- l'installation et la désinstallation sur des configurations Windows différentes de la nôtre ;
- le comportement du **mode ligne de commande** en déploiement (`--apply`, `--elevate`).

## À savoir

OwlSetup **n'est pas signé numériquement**. Windows SmartScreen affiche donc un avertissement au premier lancement : choisissez « Informations complémentaires » puis « Exécuter quand même ». La signature viendra quand le logiciel sera suffisamment connu pour qu'un certificat ait du sens.

## Vérification

Téléchargez uniquement depuis le dépôt GitHub officiel ou `owlsetup.owlnetgeek.fr`, et comparez l'empreinte SHA-256 en cas de doute :

```powershell
Get-FileHash .\OwlSetup.exe -Algorithm SHA256
```
