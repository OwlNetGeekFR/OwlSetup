/**
 * Comparaison des versions d'OwlSetup pour la mise à jour in-app.
 *
 * Miroir de `CompareAppVersions` / `ParseAppVersion` dans `OwlSetupWebView.cs`.
 * Le format suivi par le projet : `X.Y.Z` éventuellement suivi de
 * `-<canal>.<n>` avec `<canal>` ∈ {alpha, beta, rc} (cf. `build.ps1`
 * `$displayVersion = "$AppVersion-$PrereleaseLabel"`). Un `v` en tête est
 * toléré (tags GitHub).
 *
 * Ordre : `X.Y.Z` d'abord (numérique), puis une version SANS préversion passe
 * devant la même version AVEC préversion (la stable `4.0.0` est plus récente
 * que `4.0.0-beta.9`), puis `alpha < beta < rc`, puis le numéro de préversion.
 *
 * Couvert par `beta/test/app-version.test.js`.
 */

/** Rang des canaux de préversion (plus grand = plus proche de la stable). */
export const PRERELEASE_RANK = { alpha: 0, beta: 1, rc: 2 };

/**
 * @param {unknown} value
 * @returns {{release: number[], pre: {stage: string, rank: number, number: number} | null} | null}
 *   `null` si la chaîne n'est pas une version reconnue.
 */
export function parseAppVersion(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/^v/i, "");
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?$/.exec(text);
  if (!match) return null;
  const release = [Number(match[1] || 0), Number(match[2] || 0), Number(match[3] || 0)];
  let pre = null;
  if (match[4]) {
    const m = /^([A-Za-z]+)(?:[.-]?(\d+))?$/.exec(match[4]);
    const stage = (m ? m[1] : match[4]).toLowerCase();
    pre = {
      stage,
      rank: stage in PRERELEASE_RANK ? PRERELEASE_RANK[stage] : -1,
      number: m && m[2] !== undefined ? Number(m[2]) : 0,
    };
  }
  return { release, pre };
}

/**
 * @param {unknown} current version installée (ex. `BuildInfo.DisplayVersion`)
 * @param {unknown} candidate version proposée (ex. `tag_name` GitHub)
 * @returns {number} < 0 si `current` est plus ancienne (mise à jour dispo),
 *   0 si identiques, > 0 si `current` est plus récente. `NaN` si l'une des
 *   deux chaînes est illisible.
 */
export function compareAppVersions(current, candidate) {
  const a = parseAppVersion(current);
  const b = parseAppVersion(candidate);
  if (!a || !b) return NaN;
  for (let i = 0; i < 3; i += 1) {
    if (a.release[i] !== b.release[i]) return a.release[i] < b.release[i] ? -1 : 1;
  }
  if (!a.pre && !b.pre) return 0;
  if (!a.pre) return 1; // stable > préversion de même X.Y.Z
  if (!b.pre) return -1;
  if (a.pre.rank !== b.pre.rank) return a.pre.rank < b.pre.rank ? -1 : 1;
  if (a.pre.number !== b.pre.number) return a.pre.number < b.pre.number ? -1 : 1;
  return 0;
}

/**
 * @param {unknown} current
 * @param {unknown} candidate
 * @returns {boolean} vrai si `candidate` est une version strictement plus
 *   récente que `current` (chaînes illisibles -> faux).
 */
export function isNewerAppVersion(current, candidate) {
  const result = compareAppVersions(current, candidate);
  return Number.isFinite(result) && result < 0;
}
