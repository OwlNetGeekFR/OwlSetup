import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as scenarios from "../e2e/faux-hote/scenarios.js";
import { actionsConnuesDeLHote, carteDesRessources } from "../e2e/faux-hote/ressources.js";

/**
 * Fidélité du faux hôte des tests e2e (beta/e2e/).
 *
 * Un parcours Playwright ne prouve quelque chose que si le faux hôte parle
 * comme le vrai. Un scénario qui inventerait un champ — ou oublierait un champ
 * que l'hôte envoie toujours — ferait passer l'interface sur des messages qui
 * n'existent pas. Ce test lit donc les initialiseurs `new { type="…", … }` de
 * OwlSetupWebView.cs et y confronte chaque message produit par scenarios.js.
 *
 * Même leçon que package-id.test.js : on lit l'autre côté de la frontière,
 * on ne le recopie pas.
 */

const hote = readFileSync(new URL("../../OwlSetupWebView.cs", import.meta.url), "utf8");

/** Position juste après la fin du littéral C# qui commence en `i`, sinon -1. */
function finDeLitteral(source, i) {
  const c = source[i];
  if (c === "@" && source[i + 1] === '"') {
    let j = i + 2;
    while (j < source.length) {
      if (source[j] === '"' && source[j + 1] === '"') j += 2;
      else if (source[j] === '"') return j + 1;
      else j++;
    }
  }
  if (c === "$" && source[i + 1] === '"') return finDeLitteral(source, i + 1);
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < source.length && source[j] !== c) j += source[j] === "\\" ? 2 : 1;
    return j + 1;
  }
  return -1;
}

/** Corps d'un bloc `{ … }` ouvert en `ouverture`, découpé à la virgule de premier niveau. */
function membresDuBloc(source, ouverture) {
  const membres = [];
  let profondeur = 0;
  let debut = ouverture + 1;
  for (let i = ouverture; i < source.length; i++) {
    const fin = finDeLitteral(source, i);
    if (fin > 0) {
      i = fin - 1;
      continue;
    }
    const c = source[i];
    if ("({[".includes(c)) profondeur++;
    else if (")}]".includes(c)) {
      profondeur--;
      if (profondeur === 0) {
        membres.push(source.slice(debut, i));
        return membres;
      }
    } else if (c === "," && profondeur === 1) {
      membres.push(source.slice(debut, i));
      debut = i + 1;
    }
  }
  throw new Error(`bloc non fermé à la position ${ouverture}`);
}

/**
 * type → liste des jeux de champs, un par site d'émission. Seuls les objets
 * anonymes qui portent un `type` littéral sont des messages.
 */
function messagesDeLHote(source) {
  const messages = new Map();
  for (const correspondance of source.matchAll(/\bnew\s*\{/g)) {
    const ouverture = correspondance.index + correspondance[0].length - 1;
    let type = null;
    const champs = new Set();
    for (const membre of membresDuBloc(source, ouverture)) {
      const affectation = /^\s*([A-Za-z_]\w*)\s*=(?!=)\s*([\s\S]*)$/.exec(membre);
      if (!affectation) continue;
      champs.add(affectation[1]);
      const litteral = /^"([a-z0-9-]+)"\s*$/.exec(affectation[2]);
      if (affectation[1] === "type" && litteral) type = litteral[1];
    }
    if (!type) continue;
    if (!messages.has(type)) messages.set(type, []);
    messages.get(type).push(champs);
  }
  return messages;
}

const emis = messagesDeLHote(hote);

/** Tous les messages que les scénarios savent produire, avec des entrées types. */
const PRODUCTIONS = {
  infosApplication: () => scenarios.infosApplication(),
  applicationsInstallees: () =>
    scenarios.applicationsInstallees({ apps: [{ id: "VideoLAN.VLC", name: "VLC" }] }, [
      "VideoLAN.VLC",
    ]),
  verificationDeMiseAJour: () => scenarios.verificationDeMiseAJour(),
  etatDeSante: () => scenarios.etatDeSante([scenarios.miseAJourDisponible("A.B", "A", "1", "2")]),
  analyseDesMisesAJour: () =>
    scenarios.analyseDesMisesAJour([scenarios.miseAJourDisponible("A.B", "A", "1", "2")]),
  quarantaineVide: () => scenarios.quarantaineVide(),
  diagnosticAvantInstallation: () =>
    scenarios.diagnosticAvantInstallation({ requestId: 3, packages: ["A.B", "C.D"] }),
  installation: () => scenarios.installation({ packages: ["A.B", "C.D"] }, ["C.D"]),
};

describe("faux hôte : fidélité à OwlSetupWebView.cs", () => {
  it("la lecture des messages de l'hôte retrouve tous les types émis", () => {
    // Garde-fou du lecteur lui-même : il doit retrouver ce que trouve la
    // recherche brute d'ipc-contract.test.js. Seul `security-status`, construit
    // comme un dictionnaire, lui échappe — et aucun scénario ne le produit.
    const bruts = new Set([...hote.matchAll(/\btype\s*=\s*"([a-z0-9-]+)"/g)].map(([, t]) => t));
    expect([...bruts].filter((t) => !emis.has(t))).toEqual([]);
    expect(emis.size).toBeGreaterThan(80);
    expect(emis.get("health-state")[0]).toContain("deductions");
    expect(emis.get("health-state")[0]).not.toContain("updates"); // champ de l'objet imbriqué
  });

  it("chaque fonction de scenarios.js est couverte par ce test", () => {
    const fonctions = Object.entries(scenarios)
      .filter(([, valeur]) => typeof valeur === "function")
      .map(([nom]) => nom)
      .filter((nom) => nom !== "miseAJourDisponible"); // ligne de liste, vérifiée plus bas
    expect(fonctions.sort()).toEqual(Object.keys(PRODUCTIONS).sort());
  });

  for (const [nom, produire] of Object.entries(PRODUCTIONS)) {
    it(`${nom} n'envoie que des types et des champs de l'hôte`, () => {
      for (const message of produire()) {
        const sites = emis.get(message.type);
        expect(sites, `type « ${message.type} » jamais émis par l'hôte`).toBeDefined();
        const cles = Object.keys(message);
        // Inventé : aucun site d'émission ne porte ce champ.
        const connus = new Set(sites.flatMap((champs) => [...champs]));
        const inventes = cles.filter((cle) => !connus.has(cle));
        expect(inventes, `${message.type} : champs inventés`).toEqual([]);
        // Oublié : un champ présent sur TOUS les sites d'émission de ce type.
        const toujours = [...sites[0]].filter((cle) => sites.every((champs) => champs.has(cle)));
        const oublies = toujours.filter((cle) => !cles.includes(cle));
        expect(oublies, `${message.type} : champs toujours envoyés par l'hôte`).toEqual([]);
      }
    });
  }

  it("une ligne de mise à jour a les champs de QueryAvailableUpdates", () => {
    const debut = hote.indexOf("List<Dictionary<string,object>> QueryAvailableUpdates(");
    expect(debut, "QueryAvailableUpdates introuvable").toBeGreaterThan(0);
    const ajout = hote.indexOf("results.Add(new Dictionary<string,object>{", debut);
    const ligne = hote.slice(ajout, hote.indexOf("});", ajout));
    const champs = [...ligne.matchAll(/\{"(\w+)",/g)].map(([, champ]) => champ).sort();
    expect(champs.length).toBeGreaterThan(3);
    expect(Object.keys(scenarios.miseAJourDisponible("A.B", "A", "1", "2")).sort()).toEqual(champs);
  });

  it("les réponses de démarrage correspondent à des actions de OnWebMessage", () => {
    const connues = actionsConnuesDeLHote();
    expect(connues.size).toBeGreaterThan(50);
    for (const action of Object.keys(scenarios.REPONSES_DE_DEMARRAGE)) {
      expect(connues, `action « ${action} »`).toContain(action);
    }
  });
});

describe("faux hôte : ressources servies", () => {
  const carte = carteDesRessources();

  it("sert l'interface telle que l'hôte l'extrait", () => {
    for (const fichier of [
      "index.html",
      "i18n.js",
      "catalog.generated.js",
      "app.js",
      "styles.css",
    ]) {
      expect(carte.get(fichier), fichier).toMatch(new RegExp(`${fichier.replace(".", "\\.")}$`));
    }
    // Le logo est embarqué depuis la version 512 px et servi sous un autre nom.
    expect(carte.get("assets/branding/owlsetup-logo.png")).toMatch(/owlsetup-logo-512\.png$/);
    expect(
      [...carte.keys()].filter((chemin) => chemin.startsWith("assets/logos/")).length
    ).toBeGreaterThan(50);
  });

  it("ne sert rien de plus que ce que l'hôte extrait dans AppRoot", () => {
    // Les DLL WebView2 vont dans RuntimeRoot, hors de l'hôte virtuel.
    expect([...carte.keys()].some((chemin) => /\.dll$/i.test(chemin))).toBe(false);
  });
});
