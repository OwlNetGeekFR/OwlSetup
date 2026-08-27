/**
 * Verifie que `catalog/apps.json` decrit exactement le meme catalogue que le
 * code inline de `../app.js`. Si l'un bouge sans l'autre, ce test echoue.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootSource = readFileSync(fileURLToPath(new URL("../../app.js", import.meta.url)), "utf8");
const catalog = JSON.parse(
  readFileSync(fileURLToPath(new URL("../catalog/apps.json", import.meta.url)), "utf8")
);

function inlineCatalog() {
  const appsStart = rootSource.indexOf("const apps = [");
  const appsEnd = rootSource.indexOf("\nif (Array.isArray(window.PC_SETUP_CATALOG)", appsStart);
  const logosStart = rootSource.indexOf("const appLogos");
  const logosEnd = rootSource.indexOf("};", logosStart) + 2;
  const build = new Function(`
    ${rootSource.slice(appsStart, appsEnd)}
    ${rootSource.slice(logosStart, logosEnd)}
    apps.forEach(a => a.logo = a.logo || (appLogos[a.id] ? "assets/logos/" + appLogos[a.id] : ""));
    return apps;
  `);
  return build();
}

describe("parite catalogue app.js <-> apps.json", () => {
  const inline = inlineCatalog();

  it("meme nombre d'applications", () => {
    expect(catalog.applications.length).toBe(inline.length);
  });

  it("meme ensemble d'identifiants", () => {
    const a = new Set(inline.map((x) => x.id));
    const b = new Set(catalog.applications.map((x) => x.id));
    expect([...b].filter((id) => !a.has(id))).toEqual([]);
    expect([...a].filter((id) => !b.has(id))).toEqual([]);
  });

  it("memes champs cles pour chaque application", () => {
    const byId = new Map(catalog.applications.map((x) => [x.id, x]));
    for (const app of inline) {
      const json = byId.get(app.id);
      expect(json, app.id).toBeTruthy();
      expect(json.name, app.id).toBe(app.name);
      expect(json.category, app.id).toBe(app.category);
      expect(json.site, app.id).toBe(app.site);
      expect(json.color, app.id).toBe(app.color);
      expect(json.icon, app.id).toBe(app.icon);
      expect(json.logo || "", app.id).toBe(app.logo || "");
      expect(Boolean(json.manualInstall), app.id).toBe(Boolean(app.manualInstall));
      expect(Boolean(json.webService), app.id).toBe(Boolean(app.webService));
      expect(json.repairMode, app.id).toBe(app.repairMode);
    }
  });
});
