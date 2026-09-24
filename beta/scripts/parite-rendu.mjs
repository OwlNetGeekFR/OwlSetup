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
//   node scripts/parite-rendu.mjs --captures planche/   captures avant/après
//
// Code de sortie : 0 rendu identique, 1 écarts, 2 parcours divergent ou erreur.
//
// Mode palette : quand une refonte remplace volontairement des couleurs par
// des jetons proches, chaque écart de couleur est mesuré (ΔE) et les autres
// écarts (longueurs, mots-clés…) sont comptés à part — eux ne devraient pas
// exister. `--captures` écrit une planche HTML avant/après des états qui
// diffèrent, pour une validation à l'œil.
//
// Limites, à garder en tête :
//  - seuls les états joués sont comparés ; la couverture affichée à la fin dit
//    quelle part des règles a été exercée, et le rapport liste les autres ;
//  - :hover et :active ne sont pas forcés (seul l'état réel de la souris et du
//    focus compte) ;
//  - les propriétés personnalisées (--*) ne sont pas comparées, par principe.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";
import { FauxHote } from "../e2e/faux-hote/faux-hote.js";
import { cadrerElement, capturerStylesCalcules, ecartsDeDetail } from "../e2e/rendu/capture.js";
import { ecartDeCouleur } from "../e2e/rendu/couleurs.js";
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
    captures: { type: "string" },
    "captures-largeurs": { type: "string", default: "1500" },
  },
});
const largeursCapturees = liste(options["captures-largeurs"]).map(Number);
if (options.captures) mkdirSync(options.captures, { recursive: true });
let numeroDeCapture = 0;
// Un même élément (la barre latérale…) diffère dans presque tous les états :
// on ne le zoome qu'une fois par variante.
const dejaZoomes = new Set();

function liste(texte) {
  return texte ? texte.split(",").map((x) => x.trim()) : null;
}
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
  constructor(etiquette, largeur, variante) {
    this.etiquette = etiquette;
    this.largeur = largeur;
    this.variante = variante;
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

  /**
   * Zooms avant/après des éléments les plus modifiés d'un état : un écart de
   * bordure de quelques ΔE est invisible sur une capture pleine page.
   * Les deux pages ont la même mise en page (seules des couleurs changent en
   * mode palette) : le même défilement et le même cadre valent des deux côtés.
   */
  async #zoomer(pageRef, pageCand, ecarts) {
    const pire = new Map();
    for (const e of ecarts) {
      const note = e.deltaE ?? 100;
      if (!pire.has(e.index) || pire.get(e.index).note < note) pire.set(e.index, { ...e, note });
    }
    const zooms = [];
    for (const e of [...pire.values()].sort((x, y) => y.note - x.note)) {
      if (zooms.length >= 6) break;
      const cle = `${this.variante}|${e.element}`;
      if (dejaZoomes.has(cle)) continue;
      const cadre = await pageRef.evaluate(cadrerElement, e.index);
      await pageCand.evaluate(cadrerElement, e.index);
      if (!cadre) continue;
      dejaZoomes.add(cle);
      const numero = String(++numeroDeCapture).padStart(3, "0");
      const zoom = {
        element: e.element,
        propriete: e.propriete,
        deltaE: e.deltaE,
        avant: `${numero}-z-avant.png`,
        apres: `${numero}-z-apres.png`,
      };
      try {
        await pageRef.screenshot({ path: path.join(options.captures, zoom.avant), clip: cadre });
        await pageCand.screenshot({ path: path.join(options.captures, zoom.apres), clip: cadre });
        zooms.push(zoom);
      } catch {
        // Un zoom impossible ne doit pas faire échouer la comparaison.
      }
    }
    return zooms;
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
      for (const ecart of ecarts) ecart.deltaE = ecartDeCouleur(ecart.reference, ecart.candidat);
    }
    let captures;
    if (ecarts.length && options.captures && largeursCapturees.includes(this.largeur)) {
      const numero = String(++numeroDeCapture).padStart(3, "0");
      captures = { avant: `${numero}-avant.jpg`, apres: `${numero}-apres.jpg` };
      await reference.page.screenshot({
        path: path.join(options.captures, captures.avant),
        type: "jpeg",
        quality: 80,
      });
      await candidat.page.screenshot({
        path: path.join(options.captures, captures.apres),
        type: "jpeg",
        quality: 80,
      });
    }
    if (captures) captures.zooms = await this.#zoomer(reference.page, candidat.page, ecarts);
    const resultat = { etape, elements: a.length, ecarts, note, captures };
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
    deviceScaleFactor: options.captures ? 2 : 1,
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

const echapper = (texte) =>
  String(texte).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );

/** Planche HTML autonome : pour chaque état capturé, avant/après et écarts. */
function ecrirePlanche(bilan) {
  const pastille = (valeur) =>
    /rgba?\(|color\(srgb /.test(valeur)
      ? `<i style="background:${echapper(valeur.match(/rgba?\([^)]*\)|color\(srgb [^)]*\)/)[0])}"></i>`
      : "";
  const sections = bilan.flatMap(({ etiquette, resultats }) =>
    resultats
      .filter((r) => r.captures)
      .map((r) => {
        const groupes = new Map();
        for (const e of r.ecarts) {
          const cle = `${e.propriete}|${e.reference}|${e.candidat}`;
          if (!groupes.has(cle)) groupes.set(cle, { ...e, elements: [] });
          groupes.get(cle).elements.push(`${e.element}${e.pseudo}`);
        }
        const lignes = [...groupes.values()]
          .sort((x, y) => (y.deltaE ?? 99) - (x.deltaE ?? 99))
          .map(
            (g) =>
              `<tr><td>${echapper(g.propriete)}</td><td>${pastille(g.reference)}${echapper(g.reference)}</td>` +
              `<td>${pastille(g.candidat)}${echapper(g.candidat)}</td>` +
              `<td>${g.deltaE === null ? "<b>hors couleur</b>" : g.deltaE.toFixed(1)}</td>` +
              `<td>${g.elements.length} : ${echapper(g.elements.slice(0, 3).join(", "))}${g.elements.length > 3 ? "…" : ""}</td></tr>`
          )
          .join("");
        const zooms = (r.captures.zooms ?? [])
          .map(
            (z) =>
              `<div class="zoom"><p>${echapper(z.element)} · ${echapper(z.propriete)}` +
              ` · ΔE ${z.deltaE === null ? "hors couleur" : z.deltaE.toFixed(1)}</p>` +
              `<div class="duo"><img src="${z.avant}" alt="avant"><img src="${z.apres}" alt="après"></div></div>`
          )
          .join("");
        return (
          `<section><h2>${echapper(etiquette)} · ${echapper(r.etape)}</h2>` +
          (zooms ? `<div class="zooms">${zooms}</div>` : "") +
          `<details><summary>Écran entier</summary><div class="duo"><figure><figcaption>Avant</figcaption><img src="${r.captures.avant}" alt=""></figure>` +
          `<figure><figcaption>Après</figcaption><img src="${r.captures.apres}" alt=""></figure></div></details>` +
          `<details><summary>${r.ecarts.length} écart(s)</summary><table><tr><th>Propriété</th><th>Avant</th>` +
          `<th>Après</th><th>ΔE</th><th>Éléments</th></tr>${lignes}</table></details></section>`
        );
      })
  );
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Planche avant/après</title>
<style>body{font:14px system-ui,sans-serif;margin:16px;background:#f4f5f7;color:#1c2330}
section{background:#fff;border:1px solid #d5dae2;border-radius:10px;padding:12px 16px;margin:0 0 16px}
h2{font-size:15px;margin:0 0 10px}.duo{display:grid;grid-template-columns:1fr 1fr;gap:10px}
figure{margin:0}figcaption{font-weight:600;margin-bottom:4px}img{width:100%;border:1px solid #ccd;border-radius:6px}
table{border-collapse:collapse;margin-top:8px;font-size:12px;width:100%}td,th{border-bottom:1px solid #e3e6eb;padding:4px 6px;text-align:left;vertical-align:top}
.zooms{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px;margin-bottom:8px}
.zoom p{margin:0 0 4px;font-size:12px;color:#445}.zoom .duo img{width:auto;max-width:100%;background:#fff}
i{display:inline-block;width:12px;height:12px;border:1px solid #888;border-radius:3px;margin-right:5px;vertical-align:-2px}</style>
</head><body><h1>Planche avant/après — référence ${echapper(options.reference)}</h1>${sections.join("\n")}</body></html>`;
  writeFileSync(path.join(options.captures, "planche.html"), html);
  console.log(
    `Planche : ${path.join(options.captures, "planche.html")} (${sections.length} état(s))`
  );
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
      const rdv = new RendezVous(etiquette, combinaison.largeur, combinaison.variante);
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

  // Regroupe les écarts identiques (même élément, propriété et valeurs). Les
  // longues d'une même bordure (quatre côtés, puis leurs alias logiques
  // block/inline) ne font qu'un écart : `border-*-color`.
  const groupes = new Map();
  for (const e of tousEcarts) {
    const propriete = e.propriete.replace(
      /^(border|scroll-margin|scroll-padding|margin|padding|inset)-(top|right|bottom|left|block-start|block-end|inline-start|inline-end)(-(color|width|style))?$/,
      (_, base, _cote, suite) => `${base}-*${suite ?? ""}`
    );
    const cle = `${e.element}${e.pseudo} ${propriete} : ${e.reference} → ${e.candidat}`;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(e.ou);
  }
  const couleurs = tousEcarts.filter((e) => e.deltaE !== null && e.deltaE !== undefined);
  const autres = tousEcarts.filter((e) => e.deltaE === null || e.deltaE === undefined);
  if (tousEcarts.length) {
    const paliers = [
      ["imperceptible (ΔE < 2)", (d) => d < 2],
      ["visible de près (2 ≤ ΔE < 5)", (d) => d >= 2 && d < 5],
      ["visible (ΔE ≥ 5)", (d) => d >= 5],
    ];
    console.log("\nÉcarts de couleur, par état et élément :");
    for (const [nom, test] of paliers) {
      console.log(`  ${nom} : ${couleurs.filter((e) => test(e.deltaE)).length}`);
    }
    console.log(`Autres écarts (longueurs, mots-clés…) : ${autres.length}`);
  }
  if (options.captures) ecrirePlanche(bilan);
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
