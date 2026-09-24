// Parité de rendu : la feuille candidate (partiels de beta/src/styles/, tels
// qu'ils sont sur le disque) produit-elle EXACTEMENT les mêmes styles calculés
// que la feuille de référence (styles.css d'un commit git) ?
//
// C'est le filet de la refonte CSS : réorganiser, fusionner ou supprimer des
// règles ne doit rien changer à l'écran. L'outil rejoue les parcours de
// e2e/rendu/parcours.js deux fois en parallèle — même interface, même faux
// hôte, seule la feuille diffère — et compare à chaque étape tous les styles
// calculés de tous les éléments, pseudo-éléments ::before/::after compris.
//
//   node scripts/parite-rendu.mjs                      référence : HEAD
//   node scripts/parite-rendu.mjs --reference origin/main
//   node scripts/parite-rendu.mjs --parcours vues --variantes clair --largeurs 1500
//   node scripts/parite-rendu.mjs --rapport parite.json
//
// Code de sortie : 0 rendu identique, 1 écarts, 2 parcours divergent ou erreur.
//
// Limites, à garder en tête :
//  - seuls les états joués sont comparés ; la couverture affichée à la fin dit
//    quelle part des règles a été exercée, et le rapport liste les autres ;
//  - :hover et :active ne sont pas forcés (seul l'état réel de la souris et du
//    focus compte) ;
//  - les propriétés personnalisées (--*) ne sont pas comparées, par principe.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import { FauxHote } from "../e2e/faux-hote/faux-hote.js";
import { capturerStylesCalcules, ecartsDeDetail } from "../e2e/rendu/capture.js";
import { PARCOURS, stockage } from "../e2e/rendu/parcours.js";
import { assembler } from "./build-css.mjs";

const { values: options } = parseArgs({
  options: {
    reference: { type: "string", default: "HEAD" },
    parcours: { type: "string" },
    variantes: { type: "string" },
    largeurs: { type: "string" },
    rapport: { type: "string" },
    paralleles: { type: "string", default: "2" },
    details: { type: "string", default: "12" },
  },
});

const liste = (texte) => (texte ? texte.split(",").map((x) => x.trim()) : null);
const filtreParcours = liste(options.parcours);
const filtreVariantes = liste(options.variantes);
const filtreLargeurs = liste(options.largeurs)?.map(Number);

const cssReference = execFileSync("git", ["show", `${options.reference}:styles.css`], {
  cwd: new URL("../..", import.meta.url),
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const cssCandidat = assembler();
const HEURE_FIGEE = new Date("2026-09-24T10:15:00+02:00");

/**
 * Point de rendez-vous : chaque côté y dépose ses empreintes pour une étape ;
 * quand les deux sont là, on compare, on demande le détail des éléments qui
 * diffèrent, puis on relâche les deux côtés.
 */
class RendezVous {
  constructor(etiquette) {
    this.etiquette = etiquette;
    this.attente = new Map();
    this.resultats = [];
  }

  /**
   * Avant de capturer, chaque côté se met au repos puis avance son horloge de
   * dix secondes : les minuteries courtes (notification éphémère, passage en
   * arrière-plan, focus différé) se déclenchent alors des deux côtés, quel que
   * soit l'écart de quelques millisecondes entre les deux pages.
   * `{ avancer: false }` capture un état éphémère tel quel.
   */
  async capturer(cote, page, hote, etape, { avancer = true } = {}) {
    await hote.stabiliser();
    if (avancer) {
      await page.clock.fastForward(10_000);
      await hote.stabiliser();
    }
    await page.mouse.move(0, 0);
    const capture = await page.evaluate(capturerStylesCalcules, {});
    let entree = this.attente.get(etape);
    if (!entree) {
      entree = {};
      entree.pret = new Promise((resoudre) => (entree.resoudre = resoudre));
      this.attente.set(etape, entree);
    }
    entree[cote] = { page, capture };
    if (entree.reference && entree.candidat) {
      entree.resoudre(await this.#comparer(etape, entree.reference, entree.candidat));
    }
    return entree.pret;
  }

  async #comparer(etape, reference, candidat) {
    // Le focus peut dépendre d'une course entre deux minuteries de l'interface
    // elle-même. Si les deux pages ne l'ont pas au même endroit, ce n'est pas
    // une question de feuille de style : on le retire des deux côtés.
    let note;
    if (reference.capture.actif !== candidat.capture.actif) {
      note = "focus retiré (placé différemment par l'interface)";
      for (const cote of [reference, candidat]) {
        await cote.page.evaluate(() => document.activeElement?.blur());
        cote.capture = await cote.page.evaluate(capturerStylesCalcules, {});
      }
    }
    const a = reference.capture.empreintes;
    const b = candidat.capture.empreintes;
    if (a.length !== b.length) {
      const resultat = {
        etape,
        divergent: `${a.length} éléments avec la référence, ${b.length} avec la candidate`,
      };
      this.resultats.push(resultat);
      return resultat;
    }
    const indices = a.flatMap((empreinte, i) => (empreinte === b[i] ? [] : [i]));
    const ecarts = [];
    if (indices.length) {
      const detailsRef = await reference.page.evaluate(capturerStylesCalcules, { indices });
      const detailsCand = await candidat.page.evaluate(capturerStylesCalcules, { indices });
      detailsRef.forEach((detail, i) => ecarts.push(...ecartsDeDetail(detail, detailsCand[i])));
    }
    const resultat = { etape, elements: a.length, ecarts, note };
    this.resultats.push(resultat);
    return resultat;
  }
}

async function jouerCote(navigateur, parcours, { variante, largeur }, cote, css, rdv, couverture) {
  const contexte = await navigateur.newContext({
    viewport: { width: largeur, height: largeur >= 1100 ? 920 : 650 },
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    colorScheme: variante.startsWith("clair") ? "light" : "dark",
    storageState: stockage(variante, { premierLancement: parcours.premierLancement }),
  });
  const page = await contexte.newPage();
  try {
    await page.clock.install({ time: HEURE_FIGEE });
    if (couverture) await page.coverage.startCSSCoverage({ resetOnNavigation: false });
    const hote = new FauxHote(page, { remplacements: { "styles.css": css } });
    await hote.brancher();
    parcours.preparer?.(hote);
    await parcours.jouer({
      page,
      hote,
      capturer: (etape, options) => rdv.capturer(cote, page, hote, etape, options),
    });
    await hote.calme();
    const problemes = [
      ...hote.erreursDePage.map((m) => `exception : ${m}`),
      ...hote.ressourcesIntrouvables.map((m) => `404 : ${m}`),
      ...hote.actionsInconnues.map((m) => `action refusée : ${m}`),
    ];
    if (problemes.length) throw new Error(`${cote} : ${problemes.join(" ; ")}`);
    if (couverture) couverture.push(...(await page.coverage.stopCSSCoverage()));
  } finally {
    await contexte.close();
  }
}

/** Part des règles de la candidate exercées par au moins un état joué. */
function mesurerCouverture(entrees) {
  const plages = entrees
    .filter((entree) => new URL(entree.url).pathname === "/styles.css")
    .flatMap((entree) => entree.ranges);
  const texte = cssCandidat.replace(/\/\*[\s\S]*?\*\//g, (commentaire) =>
    " ".repeat(commentaire.length)
  );
  const regles = [];
  const motif = /(^|[{};])(\s*)([^{}@;\s][^{};]*)\{/g;
  for (const correspondance of texte.matchAll(motif)) {
    const debut = correspondance.index + correspondance[1].length + correspondance[2].length;
    const selecteur = correspondance[3].trim();
    if (/^(from|to|\d+%)/.test(selecteur)) continue; // étapes de @keyframes
    regles.push({ debut, selecteur });
  }
  const exercee = (debut) => plages.some((plage) => debut >= plage.start && debut < plage.end);
  const inutilisees = regles.filter((regle) => !exercee(regle.debut));
  return { total: regles.length, inutilisees: inutilisees.map((regle) => regle.selecteur) };
}

async function principal() {
  const taches = [];
  for (const parcours of PARCOURS) {
    if (filtreParcours && !filtreParcours.includes(parcours.nom)) continue;
    for (const combinaison of parcours.combinaisons) {
      if (filtreVariantes && !filtreVariantes.includes(combinaison.variante)) continue;
      if (filtreLargeurs && !filtreLargeurs.includes(combinaison.largeur)) continue;
      taches.push({ parcours, combinaison });
    }
  }
  if (!taches.length) throw new Error("aucun parcours ne correspond aux filtres");
  console.log(
    `Parité de rendu : référence ${options.reference}, candidate = partiels du disque. ` +
      `${taches.length} parcours à jouer.`
  );

  const navigateur = await chromium.launch();
  const couverture = [];
  const bilan = [];
  let suivante = 0;
  const ouvrier = async () => {
    while (suivante < taches.length) {
      const { parcours, combinaison } = taches[suivante++];
      const etiquette = `${parcours.nom} · ${combinaison.variante} · ${combinaison.largeur}px`;
      const rdv = new RendezVous(etiquette);
      try {
        await Promise.all([
          jouerCote(navigateur, parcours, combinaison, "reference", cssReference, rdv, null),
          jouerCote(navigateur, parcours, combinaison, "candidat", cssCandidat, rdv, couverture),
        ]);
      } catch (erreur) {
        rdv.resultats.push({ etape: "(parcours)", divergent: erreur.message.split("\n")[0] });
      }
      const ecarts = rdv.resultats.reduce((n, r) => n + (r.ecarts?.length ?? 0), 0);
      const divergents = rdv.resultats.filter((r) => r.divergent);
      const marque = divergents.length ? "!" : ecarts ? "✗" : "✓";
      console.log(
        `${marque} ${etiquette} : ${rdv.resultats.length} états, ${ecarts} écart(s)` +
          (divergents.length ? `, ${divergents.length} divergent(s)` : "")
      );
      bilan.push({ etiquette, resultats: rdv.resultats });
    }
  };
  await Promise.all(Array.from({ length: Number(options.paralleles) }, ouvrier));
  await navigateur.close();

  const tousEcarts = bilan.flatMap(({ etiquette, resultats }) =>
    resultats.flatMap((r) =>
      (r.ecarts ?? []).map((e) => ({ ...e, ou: `${etiquette} · ${r.etape}` }))
    )
  );
  const divergences = bilan.flatMap(({ etiquette, resultats }) =>
    resultats.filter((r) => r.divergent).map((r) => `${etiquette} · ${r.etape} : ${r.divergent}`)
  );

  // Regroupe les écarts identiques (même élément, propriété et valeurs).
  const groupes = new Map();
  for (const e of tousEcarts) {
    const cle = `${e.element}${e.pseudo} ${e.propriete} : ${e.reference} → ${e.candidat}`;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(e.ou);
  }
  const { total, inutilisees } = mesurerCouverture(couverture);
  const partExercee = total ? Math.round((100 * (total - inutilisees.length)) / total) : 0;

  console.log("");
  for (const divergence of divergences) console.log(`! ${divergence}`);
  const limite = Number(options.details);
  for (const [cle, ou] of [...groupes].slice(0, limite)) {
    console.log(`✗ ${cle}\n    dans ${ou.length} état(s), dont : ${ou[0]}`);
  }
  if (groupes.size > limite)
    console.log(`… et ${groupes.size - limite} autre(s) écart(s) distinct(s).`);
  console.log(
    `\nCouverture : ${total - inutilisees.length}/${total} règles exercées (${partExercee} %).` +
      ` Les autres ne sont pas vérifiées par cette comparaison.`
  );
  if (options.rapport) {
    writeFileSync(
      options.rapport,
      JSON.stringify(
        {
          reference: options.reference,
          divergences,
          ecarts: [...groupes],
          reglesNonExercees: inutilisees,
        },
        null,
        2
      )
    );
    console.log(`Rapport : ${options.rapport}`);
  }
  if (divergences.length) return 2;
  if (groupes.size) {
    console.log(`\nRendu DIFFÉRENT : ${groupes.size} écart(s) distinct(s).`);
    return 1;
  }
  console.log("\nRendu identique à la référence sur tous les états joués.");
  return 0;
}

principal().then(
  (code) => process.exit(code),
  (erreur) => {
    console.error(erreur);
    process.exit(2);
  }
);
