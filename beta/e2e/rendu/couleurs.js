/**
 * Mesure des écarts de couleur entre deux valeurs calculées, pour la parité
 * de rendu en mode « palette » : quand la refonte remplace une couleur par un
 * jeton proche, l'écart doit rester petit et mesuré, pas seulement signalé.
 *
 * ΔE CIE76 dans l'espace Lab (D65), sur les couleurs composées sur un fond de
 * même luminance quand elles sont translucides : un repère simple et suffisant
 * pour trier « imperceptible » (< 2), « visible de près » (2–5) et « visible »
 * (> 5).
 */

const MOTIF_COULEUR = /rgba?\([^)]*\)/g;

/** `rgb(…)` / `rgba(…)` calculé → [r, g, b, a], ou null. */
export function lireCouleur(texte) {
  const nombres = texte.match(/[\d.]+/g)?.map(Number);
  if (!nombres || nombres.length < 3) return null;
  return [nombres[0], nombres[1], nombres[2], nombres.length > 3 ? nombres[3] : 1];
}

function versLab([r, g, b]) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/**
 * Composition d'une couleur translucide sur un fond neutre : l'écart entre
 * deux blancs à 6 % et 8 % d'opacité se mesure une fois posés quelque part.
 * Le fond est gris moyen pour ne favoriser ni le thème sombre ni le clair.
 */
function composer([r, g, b, a]) {
  const fond = 128;
  return [r * a + fond * (1 - a), g * a + fond * (1 - a), b * a + fond * (1 - a)];
}

export function deltaE(a, b) {
  const [l1, a1, b1] = versLab(composer(a));
  const [l2, a2, b2] = versLab(composer(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Écart de couleur entre deux valeurs calculées d'une même propriété.
 * Rend le plus grand ΔE entre les couleurs de même rang (dégradés, ombres
 * multiples), ou null si les deux valeurs ne diffèrent pas QUE par leurs
 * couleurs (structure, longueur, mot-clé…).
 */
export function ecartDeCouleur(reference, candidat) {
  const couleursRef = reference.match(MOTIF_COULEUR) ?? [];
  const couleursCand = candidat.match(MOTIF_COULEUR) ?? [];
  if (!couleursRef.length || couleursRef.length !== couleursCand.length) return null;
  if (reference.replace(MOTIF_COULEUR, "¤") !== candidat.replace(MOTIF_COULEUR, "¤")) return null;
  let maximum = 0;
  couleursRef.forEach((texte, i) => {
    const a = lireCouleur(texte);
    const b = lireCouleur(couleursCand[i]);
    if (a && b) maximum = Math.max(maximum, deltaE(a, b));
  });
  return maximum;
}
