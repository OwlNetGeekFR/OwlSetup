# Parcours de l'interface face à un faux hôte

L'interface d'OwlSetup (`index.html`, `i18n.js`, `catalog.generated.js`,
`app.js`, `styles.css`) tourne ici dans **Chromium**, sans Windows. Elle parle à
un **faux hôte** comme elle parlerait à `OwlSetupWebView.cs`. On peut ainsi
cliquer, remplir, installer « pour de faux » et vérifier ce que l'utilisateur
voit. Ces tests tournent en CI Linux (job `interface` de `quality.yml`).

```bash
cd beta
npm ci
npx playwright install chromium   # une fois
npm run test:e2e                  # tous les parcours
npx playwright test --ui          # mode interactif, pas à pas
npx playwright show-trace test-results/<test>/trace.zip   # après un échec
```

## Ce que le faux hôte reproduit

| De l'hôte réel                                                         | Dans le faux hôte (`faux-hote/`)                                                                          |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Origine `https://pcsetup.local`                                        | Même origine, servie par `page.route` : la CSP s'applique telle quelle                                    |
| Fichiers extraits dans `AppRoot` au démarrage (`Bootstrap.Extract`)    | Carte **lue** dans `OwlSetup.csproj` et `OwlSetupWebView.cs` (`ressources.js`) ; tout autre fichier → 404 |
| `window.chrome.webview` (`postMessage`, `addEventListener("message")`) | Pont injecté avant tout script, aller-retour JSON, un message par tâche                                   |
| Refus de `OnWebMessage` (action inconnue, commande > 1 Mo)             | Même refus, même événement `owlsetup:native-error`                                                        |
| Réponses (`SendToWeb`)                                                 | Scénarios écrits d'après le C# (`scenarios.js`), confrontés au C# par `test/faux-hote.test.js`            |

Le faux hôte n'exécute rien : aucun winget, aucun PowerShell, aucun fichier
touché. Il ne teste donc **pas** l'hôte C#. Ce dernier reste couvert par les
tests PowerShell, dont `Test-InterfaceStartup.ps1` pour le vrai démarrage.

## Les garde-fous communs

À la fin de **chaque** test (`fixtures.js`), le parcours échoue même si
l'écran est correct dans l'un de ces cas :

- une exception JavaScript non rattrapée ;
- un fichier demandé que l'hôte n'extrait pas (404) ;
- une requête réseau vers une autre origine (toutes sont coupées) ;
- une violation de la CSP ;
- une action que `OnWebMessage` refuserait ;
- un message du faux hôte qui n'a pas pu être remis à l'interface.

Chacun a été validé par un sabotage. Une limite connue : Chromium sans
affichage ne demande jamais le favicon, donc une 404 sur
`<link rel="icon">` passe inaperçue.

## Écrire un parcours

```js
import { test, expect, ouvrirVue } from "./fixtures.js";
import { analyseDesMisesAJour, miseAJourDisponible } from "./faux-hote/scenarios.js";

test("…", async ({ page, hote }) => {
  // 1. Ce que l'hôte répondra (avant le démarrage si c'est une commande de démarrage).
  hote.repondre("scan-updates", () =>
    analyseDesMisesAJour([miseAJourDisponible("A.B", "A", "1", "2")])
  );
  // 2. Ouvrir l'interface ; les réponses de démarrage sont déjà installées.
  await hote.demarrer();
  // 3. Agir comme l'utilisateur, vérifier l'écran et les commandes reçues.
  await ouvrirVue(page, "updates");
  await page.locator("#scanUpdatesBtn").click();
  const payload = await hote.commande("scan-updates");
  await expect(page.locator("#availableUpdates .available-update")).toHaveCount(1);
  // Un message spontané de l'hôte, hors de toute commande :
  await hote.envoyer({ type: "updates-scanning" });
});
```

- `hote.repondre(action, payload => messages)` : ce que l'hôte renvoie. Une
  action sans réponse est seulement notée.
- `hote.refuser(action, message)` : l'hôte lève une exception en traitant
  l'action. L'interface reçoit `owlsetup:native-error`, comme depuis le
  `catch` de `OnWebMessage`.
- `hote.commande(action)` : attend la commande et rend son `payload`.
- `hote.actions()` : les actions reçues, dans l'ordre.
- `hote.calme()` : attend que les messages en file soient remis.
- Profils (`profils.js`) : `UTILISATEUR_HABITUE` (par défaut) ou
  `PREMIER_LANCEMENT` via `test.use({ storageState: … })`.

**Ajouter un scénario** : écrire la fonction dans `scenarios.js` d'après le C#,
puis l'ajouter à `PRODUCTIONS` dans `test/faux-hote.test.js`. Ce test échoue si
une fonction n'y figure pas, si un message porte un type ou un champ que l'hôte
n'envoie pas, ou s'il oublie un champ que l'hôte envoie toujours.

## Le rythme de l'hôte compte

L'hôte réel met des secondes, voire des minutes, à répondre. Un faux hôte qui
répond d'un bloc crée des courses que l'application ne connaît pas. La première
rencontrée : l'interface passe la fenêtre d'installation en arrière-plan au bout
de 450 ms. Selon la charge de la machine, le bilan arrivait avant ou après ce
délai, et le test passait ou non.

Règle suivie : **attendre un état visible, jamais une durée**. Dans
`installation.spec.js`, l'hôte envoie `install-start` tout de suite. Le test
attend ensuite que la fenêtre soit passée en arrière-plan, puis livre la fin de
l'installation (`hoteQuiInstalle(…).terminer`). De même, après une
installation, l'interface redemande la détection : le test attend cette réponse
(`hote.calme()`) avant de vérifier l'état final des cartes.

Les parcours sont validés en rafale (`--repeat-each=5`, plus de workers que de
cœurs). Aucune nouvelle tentative n'est configurée : un test instable est un
bug à comprendre.

## Parité de rendu (refonte CSS)

`npm run css:parite` s'appuie sur le même faux hôte. Il rejoue les parcours de
`rendu/parcours.js` deux fois en parallèle : une fois avec la feuille d'un
commit de référence (`--reference`, `HEAD` par défaut), une fois avec les
partiels de `src/styles/` tels qu'ils sont sur le disque. À chaque
`capturer(…)`, il compare tous les styles calculés (propriétés standard, sans
les `--*`) de tous les éléments et de leurs `::before`/`::after`.

```bash
npm run css:parite                                  # tout, contre HEAD (≈ 4 min 30)
npm run css:parite -- --reference origin/main
npm run css:parite -- --parcours vues --variantes clair --largeurs 1500
npm run css:parite -- --rapport parite.json         # écarts + règles non exercées
```

Code de sortie : 0 si le rendu est identique, 1 s'il y a des écarts, 2 si un
parcours diverge. Pour rester déterministe, l'outil fige l'horloge, avance les
minuteries de 10 s avant chaque capture et attend que l'échange avec l'hôte
soit au repos. Si l'interface place le focus différemment d'un côté à l'autre,
il le retire des deux pages. Limites : `:hover` et `:active` ne sont pas
forcés, et seules les règles exercées par les parcours sont vérifiées (la
couverture est affichée à la fin).

**Mode palette.** Quand une refonte remplace volontairement des couleurs par
des jetons proches, le rendu ne peut plus être identique. L'outil mesure alors
chaque écart de couleur (ΔE CIE76 : < 2 imperceptible, 2–5 visible de près,
≥ 5 visible) et compte à part les écarts qui ne sont pas des couleurs, qui ne
devraient pas exister. `--captures <dossier>` écrit une planche HTML : pour
chaque état qui diffère, des zooms ×2 avant/après des éléments les plus
modifiés, puis l'écran entier. `--captures-largeurs` choisit les largeurs
capturées (1500 par défaut).

```bash
npm run css:parite -- --parcours vues --largeurs 1500 --variantes sombre,clair --captures planche/
```

Pour exercer de nouvelles règles, ajouter des étapes ou des données à
`rendu/parcours.js`, et les scénarios correspondants dans
`faux-hote/scenarios.js`, vérifiés par `test/faux-hote.test.js`.
