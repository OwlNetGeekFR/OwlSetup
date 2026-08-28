import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const BUILD_JS = here("../scripts/build-js.mjs");
const ROOT_APP_JS = here("../../app.js");
const LEGACY = here("../src/app/legacy.js");

function rebuild() {
  execFileSync(process.execPath, [BUILD_JS], { stdio: "pipe" });
  return readFileSync(ROOT_APP_JS, "utf8");
}

describe("build-js.mjs — assemblage de app.js", () => {
  it("produit une sortie déterministe (deux exécutions identiques)", () => {
    const first = rebuild();
    const second = rebuild();
    expect(second).toBe(first);
  });

  it("enveloppe le tout dans une IIFE avec bannière « ne pas éditer »", () => {
    const app = rebuild();
    expect(app.startsWith("/* Genere par beta/scripts/build-js.mjs")).toBe(true);
    expect(app).toContain("(function () {");
    expect(app.trimEnd().endsWith("})();")).toBe(true);
    // Pas de directive stricte ajoutée : legacy.js reste en mode sloppy.
    expect(app.slice(0, 200)).not.toContain('"use strict"');
  });

  it("inclut legacy.js verbatim (garantie pendant la migration lot 2)", () => {
    const app = rebuild();
    const legacy = readFileSync(LEGACY, "utf8").trimEnd();
    expect(app).toContain(legacy);
  });

  it("ne perd aucun repère clé de l'interface", () => {
    const app = rebuild();
    for (const marker of [
      "window.PC_SETUP_CATALOG",
      "window.chrome.webview",
      "owlsetup:native-error",
      "function showView",
      "function renderApps",
    ]) {
      expect(app, `repère manquant : ${marker}`).toContain(marker);
    }
  });
});
