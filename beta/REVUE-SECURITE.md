# Revue de l'onglet « Sécurité »

_Branche `beta/4.0-foundations` · base 4.0.0-beta.6 · 2026-08-27_

Trois entrées : **Centre de sécurité**, **Quarantaine**, **Aide et dépannage**.
Code lu : `OwlSetupWebView.cs` (`BuildSecuritySnapshot`, `BuildQuarantineItems`,
`RestoreQuarantine`/`DeleteQuarantine`, `RunSelfDiagnostic`,
`CheckFeedbackFollowups`), `app.js` (rendu sécurité + quarantaine),
`index.html`.

## Verdict

Base **saine et honnête** : lecture seule des protections Windows, quarantaine
réversible avec garde-fous reparse-point, aucune modification des réglages
système, mise à jour auto désactivée tant qu'il n'y a pas de signature. Les
défauts sont surtout de la **fiabilité de détection** et de l'**ergonomie**.

## Problèmes détectés

| #   | Constat                                                                                                                                                                                                                    | Gravité       | État                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| S1  | Détection antivirus/pare-feu de repli via registre : sous Tamper Protection ou pour un utilisateur standard, les valeurs sont absentes → OwlSetup concluait « Protection active » par défaut, y compris si elle est coupée | moyen         | ✅ 4.0.0-beta.7 : « État indéterminé » distinct, pas de faux vert ni de faux avertissement |
| S2  | Badge « Quarantaine » du menu : toujours visible, affiche « 0 » quand vide (les autres badges se masquent)                                                                                                                 | mineur        | ✅ 4.0.0-beta.7                                                                            |
| S3  | `BuildQuarantineItems` trie par **chaîne de date au format court local** → ordre non chronologique                                                                                                                         | mineur        | ✅ 4.0.0-beta.7 : tri sur `DateTime` réel (ISO 8601)                                       |
| S4  | `winget.exe --version` relancé à **chaque** rafraîchissement du Centre de sécurité et du diagnostic (y compris après purge d'historique)                                                                                   | mineur (perf) | ✅ 4.0.0-beta.7 : cache 10 min                                                             |
| S5  | Score : +5 antivirus / +5 pare-feu attribués même quand l'état est inconnu (score faussement optimiste)                                                                                                                    | mineur        | ✅ 4.0.0-beta.7                                                                            |
| S6  | Quarantaine : aucun moyen de vider en masse ; pas de taille ni d'ancienneté affichée                                                                                                                                       | ergonomie     | ✅ 4.0.0-beta.7 : taille + âge + bouton « supprimer > 30 j »                               |
| S7  | `X509Chain.Build` avec révocation **en ligne** (timeout 4 s) à chaque « Vérifier maintenant » — dépendance réseau dans un panneau « contrôles locaux »                                                                     | mineur        | ⏳ à revoir quand la signature de code sera en place                                       |
| S8  | Détection Defender spécifique absente (`Get-MpComputerStatus` : âge des signatures, service AM, etc.)                                                                                                                      | amélioration  | ⏳ moyen terme                                                                             |
| S9  | Auto-diagnostic (Aide et dépannage) : 5 contrôles seulement (intégrité, WinGet, WebView2, stockage, écriture journaux) — pas d'espace disque, redémarrage en attente, âge des signatures AV                                | amélioration  | ⏳ moyen terme                                                                             |
| S10 | `CheckFeedbackFollowups` télécharge les 100 dernières issues GitHub à l'ouverture du dépannage (gardé : uniquement si des suivis locaux existent)                                                                          | négligeable   | —                                                                                          |

## Fait en 4.0.0-beta.7

- `ReadRegistryFlag` renvoie `null` quand la valeur est absente/illisible ;
  `BuildSecuritySnapshot` calcule `antivirusDetermined` / `firewallDetermined`.
- UI : carte « État indéterminé » (style info), provider « État non lisible sur
  ce PC », recommandation `info` au lieu de `warning`, `protectedCore` exige un
  état déterminé, heure de dernière vérification affichée.
- Quarantaine : `bytes` / `size` / `ageDays` par élément, tri chronologique,
  `PurgeOldQuarantine` (`action:"purge-quarantine"`, jours ∈ {7,30,90}) avec
  confirmation, badge de menu masqué à vide.
- `CachedWingetVersion()` partagé entre le Centre de sécurité et le diagnostic.

## Fait en 4.0.0-beta.8 (retour utilisateur)

- **S11** — suppression/restauration de quarantaine qui échouait sur
  « Impossible de trouver une partie du chemin d'accès » (cache CapCut :
  fichiers `.meta` en lecture seule + arborescence profonde). Corrigé :
  `ForceDeleteDirectory` en 3 temps (voie normale → récursion manuelle avec
  remise à zéro des attributs → `rd /s /q` avec préfixe `\\?\`), restauration
  via `robocopy /MOVE` en repli, message explicite si des fichiers restent
  verrouillés, `longPathAware` dans le manifeste.

## Suite (S7–S9)

- Diagnostic Defender via `Get-MpComputerStatus` (âge des définitions = signal
  de sécurité concret).
- Étendre l'auto-diagnostic : espace disque < 5 Go, redémarrage en attente,
  état WSC AV/pare-feu, âge des signatures.
- Révocation de certificat : passer en `X509RevocationMode.Offline` ou rendre le
  contrôle asynchrone/optionnel, une fois la signature de code obtenue (lot 5
  du plan).
