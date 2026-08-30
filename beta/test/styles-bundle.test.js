import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PARTIELS, BANNIERE, assembler } from "../scripts/build-css.mjs";

const here = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const BUILD_CSS = here("../scripts/build-css.mjs");
const ROOT_STYLES = here("../../styles.css");

function rebuild() {
  execFileSync(process.execPath, [BUILD_CSS], { stdio: "pipe" });
  return readFileSync(ROOT_STYLES, "utf8");
}

describe("build-css.mjs — assemblage de styles.css", () => {
  it("produit une sortie déterministe (deux exécutions identiques)", () => {
    expect(rebuild()).toBe(rebuild());
  });

  it("le styles.css versionné correspond aux partiels", () => {
    // Garde le fichier généré et ses sources synchronisés : si quelqu'un édite
    // styles.css à la main, ce test le signale.
    expect(readFileSync(ROOT_STYLES, "utf8")).toBe(assembler());
  });

  it("porte la bannière « ne pas éditer »", () => {
    expect(rebuild().startsWith(BANNIERE)).toBe(true);
  });

  it("concatène les partiels dans l'ordre déclaré", () => {
    const css = rebuild();
    let position = 0;
    for (const nom of PARTIELS) {
      const partiel = readFileSync(here(`../src/styles/${nom}`), "utf8");
      const trouve = css.indexOf(partiel, position);
      expect(trouve, `${nom} absent ou hors séquence`).toBeGreaterThanOrEqual(0);
      position = trouve + partiel.length;
    }
  });

  it("garde les accolades équilibrées et les repères clés", () => {
    const css = rebuild();
    const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const ouvrantes = (sansCommentaires.match(/\{/g) || []).length;
    const fermantes = (sansCommentaires.match(/\}/g) || []).length;
    expect(ouvrantes).toBe(fermantes);

    for (const marker of [
      "--muted:",
      '[data-theme="light"]',
      "body.high-contrast",
      "prefers-reduced-motion",
      ":focus-visible",
    ]) {
      expect(css, `repère manquant : ${marker}`).toContain(marker);
    }
  });
});
