import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const schemaPath = fileURLToPath(new URL("../catalog/catalog.schema.json", import.meta.url));
const catalogPath = fileURLToPath(new URL("../catalog/apps.json", import.meta.url));

describe("catalog/apps.json", () => {
  let catalog;
  let validate;

  beforeAll(() => {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const ajv = new Ajv({ allErrors: true, strict: false });
    validate = ajv.compile(schema);
  });

  it("respecte le schema JSON", () => {
    const ok = validate(catalog);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it("contient au moins 90 applications (garde de `check-catalog.mjs`)", () => {
    expect(catalog.applications.length).toBeGreaterThanOrEqual(90);
  });

  it("n'a aucun identifiant duplique (insensible a la casse)", () => {
    const seen = new Set();
    for (const app of catalog.applications) {
      const key = app.id.toLowerCase();
      expect(seen.has(key), `doublon : ${app.id}`).toBe(false);
      seen.add(key);
    }
  });

  it("n'utilise que des URL https pour `site` et `manualInstallUrl`", () => {
    for (const app of catalog.applications) {
      expect(app.site.startsWith("https://"), app.id).toBe(true);
      if (app.manualInstallUrl)
        expect(app.manualInstallUrl.startsWith("https://"), app.id).toBe(true);
    }
  });

  it("declare `manualInstallUrl` quand `manualInstall` est vrai", () => {
    for (const app of catalog.applications) {
      if (app.manualInstall) expect(app.manualInstallUrl, app.id).toBeTruthy();
    }
  });

  it("garde `count` coherent avec la liste", () => {
    if (typeof catalog.count === "number") {
      expect(catalog.count).toBe(catalog.applications.length);
    }
  });
});
