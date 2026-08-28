/**
 * Depuis 4.0.0-beta.11, `catalog/apps.json` est la source de vérité du
 * catalogue. Ce test vérifie que `catalog.generated.js` (le script chargé au
 * runtime, produit par `scripts/build-catalog.mjs`) décrit exactement le même
 * catalogue.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const catalog = JSON.parse(
  readFileSync(fileURLToPath(new URL("../catalog/apps.json", import.meta.url)), "utf8")
);
const generatedSrc = readFileSync(
  fileURLToPath(new URL("../../catalog.generated.js", import.meta.url)),
  "utf8"
);

function runtimeCatalog() {
  const scope = { window: {} };
  new Function("window", generatedSrc)(scope.window);
  return scope.window.PC_SETUP_CATALOG;
}

describe("parité catalog/apps.json <-> catalog.generated.js", () => {
  const runtime = runtimeCatalog();

  it("catalog.generated.js expose bien un tableau window.PC_SETUP_CATALOG", () => {
    expect(Array.isArray(runtime)).toBe(true);
  });

  it("même nombre d'applications", () => {
    expect(runtime.length).toBe(catalog.applications.length);
  });

  it("même ordre d'identifiants (l'ordre = l'affichage)", () => {
    expect(runtime.map((x) => x.id)).toEqual(catalog.applications.map((x) => x.id));
  });

  it("mêmes champs par application, `logo` compris", () => {
    const byId = new Map(runtime.map((x) => [x.id, x]));
    for (const app of catalog.applications) {
      const rt = byId.get(app.id);
      expect(rt, app.id).toBeTruthy();
      expect(rt, app.id).toEqual(app);
      expect(rt.logo, app.id).toMatch(/^assets\/logos\/[^/]+\.(svg|png|ico)$/);
    }
  });
});
