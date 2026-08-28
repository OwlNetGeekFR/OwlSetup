import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  SELF_MANAGED_UPDATERS,
  isVersionPrefixMismatch,
  isSelfManagedUpdate,
} from "../src/modules/update-heuristics.js";

describe("isVersionPrefixMismatch", () => {
  it("détecte le cas Ankama (3.15.2 -> 3.15.2.20509)", () => {
    expect(isVersionPrefixMismatch("3.15.2", "3.15.2.20509")).toBe(true);
  });

  it("fonctionne dans les deux sens", () => {
    expect(isVersionPrefixMismatch("1.2.3.4", "1.2.3")).toBe(true);
  });

  it("laisse passer une vraie montée de version", () => {
    expect(isVersionPrefixMismatch("3.15.2", "3.16.0")).toBe(false);
    expect(isVersionPrefixMismatch("1.0", "2.0")).toBe(false);
  });

  it("ignore l'égalité et le vide", () => {
    expect(isVersionPrefixMismatch("3.15.2", "3.15.2")).toBe(false);
    expect(isVersionPrefixMismatch("", "1.0")).toBe(false);
    expect(isVersionPrefixMismatch("1.0", "")).toBe(false);
    expect(isVersionPrefixMismatch(null, undefined)).toBe(false);
  });

  it("ne se laisse pas piéger par un préfixe numérique sans point", () => {
    // "3.1" -> "3.15" : "3.15" ne commence pas par "3.1." donc ce n'est pas
    // considéré comme un simple décalage de schéma.
    expect(isVersionPrefixMismatch("3.1", "3.15")).toBe(false);
  });
});

describe("isSelfManagedUpdate", () => {
  it("reconnaît un lanceur connu quelle que soit la casse", () => {
    expect(isSelfManagedUpdate("Ankama.AnkamaLauncher", "3.15.2", "3.16.0")).toBe(true);
    expect(isSelfManagedUpdate("ankama.ankamalauncher", "x", "y")).toBe(true);
  });

  it("reconnaît un décalage de schéma même hors liste", () => {
    expect(isSelfManagedUpdate("Some.OtherApp", "3.15.2", "3.15.2.20509")).toBe(true);
  });

  it("laisse une application normale se faire mettre à jour par WinGet", () => {
    expect(isSelfManagedUpdate("Mozilla.Firefox", "127.0", "128.0")).toBe(false);
  });
});

describe("parité de la liste (module <-> C# <-> app.js)", () => {
  const expected = [...SELF_MANAGED_UPDATERS].map((id) => id.toLowerCase()).sort();

  it("== SelfManagedUpdaters (OwlSetupWebView.cs)", () => {
    const cs = readFileSync(
      fileURLToPath(new URL("../../OwlSetupWebView.cs", import.meta.url)),
      "utf8"
    );
    const block = cs.slice(
      cs.indexOf("SelfManagedUpdaters = new HashSet<string>"),
      cs.indexOf("};", cs.indexOf("SelfManagedUpdaters = new HashSet<string>"))
    );
    const csIds = [...block.matchAll(/"([A-Za-z0-9][A-Za-z0-9.+_-]*)"/g)].map((m) =>
      m[1].toLowerCase()
    );
    expect(csIds.sort()).toEqual(expected);
  });

  // Migré (lot 2, 4.0.0-beta.31) : app.js n'a plus de tableau d'ids codé en
  // dur ; la liste vient du module, inlinée par build-js.mjs, et le Set en est
  // dérivé. On vérifie que la liste inlinée reste identique au module.
  it("== app.js (liste inlinée depuis le module + Set dérivé)", () => {
    const js = readFileSync(fileURLToPath(new URL("../../app.js", import.meta.url)), "utf8");
    expect(js).not.toContain("const SELF_MANAGED_UPDATER_IDS = new Set([");
    expect(js).toContain(
      "const SELF_MANAGED_UPDATER_IDS = new Set(SELF_MANAGED_UPDATERS.map(id => id.toLowerCase()));"
    );
    const start = js.indexOf("const SELF_MANAGED_UPDATERS = [");
    const block = js.slice(start, js.indexOf("];", start));
    const jsIds = [...block.matchAll(/"([A-Za-z0-9][A-Za-z0-9.+_-]*)"/g)].map((m) =>
      m[1].toLowerCase()
    );
    expect(jsIds.sort()).toEqual(expected);
  });
});
