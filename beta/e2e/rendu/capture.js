/**
 * Capture des styles calculés, exécutée DANS la page.
 *
 * Pour chaque élément du document, puis pour ses pseudo-éléments ::before et
 * ::after, on lit toutes les propriétés CSS standard (les propriétés
 * personnalisées `--*` sont exclues : ce sont des détails d'implémentation, et
 * une refonte par jetons en ajoute partout). Seule une empreinte par élément
 * quitte la page ; le détail n'est demandé que pour les éléments qui diffèrent.
 *
 * Les animations et transitions en cours sont menées à leur fin (ou figées au
 * début si elles sont infinies) : sans cela, deux captures du même état
 * pourraient tomber à deux instants différents d'un fondu.
 *
 * @param {{ indices?: number[] }} options sans `indices` : empreintes ; avec :
 *   valeurs détaillées de ces éléments.
 */
export function capturerStylesCalcules({ indices } = {}) {
  for (const animation of document.getAnimations()) {
    try {
      animation.finish();
    } catch {
      animation.pause();
      animation.currentTime = 0;
    }
  }
  const proprietes = [...getComputedStyle(document.documentElement)]
    .filter((propriete) => !propriete.startsWith("--"))
    .sort();
  const elements = [...document.querySelectorAll("*")];
  const PSEUDOS = [null, "::before", "::after"];

  const valeurs = (element, pseudo) => {
    const style = getComputedStyle(element, pseudo);
    // Un pseudo-élément sans `content` n'est pas généré : ses autres
    // propriétés ne s'affichent nulle part.
    if (pseudo && style.content === "none") return null;
    return proprietes.map((propriete) => style.getPropertyValue(propriete));
  };

  if (indices) {
    const decrire = (element) => {
      const classes = [...element.classList].map((nom) => `.${nom}`).join("");
      const id = element.id ? `#${element.id}` : "";
      const parent = element.parentElement?.id ? `#${element.parentElement.id} > ` : "";
      return `${parent}${element.localName}${id}${classes}`;
    };
    return indices.map((index) => ({
      index,
      element: decrire(elements[index]),
      pseudos: Object.fromEntries(
        PSEUDOS.map((pseudo) => [pseudo ?? "", valeurs(elements[index], pseudo)])
      ),
      proprietes,
    }));
  }

  const empreinte = (texte) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < texte.length; i++) {
      h ^= texte.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };
  return {
    proprietes: proprietes.length,
    actif: elements.indexOf(document.activeElement),
    empreintes: elements.map((element) =>
      empreinte(
        PSEUDOS.map((pseudo) => {
          const liste = valeurs(element, pseudo);
          return liste ? liste.join("\u0001") : "\u0000";
        }).join("\u0002")
      )
    ),
  };
}

/**
 * Écarts entre deux détails d'un même élément (référence, candidat).
 * @returns {{ element: string, pseudo: string, propriete: string, reference: string, candidat: string }[]}
 */
export function ecartsDeDetail(reference, candidat) {
  const ecarts = [];
  for (const [pseudo, valeursRef] of Object.entries(reference.pseudos)) {
    const valeursCand = candidat.pseudos[pseudo];
    if (valeursRef === null || valeursCand === null) {
      if (valeursRef !== valeursCand) {
        ecarts.push({
          index: reference.index,
          element: reference.element,
          pseudo,
          propriete: "(pseudo-élément)",
          reference: valeursRef ? "généré" : "absent",
          candidat: valeursCand ? "généré" : "absent",
        });
      }
      continue;
    }
    reference.proprietes.forEach((propriete, i) => {
      if (valeursRef[i] !== valeursCand[i]) {
        ecarts.push({
          index: reference.index,
          element: reference.element,
          pseudo,
          propriete,
          reference: valeursRef[i],
          candidat: valeursCand[i],
        });
      }
    });
  }
  return ecarts;
}

/**
 * Cadre d'un élément (par son rang dans le document), amené au centre de la
 * fenêtre. Exécuté dans la page. Rend null si l'élément n'est pas affiché ou
 * s'il est plus grand que la fenêtre (un zoom n'aurait alors plus de sens).
 */
export function cadrerElement(index) {
  const element = document.querySelectorAll("*")[index];
  if (!element) return null;
  element.scrollIntoView({ block: "center", inline: "center" });
  const cadre = element.getBoundingClientRect();
  if (!cadre.width || !cadre.height) return null;
  if (cadre.width > innerWidth * 0.9 || cadre.height > innerHeight * 0.9) return null;
  // Hors de la fenêtre même après défilement (translation, position fixe…).
  if (cadre.right <= 0 || cadre.bottom <= 0) return null;
  if (cadre.left >= innerWidth || cadre.top >= innerHeight) return null;
  const marge = 14;
  const x = Math.max(0, cadre.left - marge);
  const y = Math.max(0, cadre.top - marge);
  const width = Math.min(innerWidth - x, cadre.right + marge - x);
  const height = Math.min(innerHeight - y, cadre.bottom + marge - y);
  return width >= 2 && height >= 2 ? { x, y, width, height } : null;
}
