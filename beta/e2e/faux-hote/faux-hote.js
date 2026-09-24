import { readFile } from "node:fs/promises";
import { actionsConnuesDeLHote, carteDesRessources, typeDeContenu } from "./ressources.js";
import { REPONSES_DE_DEMARRAGE } from "./scenarios.js";

/**
 * Faux hôte WebView2 : l'interface d'OwlSetup tourne dans Chromium, sans
 * Windows, et parle à ce faux hôte comme elle parlerait à `OwlSetupWebView.cs`.
 *
 * Ce qu'il reproduit de l'hôte réel :
 *  - l'origine `https://pcsetup.local`, servie depuis les seules ressources que
 *    l'hôte extrait (cf. ressources.js) — tout autre fichier répond 404 ;
 *  - `window.chrome.webview` : `postMessage` vers l'hôte, messages de l'hôte
 *    reçus par `addEventListener("message")`, chacun dans sa propre tâche ;
 *  - les refus de `OnWebMessage` : action inconnue ou commande de plus d'1 Mo
 *    déclenchent `owlsetup:native-error`, comme dans l'application ;
 *  - aucun accès réseau : toute requête vers une autre origine est coupée et
 *    notée.
 *
 * Ce qu'il ne fait pas : exécuter quoi que ce soit. Les réponses sont des
 * scénarios écrits d'après le C# (scenarios.js).
 */

const ORIGINE = "https://pcsetup.local";
export const PAGE_D_ACCUEIL = `${ORIGINE}/index.html`;
const TAILLE_MAX_COMMANDE = 1024 * 1024;

const carte = carteDesRessources();
const actionsConnues = actionsConnuesDeLHote();

/** Exécuté dans la page, avant tout script de l'interface. */
function pontWebView({ tailleMax }) {
  const ecouteurs = new Set();
  // Même détail que le `catch` de OnWebMessage.
  const erreurNative = (message, operation, errorKind) =>
    window.dispatchEvent(
      new CustomEvent("owlsetup:native-error", {
        detail: {
          message,
          operation,
          failureStage: "execution",
          errorKind,
          resolutionStatus: "open",
        },
      })
    );
  window.chrome = window.chrome || {};
  window.chrome.webview = {
    postMessage(message) {
      // WebView2 transmet la commande sérialisée : même aller-retour JSON ici.
      const texte = JSON.stringify(message);
      if (!texte || texte.length > tailleMax) {
        erreurNative("Commande trop volumineuse ou vide.", "unknown", "validation");
        return;
      }
      window.__owlsetupVersLHote(JSON.parse(texte));
    },
    addEventListener(type, ecouteur) {
      if (type === "message") ecouteurs.add(ecouteur);
    },
    removeEventListener(type, ecouteur) {
      if (type === "message") ecouteurs.delete(ecouteur);
    },
  };
  window.__owlsetupPont = {
    emettre(message) {
      for (const ecouteur of ecouteurs) ecouteur({ data: message });
    },
    erreurNative,
  };
  window.__owlsetupViolationsCsp = [];
  document.addEventListener("securitypolicyviolation", (evenement) =>
    window.__owlsetupViolationsCsp.push(`${evenement.violatedDirective} ${evenement.blockedURI}`)
  );
}

export class FauxHote {
  /** @type {{ action: string, payload: any }[]} commandes reçues, dans l'ordre */
  commandes = [];
  /** actions refusées par OnWebMessage (« Action inconnue. ») */
  actionsInconnues = [];
  /** chemins demandés par l'interface et que l'hôte n'extrait pas */
  ressourcesIntrouvables = [];
  /** requêtes vers une autre origine que pcsetup.local, toutes coupées */
  requetesExternes = [];
  /** exceptions JavaScript non rattrapées dans l'interface */
  erreursDePage = [];
  /** messages que le faux hôte n'a pas pu remettre à l'interface */
  erreursDEnvoi = [];

  #page;
  #remplacements;
  #reponses = new Map(Object.entries(REPONSES_DE_DEMARRAGE));
  #attentes = [];
  #envois = Promise.resolve();

  /**
   * @param {import("@playwright/test").Page} page
   * @param {{ remplacements?: Record<string, string | Buffer> }} [options]
   *   contenu servi à la place d'une ressource extraite (même chemin) — par
   *   exemple une feuille de style de référence pour comparer deux rendus.
   *   Seul un chemin que l'hôte extrait peut être remplacé.
   */
  constructor(page, { remplacements = {} } = {}) {
    this.#page = page;
    for (const chemin of Object.keys(remplacements)) {
      if (!carte.has(chemin)) throw new Error(`l'hôte n'extrait pas « ${chemin} »`);
    }
    this.#remplacements = new Map(Object.entries(remplacements));
  }

  async brancher() {
    const page = this.#page;
    page.on("pageerror", (erreur) => this.erreursDePage.push(erreur.message));
    await page.exposeFunction("__owlsetupVersLHote", (commande) => this.#recevoir(commande));
    await page.addInitScript(pontWebView, { tailleMax: TAILLE_MAX_COMMANDE });
    await page.route("**/*", (route) => this.#servir(route));
  }

  /**
   * Ouvre l'interface comme le fait WebAppForm, et attend sa première
   * commande : à ce moment `app.js` a fini de s'exécuter.
   */
  async demarrer() {
    await this.#page.goto(PAGE_D_ACCUEIL);
    await this.commande("get-app-info");
  }

  /**
   * Définit ce que l'hôte répond à une action. `fabrique(payload)` rend la
   * liste des messages à envoyer ; sans réponse définie, l'action est notée et
   * rien n'est renvoyé.
   */
  repondre(action, fabrique) {
    if (!actionsConnues.has(action))
      throw new Error(`l'hôte ne connaît pas l'action « ${action} »`);
    this.#reponses.set(action, fabrique);
  }

  /**
   * L'hôte lève une exception en traitant `action` : le `catch` de
   * OnWebMessage la rend à l'interface par `owlsetup:native-error`.
   * `errorKind` suit le type d'exception (InvalidOperationException →
   * « application », InvalidDataException → « validation »…).
   */
  refuser(action, message, errorKind = "application") {
    if (!actionsConnues.has(action))
      throw new Error(`l'hôte ne connaît pas l'action « ${action} »`);
    this.#reponses.set(action, { refus: { message, errorKind } });
  }

  /** Envoie des messages à l'interface, un par tâche, comme PostWebMessageAsJson. */
  envoyer(...messages) {
    for (const message of messages) {
      this.#enFile(() => this.#page.evaluate((m) => window.__owlsetupPont.emettre(m), message));
    }
    return this.#envois;
  }

  /** Attend (ou retrouve) la première commande `action` reçue et rend son payload. */
  commande(action, { delai = 5000 } = {}) {
    const deja = this.commandes.find((commande) => commande.action === action);
    if (deja) return Promise.resolve(deja.payload);
    return new Promise((resoudre, rejeter) => {
      const minuterie = setTimeout(() => {
        rejeter(
          new Error(
            `l'interface n'a pas envoyé « ${action} » (reçues : ${this.actions().join(", ")})`
          )
        );
      }, delai);
      this.#attentes.push({
        action,
        resoudre: (payload) => {
          clearTimeout(minuterie);
          resoudre(payload);
        },
      });
    });
  }

  /** Noms des actions reçues, dans l'ordre. */
  actions() {
    return this.commandes.map((commande) => commande.action);
  }

  /** Attend que tous les messages en file soient remis à l'interface. */
  async calme() {
    await this.#envois;
  }

  /**
   * Attend que l'échange soit au repos : plus aucun message en file, et
   * l'interface n'envoie plus de nouvelle commande (une réponse en déclenche
   * souvent une autre : fin d'installation → nouvelle détection…).
   */
  async stabiliser() {
    for (let tour = 0; tour < 40; tour++) {
      const avant = this.commandes.length + this.actionsInconnues.length;
      await this.calme();
      await this.#page.evaluate(
        () => new Promise((fin) => requestAnimationFrame(() => setTimeout(fin, 60)))
      );
      await this.calme();
      if (this.commandes.length + this.actionsInconnues.length === avant) return;
    }
    throw new Error("l'interface ne cesse d'envoyer des commandes");
  }

  async violationsCsp() {
    return this.#page.evaluate(() => window.__owlsetupViolationsCsp ?? []);
  }

  /** Chaîne les remises : un échec est noté sans bloquer les suivantes. */
  #enFile(remise) {
    this.#envois = this.#envois.then(remise).catch((erreur) => {
      this.erreursDEnvoi.push(erreur.message);
    });
  }

  #recevoir(commande) {
    const action = String(commande?.action ?? "unknown");
    const payload = commande?.payload ?? null;
    if (!actionsConnues.has(action)) {
      this.actionsInconnues.push(action);
      // OnWebMessage lève InvalidOperationException : errorKind « application ».
      this.#enFile(() =>
        this.#page.evaluate(
          (a) => window.__owlsetupPont.erreurNative("Action inconnue.", a, "application"),
          action
        )
      );
      return;
    }
    this.commandes.push({ action, payload });
    const reponse = this.#reponses.get(action);
    if (reponse?.refus) {
      const { message, errorKind } = reponse.refus;
      this.#enFile(() =>
        this.#page.evaluate(
          ([m, a, k]) => window.__owlsetupPont.erreurNative(m, a, k),
          [message, action, errorKind]
        )
      );
    } else if (reponse) this.envoyer(...reponse(payload));
    for (const attente of this.#attentes.filter((a) => a.action === action))
      attente.resoudre(payload);
    this.#attentes = this.#attentes.filter((a) => a.action !== action);
  }

  async #servir(route) {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGINE) {
      this.requetesExternes.push(url.href);
      return route.abort("blockedbyclient");
    }
    const chemin = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const fichier = carte.get(chemin);
    if (!fichier) {
      this.ressourcesIntrouvables.push(chemin);
      return route.fulfill({ status: 404, body: "" });
    }
    return route.fulfill({
      status: 200,
      contentType: typeDeContenu(fichier),
      body: this.#remplacements.get(chemin) ?? (await readFile(fichier)),
    });
  }
}
