# Historique des versions

## [4.0.0-beta.59] - 2026-08-30

### Lot 3 — le front ne disait plus la même règle que l'hôte, et le test qui devait s'en apercevoir mentait

La 4.0.0-beta.57 avait unifié la validation des identifiants de paquet **côté
hôte**, sur la plus stricte des trois formes trouvées. Elle n'a pas touché au
front-end. Résultat : depuis deux versions, l'interface acceptait des
identifiants que `OwlSetupWebView.cs` refuse.

La règle était écrite **six fois, en trois versions** :

| Lieu | Motif | ≥ 2 car. | Borne |
| --- | --- | --- | --- |
| `package-id.js` (module partagé) | `[A-Za-z0-9.+_-]*` | non | aucune |
| `legacy.js` — sélection restaurée | idem, recopié | non | aucune |
| `package-id.test.js` — copie figée | idem, recopié | non | aucune |
| `parity.test.js` — copie figée | idem, recopié | non | aucune |
| `legacy.js` — recherche étendue (×2) | `[A-Za-z0-9._+\-]{1,127}` | oui | 128 |
| **`OwlSetupWebView.cs`** (la seule qui décide) | `[A-Za-z0-9._+\-]{1,127}` | oui | 128 |

C'est la même dérive qu'au lot 3 côté C# — 27 copies, trois règles — mais côté
front, et sur le module dont c'est précisément le rôle de refléter l'hôte.

### Le test qui affirmait le contraire

`package-id.test.js` contenait ceci :

```js
it("est identique a la regex de l'hote C# (…)", () => {
  expect(PACKAGE_ID_PATTERN.source).toBe("^[A-Za-z0-9][A-Za-z0-9.+_-]*$");
});
```

Il ne comparait pas le module à l'hôte : il le comparait à une **copie littérale
écrite dans le test lui-même**. Quand l'hôte a changé, la copie n'a pas bougé,
le test a continué de passer, et il a affirmé pendant deux versions une égalité
devenue fausse. Un test qui ne va pas chercher l'autre côté de la frontière ne
garde pas cette frontière — il garde sa propre copie.

Il lit désormais `OwlSetupWebView.cs`, en extrait `PackageIdPattern`, et compare
de deux façons : la chaîne (aux conventions d'échappement près, documentées) et
le **comportement** sur un corpus de vingt cas limites. Une reformulation
équivalente en apparence seulement ne passe pas.

### Ce que ça changeait en pratique

Peu, et il faut le dire : les 93 applications du catalogue mesurent entre 7 et
39 caractères — aucune n'est concernée, et c'est vérifié par un test. Les seuls
identifiants pouvant sortir des bornes viennent de la découverte d'applications
installées et de la recherche WinGet étendue, où ils sont possibles sans avoir
été observés. L'écart était réel mais dormant.

Le point n'est pas le dégât évité, c'est que l'invariant est maintenant
**vérifié** au lieu d'être affirmé à tort. Une application découverte avec un
identifiant hors bornes entrait dans le catalogue, s'affichait, se laissait
sélectionner — et l'installation ne faisait rien, sans message. Le front refuse
désormais ce que l'hôte refusera.

### Nettoyage

Les trois copies inline de `legacy.js` sont retirées ; la restauration de la
sélection passe par `sanitizePackageIds`, dont c'était déjà le rôle exact. Un
garde vérifie qu'aucune copie ne revient — en visant la forme
`[A-Za-z0-9][A-Za-z0-9`, pour ne pas confondre avec la regex de recherche
étendue, qui est une autre règle sur une autre donnée.

Les quatre contrôles ont été validés en cassant le code : hôte durci sans le
front, front relâché sans l'hôte, `PackageIdPattern` renommé, copie inline
réintroduite — **les quatre échouent bien**.

### Audit sans suite : l'export de scripts PowerShell

Les trois générateurs (`OwlSetup-Installer.ps1`, `Mettre-a-jour-mon-PC.ps1`,
`Liberer-espace-disque.ps1`) construisent du PowerShell par interpolation de
chaînes en JavaScript, et n'avaient jamais été audités. **Aucune faille :**
`generateUpdateScript` n'interpole rien, `generateCleanupScript` n'assemble que
des littéraux choisis par des clés fixes, et les deux valeurs de
`generateScript` sont contraintes — `app.id` est validé sur ses trois chemins
d'entrée, `app.source` n'est jamais écrit depuis une donnée externe.

C'est vrai par accident plutôt que par construction : `mergeDiscoveredInstalledApps`
lit `item.source` deux lignes au-dessus de l'endroit où il construit l'objet
sans le poser. Échapper ces valeurs à la construction reste à faire.

**Vérifié :** 243 tests JavaScript, 55 fichiers de tests PowerShell.


## [4.0.0-beta.58] - 2026-08-30

### Lot 2 — le routeur de 827 lignes, découpé sans en changer une seule

`handleInstallMessage` recevait **tous** les messages de l'hôte C# : 97 branches
`message.type === "…"` à plat, **829 lignes**. À elle seule, cette fonction
pesait **23,6 % de tout le code fonctionnel** de `legacy.js` — onze fois la
suivante (`renderWindowsUpdates`, 75 lignes). Toute panne d'affichage commençait
par une lecture en diagonale de ces 829 lignes.

Elle est maintenant **dix fonctions de domaine** et un répartiteur de treize
lignes :

| Domaine | Types | Lignes |
| --- | ---: | ---: |
| `handleQuarantineAndCleanupMessage` | 8 | 120 |
| `handleInstallFlowMessage` | 10 | 107 |
| `handleSystemAndConfigMessage` | 17 | 102 |
| `handleUpdateAndInstalledMessage` | 5 | 93 |
| `handleSimulationMessage` | 10 | 86 |
| `handleUninstallAndRepairMessage` | 6 | 83 |
| `handleDiskAndBatchMessage` | 8 | 82 |
| `handleHealthAndWindowsUpdateMessage` | 16 | 75 |
| `handleToolAndSecurityMessage` | 4 | 60 |
| `handleHistoryMessage` | 12 | 40 |

La plus grosse fonction du fichier passe de **829 à 120 lignes**, de 23,6 % à
3,4 % du total.

**Aucun corps de branche n'a été touché.** Le découpage a été fait
mécaniquement, puis vérifié en comparant les 827 lignes d'origine à la
concaténation des dix nouveaux corps : **identiques, ligne pour ligne**. Le
comportement ne peut pas avoir changé — seul le choix du domaine est nouveau.

Une condition préalable rendait l'opération sûre : sur les 97 branches, **95
testent uniquement `message.type`**, et les deux seules conditions composées
(la paire `uninstall-residues-complete`, distinguée par `message.context`)
tombent dans le même domaine. Aucune branche ne dépendait donc de la chute vers
la suivante.

### Un garde qui ne gardait rien

`if (!message) return;` se trouvait **après** le premier accès à
`message.type` : un message nul levait une exception au lieu d'être écarté. Il
est remonté dans le répartiteur, où il protège réellement.

### Le mode de panne que ce découpage introduit, et son filet

Le répartiteur choisit le domaine dans une table `MESSAGE_DOMAINS`. Cette table
peut désormais **diverger du code** : une branche non déclarée n'est jamais
atteinte, un type déclaré sans branche route vers rien. Dans les deux cas, le
message est ignoré en silence — exactement le genre de panne que
`beta/test/ipc-contract.test.js` existait pour empêcher.

Trois contrôles ont donc été ajoutés à ce test : la table décrit exactement les
branches de chaque fonction, aucun type n'est réclamé par deux domaines, aucune
branche ne vit hors des domaines. Ils ont été validés en cassant délibérément le
code — type retiré de la table, type déclaré sans branche, type dupliqué entre
deux domaines, branche déplacée dans un dispatcher parallèle : **les quatre
sabotages sont détectés**.

**Vérifié :** 237 tests JavaScript, 55 fichiers de tests PowerShell, `app.js`
régénéré et contrôlé syntaxiquement.


## [4.0.0-beta.57] - 2026-08-30

### Lot 3 — trois regex de sécurité pour une seule règle

Audit des **41 appels** à winget : chaque valeur interpolée dans une ligne de
commande est bien assainie — identifiants par expression régulière, noms et
chemins par retrait des guillemets, fichiers d'export construits sur un GUID.
Aucun trou.

**Mais la règle elle-même était écrite 27 fois, sous trois formes qui ne
disaient pas la même chose :**

| Forme | Occurrences | Accepte un caractère ? | Longueur maximale |
| --- | ---: | --- | --- |
| `[A-Za-z0-9.+_-]*` | 21 | oui | aucune |
| `[A-Za-z0-9.+_-]{0,127}` | 4 | oui | 128 |
| `[A-Za-z0-9._+\-]{1,127}` | 2 | **non** | 128 |

Le même identifiant pouvait donc être **accepté à une entrée et refusé à une
autre**, selon le chemin emprunté. C'est précisément la dérive qui avait laissé
`Installer-selection.ps1` sur l'ancienne regex jusqu'à la 4.0.0-beta.53 : une
règle recopiée finit toujours par diverger.

Une seule déclaration désormais — `PackageIdPattern` / `IsValidPackageId` —
alignée sur **la plus stricte des trois**. Les 93 applications du catalogue
mesurent entre 7 et 39 caractères : aucune n'est concernée. Les quatre appels
venant de la classe `Bootstrap` sont qualifiés, une méthode statique d'une autre
classe ne s'appelant pas sans préfixe.

**Deux tests existants ont dû changer de critère.** Ils vérifiaient la
*présence du littéral* dans le source : les laisser tels quels aurait exigé la
duplication qu'on venait de retirer. Ils vérifient maintenant l'appel à la
source unique, le comportement du motif étant couvert à part.

Garde : `tests/Test-PackageIdValidation.ps1` — une seule déclaration dans le
fichier, appels qualifiés depuis `Bootstrap`, puis le comportement réel par
réflexion : identifiants légitimes acceptés, `-Force`, `--source`, guillemets,
chaîne vide, caractère unique et identifiant de 200 caractères refusés, et les
93 applications du catalogue passées une à une.

## [4.0.0-beta.56] - 2026-08-30

### Lot 3 — appels natifs confinés à System32, analyse de sécurité activée

Les analyseurs Roslyn n'avaient jamais tourné sur l'hôte C#. Mis en analyse
complète, ils lèvent **plus de 1 250 avertissements** — dont 390 `catch`
génériques et 300 appels sans `IFormatProvider`. Passer tout cela en erreur
bloquerait le build sans rien apprendre d'utile. La **catégorie sécurité**, elle,
est courte et actionnable : c'est elle qui est désormais traitée en erreur.

**Le vrai correctif : 15 P/Invoke confinés à System32.**

Sans l'attribut `DefaultDllImportSearchPaths`, un appel natif suit l'ordre de
recherche par défaut de Windows, qui inclut **le dossier de l'application et le
répertoire courant**. Une DLL déposée à côté de l'exécutable peut alors être
chargée à la place de celle du système.

Le risque n'était pas théorique partout, mais il ne l'était pas nulle part non
plus : `kernel32` et `advapi32` sont des **KnownDLLs**, que Windows protège
déjà de ce détournement — mais **`userenv.dll`, `wscapi.dll` et `dwmapi.dll` ne
le sont pas**. Ce sont précisément celles utilisées pour créer un bloc
d'environnement lors d'une opération élevée, lire l'état du Centre de sécurité,
et dessiner la barre de titre. L'attribut est appliqué aux 15 déclarations,
plutôt que de maintenir à la main la liste des DLL protégées par Windows.

**Deux règles écartées, après examen et non par confort** — la justification est
écrite dans le `.csproj` :

- **CA5386** conseille `SecurityProtocolType.SystemDefault` plutôt qu'un
  protocole codé en dur. Sur .NET Framework 4.6.2, le défaut système peut encore
  autoriser TLS 1.0 : forcer TLS 1.2 est ici le choix **le plus sûr**. Le nombre
  magique `3072` devient toutefois `SecurityProtocolType.Tls12`.
- **CA2322** ne vaut que pour un `JavaScriptSerializer` construit avec un
  `JavaScriptTypeResolver`. Ici il est toujours construit sans, donc il ne peut
  produire que des dictionnaires, des tableaux et des primitives.

Le certificat de signature est également libéré (`using`) : il détenait des
ressources non managées jusqu'au passage du ramasse-miettes.

Garde : `tests/Test-NativeInteropHardening.ps1` — chaque P/Invoke porte
l'attribut, aucune DLL inattendue n'est importée, le forçage TLS explicite
subsiste, et la catégorie sécurité reste en erreur dans le projet.

## [4.0.0-beta.55] - 2026-08-30

### Lot 2 — où est vraiment la masse d'`app.js`, et un filet avant d'y toucher

Première tranche du découpage du front-end. Avant de couper, j'ai mesuré — et
la masse n'est pas là où le plan la supposait.

Sur les **236 fonctions** de premier niveau de `legacy.js`,
**`handleInstallMessage` en fait 827 à elle seule, soit 18 % du fichier**. C'est
un routeur plat de **97 branches** `message.type === "…"`, et le **seul** point
d'entrée des messages envoyés par l'hôte C#.

Deuxième constat : seules **34 fonctions (279 lignes)** sont exemptes de DOM et
d'état global, et les plus grosses sont déjà extraites. Le reste du fichier
demandera un découpage **par couches**, pas une simple récolte de fonctions
pures — c'est une correction utile de la trajectoire du lot.

**Un filet avant de découper ce routeur.**
`beta/test/ipc-contract.test.js` tient ensemble les deux côtés de l'IPC : tout
type émis par `OwlSetupWebView.cs` doit avoir une branche, et toute branche doit
correspondre à un type émis. Un message non traité ne provoque aucune erreur —
il est simplement ignoré, et la fonctionnalité ne fait rien. C'est le genre de
panne silencieuse qu'un découpage de 827 lignes peut introduire sans bruit.

Le test lit **les deux formes** d'émission côté C# : l'initialiseur d'objet
`new { type="x" }` et l'affectation `snapshot["type"]="x"`. N'en chercher
qu'une faisait passer un handler bien vivant pour du code mort. Résultat
actuel : **96 types, aucun orphelin des deux côtés**.

**Première extraction.** `operation-summary.js` porte les libellés d'issue de
quarantaine, que le routeur construisait **deux fois** — une pour la
désinstallation simple, une pour la groupée — avec des titres et des détails
rigoureusement identiques et seule la phrase du panneau qui changeait.

Le test de parité recopie **les chaînes de l'ancien code** comme valeurs
attendues, et vérifie en plus qu'elles ont toujours une entrée dans `i18n.js` :
en modifier une ferait retomber ce texte en français dans l'interface anglaise.

## [4.0.0-beta.54] - 2026-08-30

### Lot 4 — les quatre scripts d'opération sont couverts, `winget` simulé

`Nettoyer-residus-applications.ps1` et `Mettre-a-jour-mon-PC.ps1` rejoignent les
deux premiers : leur logique passe en **fonctions importables**, chargées par
`-AsModule` sans rien exécuter. La suite Pester passe de **15 à 37 tests**.

**`winget` est désormais simulé.** L'appel réel est isolé dans une fonction
d'enveloppe que les tests remplacent par `Mock` : on vérifie que la branche
« winget absent » ne l'appelle **jamais**, qu'un code 0 donne « réussi » et
qu'un code non nul demande une vérification — sans rien installer sur la
machine.

**Un test tient ensemble deux côtés du code.** Quand un dossier part en
quarantaine, son nom porte l'emplacement d'origine en préfixe (`Local-`,
`Roaming-`, `ProgramData-`). C'est ce préfixe que `RestoreQuarantine`
(`OwlSetupWebView.cs`) relit pour savoir où remettre le dossier. Si les deux
divergent, **la restauration échoue en silence** : le test compare maintenant
ce que le script produit à ce que l'hôte C# sait relire.

La sélection des résidus était jusqu'ici enfouie dans un `Where-Object` en
chaîne. Elle devient une fonction, `Test-OwlSetupResidueCandidate`, avec ses
règles nommées et testées : âge supérieur à 90 jours, pas un lien symbolique,
nom d'au moins 4 caractères, hors liste protégée, sans point initial, et aucune
application installée dont le nom se rapproche — **dans les deux sens**, car
« vlcmedia » contient « vlc » comme l'inverse.

Le comportement de la normalisation est documenté au lieu d'être subi : les
caractères accentués disparaissent (« Café » → « caf »), le rapprochement étant
volontairement grossier.

**Vérifié en cassant le code** : changer le préfixe de quarantaine produit 4
échecs, dont celui qui compare au C#.

## [4.0.0-beta.53] - 2026-08-30

### Lot 4 — premiers tests de comportement, et une regex de sécurité oubliée

Les ~45 tests PowerShell du dépôt vérifient surtout la **présence de chaînes**
dans le source. Ils n'exécutent presque rien : un fichier peut contenir le bon
texte et se comporter mal.

`Installer-selection.ps1` et `Liberer-espace-disque.ps1` exposent désormais
leur logique en **fonctions importables**. Le drapeau `-AsModule` charge le
fichier sans rien exécuter, ce qui permet de tester les fonctions directement.

**Un seul fichier par script, volontairement.** Sortir la logique dans un
`.psm1` aurait ajouté une ressource à embarquer, à extraire, et surtout à
recopier dans le dossier d'exécution élevé à ACL stricte — un fichier de plus
dont l'intégrité conditionne une exécution administrateur. Le drapeau évite
tout cela.

**Une regex de sécurité avait été oubliée.** Le durcissement de la beta.2 —
« un identifiant de paquet doit commencer par un caractère alphanumérique » —
avait été appliqué à `app.js`, `OwlSetupWebView.cs`, `tools/check-catalog.mjs`
et `beta/`, mais **pas à `Installer-selection.ps1`**, resté sur
`^[A-Za-z0-9.+_-]+$`. Cette regex accepte `-Force`, `--source` ou `-h`, que
winget lirait comme des drapeaux et non comme des noms de paquet. Le script est
alimenté par OwlSetup, qui valide déjà — c'était donc de la défense en
profondeur manquante, sur un fichier extrait sur disque et lançable seul.

**15 tests Pester** (`tests/Pester/`, lancés par
`tests/Test-OperationScripts.ps1`) couvrent la validation des identifiants, la
lecture des sélections (liste, JSON, vide), le filtrage des zones de nettoyage,
et la suppression de contenu — dont le refus de vider un dossier qui est
lui-même une jonction.

Pester 3.4 est livré avec Windows : aucune dépendance ajoutée.

**La suite a été validée en cassant volontairement le code** : le retour de
l'ancienne regex produit 5 échecs, le retrait du garde-fou des jonctions 1
échec. Un test qui ne peut pas échouer ne prouve rien.

Cette vérification a d'ailleurs montré qu'un des tests **ne discriminait pas** :
retirer le filtre sur les points d'analyse des enfants ne le fait pas échouer,
`Remove-Item -Recurse` ne traversant pas une jonction sur PowerShell 5.1. Le
filtre reste (ce comportement a varié selon les versions de Windows), mais le
test dit maintenant clairement qu'il vérifie le contrat, pas l'implémentation.

## [4.0.0-beta.52] - 2026-08-30

### Lot 7 — auto-élévation du mode CLI, avec relais de sortie

Le mode ligne de commande détectait l'absence de droits administrateur, mais ne
savait qu'avertir : « relancez depuis une invite Administrateur ». Pour un
déploiement en parc, cela veut dire deux exécutions et un opérateur devant
l'écran.

`--elevate` relance OwlSetup en administrateur, puis **rejoue la sortie et le
code de sortie** de l'exécution élevée vers l'appelant : un script voit
exactement ce qu'il aurait vu sans élévation.

**Pourquoi un fichier de relais.** Une élévation passe forcément par
`ShellExecute` + `runas`, qui **interdit la redirection des flux** : le
processus élevé ne peut pas écrire dans la console de l'appelant. Il écrit donc
dans un fichier que le parent recopie sur sa propre sortie, puis supprime.

**L'élévation est opt-in, à dessein.** Sans le drapeau, aucune invite UAC
n'apparaît et le comportement ne change pas : les actions qui exigent des
droits sont signalées puis ignorées. Un script ou un MDM ne doit jamais se
bloquer sur une invite qu'il n'a pas demandée. `--elevate` ne s'applique qu'à
`--install`, `--uninstall`, `--apply` et `--update`, et reste sans effet avec
`--dry-run` — demander l'UAC pour une simulation n'aurait aucun sens.

Trois garde-fous côté processus élevé :

- il **ne s'élève jamais lui-même** : invoqué sans droits, il renvoie 740 ;
- il **valide son fichier de relais** — confiné au dossier des journaux, nom
  conforme à un motif généré ; une remontée de chemin est refusée ;
- `--elevate` est **retiré des arguments relayés**, pour qu'aucune boucle
  d'élévation ne soit possible.

La ligne de commande de l'enfant est construite à la convention Windows, avec
les antislashs précédant un guillemet doublés : sans cela, un dossier terminé
par `\` échapperait le guillemet fermant et décalerait tout le reste.

Garde : `tests/Test-CliElevation.ps1` — câblage, puis comportement réel par
réflexion (mise entre guillemets, refus des chemins de relais illégitimes,
refus hors élévation) et exécution réelle de `--elevate --dry-run`, qui doit
rendre 0 sans aucune invite.

**Le trajet UAC complet reste à essayer sur le PC de test** : une invite
interactive ne peut pas être automatisée ici.

## [4.0.0-beta.51] - 2026-08-30

### Lot 3 — trace des opérations élevées et dernier trou de validation

Deux points de sécurité du plan restaient décochés.

**Les opérations élevées ne laissaient pas de trace fiable.**
`RunElevatedProcess` n'écrivait que dans le rapport de son appelant : rien ne
garantissait qu'il soit persisté, et un nouvel appelant pouvait l'oublier. La
trace est désormais écrite **par `RunElevatedProcess` lui-même**, dans
`PC-Setup-Elevations.log` :

- la **demande** est tracée **avant** le lancement — si l'application est
  interrompue pendant l'opération, l'historique garde ce qui a été demandé ;
- puis l'issue : code de sortie, refus de l'invite UAC, ou échec.

Le fichier suit la convention de nommage des journaux, il apparaît donc dans
l'historique local et s'ouvre depuis l'interface. Il est tronqué à 512 Ko en
gardant les entrées **récentes**, pour rester sous la limite d'affichage
d'`OpenLog` (2 Mo). Une trace d'audit ne doit jamais faire échouer l'opération
qu'elle observe : toute erreur d'écriture est ignorée.

**Un seul trou de validation de chemin restait.** L'audit des handlers montre
que `OpenLog`, `OpenReport`, `GetQuarantineItem` et `GetAuthorizedDiskTarget`
étaient déjà confinés — nom de fichier seul, racine autorisée, liste blanche
issue d'une analyse préalable, refus des points de jonction.

`ValidateInstallBasePath` faisait exception : il ne travaillait que sur le
chemin **textuel** (pas la racine du disque, pas le dossier Windows, pas de
guillemet). Un dossier d'installation existant pouvait donc être une
**jonction** redirigeant vers une zone protégée, invisible pour ces contrôles.
Il vérifie maintenant chaque composant depuis la racine du disque, comme le
faisait déjà `GetAuthorizedDiskTarget`.

Garde : `tests/Test-ElevationAudit.ps1` — câblage dans le source, puis
comportement réel des helpers par réflexion sur l'exécutable compilé
(aplatissement des sauts de ligne, troncature des arguments longs, rotation qui
conserve bien la fin du journal et laisse un fichier sous le seuil intact).

## [4.0.0-beta.50] - 2026-08-30

### Lot 6 — les chaînes construites par interpolation passent en anglais

La beta.49 laissait **152 chaînes** en français : celles que le code assemble
avec une valeur, comme « 3 mises à jour disponibles » ou « Installer la
sélection (2) ». Aucune clé de dictionnaire ne peut les couvrir, puisque le
nombre change à chaque affichage.

**Écrire un motif par forme aurait demandé plus de 150 expressions
régulières**, dont beaucoup avec la marque du pluriel au milieu d'un mot
(`mise${s} à jour`) — autant d'occasions de fautes d'accord.

`i18n.js` **décompose** désormais la chaîne autour de ses parties variables :

- compteur en tête (« 3 mises à jour disponibles ») ;
- compteur final entre parenthèses (« Installer la sélection (2) ») ;
- segments séparés par « · » (« 4 installée(s) · 1 à vérifier »).

Le texte fixe passe alors par le dictionnaire — des **clés exactes**, sans
risque d'accord. La décomposition n'est retenue que si **toutes** les parties
se traduisent : une phrase à moitié anglaise serait pire que la version
française. Un segment sans texte (« 4,2 Go », « 45 % ») passe tel quel plutôt
que de faire échouer la phrase entière.

**98 fragments** ajoutés au dictionnaire, **58 motifs** pour les cas où la
valeur est au milieu de la phrase (« Désinstallation de X », « Réparation
incomplète (code N) »). Les groupes capturés passent eux aussi par le
dictionnaire, en correspondance exacte : « Étape 1/3 préparée : **Nettoyage** »
devient « Step 1/3 prepared: **Cleanup** », tandis qu'un nom d'application
reste intact.

**Trois défauts de l'audit corrigés au passage**, tous découverts parce que le
compte refusait de descendre :

- les **sondes d'instanciation** substituaient un nombre à la marque du
  pluriel, produisant « 1 mise1 à jour » — une chaîne qui n'existe nulle part.
  L'audit reconnaît maintenant un accord (`? "s" : ""`, mais aussi
  `? "nt" : ""` pour « résiste » / « résistent ») et rend le gabarit au
  singulier **puis** au pluriel ;
- le **parseur de motifs** exigeait `[/` collés, donc ignorait toute entrée
  formatée sur plusieurs lignes — l'audit signalait des trous déjà couverts ;
- la liste des fragments manquants était filtrée par la détection du français,
  ce qui **masquait** « libres » ou « introuvable(s) », sans accent.

La porte `--check` **inclut désormais les interpolations** : elles sont toutes
couvertes, elle protège donc l'acquis.

Vérifié à l'écran en anglais, toutes vues et fenêtres affichées : **0 texte** et
**0 attribut** en français, hors le badge BÊTA et les noms de langues.

## [4.0.0-beta.49] - 2026-08-30

### Lot 6 — traduction anglaise complète de l'interface

En mode anglais, **491 chaînes restaient en français** : tout ce que rend
`app.js` (résultats d'opération, messages d'erreur, états), plus des libellés
d'`index.html` qui échappaient à l'audit.

**L'outil d'audit était la vraie cause.** Il annonçait « `index.html` : 100 % »
alors que 16 chaînes de ce fichier n'étaient même pas comptées. Trois défauts :

- **La détection du français exigeait un accent** ou un mot-outil. « Espace
  disque », « Langue », « Validation avant action » passaient donc pour de
  l'anglais. La liste s'étend à des mots français sans accent — en excluant
  ceux qui s'écrivent pareil en anglais (`installation`, `version`, `guide`).
- **Le filtre « identifiant de paquet »** (`^[A-Za-z0-9._+-]+$`) rejetait
  « Analyse... » à cause de ses points de suspension. Il exige maintenant un
  séparateur **entre** deux groupes alphanumériques (`Microsoft.Edge`).
- **Les littéraux de `app.js` étaient extraits à l'expression régulière.** Une
  apostrophe française dans une chaîne à guillemets doubles (`"n'a pas ...
  l'application"`) faisait croire à un littéral simple quote « a pas ... l ».
  Un vrai scanner JavaScript remplace les regex : il suit les commentaires, les
  trois types de guillemets, les échappements, l'imbrication `${}` et les
  littéraux réguliers.

L'extraction gagne aussi en précision : le HTML contenu dans un littéral passe
par le tokeniseur (les nœuds de texte sont comptés un par un, plus le bloc
entier), et les scripts PowerShell comme les sorties console sont écartés — ils
n'atteignent jamais le DOM.

**Résultat : 1 227 chaînes, 100 %.** 489 traductions ajoutées, plus un motif
pour l'attribut `title` des cartes du catalogue, qui couvre à lui seul les
**95 boutons « Ouvrir le site officiel de… »**.

La porte `--check` **bloque désormais sur `app.js` aussi**, et plus seulement
sur `index.html` : l'extraction est assez fiable pour cela.

Vérifié à l'écran, toutes vues et fenêtres affichées : **0 attribut** et **0
texte** en français, hors le badge BÊTA et les noms de langues (`Français`,
`Demnächst`, `Português`), laissés dans leur langue à dessein.

**Ce qui reste.** 152 chaînes sont **construites par interpolation** (« 3 mises
à jour disponibles ») : le nœud rendu mêle texte et valeurs, aucune clé exacte
ne peut correspondre. Elles relèvent d'un motif dans `englishPatterns`, souvent
avec la marque du pluriel au milieu d'un mot (`mise${s} à jour`) — c'est une
passe à part, avec ses propres tests. L'audit les compte et les liste
séparément, hors de la porte.

## [4.0.0-beta.48] - 2026-08-30

### Lot 6 — `styles.css` découpé en partiels

`styles.css` était un fichier unique de 1 445 lignes, dont **20 dépassaient
2 000 caractères** (la plus longue : 7 326). Les règles s'y étaient accumulées
par ajouts successifs — « Beta 3.7 », « Audit beta.37 », « 4.0.0-beta.5 » — sans
jamais être regroupées.

La feuille est désormais **formatée**, puis découpée en **10 partiels** dans
`beta/src/styles/`, réassemblés par `beta/scripts/build-css.mjs` que `build.ps1`
appelle avant la compilation — même mécanique que `app.js`.

**L'ordre des partiels est significatif** et le préfixe numérique le rend
explicite : la feuille s'est construite par accumulation, et les surcharges du
thème clair, de l'accessibilité et des contrastes s'appuient sur le fait
d'arriver **après** les règles de base, à spécificité parfois égale. Les coupes
ont donc été faites à l'endroit exact où elles tombent dans l'ordre d'origine,
sans jamais réordonner.

Pas de minification, contrairement à ce que prévoyait le plan : la feuille est
chargée depuis l'hôte virtuel local par WebView2, **jamais sur le réseau**.
Minifier ne ferait gagner aucun temps de chargement et compliquerait le
débogage — c'est déjà le raisonnement retenu pour `build-js.mjs`.

**Aucun changement de rendu.** Deux vérifications :

- la concaténation des partiels reproduit le fichier formaté **octet pour
  octet** ;
- après normalisation des écarts purement cosmétiques du formateur (zéros de
  tête, espaces dans les parenthèses, `!important`, `@media (`, opérateurs de
  `calc()`, guillemets d'attribut), le résultat est **identique au caractère
  près** à l'ancien `styles.css` — 251 099 caractères de part et d'autre.

Contrôlé aussi à l'écran : 2 490 règles chargées, 0 échec de contraste sur les
4 combinaisons de thème.

Garde : `beta/test/styles-bundle.test.js` — déterminisme, correspondance entre
le fichier généré et ses partiels, ordre de concaténation, accolades
équilibrées.

**Tests PowerShell rendus insensibles à la mise en forme.** 18 tests
inspectaient `styles.css` en cherchant des motifs compacts
(`#catalog .catalog-tools{`, `button,input,select,textarea,`) ; 10 se sont
cassés au formatage. Plutôt que de les recoller à la sortie exacte du
formateur — ce qui les aurait rendus fragiles à chaque reformatage — un helper
partagé `tests/lib/CssText.ps1` ramène CSS et motif à une forme comparable.
Les tests vérifient désormais le **contenu** des règles, pas leur présentation.

## [4.0.0-beta.47] - 2026-08-30

### Lot 6 — contrastes WCAG AA

L'interface a été mesurée à l'écran sur les **quatre combinaisons de thème**
(clair et sombre, chacun avec et sans contraste renforcé), au seuil WCAG AA de
4,5:1 (3:1 pour le grand texte). Sur 3 947 éléments porteurs de texte,
**132 couleurs distinctes passaient sous le seuil**.

La cause n'était pas une couleur mal choisie ici ou là : la feuille de style
improvisait **une nuance de gris par règle** — 90 gris différents pour dire
« texte secondaire » — au lieu du token `--muted` déjà prévu pour ça. Chaque
nuance devait donc être corrigée séparément, dans chaque thème.

Le correctif rebranche ces textes sur des **tokens** :

- `--muted` pour les textes secondaires ;
- `--text-blue`, `--text-cyan`, `--text-green`, `--text-danger` et
  `--text-warn` pour les textes de couleur. Ils sont **distincts** de
  `--blue`, `--cyan` et `--green`, qui servent aussi aux fonds et aux bordures
  et ne peuvent donc pas être assombris librement.

Chaque token est redéfini par thème avec une valeur garantie au-dessus de
4,5:1 sur toutes les surfaces de ce thème. **216 déclarations** de couleur ont
été converties.

Trois défauts n'étaient pas des problèmes de couleur mais de support :

- **`.btn.ghost`** (le bouton « Parcourir… » du sélecteur de dossier) n'était
  déclaré nulle part : le navigateur lui appliquait sa face de bouton native
  (`#f0f0f0`), donc un texte clair sur fond clair en thème sombre. Il a
  désormais son propre fond, tiré des tokens.
- Le **« / 100 »** des jauges se superposait au remplissage : selon le
  pourcentage, son support était le panneau, le bleu ou le vert. Il reçoit un
  fond opaque pour que son contraste ne dépende plus du remplissage.
- La **barre de sélection** et le **badge d'étape** héritaient de `--text` sur
  un bleu plein — texte sombre sur fond bleu en thème clair.

Un test verrouille l'invariant (`beta/test/contrast.test.js`) : il recalcule le
contraste de chaque token de texte sur chaque surface des quatre thèmes, et
refuse le retour des 132 littéraux connus comme non conformes dans une
déclaration `color:`.

## [4.0.0-beta.46] - 2026-08-29

### Lot 6 — accessibilité au clavier

Les 19 fenêtres de l'application déclaraient `aria-modal="true"`, mais **seules
deux piégeaient le focus** : dans les 17 autres, la tabulation sortait derrière
la fenêtre et continuait dans la page masquée. Au clavier, on perdait le fil
sans pouvoir revenir.

Un **mécanisme unique** remplace les deux pièges écrits à la main. Il observe
l'affichage des boîtes (classe `hidden`) et se charge de tout :

- à l'ouverture, il mémorise l'élément déclencheur et place le focus sur le
  premier contrôle utile — pas sur la croix de fermeture ;
- pendant, il retient <kbd>Tab</kbd> et <kbd>Maj</kbd>+<kbd>Tab</kbd>, et
  ramène le focus dans la boîte s'il en est sorti ;
- **Échap** ferme la boîte, mais **uniquement si elle expose un bouton de
  fermeture** : les trois boîtes obligatoires (langue, premier démarrage,
  guide) n'en ont pas et restent non annulables ;
- à la fermeture, il **rend le focus à l'élément déclencheur**.

Vérifié à l'écran sur les **19 boîtes** : focus déplacé dedans, tabulation
bouclée dans les deux sens, retour dans la boîte depuis l'extérieur — aucun
échec. Le cycle complet déclencheur → boîte → Échap → déclencheur a été
contrôlé de bout en bout.

### Animations réduites

`prefers-reduced-motion` n'était honoré que par le parcours d'accueil :
**21 animations et 39 transitions** restaient actives. La règle couvre
désormais toute l'interface, défilement doux compris.

### Anneau de focus visible

Plusieurs contrôles s'appuyaient sur l'anneau par défaut du navigateur,
invisible sur les fonds sombres de l'application. Un `:focus-visible` explicite
est appliqué partout, décliné pour le thème clair.

### Tests

Nouveau `tests/Test-Accessibility.ps1` : mécanisme générique, règle de
fermeture par Échap, neutralisation des animations, anneau de focus, et
étiquette accessible sur chacune des 19 boîtes. Il vérifie aussi que les boîtes
obligatoires **ne gagnent pas** de bouton de fermeture — sinon Échap se
mettrait à les fermer sans que personne ne le remarque.

Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
OK, l'application démarre.

## [4.0.0-beta.45] - 2026-08-29

### CodeQL : 5 alertes « high » dans l'outil d'audit de la bêta 44

L'analyse de sécurité a signalé cinq alertes de gravité haute, toutes dans le
nouveau `beta/scripts/audit-i18n.mjs` : j'y découpais du HTML à coups
d'expressions régulières.

- `js/bad-tag-filter` : `/<script[\s\S]*?<\/script>/` ne reconnaît pas une
  balise fermante écrite `</script >`.
- `js/incomplete-multi-character-sanitization` (×3) : la chaîne de `replace()`
  pouvait laisser passer `<script`, `<style` et `<!--`.
- `js/double-escaping` : décoder `&amp;` puis `&lt;` **double-déséchappe** —
  `&amp;lt;` devenait `<` au lieu de `&lt;`.

Aucune surface d'attaque ici (script de construction, sur notre propre fichier),
mais les deux derniers points sont de véritables défauts de correction. Plutôt
que de neutraliser les alertes, le script utilise désormais un **petit
analyseur HTML à un seul passage** : il suit les guillemets d'attributs, saute
les commentaires et le contenu de `script` / `style` / `svg` en cherchant leur
vraie fin, et décode les entités **en une passe** via une table.

### Deux bugs révélés par ce remplacement

Le nouvel analyseur, plus fidèle, a mis au jour deux défauts de la bêta 44 :

- La traduction du texte d'exemple du formulaire d'aide avait pour clé
  `…&#10;…`, la forme **encodée**. Le navigateur décode cette entité en saut de
  ligne : l'entrée n'aurait donc **jamais** correspondu. Clé corrigée.
- L'audit lisait les clés du dictionnaire sans interpréter les échappements
  JavaScript, si bien qu'un `\n` restait littéral. Il utilise maintenant
  `JSON.parse`, qui les traite tous.

Les valeurs d'attributs sont également extraites sans écraser les sauts de
ligne, puisque `i18n.js` les compare telles quelles.

### Vérifié

`node beta/scripts/audit-i18n.mjs --check` → couverture complète d'`index.html`,
et la garde échoue toujours si une entrée disparaît (revérifié).
`tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256 OK,
l'application démarre.

## [4.0.0-beta.44] - 2026-08-29

### Lot 6 — la traduction anglaise était très incomplète

`tests/Test-EnglishTranslation.ps1` passait, mais il ne vérifiait que la
présence du moteur de traduction — jamais sa **couverture**. En basculant
l'application en anglais et en relevant le texte réellement affiché :
**316 chaînes restaient en français**, dont des pages entières (accueil,
catalogue, sécurité, aide) et toutes les fenêtres modales.

- **343 traductions ajoutées** à `i18n.js` : la totalité des chaînes
  affichables d'`index.html` — titres, descriptions, boutons, libellés,
  info-bulles, textes d'aide, messages de confidentialité, étapes guidées.
- **Résultat mesuré à l'écran : 0 chaîne française restante** en anglais, sur
  les 14 vues et toutes les fenêtres modales.

### Une traduction partielle corrigée

Le bouton « Désinstaller la sélection » s'affichait « **Uninstall la
sélection** » : le motif dynamique `/^Désinstaller (.+)$/` s'appliquait faute
d'entrée exacte. Une correspondance exacte étant prioritaire, l'entrée a été
ajoutée — comme pour les autres libellés commençant par un verbe couvert par un
motif.

### Un outil d'audit, pour que ça ne se reproduise pas

Nouveau `beta/scripts/audit-i18n.mjs` :

- extrait les chaînes françaises affichables d'`index.html` (texte + attributs
  `placeholder`, `title`, `aria-label`, aide contextuelle) et les littéraux
  d'`app.js` ;
- tient compte des **motifs dynamiques** (`3 éléments`, `Réparer X`…), qui ne
  sont pas des entrées de dictionnaire ;
- ignore ce qui ne doit pas être traduit : marques, et les endonymes du
  sélecteur de langue (« Français », « Português », « Demnächst »…).

`tests/Test-EnglishTranslation.ps1` appelle désormais cet audit et **échoue** si
une chaîne d'`index.html` perd sa traduction (vérifié en retirant une entrée).

La porte ne couvre volontairement qu'`index.html` : l'extraction des littéraux
d'`app.js` ramène aussi des chaînes qui n'atteignent jamais le DOM (journaux,
fragments PowerShell), ce qui la rendrait inutilisable. Ces chaînes restent
listées à titre indicatif — c'est le prochain incrément.

## [4.0.0-beta.43] - 2026-08-29

### Entretien planifié : la vérification hebdomadaire ne servait à rien

Défaut trouvé en inspectant une tâche réellement créée par la bêta 42 :
`Dernière exécution : résultat = 1`.

- L'action « Vérifier les mises à jour » lançait `--check-updates` **sans
  fenêtre** : la tâche s'exécutait, écrivait dans son journal, et
  l'utilisateur n'en savait jamais rien.
- Pire, `--check-updates` renvoie **1 quand des mises à jour existent** (c'est
  voulu, pour piloter un script). Le Planificateur Windows affichait donc la
  tâche comme **ayant échoué**, alors que tout allait bien.

Corrigé : l'action de vérification **ouvre OwlSetup**. Le résultat est visible
et actionnable, et le code de sortie redevient 0. Les libellés disent
maintenant ce qui se passe vraiment : « Ouvrir OwlSetup pour vérifier » et
« Installer les mises à jour en silence ».

Le mode CLI n'est pas modifié : `--check-updates` garde son code de sortie 1,
utile en script.

### Détail technique

`New-ScheduledTaskAction -Argument ''` est **refusé** par PowerShell (« L'argument
est Null ou vide »). La tâche d'ouverture omet donc le paramètre `-Argument`
plutôt que de le passer vide — sans ce correctif, l'enregistrement échouait.
La relecture continue de déduire l'action des arguments (vides = ouverture).

`tests/Test-ScheduledMaintenance.ps1` interdit désormais qu'une tâche planifiée
relance `--check-updates` sans fenêtre.

## [4.0.0-beta.42] - 2026-08-29

### Lot 6 — entretien planifié (vraie tâche Windows)

Nouveau panneau **Paramètres → « Entretien planifié »**. Il crée une véritable
tâche dans le planificateur Windows, qui rappelle le mode CLI livré au lot 7 —
pas une simple préférence locale.

- **Deux actions** : « Vérifier les mises à jour » (`--check-updates`) ou
  « Installer les mises à jour » (`--update --silent`).
- **Deux rythmes** : chaque semaine, ou toutes les 4 semaines — avec le jour et
  l'heure de votre choix.
- La ligne d'état affiche ce qui est planifié **et la prochaine exécution**
  calculée par Windows.

### Sécurité : aucune tâche privilégiée silencieuse

La tâche s'exécute **sous votre compte Windows, sans mot de passe enregistré et
sans élévation** (`-LogonType Interactive -RunLevel Limited`). OwlSetup ne crée
donc jamais de tâche capable d'agir en administrateur sans vous. Le panneau
l'indique explicitement : les logiciels installés pour toute la machine peuvent
demander une intervention manuelle. Tout ce qui vient de l'interface (action,
fréquence, jour, heure) est **validé côté hôte** avant d'entrer dans le script
PowerShell.

### L'état affiché vient de Windows, pas d'une préférence

À l'ouverture des Paramètres, OwlSetup interroge le planificateur. Si vous
supprimez la tâche depuis Windows, l'interface le reflète — il n'y a pas deux
sources de vérité.

### Détails techniques

- La lecture du jour utilise le **masque de bits `DaysOfWeek`** du déclencheur.
  Une première version lisait `StartBoundary.Day`, c'est-à-dire le jour du
  **mois** : une tâche du vendredi se relisait « jour 29 ». Corrigé et couvert
  par le test.
- « Toutes les 4 semaines » est un déclencheur hebdomadaire d'intervalle 4 sur
  le jour choisi — le module PowerShell n'expose pas de déclencheur mensuel, et
  cette forme reste prévisible pour l'utilisateur.
- Nouveau `tests/Test-ScheduledMaintenance.ps1` : marqueurs (actions, validation
  des entrées, **absence** de `-RunLevel Highest` et de `-Password`) **et cycle
  réel** création → relecture → suppression sur une tâche de test dédiée, jamais
  celle de l'utilisateur.
- L'ébauche « Automatisation One-Click » du canal Alpha, qui n'écrivait aucune
  tâche, reste en place et sans effet.
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  OK, l'application démarre, panneau contrôlé dans les thèmes clair et sombre.
  Cycle réel testé sur cette machine (mise à jour, toutes les 4 semaines, le
  mercredi à 07:30 → prochaine exécution calculée par Windows au 2026-09-02).

## [4.0.0-beta.41] - 2026-08-29

### Lot 7 — mode CLI : mises à jour, inventaire et profils

Trois nouvelles commandes, pensées pour les techniciens et le déploiement en
parc — le créneau tenu par Ninite et Patch My PC.

- **`--check-updates [--json]`** — liste les mises à jour proposées par WinGet,
  enrichies du nom du catalogue OwlSetup et d'un indicateur `inCatalog`. Le
  **code de sortie vaut `1` s'il existe au moins une mise à jour**, `0` sinon :
  de quoi piloter une tâche planifiée sans analyser la sortie.
- **`--update [<id>,...]`** — met à jour les identifiants demandés ; sans
  argument, tout ce que WinGet propose. Respecte `--dry-run` et `--silent`.
- **`--export-profile <fichier>`** — écrit un profil `.pcsetup.json` **au même
  format que l'export de l'interface**, donc relisible par `--apply` et par la
  restauration de configuration de l'application. L'inventaire vient de
  `winget export` (JSON), plus fiable que l'analyse d'un tableau. Le profil
  distingue les logiciels détectés (`installedPackages`) de ceux présents au
  catalogue OwlSetup (`selectedPackages`).

### `--apply` amène réellement la machine à l'état décrit

`--apply` installait les paquets manquants mais laissait les paquets déjà
présents dans leur version d'origine. Il exécute désormais, entre l'installation
et le nettoyage, une **passe de mise à jour** limitée aux paquets de la
configuration que WinGet signale comme améliorables (donc rapide).

### Détails techniques

- Nouveau `CliCaptureWinget` : exécute WinGet en **capturant** sa sortie pour
  l'analyser, là où `CliRunWinget` ne fait que l'afficher.
- ``--check-updates`` réutilise l'**analyseur tabulaire unique**
  `ParseWingetTable` (passé `internal` pour être accessible depuis le mode CLI)
  — pas de second analyseur maison. Les lignes de résumé de WinGet, découpées
  par les positions de colonnes, sont écartées via l'absence de version
  disponible.
- `tests/Test-CliMode.ps1` étendu : marqueurs des trois verbes **et** exécution
  réelle sans effet de bord — validité du JSON, cohérence du code de sortie
  avec le nombre de mises à jour, identifiants conformes, et **boucle complète
  `--export-profile` → `--apply --dry-run`**.
- `README.md` : nouvelle section « Command line (no interface) » avec les codes
  de sortie et un exemple de clonage d'un poste vers un autre.
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  OK, l'interface démarre. Testé sur cette machine : `--check-updates` (2 mises
  à jour réelles), `--check-updates --json`, `--update --dry-run`,
  `--export-profile` (61 logiciels détectés, 20 du catalogue) puis relecture
  par `--apply`.

### Reste au lot 7

Auto-élévation propre (relais du code de sortie vers l'appelant) pour les
installations machine, et page dédiée du site.

## [4.0.0-beta.40] - 2026-08-29

### Thème clair + « Contraste renforcé » : les cartes restaient noires

Voici pourquoi certains panneaux restaient sombres alors que le thème clair
était correct — ce n'était pas un oubli de teinte, mais un conflit d'héritage
de variables CSS.

- `body.high-contrast` (option **Accessibilité → Contraste renforcé**)
  redéclare `--panel:#101b2a` **sur `<body>`**. Or une variable CSS est héritée
  du **déclarant le plus proche** : `<body>` étant plus proche que `<html>`,
  cette valeur sombre écrasait le `--panel` clair de
  `:root[data-theme="light"]` pour tout le sous-arbre.
- La surcharge claire du mode contraste ne corrigeait que `--line`, `--muted`
  et `--text` — **ni `--panel`, ni `--bg`, ni `--panel-2`**. Résultat : tous
  les éléments dont le fond vient de `var(--panel)` s'affichaient noirs en
  thème clair : cartes du Centre des opérations, résumé de « Tout mettre à
  jour », panneau « Santé des applications », étapes du guide, lignes
  d'opération, options de nettoyage…
- Correction : la surcharge claire redonne désormais **tous** les jetons de
  surface (`--bg`, `--panel`, `--panel-2`, `--line`, `--muted`, `--text`), avec
  des valeurs adaptées au contraste renforcé (panneaux blancs, texte quasi
  noir, bordures marquées). Le texte secondaire du mode contraste
  (`body.high-contrast .view p / small`) passe également en teinte foncée.
- Vérifié sur les **4 combinaisons** (clair, clair + contraste, sombre, sombre
  + contraste) : jetons cohérents, thème sombre inchangé. En thème clair avec
  contraste renforcé : **0 texte à faible contraste** et 6 fonds sombres, tous
  volontaires.
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  OK, l'application démarre.

## [4.0.0-beta.39] - 2026-08-29

### Thème clair — audit des contenus construits en JavaScript

Les audits précédents ne voyaient que le HTML statique. Cette passe injecte des
**données de test** (opérations terminées, échouées, interrompues, résolues)
pour faire réellement rendre les listes construites en JavaScript, puis mesure
le contraste texte/fond sur **les 14 vues**.

- **Centre des opérations** : le libellé vert « Résultat confirmé après
  contrôle » (`.operation-row em`) était illisible sur fond clair (contraste
  1,6) — passé en vert foncé. Même correctif pour `.app-health-item.healthy`.
- **Guide / Aide** : les libellés de champ du formulaire de signalement
  (`.feedback-fields label>span`) étaient trop pâles.
- **Applications installées** : aucun défaut restant.
- **Autres vues** : ~25 textes d'accent corrigés — carte de sécurité
  (« Vérification… » en blanc), progression des outils, intro du catalogue,
  découverte WinGet, anneau du score, garanties des Paramètres, résumé de la
  file, et l'ensemble du nettoyage des navigateurs (statistiques, préréglages,
  catégories, données protégées, bandeau de sécurité).
- **Correction de spécificité** : certaines règles de base sont portées par un
  identifiant (`#catalog .catalog-search-intro small`) et l'emportaient sur la
  couche claire ; ces cas sont désormais surchargés à spécificité égale.
- **Résultat final : 0 texte à faible contraste** sur les 14 vues, et
  6 fonds sombres restants, tous volontaires (boutons d'action pleins, texte
  dégradé du titre, anneau du score de sécurité).
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  OK, l'application démarre.

## [4.0.0-beta.38] - 2026-08-29

### Correction de fond : l'interface restait en cache (cause des « thèmes qui ne changent pas »)

- **`index.html` référençait ses ressources avec un jeton figé**
  (`styles.css?v=3.7.0-beta.57`), identique depuis la bêta 1 et jamais réécrit
  par `build.ps1`. WebView2 sert l'interface via `https://pcsetup.local/` et
  met en cache **par URL** : après une mise à jour, l'ancienne feuille de style
  (et potentiellement l'ancien `app.js`) pouvait continuer d'être affichée.
  C'est ce qui expliquait les zones sombres persistantes signalées après les
  bêtas 35/36/37 alors que le CSS livré était correct.
- `build.ps1` réécrit désormais ce jeton avec la version compilée pour
  `styles.css`, `app.js`, `i18n.js` et `catalog.generated.js`. Chaque build
  produit donc des URL neuves : plus aucune ressource d'interface périmée après
  une mise à jour.

### Logos invisibles sur fond clair

- `gpt4all.svg`, `lmstudio.svg`, `pinokio.svg` et `sevenzip.svg` étaient des
  tracés **blancs** (prévus pour un fond sombre) : recolorés avec leur couleur
  de marque (`#6e5bd5`, `#6c63ff`, `#e34b51`, `#596477`), après les trois de la
  bêta 37.
- Contrôle exhaustif : les **93 logos du catalogue** sont rendus puis mesurés
  en luminance réelle — plus aucun n'est trop pâle pour être lisible.
  `jan.svg` est un faux positif de l'analyse statique (son blanc est un masque
  de luminance, pas une couleur visible) et reste inchangé.

### Thème clair

- Balayage final : **5 éléments sombres subsistent**, tous volontaires (boutons
  d'action pleins, texte dégradé du titre d'accueil, anneau du score de
  sécurité).
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  OK, l'application démarre.

## [4.0.0-beta.37] - 2026-08-29

### Thème clair — 3ᵉ passe : balayage exhaustif + logos recolorés

Les deux premières passes corrigeaient ce que je voyais à l'écran ; il restait
des composants jamais rendus pendant l'audit (listes construites en JavaScript,
états d'erreur, dialogues rarement ouverts). Cette passe s'appuie sur un
**audit du CSS lui-même**, pas du rendu.

- **Audit `styles.css` automatisé** : chaque règle qui peint un fond sombre ou
  un texte très clair est comparée à l'existence d'une contrepartie
  `:root[data-theme="light"]`. Résultat initial : **236 règles sombres sans
  équivalent clair**.
- **Couche claire générée** (~150 règles) : la teinte de chaque règle est
  dérivée de la couleur d'origine (neutre / bleu / cyan / vert / ambre / rouge
  / violet) et traduite dans la palette pastel du thème clair. Sont exclus les
  accents volontaires (boutons d'action pleins, halos, états cochés).
  Couverture : listes d'analyse, résultats WinGet, étapes guidées, préflight,
  journaux, rapports, notifications, opérations en arrière-plan, quarantaine,
  page « Installées », onboarding, aide contextuelle, écran Alpha, nettoyage
  des navigateurs, disque…
- **Après la passe : 236 → 7 éléments sombres restants**, dont 6 sont des
  boutons d'action pleins volontaires. Le 7ᵉ
  (`.troubleshooting-help .text-button`) a été corrigé à la main.
- **Logos sans couleur** : `notepadpp.svg`, `gog.svg` et `ubisoft.svg` étaient
  des tracés **blancs** (prévus pour un fond sombre) — donc invisibles sur le
  cadre clair. Recolorés avec leur couleur de marque (`#72a13e`, `#883edb`,
  `#149dda`), lisibles sur les deux thèmes.
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert (dont
  `Test-AppLogoCoverage`, `Test-HealthGaugeAndAppIcons`), intégrité SHA-256 OK,
  l'application démarre.

## [4.0.0-beta.36] - 2026-08-29

### Thème clair — 2ᵉ passe (contraste)

Suite des retours après la bêta 35 : ~30 correctifs supplémentaires, cette fois
axés **contraste du texte** (pas seulement les fonds).

- **Sous-menu de navigation** : les titres (« Centre de sécurité »,
  « Quarantaine »…) restaient en texte quasi blanc sur le panneau clair —
  passés en `#22344f` ; petits textes et survol ajustés.
- **Bandeau « confiance » de l'accueil** (`.home-trust`) : les 4 cellules
  étaient encore noires (grille à `gap:1px`, seule la grille avait été traitée)
  — cellules en `#f6f8fb`, pastilles vertes pastel.
- **Notice « exécutable non signé »** de la modale de mise à jour : fond et
  texte ambre sombres → version claire.
- **Pastilles à texte invisible** (« 100 % local », « INCLUS »,
  « Recommandé », « À vérifier ») : texte de la même teinte que le fond →
  teintes foncées lisibles.
- **Titres quasi blancs** : onglets de portée du catalogue, découverte WinGet,
  états vides (« Aucun logiciel trouvé »), carte système de la barre latérale,
  pastille d'état.
- **Accents cyan/vert vifs** du nettoyage des navigateurs (nombres, libellés)
  et **liens** (`Site officiel`, `Voir le projet GitHub`) → teintes foncées.
- **Pastilles d'icône manquantes** (cyan / vert / orange sur l'accueil, les
  mises à jour, le nettoyage) → versions pastel.
- Méthode : audit de contraste automatisé (ratio texte/fond) sur toutes les
  vues + modales, à l'écran.
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  OK, l'application démarre.

## [4.0.0-beta.35] - 2026-08-29

### Thème clair — passe complète des surfaces

- **Audit visuel réel de toutes les vues et fenêtres** en thème clair (le
  problème « trop flash » / zones sombres résiduelles signalé après la bêta 30
  n'avait jamais été vérifié à l'écran). ~150 éléments rendus sombres sur fond
  clair recensés.
- **~110 nouvelles règles `:root[data-theme="light"]`** dans `styles.css`,
  regroupées par famille : toutes les fenêtres modales (`.install-dialog` et
  ses variantes : mise à jour, installation guidée, nettoyage, désinstallation
  groupée, rapport, journal, aperçu télémétrie, détail du score…), les
  panneaux « teinte bleue/verte/ambre/rouge » (préflight, sécurité, opérations,
  résidus…), les grands panneaux opaques (outils, recommandations sécurité,
  guide, options avancées du catalogue, profils), le centre de notifications,
  les opérations en arrière-plan, les toasts, l'onboarding, les cartes de
  profil de l'accueil (`.preset`), le widget de santé, l'entretien du disque,
  les bascules, le sous-menu de navigation, et les pastilles d'icône colorées
  (bleu / vert / violet / cyan / ambre) déclinées en versions pastel.
- Palette inchangée depuis la bêta 30 (« bleu ardoise atténué ») ; cette passe
  applique cette palette **partout** au lieu de la couche partielle
  précédente.
- Aucun changement en thème sombre (couche purement additive, `:root[data-theme
  ="light"] X` l'emporte sur `X` par spécificité).
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert (dont
  `Test-ThemePreference`, `Test-TypographyConsistency`), intégrité SHA-256 des
  5 ressources OK, l'application démarre.

## [4.0.0-beta.34] - 2026-08-29

### Lot 5 — canal « préversions » de la mise à jour in-app

- **Nouvelle option Paramètres → « Recevoir les préversions » (`#prereleaseOptIn`).**
  Stockée localement (`owlsetup-prerelease-v1`), incluse dans la sauvegarde
  complète des préférences. Décochée par défaut.
- `check-app-update` / `install-app-update` transmettent maintenant le drapeau
  `prerelease`. Côté hôte : surcharge `GetLatestRelease(bool includePrerelease)`
  — à `false`, `/releases/latest` (stables uniquement, inchangé) ; à `true`, on
  liste `/releases` et on retient le tag le plus récent selon
  `CompareAppVersions` (les `X.Y.Z-beta.N` sont donc éligibles).
- `Test-SelfUpdate.ps1` étendu (option, clé de stockage, surcharge,
  transmission du drapeau). 138 tests beta.
- **`release.yml` publie désormais les préversions.** Un tag
  `vX.Y.Z-(alpha|beta|rc).N` est accepté, compilé sur le bon canal
  (`-Channel beta`/`alpha` + `-PrereleaseLabel`), publié en **prerelease
  GitHub** (`gh release create --prerelease --latest=false`) ; le contrôle
  final « ni brouillon ni préversion » distingue maintenant les deux cas. Les
  tags `X.Y.Z` restent des Releases stables « latest », inchangées.
- **Pratique retenue :** on ne tague que les _release candidates_ (`rc.N`)
  avant une stable, pas chaque bêta. `build-beta.ps1` reste local (« sans
  publication »).
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  des 5 ressources OK, l'application démarre.

## [4.0.0-beta.33] - 2026-08-28

### Lot 5 — mise à jour in-app activée (sans signature de code)

- **`InstallAppUpdate` n'est plus bloqué.** La mécanique existait déjà mais
  était désactivée « tant qu'OwlSetup n'a pas de signature reconnue ». Elle est
  maintenant active, l'intégrité reposant sur : l'**empreinte SHA-256** de
  l'exécutable vérifiée contre l'asset `SHA256.txt` de la Release, le préfixe
  d'URL `github.com/OwlNetGeekFR/OwlSetup/releases/download/` verrouillé,
  l'en-tête `MZ`, et une **confirmation explicite** via la modale. OwlSetup
  restant non signé, Windows SmartScreen peut afficher un avertissement au
  redémarrage — le texte de la modale et de la carte Sécurité le disent.
- **Comparateur de versions `X.Y.Z-beta.N`.** `System.Version` ne sait pas lire
  `4.0.0-beta.32`. Nouveau `CompareAppVersions` / `ParseAppVersion` (module pur
  `beta/src/modules/app-version.js` + miroir C#, `beta/test/app-version.test.js`,
  12 tests) : ordre `X.Y.Z` puis `stable > rc > beta > alpha` puis numéro de
  préversion. `CheckAppUpdate` et `InstallAppUpdate` l'utilisent à la place de
  la comparaison `System.Version` aveugle aux préversions ; `CheckAppUpdate` ne
  court-circuite plus sur `BuildInfo.IsBeta`.
- Interface : le bouton « Installer la mise à jour » de la modale poste
  `install-app-update` (il ouvrait juste la page GitHub) ; la modale se
  verrouille pendant le téléchargement / redémarrage.
- Nouveau `tests/Test-SelfUpdate.ps1` : garde les contrôles d'intégrité
  (SHA-256, préfixe d'URL, en-tête MZ) et vérifie le comparateur par réflexion.
  `tests/Test-SecurityControls.ps1` : le marqueur « mise à jour désactivée »
  est remplacé par des marqueurs de vérification. 138 tests beta.
- **Pas encore fait (incrément suivant) :** case « Recevoir les préversions »
  dans Paramètres + publication réelle des bêtas en _prereleases_ GitHub.
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  des 5 ressources OK, l'application démarre.

## [4.0.0-beta.32] - 2026-08-28

### Lot 1 — durcissement du chemin de contribution au catalogue

- **Une seule source de vérité pour les logos.** Le champ `logo` de
  `beta/catalog/apps.json` est désormais conservé dans `catalog.generated.js`
  et lu directement au runtime. La table `appLogos` (93 entrées, en tête de
  `app.js`) est **supprimée** — elle dupliquait `apps.json`. Ajouter une
  application = 1 entrée JSON (avec `"logo": "assets/logos/<fichier>"`) + 1
  fichier, plus aucune ligne de code à toucher.
- **`build-catalog.mjs` valide le catalogue** à chaque `catalog:build` /
  `catalog:verify` : identifiants uniques, `category` dans la liste fermée,
  champ `logo` bien formé, **fichier logo présent** dans le dépôt, `count`
  cohérent. Un ajout mal formé échoue avec un message explicite.
- **Schéma resserré** (`catalog.schema.json`) : `category` devient un `enum`
  (13 valeurs), `logo` devient **obligatoire** avec un motif
  `^assets/logos/….(svg|png|ico)$`.
- Docs mises à jour : `beta/catalog/README.md` et `CONTRIBUTING.md` (section
  « Ajouter une application »). Script de migration unique
  `beta/scripts/extract-catalog.mjs` (obsolète depuis beta.11) retiré.
- Tests adaptés : `beta/test/catalog-parity.test.js` (le `logo` fait partie de
  la parité), `tests/Test-AppLogoCoverage.ps1` (lit `apps.json`),
  `tests/Test-AiCatalog.ps1` / `Test-BrowserCatalog.ps1` /
  `Test-HealthGaugeAndAppIcons.ps1` (lisent le catalogue généré). 126 tests
  beta.
- Aucun changement visible : mêmes logos, même catalogue (93 applications).
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert, intégrité SHA-256
  des 5 ressources OK, l'application démarre.

## [4.0.0-beta.31] - 2026-08-28

### Lot 2 — modules `update-heuristics` et `operations-reconcile` branchés

- **`update-heuristics`.** La liste `SELF_MANAGED_UPDATERS` (lanceurs qui
  embarquent leur propre updater : Ankama, EA, Battle.net…) et les heuristiques
  `isVersionPrefixMismatch` / `isSelfManagedUpdate` ne sont plus copiées dans
  `app.js` : elles viennent du module `beta/src/modules/update-heuristics.js`
  (6ᵉ entrée de `MODULES`). `app.js` dérive toujours le `Set` local en
  minuscules de cette constante.
- **`operations-reconcile`.** La décision « cet échec du Centre des opérations
  n'en est pas vraiment un » (tous les paquets auto-gérés, tous masqués, ou
  alerte de plus de 14 jours sans récidive) est déléguée à
  `classifyStaleFailure` du module `beta/src/modules/operations-reconcile.js`
  (7ᵉ entrée). `reconcileMaintenanceOperations` ne garde que les effets de bord
  (libellé de résolution, sauvegarde, notifications) — seuil des 14 jours et
  garde `occurrences > 1` sortent du corps de la fonction.
- Les deux modules sont purs (miroirs de `OwlSetupWebView.cs`) et couverts par
  `beta/test/update-heuristics.test.js` (10) et
  `beta/test/operations-reconcile.test.js` (13) ; `test/parity.test.js` gagne
  deux blocs « migré ». 126 tests beta.
- Aucun changement de comportement : mêmes libellés `resolvedBy`, même seuil,
  mêmes textes de résolution.
- Vérifié : `tests/Test-ReleaseCandidateReadiness.ps1` vert (dont
  `Test-MaintenanceHardening`, `Test-OperationGhostCleanup`,
  `Test-VerifiedOperationStates`), intégrité SHA-256 des 5 ressources OK,
  l'application démarre.

## [4.0.0-beta.30] - 2026-08-28

### Thème clair : harmonisation « bleu ardoise atténué »

- **Palette moins « flash ».** Les jetons du thème clair sont adoucis :
  panneaux blanc cassé (`--panel:#f6f8fb` au lieu de blanc pur), fond gris-bleu
  posé (`--bg:#e6eaf0`, dégradé du corps aplani), bordures et ombres moins
  contrastées, accents désaturés (`--blue:#3a67b5`, `--cyan:#2c7c8e`,
  `--green:#2b7a5b`). L'identité « bleu OwlSetup » est conservée mais calmée.
- **Zones restées sombres corrigées.** Ajout des règles
  `:root[data-theme="light"]` pour les composants qui n'avaient que des
  couleurs sombres codées en dur : cartes « Rapports d'erreurs facultatifs »
  (`.telemetry-choice-list`, `.telemetry-summary`, `.telemetry-preview-dialog`
  et son `pre`/exclusions), détail du score (`.health-details-*`), diagnostic
  du formulaire d'aide (`.feedback-diagnostics`), cadres d'icônes du catalogue
  (`.app-icon`, `.update-app-icon`, `.report-item-icon`), centre de la jauge de
  maintenance (`.health-ring`), dialogue « protection refusée »
  (`.restore-protection-*`), nettoyage des navigateurs (`.browser-panel`,
  `.browser-card`, `.browser-category`, `.browser-overview`,
  `.browser-analysis-panel`, `.browser-data-details`…), écran Alpha
  (`.alpha-plan-toggle`, `.alpha-safety-pills`, `.alpha-mode-actions`…) et
  divers badges (`.update-selfmanaged`, `.external-catalog-notice`,
  `.build-badge`).

### Corrections signalées sur la bêta 28

- **Badge de navigation fantôme.** `renderHealth` écrivait dans
  `#updatesNavBadge` (et la carte « Applications » de la santé) le compteur
  **brut** `message.updateCount` venu de WinGet, sans retirer les mises à jour
  masquées (« Ne plus proposer »). Résultat : une pastille « Maintenance 2 »
  alors que la liste des mises à jour n'affichait rien. `renderHealth` calcule
  désormais `visibleUpdateCount` en filtrant `availableUpdates` avec
  `getIgnoredUpdateIds()`, comme `renderAvailableUpdates` et la sélection du
  plan. `#healthUpdates`, `#healthUpdatesDetail` et `setNavAlert` utilisent ce
  compteur filtré.
- **Thème clair des panneaux Windows Update.** L'inventaire et la barre
  d'installation ajoutés en bêta 15/16 n'avaient que des couleurs sombres
  codées en dur (`#16283f`, `#2c1e10`, `#8fb6e6`…), d'où des bandeaux sombres en
  thème clair. Ajout des règles `:root[data-theme="light"]` pour
  `.windows-update-row` (+ `.wu-kind`, `.wu-driver`, `.wu-sev`, `.wu-check`,
  `.wu-check-disabled`, `.wu-optional`), `.windows-update-install-bar` et
  `.windows-update-reboot-bar`.
- Le **score** de maintenance (calculé côté C#) continue de compter toutes les
  mises à jour, y compris masquées ; l'aligner sur les ignorées demande de
  transmettre la liste au natif et reste un incrément séparé.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  122 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts
  (`Test-HealthScoreTransparency` et `Test-ThemePreference` inclus).

## [4.0.0-beta.28] - 2026-08-28

### Lot 2 — module `theme` branché

- La **décision** du thème (`normalizeThemePreference`, `resolveTheme`,
  `THEME_PREFERENCES`) vient du module `beta/src/modules/theme.js` (5ᵉ entrée
  de `MODULES`). `getThemePreference` / `applyThemePreference` /
  `saveThemePreference` gardent leurs **effets de bord** dans `app.js`
  (`localStorage`, `matchMedia`, `dataset` du document, sélecteurs) mais
  délèguent la logique au module.
- Le module est pur (0 DOM / stockage) et couvert par
  `beta/test/theme.test.js`.
- Aucun changement de comportement : « Selon Windows » suit toujours
  `prefers-color-scheme`, un thème imposé l'ignore, une valeur invalide
  retombe sur « system ».
- Vérifié : `tests/Test-ThemePreference.ps1` vert (application du thème résolu,
  suivi des changements Windows, export de la préférence), intégrité SHA-256
  des 5 ressources OK, l'application démarre, 122 tests beta.

## [4.0.0-beta.27] - 2026-08-28

### Lot 2 — module `redaction` branché

- `redactLogDiagnostic` et `telemetryFingerprint` n'ont plus de copie inline
  dans `app.js` : ils viennent du module `beta/src/modules/redaction.js`
  (4ᵉ entrée de `MODULES`). C'est du code **sensible à la vie privée**
  (anonymisation des journaux avant tout signalement) — le module est pur et
  couvert à 100 % par `beta/test/redaction.test.js`.
- Les règles de masquage (chemins profil, e-mails, `DOMAINE\compte`, noms de
  machine) et la longueur max (420) deviennent des constantes du module.
- `test/parity.test.js` : tous les blocs sont désormais des contrôles
  « migré » (plus d'extraction de fonction depuis `app.js`).
- Aucun changement de comportement : mêmes masquages, même empreinte
  déterministe d'incident.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  122 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.

## [4.0.0-beta.26] - 2026-08-28

### Lot 2 — module `winget-brand` branché

- `wingetInitials`, `normalizeWingetBrand`, `wingetFallbackColor` n'ont plus de
  copie inline dans `app.js` : elles viennent du module
  `beta/src/modules/winget-brand.js` (3ᵉ entrée de `MODULES`). La palette de
  couleurs de repli devient une constante partagée au lieu d'être recréée à
  chaque appel.
- `resolveWingetBrand` (reconnaissance locale des logos) reste dans `legacy.js`
  et utilise les fonctions du module.
- Test de parité `winget-brand` → contrôle « migré » ; comportement couvert par
  `beta/test/winget-brand.test.js`.
- Aucun changement de comportement : mêmes initiales, même normalisation de
  marque, même couleur déterministe.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  130 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.

## [4.0.0-beta.25] - 2026-08-28

### Correctif : désinstallation bloquée pour certains logiciels (Docker, …)

Régression introduite en 4.0.0-beta.12 avec l'analyseur de tableau winget
unique. Symptôme : « Paquet non détecté par WinGet · par identifiant exact : 0 »
à la désinstallation, alors que `winget list --id X --exact` trouve bien le
logiciel.

- Cause : sur la sortie **étroite** de `winget list --id X --exact` (version
  courte), il n'y a qu'**un seul espace** entre les en-têtes `Version` et
  `Source`. Le tokenizer d'en-tête tolérait un espace simple dans un « token »
  (pour les valeurs type `< 1.2.3`) et fusionnait donc `Version Source` → la
  colonne **ID** débordait jusqu'au bout de la ligne
  (`Docker.DockerDesktop 4.88.1  winget`) et était rejetée.
- Correctif : la ligne d'**en-tête** est désormais découpée sur **n'importe quel
  espace** (les titres winget sont toujours des mots simples). Le découpage des
  **lignes de données** reste par position et tolère toujours les espaces dans
  les valeurs (`< 173.0.0.13316`, `Unknown`, ids `MSIX\ …`).
- Corrigé côté C# (`WingetHeaderColumns`) **et** côté module JS
  (`beta/src/modules/winget-table.js`).
- Nouvelle capture `winget-list-narrow-fr.txt` + tests (module + réflexion sur
  l'exécutable + `tests/Test-WingetParsing.ps1`). Vérifié : sur la machine de
  test, `Docker.DockerDesktop` se résout maintenant correctement.
- 160 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.
## [4.0.0-beta.24] - 2026-08-28

### Lot 2 — module `package-id` branché

- `isValidPackageId` n'a plus de copie inline dans `app.js` : la fonction et le
  motif `PACKAGE_ID_PATTERN` viennent du module
  `beta/src/modules/package-id.js` (2ᵉ entrée de `MODULES`).
- Le test regex inline de la télémétrie
  (`/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,95}$/.test(targetPackage)`) est remplacé par
  `telemetrySafePackageId(targetPackage)` — même règle, une seule définition.
- Test de parité `isValidPackageId` → contrôle « migré » ; le comportement
  reste couvert par `beta/test/package-id.test.js` (9 tests).
- Aucun changement de comportement : même frontière de confiance UI ↔
  `winget.exe` (1ᵉʳ caractère alphanumérique obligatoire).
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  149 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.

## [4.0.0-beta.23] - 2026-08-28

### Lot 2 — premier module branché : `escapeHtml`

- `escapeHtml` n'a plus de copie inline dans `app.js` : la fonction vient
  désormais du module `beta/src/modules/escape-html.js`, inliné en tête de
  `app.js` par `build-js.mjs` (`MODULES` passe de `[]` à cette entrée).
- `stripExports` du script d'assemblage gère aussi `export default`.
- Le test de parité correspondant devient un contrôle « migré » : `app.js` ne
  contient plus `const escapeHtml =`, il contient la fonction du module.
- `tests/Test-SecurityControls.ps1` accepte les deux formes (`const` /
  `function`) pour la garantie « neutralisation HTML présente ».
- Aucun changement de comportement : même échappement des 5 caractères
  `& < > " '`.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  157 tests beta + `Test-ReleaseCandidateReadiness.ps1` verts.

## [4.0.0-beta.22] - 2026-08-28

### Lot 2 — `app.js` devient un fichier généré

Première étape du découpage du front-end. Aucun changement de comportement
attendu : c'est de l'outillage.

- `app.js` (racine) n'est plus édité à la main. Il est **assemblé** par
  `beta/scripts/build-js.mjs` : concaténation déterministe des modules purs de
  `beta/src/modules/` (aucun pour l'instant) puis de
  `beta/src/app/legacy.js` — le corps historique, déplacé **tel quel** —, le
  tout enveloppé dans une IIFE.
- Concaténation volontaire plutôt qu'un bundler : `legacy.js` apparaît
  **verbatim** dans `app.js`, ce qui préserve les 34 contrôles de présence
  PowerShell et les 53 tests de parité pendant la migration incrémentale.
- Pas de `"use strict"` ajouté : sémantique identique à l'ancien script.
- `build.ps1` régénère `app.js` quand Node est disponible (comme
  `catalog.generated.js`) ; sinon le fichier versionné sert de repli.
- Garde-fou `beta/test/bundle.test.js` : sortie déterministe, IIFE présente,
  `legacy.js` inclus verbatim, repères clés conservés. 161 tests beta.
- `beta/src/app/README.md` décrit la marche à suivre pour migrer un domaine.
- Vérifié : intégrité SHA-256 des 5 ressources OK, l'application démarre,
  `Test-ReleaseCandidateReadiness.ps1` verte. **Le rendu de l'interface reste
  à confirmer sur le PC de test** (l'IIFE change la portée des symboles).

## [4.0.0-beta.21] - 2026-08-28

### CLI : la sortie s'affiche enfin dans une vraie console

Correctif du mode ligne de commande signalé par un test réel : lancé via le shim
`OwlSetup.com` **dans une invite de commandes ou PowerShell**, `--apply`,
`--list`, etc. n'affichaient **rien du tout** (l'opération se déroulait, sans
retour visible).

- `CliAttachConsole` distinguait mal « sortie redirigée » et « aucun handle
  standard ». Un `winexe` lancé par le shim n'hérite pas de handles utilisables :
  il était traité comme redirigé et on n'écrivait nulle part.
- Désormais on ne s'abstient **que** si les deux flux vont vers un vrai tube ou
  fichier (`GetFileType` = `FILE_TYPE_PIPE` / `FILE_TYPE_DISK`). Sinon — console
  interactive ou handle nul — on rattache la console (`AttachConsole`) et on
  écrit sur le périphérique `CONOUT$` avec son encodage réel (accents corrects).
- Les redirections voulues (`OwlSetup.com … > sortie.txt`, capture par un
  script) restent intactes.
- `tests/Test-CliMode.ps1` : marqueurs `CliStdIsRealRedirect` / `CONOUT$`.
- Vérifié : sortie capturée par tube toujours OK, interface graphique OK sans
  argument, intégrité des 5 ressources OK, `Test-ReleaseCandidateReadiness.ps1`
  verte. L'affichage en console interactive est à confirmer côté testeur.

## [4.0.0-beta.20] - 2026-08-28

### CLI : `--apply` complet — simulation, nettoyage, journal

- **`--dry-run`** (sur `--install`, `--uninstall`, `--apply`) : affiche le plan
  (applications, zones de nettoyage) **sans rien changer**, code de sortie 0.
- **`--silent`** (alias `--quiet`) : sortie minimale — plus de détail ligne à
  ligne de WinGet, seulement l'état par application et le résumé ; le détail
  d'un échec reste affiché.
- **`--apply` exécute maintenant les zones de nettoyage** de la configuration
  (`cleanupChoices`) : filtrées et réordonnées sur la liste autorisée
  (`user-temp`, `windows-temp`, `recycle-bin`, `delivery`, `components`), puis
  passées au même moteur élevé que l'interface (`RunElevatedCleanupWorker`).
  Si la session n'est pas administrateur, le nettoyage est **ignoré avec un
  message** (l'installation, elle, se poursuit).
- **`--apply` écrit un journal** complet de l'opération dans
  `%LOCALAPPDATA%\PCSetup\Logs\PC-Setup-CLI-<horodatage>.log` (transcription
  intégrale, y compris le détail WinGet masqué par `--silent`).
- `--install` : `winget install` met aussi à jour un paquet déjà présent mais
  périmé (comportement WinGet) — libellé et aide ajustés.
- `tests/Test-CliMode.ps1` étendu : `--dry-run` (plan affiché, rien d'installé,
  entrées invalides filtrées), marqueurs `--silent` / nettoyage / journal.
- Vérifié : `--apply --dry-run` et `--apply --silent` (installation +
  désinstallation réelles de 7zr en test), interface OK sans argument,
  intégrité des 5 ressources OK, `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.19] - 2026-08-27

### CLI : `--apply`, `--list --json`, et un shim console qui « juste marche »

Deuxième incrément du mode ligne de commande.

- **`OwlSetup.exe --apply <config.pcsetup.json>`** rejoue une configuration
  exportée par l'interface : installe `selectedPackages` (repli sur
  `installedPackages`), ignore les zones de nettoyage avec un message. Le
  format `pc-setup-configuration` est validé ; les identifiants passent la même
  regex que partout ailleurs.
- **`OwlSetup.exe --list --json`** : catalogue intégré en JSON compact
  (`[{"id","name","category"}, …]`), pour MDM / scripts.
- **`OwlSetup.com`** — nouveau shim console livré à côté de `OwlSetup.exe`.
  `.com` passe avant `.exe` dans `PATHEXT`, donc `OwlSetup --install X` exécute
  le shim, qui relaie vers l'exe voisin et **attend sa fin** : depuis
  PowerShell, `& OwlSetup …` renseigne enfin `$LASTEXITCODE` sans
  `Start-Process -Wait`. `build.ps1` le compile ; `build-beta.ps1` le signale
  dans `BETA-INFO.txt`.
- `CliAttachConsole` ne rattache plus de console quand la sortie est déjà
  redirigée (tube / fichier / shim) — sinon l'affichage partait dans un tampon
  invisible.
- `tests/Test-CliMode.ps1` étendu : `--apply` (fichier absent / mauvais format
  → code 2, aucune installation), `--list --json` (JSON valide), shim `.com`
  (`& OwlSetup.com --version` → `$LASTEXITCODE` = 0).
- Vérifié : les verbes fonctionnent (`--apply` a installé puis désinstallé
  7zr + Notepad++ en test), l'interface démarre toujours sans argument,
  intégrité des 5 ressources OK, `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.18] - 2026-08-27

### Mode ligne de commande (sans interface) — style Ninite

`OwlSetup.exe` accepte désormais des options : lancé sans argument il ouvre son
interface, lancé avec une option il agit en console et rend un code de sortie.

```
OwlSetup.exe --install VideoLAN.VLC,7zip.7zip,Mozilla.Firefox
OwlSetup.exe --uninstall 7zip.7zip
OwlSetup.exe --list [filtre]        # catalogue intégré
OwlSetup.exe --search vlc           # source WinGet
OwlSetup.exe --version | --help
```

- `--install` / `--uninstall` : boucle WinGet silencieuse
  (`--silent --accept-package-agreements --accept-source-agreements
  --disable-interactivity`), résumé `N réussie(s), M en échec`, code de sortie
  `0` (succès), `1` (au moins un échec), `2` (usage), `3` (WinGet absent).
  Identifiants validés par la même regex que le reste de l'hôte.
- `--list` lit le catalogue **embarqué** (aucune connexion) ; filtre par
  sous-chaîne sur id / nom / catégorie.
- L'exécutable reste `winexe` : il **rattache la console** de l'appelant pour
  écrire sa sortie. Depuis un script PowerShell, utiliser
  `Start-Process … -Wait -PassThru` pour attendre la fin et lire `.ExitCode`
  (rappel affiché par `--help`).
- Nouveau `tests/Test-CliMode.ps1` : marqueurs + exécution réelle des verbes
  sans effet de bord (`--version`, `--help`, `--list`, options invalides).
- Vérifié : `--install`/`--search`/`--list` fonctionnels ; l'interface
  graphique démarre toujours sans argument ; intégrité des 5 ressources OK ;
  suite `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.17] - 2026-08-27

### Windows Update : préversions « seeker » écartées, succès vérifié

Correctif de fond sur l'installation ajoutée en beta.16, révélé par un test réel :
une **mise à jour de préversion optionnelle** (« Télécharger et installer » dans
les Paramètres) était acceptée par l'API WUA (`resultCode 2`) **sans jamais être
appliquée** — Windows ne pilote ce type de mise à jour que par son propre
orchestrateur.

- Les mises à jour **`BrowseOnly`** (préversions / cumulatives optionnelles) sont
  désormais **listées mais non installables** dans OwlSetup : pas de case à
  cocher, badge « optionnel · Windows Update », exclues de la sélection par
  défaut. Le script d'installation élevé les refuse aussi (garde-fou).
- **Succès vérifié** : après `Install()`, l'hôte contrôle l'état réel
  (`IUpdate.IsInstalled`) de chaque mise à jour. Un `resultCode 2` sans
  installation effective **ni** redémarrage en attente est signalé comme
  « Windows a signalé un succès mais la mise à jour n'est pas appliquée »
  au lieu d'un faux succès.
- **Détection de redémarrage fiabilisée** : on croise le drapeau de
  `IInstallationResult` avec `Microsoft.Update.SystemInfo.RebootRequired` et la
  clé de registre `…\WindowsUpdate\Auto Update\RebootRequired`.
- Module `windows-update.js` : `defaultWindowsUpdateSelection` exclut
  `browseOnly` ; `parseWindowsUpdateInstallMarkers` distingue `ok` (réellement
  appliqué) de `notApplied`. 157 tests beta.
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.16] - 2026-08-27

### Windows Update : installer une sélection (composants + pilotes au choix)

Deuxième incrément du lot « Windows Update réel ». OwlSetup peut maintenant
**télécharger et installer** des mises à jour Windows, pas seulement les lister.

- Panneau **« Composants et pilotes Microsoft »** : chaque ligne a une case à
  cocher. **Les composants sont cochés par défaut, pas les pilotes** (choix
  explicite, un pilote de Windows Update pouvant être plus ancien que celui du
  fabricant). Bouton **« Installer la sélection »** avec la taille cumulée.
- `InstallWindowsUpdates` (hôte) : télécharge (`IUpdateDownloader`) puis installe
  (`IUpdateInstaller`) via l'API WUA **avec élévation** (relance UAC). Le travail
  est délégué à un script PowerShell élevé qui journalise un résultat par mise à
  jour (`PCSETUP_WUI_ITEM|` / `PCSETUP_WUI_END|`), repris ensuite par
  l'application. Les identifiants sont validés comme GUID avant l'élévation.
- **Bannière « redémarrage nécessaire »** affichée quand au moins une mise à
  jour l'exige.
- L'installation est protégée par le **point de restauration optionnel**
  (comme la désinstallation / le nettoyage).
- Module `beta/src/modules/windows-update.js` étendu :
  `defaultWindowsUpdateSelection` (pilotes exclus), `parseWindowsUpdateInstallMarkers`.
  155 tests beta. `tests/Test-WindowsUpdateInventory.ps1` couvre aussi le chemin
  d'installation (marqueurs, élévation, GUID, redémarrage, pilotes non cochés).
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte. L'installation réelle reste à
  valider sur le PC de test.

## [4.0.0-beta.15] - 2026-08-27

### Windows Update : inventaire réel (composants + pilotes)

Premier incrément du lot « Windows Update réel ». Jusqu'ici OwlSetup se
contentait de **déclencher** une recherche Windows Update à l'aveugle
(`DetectNow`) sans jamais dire ce qui était en attente.

- Nouveau `SearchWindowsUpdates` (hôte) : interroge l'API WUA
  (`Microsoft.Update.Session`) en **lecture seule** — ne télécharge ni
  n'installe rien — et renvoie la liste des mises à jour en attente :
  titre, article KB, taille, gravité, déjà téléchargée ou non, et
  **composant / pilote**. Sortie du script forcée en ASCII (`\uXXXX`) pour
  ne pas casser les accents sur un flux redirigé.
- Onglet **Tout mettre à jour** : nouveau panneau « Composants et pilotes
  Microsoft » avec bouton *Analyser* et *Ouvrir Windows Update*. La liste
  distingue visuellement composants et pilotes. L'installation reste faite
  par Windows Update (l'écriture arrivera dans un incrément suivant).
- L'étape Windows Update de « Tout mettre à jour » annonce désormais le
  nombre réel de mises à jour en attente (dont pilotes) au lieu d'un simple
  « recherche lancée ».
- Module testé `beta/src/modules/windows-update.js` (11 tests) +
  `tests/Test-WindowsUpdateInventory.ps1` (marqueurs, câblage interface, et
  recherche WUA réelle par réflexion). 148 tests beta.
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.14] - 2026-08-27

### WinGet : un seul point d'entrée pour le CLI

- Les ~24 appels dispersés à `RunHiddenProcess("winget.exe", …)` passent
  désormais par **`RunWingetCli(arguments, report)`** (+ surcharge *streaming*
  `onLine`). Un seul endroit où brancher plus tard journalisation, délai
  maximal ou télémétrie, et plus de risque qu'un nouvel appel oublie de
  résoudre le vrai `winget.exe`.
- La résolution du chemin (`ResolveWingetPath` : alias `WindowsApps` puis
  paquet `Microsoft.DesktopAppInstaller`, avec message explicite si absent)
  est retirée de `RunHiddenProcess` — qui redevient un simple lanceur de
  processus — et centralisée dans `RunWingetCli`. Comportement identique :
  `winget` introuvable lève la même exception qu'avant.
- `tests/Test-WingetParsing.ps1` : vérifie qu'aucun appel ne contourne
  `RunWingetCli` (zéro `RunHiddenProcess("winget.exe", …)` restant) et que les
  deux surcharges existent (contrôle par réflexion sur l'exécutable).
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.13] - 2026-08-27

### WinGet : les vérifications d'installation passent par la colonne ID

- Suite du chantier « analyseur unique » : les derniers points qui lisaient la
  sortie de `winget list` à la main sont migrés sur `ParseWingetTable`.
  - `ParseWingetListPackageIds` (résolution de l'identifiant à désinstaller)
    n'utilise plus `Regex.Split(\s{2,})` — fragile dès qu'un nom contient deux
    espaces consécutifs.
  - `VerifyPackageInstallation`, `IsPackageStillInstalled` et
    `PromoteVerifiedWingetPackages` ne cherchent plus l'identifiant par
    `IndexOf` / regex sur le texte brut mais via un nouveau contrôle
    `WingetTableContainsId` qui compare **la colonne ID** ligne par ligne.
    Un identifiant apparaissant dans un nom d'application ou un chemin ne
    déclenche plus de faux positif.
- Miroir JS : `wingetTableHasId(output, id)` dans
  `beta/src/modules/winget-table.js` (+ 3 tests). 137 tests beta.
- `tests/Test-WingetParsing.ps1` étendu : marqueurs des sites migrés +
  vérification par réflexion de `WingetTableContainsId` sur une capture réelle.
- Vérifié : la bêta démarre, intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.12] - 2026-08-27

### WinGet : un seul analyseur de sortie tabulaire

- Les analyseurs regex maison de `winget upgrade` et `winget search` sont
  remplacés par **un analyseur unique** (`ParseWingetTable`) qui lit la ligne
  d'en-tête pour retrouver la position de chaque colonne, puis découpe par
  positions. Miroir JS testé sur de vraies captures
  (`beta/src/modules/winget-table.js`, 12 tests).
- Corrige au passage : les paquets dont la **version installée contient un
  espace** (`< 173.0.0.13316`, ex. Ubisoft Connect) n'étaient pas listés du tout
  par l'ancienne regex ; ils apparaissent maintenant (et sont gérés comme les
  autres lanceurs auto-gérés).
- Gère les en-têtes localisés (Nom/ID/Version/Disponible/Source/Correspondance),
  `Unknown`, les colonnes vides et les identifiants `MSIX\` / `ARP\`.

## [4.0.0-beta.11] - 2026-08-27

### Catalogue : `apps.json` devient la source de vérité

- Le bloc de ~90 applications codé en dur dans `app.js` est **retiré**.
  `app.js` charge désormais le catalogue depuis `catalog.generated.js`
  (`window.PC_SETUP_CATALOG`), lui-même généré depuis
  `beta/catalog/apps.json` et vérifié par le contrôle d'intégrité SHA-256.
- Ajouter ou modifier une application = éditer **un seul fichier de données**
  (`beta/catalog/apps.json`, validé par un schéma JSON) + son logo. Plus rien à
  toucher dans `app.js`. Voir `CONTRIBUTING.md`.
- `tools/check-catalog.mjs` valide `apps.json` et sa cohérence avec le script
  généré. Nouveau test de parité `apps.json` ↔ `catalog.generated.js`
  (nombre, ordre d'affichage, champs).
- `beta/csharp/OwlSetup.csproj` **validé** par `dotnet build` : compile sans
  avertissement, l'exécutable démarre et passe le contrôle d'intégrité.
  Corrections : références `System.IO.Compression` manquantes, ressource
  `catalog.generated.js` absente, DLL WebView2 désormais embarquées.
- Vérifié : la bêta démarre (3/3), intégrité des 5 ressources OK, suite
  `Test-ReleaseCandidateReadiness.ps1` verte.

## [4.0.0-beta.10] - 2026-08-27

### Consolidation + tests

- Ajoute des tests de comportement pour les correctifs des bêtas précédentes :
  - `beta/` : nouveau module pur `operations-reconcile` (résolution automatique
    des faux échecs du Centre des opérations) avec tests unitaires + parité avec
    `app.js` ; la liste des lanceurs auto-gérés est désormais vérifiée en
    **triple parité** (module ≡ hôte C# ≡ `app.js`). 121 tests.
  - `tests/Test-MaintenanceHardening.ps1` et `tests/Test-SecurityHardening.ps1`
    gardent la présence des correctifs (identifiants durcis, `--include-unknown`,
    lanceurs auto-gérés, liste d'ignorés, réconciliation des opérations,
    détection AV/pare-feu indéterminée, suppression robuste de quarantaine,
    `longPathAware`, etc.). Exécutés par la suite de préparation, donc en CI.
- Retire `app-leftovers` de la dernière liste où elle subsistait
  (`RunElevatedCleanupWorker`).

## [4.0.0-beta.9] - 2026-08-27

### Consolidation : trois finitions

- **Notifications** : les messages d'échec s'affichent avec une icône rouge « ✕ »
  (et non plus le « ✓ » vert générique). L'icône suit le type : succès,
  information, avertissement, erreur.
- **Réparer WinGet** ne réinitialise plus les sources en aveugle : une simple
  actualisation est tentée d'abord ; la réinitialisation complète n'intervient
  qu'en cas d'échec, et les **sources personnalisées** sont sauvegardées puis
  ré-ajoutées automatiquement (celles qui échouent sont listées).
- **Point de restauration** : plus de modification du registre pour contourner
  la limite Windows de 1 point / 24 h (fragile si le processus est interrompu).
  Quand Windows refuse pour cette raison, OwlSetup indique qu'un point récent
  protège déjà le PC, et une opération protégée se poursuit normalement.

## [4.0.0-beta.8] - 2026-08-27

### Quarantaine : suppression et restauration robustes

- Corrige « Action impossible · Impossible de trouver une partie du chemin
  d'accès » lors de la suppression ou de la restauration d'un dossier en
  quarantaine (constaté sur des caches CapCut). Causes traitées : fichiers en
  **lecture seule / cachés / système**, arborescences **très profondes**
  (> 260 caractères), fichiers verrouillés.
- Nouvelle suppression récursive en trois temps : voie normale, puis récursion
  manuelle avec remise à zéro des attributs, puis `rd /s /q` en préfixe `\\?\`.
- La restauration bascule sur `robocopy /MOVE` quand le déplacement direct
  échoue à cause de la profondeur du dossier.
- Quand des fichiers restent (application encore ouverte), le message le dit
  clairement au lieu d'un échec générique.
- `OwlSetup.manifest` : `longPathAware` activé.

## [4.0.0-beta.7] - 2026-08-27

### Onglet Sécurité : corrections et améliorations

- **Antivirus / pare-feu** : quand ni le Centre de sécurité Windows ni le
  registre ne permettent de conclure, OwlSetup affiche « État indéterminé » au
  lieu d'un faux « Protection active ». Aucun avertissement n'est créé dans ce
  cas ; le détail explique comment vérifier soi-même.
- **Quarantaine** : le badge du menu se masque quand elle est vide (au lieu
  d'afficher « 0 »). Les éléments sont triés par date réelle et affichent leur
  **taille** et leur **ancienneté**.
- **Quarantaine** : nouveau bouton « Supprimer les éléments de plus de 30 jours »
  (avec confirmation) pour vider l'ancienne quarantaine d'un coup.
- **Centre de sécurité** : la version de WinGet n'est plus relue en lançant
  `winget.exe` à chaque rafraîchissement (mise en cache 10 min). Le panneau
  indique l'heure de la dernière vérification.
- Le score n'attribue plus les points antivirus / pare-feu quand leur état n'a
  pas pu être déterminé.

## [4.0.0-beta.6] - 2026-08-27

### Centre des opérations : effacer les erreurs qui n'en sont plus

- À l'ouverture du Centre des opérations, les échecs de mise à jour qui ne sont
  pas de vraies erreurs sont **classés « résolu » automatiquement** : logiciels
  qui se mettent à jour eux-mêmes (Ankama Launcher…), mises à jour masquées via
  « Ne plus proposer », ou alertes de plus de 14 jours sans récidive.
- Chaque échec propose maintenant **« Marquer résolu »** à côté de « Corriger ».
- Bouton d'en-tête **« ✓ Tout classer résolu »** (visible s'il reste des échecs)
  et **« Effacer les terminées »** pour alléger l'historique.
- Une croix **✕** retire une opération terminée, résolue ou interrompue de la
  liste.
- Quand une opération est classée résolue, la **notification d'avertissement
  liée** passe en « résolu » au lieu de rester affichée.
- Le compteur du menu Maintenance reflète ces changements immédiatement.

## [4.0.0-beta.5] - 2026-08-27

### Onglet Maintenance : 7 correctifs rapides (voir REVUE-MAINTENANCE.md)

- **Mises à jour** : `winget upgrade` est désormais interrogé avec
  `--include-unknown`. Les logiciels dont WinGet ignore la version installée sont
  affichés (« version installée : inconnue ») et traités sans erreur, comme les
  lanceurs auto-updatés.
- **Pilotes** : les textes n'affirment plus qu'OwlSetup installe les pilotes. Ils
  indiquent qu'OwlSetup **ouvre Windows Update**, où Microsoft propose composants
  et pilotes.
- **Nettoyage des navigateurs** : une catégorie sans effet pour le moteur
  sélectionné (cache multimédia et historique côté Firefox) est désormais
  grisée et décochée au lieu d'être proposée pour rien.
- **Libérer de l'espace** : l'option « Résidus d'applications » — inactive dans
  le nettoyage intégré — est retirée. La désinstallation vérifiée (onglet
  Applications) reste le chemin pour les résidus.
- **Point de restauration** : contrôle de la protection système, neutralisation
  temporaire de la limite Windows de 1 point / 24 h, et vérification que le point
  a réellement été créé (fini le « Point créé » quand rien n'a été fait).
- **Messages de blocage** : plus de référence codée en dur à « OBS » ; le libellé
  s'adapte au logiciel réellement concerné.
- **Mesure de taille** : quand un dossier dépasse 200 000 fichiers, l'analyse
  l'indique (« mesure partielle ») au lieu de sous-estimer en silence.

## [4.0.0-beta.4] - 2026-08-27

### Masquer une mise à jour définitivement

- Chaque mise à jour proposée peut être masquée (bouton ✕ « Ne plus proposer »).
  Le choix est conservé localement (`owlsetup-update-ignore-v1`).
- Les mises à jour masquées ne comptent plus dans le badge de navigation, la
  sélection ni la notification.
- Une barre « N mise(s) à jour masquée(s) · Réafficher » permet de tout
  restaurer d'un clic.
- Utile pour les logiciels qui se mettent à jour eux-mêmes (Ankama Launcher…)
  que WinGet reproposera toujours.

## [4.0.0-beta.3] - 2026-08-27

### Mises à jour : logiciels qui se mettent à jour eux-mêmes

- Reconnaît les lanceurs à mise à jour intégrée (Ankama Launcher, EA app,
  Battle.net, Epic Games, Ubisoft Connect, GOG Galaxy, Steam, Discord, Riot,
  CurseForge, Amazon Games, Logitech G HUB) ainsi que les écarts de schéma de
  version (installée `3.15.2`, proposée `3.15.2.20509`).
- Pour ces logiciels, `winget upgrade` n'est plus compté comme un échec : la
  mise à jour se termine « sans avertissement » avec le message « Ouvrez
  l'application une fois pour finaliser ».
- La liste des mises à jour affiche un badge « ⟳ se met à jour seule » sur ces
  applications.
- Nouveau module testé `beta/src/modules/update-heuristics.js` (miroir de la
  logique C#, vérifié par un test de parité de la liste).

## [4.0.0-beta.2] - 2026-08-27

### Fondations 4.0 : catalogue externalisé et durcissement

- Sort le catalogue des 93 applications de `app.js` vers `beta/catalog/apps.json`
  (validé par un schéma JSON) et l'injecte au démarrage via
  `catalog.generated.js`. Le bloc `const apps` reste dans `app.js` comme repli.
- Ajoute `catalog.generated.js` à la vérification d'intégrité SHA-256 des
  ressources embarquées et à sa génération automatique dans `build.ps1`.
- Durcit la validation des identifiants de paquet : le premier caractère doit
  être alphanumérique (`^[A-Za-z0-9][A-Za-z0-9.+_-]*$`), des deux côtés de la
  frontière interface / hôte, pour écarter toute confusion avec un argument
  `winget`.
- Ajoute la couche d'outillage qualité `beta/` : ESLint, Prettier, Vitest
  (97 tests, dont un test de parité qui compare chaque module extrait à la
  version encore présente dans `app.js`), un projet MSBuild pour l'hôte C# et le
  workflow CI `.github/workflows/quality.yml`.
- Documente le plan de modernisation complet dans `beta/PLAN-AMELIORATION.md` et
  l'analyse concurrentielle dans `beta/COMPETITIVE-ANALYSIS.md`.
- Aucune modification de comportement de l'application : la suite
  `Test-ReleaseCandidateReadiness.ps1` reste verte.

## [3.7.0-beta.57] - 2026-08-02

### Désinstallation vérifiée après installation

- Corrige le bouton « Désinstaller la sélection » lorsque la sortie de `winget list` ne respecte pas exactement la mise en colonnes attendue.
- Affiche « Vérification WinGet… » pendant le contrôle, bloque les doubles clics et rétablit automatiquement le bouton en cas d’échec ou de délai dépassé.
- Écarte explicitement les applications qui ne sont plus installées ou qui ne sont pas confirmées comme gérables par WinGet.
- Ajoute une vérification rapide à la fin d’une installation et affiche les applications effectivement détectées.
- Permet de lancer immédiatement leur désinstallation individuelle depuis le résultat d’installation, avec la simulation et la confirmation de sécurité habituelles.
- Actualise automatiquement la liste des applications installées après la fin de l’opération.

## [3.7.0] - 2026-08-02

### Version stable prête à publier

- Regroupe les correctifs et améliorations validés des bêta 1 à 57 dans le canal stable.
- Ajoute la configuration initiale, le choix de la langue et du thème, ainsi qu’une navigation responsive avec menus regroupés.
- Améliore l’installation, la mise à jour et la désinstallation avec suivi en arrière-plan, réconciliation des résultats WinGet et gestion confirmée des processus bloquants.
- Ajoute le centre des opérations, l’historique local, la visionneuse de journaux et les diagnostics facultatifs anonymisés.
- Renforce les contrôles de chemins, la quarantaine réversible, la protection facultative par point de restauration et la reconnaissance des protections Windows ou tierces.
- Valide le catalogue de 93 applications, leurs sites officiels et leurs logos en couleur.
- Permet d’ouvrir les dossiers volumineux dans l’Explorateur et limite le nettoyage direct au cache `.cache`, toujours placé en quarantaine après confirmation.
- Prépare des exécutables stables sans signature numérique, accompagnés de leurs empreintes SHA-256.

## [3.7.0-beta.56] - 2026-08-02

### Gestion prudente du stockage

- Ajoute un bouton « Ouvrir » sur chaque dossier volumineux détecté afin de l'afficher directement dans l'Explorateur Windows.
- Propose « Nettoyer » uniquement pour le cache `.cache` explicitement reconnu comme sûr, jamais pour Documents, Nextcloud ou les dossiers de travail.
- Place le cache en quarantaine réversible après confirmation au lieu de le supprimer définitivement.
- Verrouille les actions natives sur les chemins issus de la dernière analyse, limités aux dossiers directs du profil et sans lien de réanalyse.
- Actualise automatiquement l'analyse du disque et la quarantaine après l'opération.

## [3.7.0-beta.55] - 2026-08-02

### Icônes des outils système

- Remplace les caractères génériques par quatre pictogrammes SVG explicites et homogènes.
- Distingue visuellement le diagnostic WinGet, la restauration, le démarrage et l’occupation du disque.
- Renforce la lisibilité grâce à des contours, dégradés et contrastes propres à chaque outil.

## [3.7.0-beta.54] - 2026-08-02

### Catalogue contrôlé

- Retire l’option avancée permettant d’ajouter librement un identifiant WinGet.
- Supprime automatiquement les anciens paquets personnalisés mémorisés localement.
- Empêche les profils de recréer des applications absentes du catalogue OwlSetup.
- Conserve les profils de sélection uniquement pour les logiciels vérifiés du catalogue.

## [3.7.0-beta.53] - 2026-08-02

### Détection des paquets personnalisés

- Un complément ou module Windows portant un nom proche n’est plus confondu avec l’application personnalisée exacte.
- Microsoft Teams Meeting Add-in n’est notamment plus présenté comme l’application Microsoft Teams installée.
- La carte affiche désormais « Composant associé » avec une explication lorsque seul un élément apparenté est trouvé.
- Les paquets personnalisés ne deviennent désinstallables qu’après confirmation de leur identifiant exact par WinGet.

## [3.7.0-beta.52] - 2026-08-02

### Corrigé

- Les paquets ajoutés manuellement acceptent désormais un identifiant seul ou une commande WinGet complète collée dans le champ.
- La désinstallation résout l’identifiant réellement installé par WinGet avant toute suppression, avec une correspondance exacte et unique.
- Les doublons personnalisés comme `Teams` et `Microsoft.Teams` sont fusionnés lorsque l’unique paquet installé est confirmé.
- La désinstallation groupée écarte les paquets non confirmés au lieu de lancer une suppression ambiguë.

## [3.7.0-beta.51] - 2026-08-02

### Apparence claire et automatique
- Ajoute les thèmes « Selon Windows », « Sombre » et « Clair » dans Paramètres.
- Propose le choix du thème dès le guide de première configuration, sans l’imposer.
- Applique le thème clair à toute l’interface, aux menus, formulaires, fenêtres d’opération et écrans du guide.
- Conserve le choix localement et l’inclut dans l’export et la restauration des réglages.

### Logo OwlSetup embarqué
- Corrige le chemin du logo principal utilisé dans la barre latérale de l’application.
- Aligne toutes les vues sur le nom réellement extrait depuis les ressources de l’exécutable.
- Ajoute un contrôle automatique empêchant la création d’une bêta dont le logo de marque ne peut pas être chargé.

## [3.7.0-beta.50] - 2026-08-02

### Audit complet des logos
- Contrôle les 93 associations entre applications et fichiers de logo.
- Corrige les icônes identiques de CrystalDiskInfo et CrystalDiskMark avec les fichiers des dépôts officiels.
- Remplace Microsoft Copilot et Stability Matrix par leurs visuels colorés.
- Rétablit les couleurs de marque de Malwarebytes, TeamViewer, Tor Browser, Opera GX, Waterfox et Visual C++.
- Ajoute un test automatique qui bloque une bêta si un logo est absent, vide ou possède une fausse extension PNG.

## [3.7.0-beta.49] - 2026-08-02

### Logos restants et contraste
- Utilise les icônes officielles de GitHub Desktop et DBeaver Community.
- Ajoute un support clair neutre aux logos officiellement sombres (Tailscale, EA app, Rustup et Ollama).
- Conserve les couleurs et les proportions originales dans le catalogue, les mises à jour et les rapports.

## [3.7.0-beta.48] - 2026-08-02

### Logos officiels en couleur
- Remplace 52 pictogrammes monochromes par leurs variantes en couleur.
- Conserve les couleurs originales sans filtre CSS ni recoloration automatique.
- Maintient un fond neutre et des dimensions homogènes dans tout le catalogue.

## [3.7.0-beta.47] - 2026-08-02

### Couleurs officielles des applications
- Retire toute modification de saturation, de contraste ou de couleur appliquée aux logos.
- Utilise un fond neutre commun afin d’afficher fidèlement les fichiers officiels.
- Conserve uniquement une taille, un alignement et un espacement homogènes.

## [3.7.0-beta.46] - 2026-08-02

### Note de maintenance et logos
- Remplace l’ancien cercle décoratif fixe par un anneau strictement proportionnel à la note sur 100.
- Synchronise immédiatement la longueur et la couleur de l’anneau après chaque analyse.
- Uniformise le cadre, la taille, le contraste et l’ombre des logos du catalogue sans remplacer leurs couleurs officielles.
- Applique le même traitement aux mises à jour, rapports et aperçus de sélection.

## [3.7.0-beta.45] - 2026-08-02

### Protection Windows et lisibilité
- Détecte l’état agrégé des antivirus enregistrés auprès du Centre de sécurité Windows, y compris les solutions tierces.
- Détecte de la même façon les pare-feu Windows ou tiers sans modifier leur configuration.
- Conserve un contrôle de secours local lorsque le Centre de sécurité Windows est indisponible.
- Remplace les libellés spécifiques à Defender et au pare-feu Windows par des intitulés génériques et explicites.
- Simplifie la carte système avec « Redémarrage : Nécessaire » afin d’éviter la répétition « PC à redémarrer ».

## [3.7.0-preparation.1] - 2026-08-01

### Version stable préparée
- Finalise la nouvelle navigation, la configuration guidée et l’interface adaptative.
- Améliore l’installation, la désinstallation, le nettoyage et les mises à jour en arrière-plan.
- Corrige les fausses alertes WinGet, les opérations fantômes et les notifications répétées.
- Ajoute l’historique local, le centre des opérations et les diagnostics facultatifs anonymisés.
- Renforce la sécurité, la protection de restauration facultative et les explications utilisateur.
- Précise explicitement lorsqu’un redémarrage complet du PC est nécessaire.
- Valide le catalogue de 93 applications, 93 sites officiels et 89 logos sans avertissement.

## [3.7.0-rc.5] - 2026-08-01

### Confidentialité et assistance
- Conserve l’onglet « Aide et dépannage » pour le diagnostic manuel, le signalement et le suivi des réponses.
- Ajoute des rapports d’erreurs facultatifs avec trois choix : aucun envoi, confirmation préalable ou diagnostic minimal automatique.
- Désactive tout envoi par défaut et présente le choix pendant la première configuration ainsi que dans les Paramètres.
- Exclut les journaux complets, chemins de fichiers, noms d’utilisateur, listes de logiciels, documents et adresses IP du contenu enregistré.
- Ajoute au dashboard privé une vue « Diagnostics » regroupée par empreinte technique, version et opération.
- Protège la réception par validation stricte, limite de taille, limitation de débit et stockage privé existant du dashboard.

## [3.7.0-rc.4] - 2026-08-01

### Prise en main et opérations
- Corrige l’icône principale absente dans l’étape « Entretien » du parcours de première utilisation.
- Replie automatiquement les mises à jour dans un suivi compact en bas à droite après leur lancement.
- Laisse l’interface visible et utilisable pendant la mise à jour, avec réouverture du détail en un clic.
- Synchronise dans le suivi compact le titre, l’étape, le pourcentage et le résultat final de l’opération.

## [3.7.0-rc.3] - 2026-08-01

### Prise en main
- Présente la création automatique des points de restauration comme un choix facultatif, avec « Pas maintenant » sélectionné par défaut.
- Remplace les caractères génériques du parcours animé par des icônes SVG cohérentes avec l’identité visuelle d’OwlSetup.
- Précise dans l’étape Sécurité que le point de restauration reste facultatif.

## [3.7.0-rc.2] - 2026-08-01

### Stabilité et ergonomie
- Remplace le message ambigu lié aux points de restauration par une aide guidée et sans modification silencieuse de Windows.
- Distingue une demande administrateur annulée d’une protection du système désactivée.
- Ajoute un accès direct au panneau officiel « Protection du système » et un choix explicite pour désactiver l’automatisation.
- Corrige l’alignement des Paramètres lorsque la fenêtre est réduite ou que l’espace utile devient insuffisant.
- Modernise les icônes du guide d’installation avec une iconographie vectorielle cohérente.

## [3.7.0-beta.36] - 2026-08-01

### Interface
- Applique un véritable thème sombre au menu de tri des applications installées.
- Réorganise les cartes installées sur deux lignes afin que le nom et le logo restent toujours visibles.
- Les catégories deviennent des badges compacts et les actions passent automatiquement sous la fiche lorsque l'espace diminue.

## [3.7.0-beta.35] - 2026-08-01

### Corrigé
- La notification « Rufus est prêt » n'est plus affichée à chaque démarrage.
- Une application portable ne déclenche désormais cette notification que lorsqu'un raccourci absent vient réellement d'être recréé.

## [3.7.0-beta.34] - 2026-08-01

### Interface
- Améliore l'espacement et le thème sombre du sélecteur de conservation des journaux.
- Agrandit la jauge de sécurité et rend l'action « Voir le calcul » visible en permanence.
- Renforce le contraste des boutons d'aide contextuelle avec une couleur ambre identifiable.

## [3.7.0-beta.33] - 2026-08-01

### Corrigé
- Aligne les filtres et les actions de l'historique sur une même ligne et une même hauteur.
- Remplace la barre de titre Windows claire par une barre sombre assortie à OwlSetup, avec bordure et texte harmonisés.

## [3.7.0-beta.32] - 2026-08-01

### Historique et aide contextuelle

- La durée de conservation est synchronisée entre Outils système et Centre de sécurité.
- L’application distingue maintenant la suppression des anciens rapports et l’effacement complet de l’historique.
- Une confirmation dédiée protège l’effacement définitif des journaux et rapports.
- Des boutons d’aide contextuelle expliquent les durées et le stockage local des journaux.

## [3.7.0-beta.31] - 2026-08-01

### Anglais enrichi

- Les pages Applications, Mises à jour, Maintenance, Nettoyage, Quarantaine, Outils, Sécurité, Assistance et Paramètres disposent de traductions anglaises supplémentaires.
- Les textes ajoutés dynamiquement et les libellés contenant des quantités sont maintenant traduits à leur apparition.
- Plusieurs formulations anglaises ont été réécrites pour être plus naturelles et cohérentes.

## [3.7.0-beta.30] - 2026-08-01

### Illustration des applications installées

- Le symbole carré de la page Applications installées est remplacé par une icône SVG d'application validée.
- Le cadre, la lumière et les couleurs de l'illustration sont harmonisés avec les autres pages d'OwlSetup.

## [3.7.0-beta.29] - 2026-08-01

### Barre de navigation et illustrations

- Le lien Ko-fi rejoint la barre de navigation horizontale avec une icône tasse et coeur.
- Les illustrations des pages Catalogue, Mises à jour, Nettoyage, Quarantaine et Dépannage utilisent maintenant des SVG homogènes.
- La carte Windows et les catégories de nettoyage abandonnent les anciens caractères typographiques.
- Les séparateurs utilisent le même bleu sombre dans toute l'interface.

## [3.7.0-beta.28] - 2026-08-01

### Iconographie de l'accueil

- Les symboles typographiques de l'accueil sont remplacés par des icônes SVG homogènes.
- Les indicateurs système, les quatre outils principaux et les garanties locales utilisent le même style que les menus.
- Les contours, couleurs et effets au survol ont été harmonisés.

## [3.7.0-beta.27] - 2026-08-01

### Interface adaptative dans une fenêtre réduite

- La page Paramètres passe automatiquement sur une colonne lorsque la largeur disponible diminue.
- Les commandes de langue, de prise en main et d'accessibilité se réorganisent sans chevauchement.
- La barre de navigation masque correctement le contenu qui défile dessous.
- Les espacements et la largeur des cartes s'adaptent progressivement aux petites fenêtres.

## [3.7.0-beta.26] — 2026-08-01

### Configuration guidée au premier démarrage

- Après le choix de la langue, une page de configuration initiale présente les préférences essentielles.
- L'utilisateur choisit la taille du texte, le contraste, les animations et la protection par point de restauration.
- La validation ouvre automatiquement le guide interactif des fonctions principales.
- Le guide reste facultatif et tout le parcours peut être relancé ou modifié depuis Paramètres.
- Les choix sont enregistrés uniquement pour l'utilisateur Windows courant.

## [3.7.0-beta.25] — 2026-08-01

### Suppression d'une fausse alerte WinGet

- Le code WinGet `0x8A15002B` est désormais interprété correctement comme « aucune mise à jour applicable ».
- Un logiciel déjà à jour n'est plus présenté comme une mise à jour en échec.
- Les anciennes opérations enregistrées avec ce code sont automatiquement reclassées comme résolues au démarrage.

## [3.7.0-beta.24] — 2026-08-01

### Alias des paquets dans l'historique

- Les identifiants abrégés enregistrés par certaines anciennes opérations sont rapprochés de leur identifiant WinGet officiel.
- `OBSStudio`, `OBS Studio` et `OBSProject.OBSStudio` désignent désormais la même application lors de la résolution automatique.
- Une ancienne erreur de mise à jour OBS ne reste donc plus active après une nouvelle tentative réussie.

## [3.7.0-beta.23] — 2026-08-01

### Résolution automatique des anciennes alertes

- Une mise à jour réussie clôt désormais automatiquement les erreurs antérieures concernant les mêmes paquets.
- Les anciennes erreurs restent consultables avec l'état « Résolu automatiquement » au lieu d'être supprimées.
- Les compteurs « À vérifier », les badges Maintenance et les notifications actives sont recalculés sans intervention manuelle.
- Le rapprochement s'applique aussi rétroactivement à l'historique local déjà présent au démarrage.

## [3.7.0-beta.22] — 2026-08-01

### Mise à jour silencieuse d'OBS

- OwlSetup recherche désormais les processus tiers qui chargent un module OBS ou OBS Virtual Camera.
- Le nom réel du verrou est présenté à l'utilisateur ; sur le poste de test, Brave chargeait `obs-virtualcam-module64.dll`.
- Le bouton ferme l'application détectée après consentement, attend la libération des fichiers puis relance silencieusement uniquement OBS.
- Les processus partageant le même exécutable sont regroupés afin de fermer proprement les applications multiprocessus comme les navigateurs.

## [3.7.0-beta.21] — 2026-08-01

### Action directe après un blocage WinGet

- Le résultat de mise à jour affiche désormais un bouton « Fermer [application] » lorsque WinGet détecte des fichiers utilisés.
- La fermeture normale est tentée directement depuis la fenêtre de résultat.
- Une fermeture forcée, accompagnée d'un avertissement, n'apparaît que si le processus résiste.
- Après la fermeture, le même emplacement propose de relancer uniquement la mise à jour en échec.

## [3.7.0-beta.20] — 2026-08-01

### Fermeture sécurisée des applications bloquantes

- Le centre des opérations recherche les processus connus associés au paquet WinGet en échec.
- L'utilisateur peut demander une fermeture normale, fermer lui-même le logiciel ou confirmer séparément une fermeture forcée.
- Les processus critiques de Windows et OwlSetup sont systématiquement protégés.
- Après fermeture, seule la mise à jour concernée est présélectionnée et la confirmation reste obligatoire.
- Les titres et identifiants des processus sont affichés avant toute action afin d'éviter les fermetures surprises.

## [3.7.0-beta.19] — 2026-08-01

### Correctif WinGet

- Reconnaissance explicite du code WinGet `0x8A150111` lorsqu'une application ou ses fichiers sont encore utilisés.
- Le centre des opérations propose une relance ciblée du seul logiciel en échec au lieu de réparer inutilement les sources WinGet.
- Aucun processus utilisateur n'est fermé automatiquement : OwlSetup indique l'application à fermer avant la nouvelle tentative.
- Les rapports WinGet sont lus en UTF-8 pour éviter les caractères illisibles et fiabiliser l'analyse des erreurs en français.
- Les résultats conservent le paquet, la catégorie d'erreur et le code technique nécessaires au dépannage.

Les changements importants de OwlSetup sont regroupés dans ce fichier. Le projet suit une numérotation de version de type `MAJEUR.MINEUR.CORRECTIF`.

## [3.7.0-beta.18] — 2026-08-01

### Ergonomie

- Catalogue allégé grâce à une section repliable pour les sauvegardes, profils et identifiants WinGet personnalisés.
- Boutons « Réparer » et « Désinstaller » explicitement nommés dans la liste des applications installées.
- Actions de dépannage renforcées visuellement et ouverture des sous-menus accélérée.
- Commandes « Tout sélectionner » et « Tout désélectionner » ajoutées aux mises à jour disponibles.

### Compréhension et aide

- Explication interactive du calcul du score de sécurité.
- Guide enrichi avec les vérifications à effectuer en cas d’échec.
- Notifications lues supprimables et automatiquement purgées après quatorze jours.
- Notifications temporaires des applications portables dédupliquées pendant la session.

## [3.6.0] — 2026-07-24

### Ajouté

- Catalogue étendu à 93 applications, notamment les principaux navigateurs et outils d’intelligence artificielle.
- Diagnostic préalable de WinGet, du stockage, de Windows et de chaque paquet sélectionné.
- Centre de notifications local avec progression des installations et désinstallations en arrière-plan.
- Visionneuse intégrée pour les rapports d’opération.
- Recherche ciblée des dossiers résiduels après désinstallation avec quarantaine réversible.
- Profils de sélection facultatifs et paquets WinGet personnalisés conservés après redémarrage.

### Amélioré

- Badges de navigation dynamiques affichés uniquement lorsqu’une action est nécessaire.
- Installation, réparation et désinstallation plus lisibles, avec messages d’erreur détaillés.
- Rapports et journaux techniques ouverts explicitement dans le Bloc-notes.
- Interface des profils repliable avec une explication de leur utilisation.

### Sécurité

- Politique CSP stricte et neutralisation des données dynamiques affichées dans l’interface privilégiée.
- Refus par défaut des permissions WebView2 et limitation de la taille des commandes et imports.
- Résolution de WinGet limitée aux emplacements officiels de Microsoft App Installer.
- Mise à jour automatique non signée désactivée au profit de la Release GitHub officielle et de sa vérification SHA-256.
- Nettoyage AppData automatique sans validation individuelle désactivé.
- Permissions du workflow GitHub limitées au strict nécessaire.

## [3.6.0-beta.12] — 2026-07-24

### Corrigé

- L’ouverture d’un rapport ou journal technique ne dépend plus de l’association de fichiers Windows.
- Les fichiers `.json` et `.log` sont maintenant ouverts explicitement dans le Bloc-notes.
- Une mauvaise association avec `wsl.exe` ne peut donc plus ouvrir un terminal WSL.
- Le bouton du rapport précise qu’il ouvre le JSON technique dans le Bloc-notes.

## [3.6.0-beta.11] — 2026-07-24

### Amélioré

- Les badges « NEW » permanents ont été remplacés par de véritables indicateurs dynamiques.
- Le badge des mises à jour affiche uniquement le nombre réellement disponible.
- Outils système signale uniquement un problème WinGet nécessitant une action.
- Centre de sécurité affiche le nombre de contrôles demandant une attention.
- Dépannage affiche uniquement le nombre d’avertissements non lus.
- Aucun badge n’est affiché lorsqu’il n’y a rien à traiter.

## [3.6.0-beta.10] — 2026-07-24

### Corrigé

- « Tout marquer comme lu » retire maintenant immédiatement la couleur des notifications nouvelles.
- Les notifications lues utilisent un style neutre et le bouton indique « Tout est lu ».
- Ouvrir le centre ne marque plus automatiquement toutes les notifications comme lues.
- Cliquer sur une notification marque uniquement celle-ci comme lue.

## [3.6.0-beta.9] — 2026-07-24

### Amélioré

- Les désinstallations simples et groupées continuent maintenant en arrière-plan sans bloquer la navigation.
- Un bandeau compact affiche l’application en cours, le pourcentage et le résultat de l’opération.
- La progression peut être rouverte à tout moment depuis le bandeau.
- OwlSetup rouvre automatiquement la fenêtre lorsqu’une décision est nécessaire pour des dossiers résiduels.
- Le centre de notifications indique les désinstallations réussies, les avertissements et les résidus à vérifier.

## [3.6.0-beta.8] — 2026-07-24

### Amélioré

- Les rapports d’installation s’ouvrent maintenant dans une visionneuse intégrée à OwlSetup.
- Le résumé présente les réussites, les éléments à vérifier, l’environnement et le détail de chaque application.
- Le fichier JSON technique reste accessible séparément pour le diagnostic ou l’import dans le dashboard.
- L’historique remplace le bouton « JSON » par un bouton « Rapport visuel ».

## [3.6.0-beta.7] — 2026-07-24

### Ajouté

- Centre de notifications intégré avec historique local et compteur d’éléments non lus.
- Alertes détaillées lorsqu’une mise à jour est disponible, lorsqu’une application est installée ou lorsqu’une opération demande une vérification.
- Bandeau compact de progression permettant de rouvrir le détail d’une installation.

### Amélioré

- Les installations continuent en arrière-plan sans bloquer la navigation dans OwlSetup.
- La fenêtre de progression peut être réduite ou fermée pendant l’opération sans interrompre WinGet.
- Un récapitulatif persistant indique le résultat de chaque application et de la session complète.

## [3.6.0-beta.6] — 2026-07-21

### Ajouté

- Recherche ciblée des dossiers résiduels après une désinstallation réussie.
- Aperçu de chaque dossier avec son emplacement et sa taille avant toute action.
- Placement en quarantaine réversible ou conservation au choix de l’utilisateur.

### Sécurité

- Analyse limitée aux dossiers directs `%APPDATA%` et `%LOCALAPPDATA%` portant exactement le nom de l’application.
- Aucun nettoyage automatique de Documents, Bureau, Téléchargements, projets ou sauvegardes.

### Corrigé

- Identifiant WinGet de DBeaver Community actualisé.
- RustDesk et FileZilla passent en installation guidée depuis leur site officiel lorsque WinGet ne les distribue plus.
- L’audit du catalogue distingue désormais les paquets WinGet des services Web et installations guidées.

## [3.6.0-beta.5] — 2026-07-21

### Ajouté

- Diagnostic préalable de WinGet, du stockage, de Windows et de chaque paquet sélectionné.
- Relance ciblée des seules installations en échec.
- Historique enrichi avec le résultat de chaque session.
- Rapport JSON local, sans donnée personnelle, importable dans le catalogue du dashboard privé.

### Sécurité

- Le démarrage de l’installation reste désactivé tant qu’un contrôle bloquant échoue.
- Les rapports n’incluent ni nom d’utilisateur, ni nom du PC, ni chemin personnel, ni identifiant persistant.

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
[3.6.0]: https://github.com/OwlNetGeekFR/OwlSetup/releases/tag/v3.6.0
# 3.7.0-beta.13 — 2026-07-31

- Diagnostic intelligent des journaux avec suggestions et relance ciblée des installations en échec.
- Aperçu de confidentialité obligatoire avant l’ouverture d’un signalement GitHub.
- Suivi local des signalements et consultation de leur état public sans jeton GitHub.
- Export ZIP d’assistance anonymisé, sans journal complet ni fichier personnel automatique.
- Filtres et durée de conservation configurable pour l’historique local.
- Point de restauration automatique facultatif avant maintenance sensible.
- Réglages d’accessibilité : taille du texte, contraste renforcé et animations réduites.
- Autodiagnostic interne de l’intégrité, WinGet, WebView2, du stockage et des permissions.
- Signalement direct depuis les résultats d’installation et de mise à jour en avertissement.

# 3.7.0-beta.14 — 2026-07-31

- Centre des opérations avec résultats, erreurs et reprise contrôlée après interruption.
- Vérification réelle de la présence d’une application après installation WinGet.
- Détection des applications ouvertes avant une installation et messages d’erreur plus explicites.
- Analyse locale de la santé des applications installées.
- Sauvegarde complète des profils, préférences, accessibilité et réglages OwlSetup.
- Mode expert facultatif affichant les commandes préparées avant leur exécution.
- Correction guidée de WinGet depuis une opération en échec.
- Contrôle automatique de la structure du catalogue, des liens HTTPS et des logos via GitHub Actions.

# 3.7.0-beta.15 — 2026-07-31

- Nouveau score de sécurité local sur 100 avec explication de chaque contrôle.
- Cartes détaillées pour l’intégrité, l’origine WebView2, la signature, WinGet, WebView2 et les privilèges.
- Lecture seule de l’état apparent de Microsoft Defender et des profils du pare-feu Windows.
- Distinction claire entre bêta locale non signée, exécutable non signé et signature invalide.
- Actions recommandées contextualisées sans transformer OwlSetup en antivirus.
- Export JSON anonymisé du diagnostic de sécurité, sans compte, document ni contenu de journal.
- Conservation configurable des journaux de sécurité sur 7, 30 ou 90 jours.
# 3.7.0-beta.16 — 2026-08-01

- Détection des applications installées consolidée à partir de WinGet, du registre Windows, des paquets MSIX et des applications portables gérées par OwlSetup.
- Distinction claire entre une application installée et une application réellement gérable par WinGet.
- Les installations reconnues par Windows mais non associées à WinGet ne sont plus présentées comme absentes ou défectueuses.
- Ajout d’un état « Détectée via Windows/MSIX » et d’un accès sûr à la page Applications installées de Windows.
- Les actions groupées, la réparation et la désinstallation WinGet sont réservées aux paquets dont l’identifiant a été vérifié.
- Amélioration des correspondances pour Battle.net, Brave, GitHub Desktop, Node.js, Python et qBittorrent.
# 3.7.0-beta.17 — 2026-08-01

- Réorganisation visuelle légère de la page Paramètres.
- Ajout d’un résumé local, privé et réversible en tête de page.
- Icônes harmonisées avec la navigation OwlSetup et états de sécurité mieux différenciés.
- Cartes, espacements et comportements adaptatifs améliorés.
- Correction de l’affichage de la version longue dans la carte À propos.
## [3.7.0-beta.37] - 2026-08-01

- fonctionnement hors ligne complet : suppression de la police distante Google Fonts ;
- erreurs natives affichées dans une carte non bloquante avec copie du diagnostic et accès au dépannage ;
- catalogue plus compact au retour, filtres adaptatifs et suppression du défilement horizontal ;
- navigation adaptée aux fenêtres plus étroites et taille minimale réduite sans casser la mise en page ;
- traduction anglaise étendue aux catégories et descriptions du catalogue ;
- ancien moteur de mise à jour automatique maintenu désactivé tant que l'application ne peut pas être signée ;
- export du script personnalisé renommé `OwlSetup-Installer.ps1`.

## [3.7.0-beta.38] - 2026-08-01

- choix entre l’emplacement automatique recommandé et un dossier d’installation personnalisé ;
- sélecteur Windows natif et validation des chemins locaux protégés ;
- création d’un sous-dossier distinct pour chaque application sélectionnée ;
- contrôle de l’espace disponible sur le disque réellement choisi ;
- transmission de l’emplacement à WinGet avec avertissement lorsque l’installateur de l’éditeur l’ignore ;
- mémorisation du dossier des applications portables pour conserver des raccourcis fonctionnels.

## [3.7.0-beta.39] - 2026-08-01

- fenêtre d’installation replacée au centre de l’écran ;
- largeur augmentée et défilement interne conservé sur les petits écrans ;
- titres, diagnostics, champs, explications et boutons agrandis pour une meilleure lisibilité.

## [3.7.0-beta.40] - 2026-08-01

- blocage des doubles demandes d’installation pendant qu’une première opération continue ;
- une nouvelle demande reçue par le moteur natif devient une information et non une erreur ;
- vérification différée et répétée de la présence réelle du logiciel dans Windows ;
- correction automatique d’un code WinGet trompeur lorsque l’application est finalement bien installée.

## [3.7.0-beta.41] - 2026-08-01

- typographie harmonisée dans l’ensemble de l’interface avec une police Windows locale unique ;
- boutons, champs, listes, titres, cartes, notifications et fenêtres alignés sur la même famille ;
- police technique distincte conservée uniquement pour les commandes, codes et journaux ;
- aucun téléchargement de police requis : le rendu reste cohérent hors ligne.

## [3.7.0-beta.42] - 2026-08-01

- seconde vérification exacte des applications détectées par Windows ou MSIX lorsque l’export WinGet ne suffit pas ;
- activation de la désinstallation uniquement lorsque WinGet confirme précisément l’identifiant du paquet installé ;
- conservation du bouton « Gérer dans Windows » lorsque la correspondance reste incertaine ;
- aucune commande de désinstallation issue du registre n’est exécutée sans validation par le gestionnaire officiel Microsoft.

## [3.7.0-beta.43] - 2026-08-01

- suppression automatique des faux compteurs « En cours » lorsque plus aucune tâche OwlSetup n’existe ;
- récupération du dernier suivi actif lorsqu’un message de fin arrive sans référence locale ;
- anciennes tâches fantômes classées comme interrompues avec une explication claire ;
- badge du Centre des opérations limité aux opérations réellement actives ou aux erreurs à corriger.
# 3.7.0-rc.1 - stabilisation locale

- Gel des nouvelles fonctionnalités avant la prochaine version stable.
- Ajout d'un contrôle global de préparation à la release : syntaxe, catalogue, sécurité, interface et tests de régression.
- Ajout d'une compilation Release Candidate séparée des bêtas et des versions stables.
- Ajout d'une checklist obligatoire pour les essais réels sur le PC secondaire.
- La Release Candidate reste locale et ne sera pas publiée comme stable avant validation complète.
## [3.7.0-beta.44] - 2026-08-02

- Le statut sans signature reste visible comme information, sans badge d'action permanent.
- Les neuf contrôles du Centre de sécurité utilisent désormais des pictogrammes SVG cohérents et accessibles.
