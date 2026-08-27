/**
 * Heuristiques « ce n'est pas une vraie mise à jour » pour les lanceurs qui
 * embarquent leur propre updater (Ankama, EA, Battle.net…).
 *
 * Miroir de `OwlSetupWebView.cs` :
 *  - `SelfManagedUpdaters` (liste)
 *  - `IsVersionPrefixMismatch(current, available)`
 *  - `IsSelfManagedUpdate(id, current, available)`
 *
 * Le test `beta/test/update-heuristics.test.js` vérifie que la liste ci-dessous
 * reste identique à celle de l'hôte C#.
 */

/** IDs WinGet dont la mise à jour est gérée par le logiciel lui-même. */
export const SELF_MANAGED_UPDATERS = [
  "Ankama.AnkamaLauncher",
  "ElectronicArts.EADesktop",
  "EpicGames.EpicGamesLauncher",
  "Blizzard.BattleNet",
  "Ubisoft.Connect",
  "GOG.Galaxy",
  "Valve.Steam",
  "Discord.Discord",
  "RiotGames.LeagueOfLegends.EUW",
  "RiotGames.Valorant.EU",
  "Overwolf.CurseForge",
  "Amazon.Games",
  "Logitech.GHUB",
];

const SELF_MANAGED_SET = new Set(SELF_MANAGED_UPDATERS.map((id) => id.toLowerCase()));

/**
 * Vrai quand une version n'est que le préfixe étendu de l'autre
 * (ex. installée `3.15.2`, proposée `3.15.2.20509`) : presque toujours une
 * différence de schéma de version, pas une vraie mise à jour.
 *
 * @param {unknown} current
 * @param {unknown} available
 * @returns {boolean}
 */
export function isVersionPrefixMismatch(current, available) {
  const a = String(current ?? "").trim();
  const b = String(available ?? "").trim();
  if (!a || !b || a.toLowerCase() === b.toLowerCase()) return false;
  return (
    b.toLowerCase().startsWith(a.toLowerCase() + ".") ||
    a.toLowerCase().startsWith(b.toLowerCase() + ".")
  );
}

/**
 * @param {unknown} id identifiant WinGet
 * @param {unknown} current version installée
 * @param {unknown} available version proposée
 * @returns {boolean} vrai si WinGet ne devrait pas piloter cette mise à jour
 */
export function isSelfManagedUpdate(id, current, available) {
  return (
    SELF_MANAGED_SET.has(String(id ?? "").toLowerCase()) ||
    isVersionPrefixMismatch(current, available)
  );
}
