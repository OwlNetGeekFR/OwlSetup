# OwlSetup 3.6.0

Cette version stable améliore la fiabilité, la sécurité et le confort d’utilisation d’OwlSetup.

## Points importants

- Catalogue étendu à 93 applications, avec de nouveaux navigateurs et outils d’intelligence artificielle.
- Installation et désinstallation en arrière-plan avec progression et notifications locales.
- Diagnostic préalable de WinGet, du stockage, de Windows et des paquets sélectionnés.
- Visionneuse intégrée des rapports, sans ouverture involontaire de terminal.
- Détection ciblée des dossiers résiduels et quarantaine réversible après désinstallation.
- Profils de sélection facultatifs et paquets WinGet personnalisés persistants.
- Badges de navigation affichés uniquement lorsqu’une action est réellement nécessaire.

## Sécurité

- Politique de sécurité du contenu renforcée pour l’interface WebView2.
- Données dynamiques neutralisées avant leur affichage.
- Permissions WebView2 refusées par défaut.
- WinGet résolu uniquement depuis les emplacements officiels de Microsoft App Installer.
- Nettoyage automatique large d’AppData désactivé sans confirmation individuelle.
- Mise à jour automatique de l’exécutable désactivée tant qu’OwlSetup n’est pas signé.

## Téléchargement

Pour la majorité des utilisateurs, téléchargez **`OwlSetup-Setup.exe`**.

OwlSetup n’est pas encore signé numériquement. Windows SmartScreen peut donc afficher un avertissement. Téléchargez uniquement les fichiers de cette Release officielle et comparez leur empreinte avec `SHA256.txt`.
