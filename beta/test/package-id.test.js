import { describe, it, expect } from "vitest";
import {
  isValidPackageId,
  sanitizePackageIds,
  telemetrySafePackageId,
  PACKAGE_ID_PATTERN,
} from "../src/modules/package-id.js";

describe("isValidPackageId", () => {
  it("accepte les identifiants WinGet reels du catalogue", () => {
    for (const id of [
      "Google.Chrome",
      "Microsoft.VCRedist.2015+.x64",
      "7zip.7zip",
      "Notepad++.Notepad++",
      "9NT1R1C2HH7J",
      "OpenJS.NodeJS.LTS",
    ]) {
      expect(isValidPackageId(id), id).toBe(true);
    }
  });

  it("rejette tout ce qui pourrait s'echapper vers le shell / winget", () => {
    for (const id of [
      "",
      "Foo Bar",
      "Foo;calc.exe",
      'Foo"',
      "Foo`n",
      "Foo|bar",
      "Foo&&bar",
      "../../etc",
      "Foo\nBar",
    ]) {
      expect(isValidPackageId(id), JSON.stringify(id)).toBe(false);
    }
  });

  it("durcissement 4.0-beta : refuse un identifiant commencant par un non-alphanumerique", () => {
    for (const id of ["--source", "-e", ".hidden", "+x", "_foo", "-Google.Chrome"]) {
      expect(isValidPackageId(id), JSON.stringify(id)).toBe(false);
    }
  });

  it("rejette les valeurs non-chaines", () => {
    expect(isValidPackageId(null)).toBe(false);
    expect(isValidPackageId(42)).toBe(false);
    expect(isValidPackageId(["Google.Chrome"])).toBe(false);
  });
});

describe("sanitizePackageIds", () => {
  it("filtre, deduplique et conserve l'ordre", () => {
    const input = ["Google.Chrome", "bad id", "Google.Chrome", "Mozilla.Firefox", 5, null];
    expect(sanitizePackageIds(input)).toEqual(["Google.Chrome", "Mozilla.Firefox"]);
  });

  it("renvoie un tableau vide pour une entree non-tableau", () => {
    expect(sanitizePackageIds("Google.Chrome")).toEqual([]);
    expect(sanitizePackageIds(undefined)).toEqual([]);
  });
});

describe("telemetrySafePackageId", () => {
  it("garde un identifiant court et sur", () => {
    expect(telemetrySafePackageId("Google.Chrome")).toBe("Google.Chrome");
  });

  it("efface un identifiant trop long ou invalide", () => {
    expect(telemetrySafePackageId("A".repeat(97))).toBe("");
    expect(telemetrySafePackageId("mauvais id")).toBe("");
    expect(telemetrySafePackageId(null)).toBe("");
  });
});

describe("PACKAGE_ID_PATTERN", () => {
  it("est identique a la regex de l'hote C# (^[A-Za-z0-9][A-Za-z0-9.+_-]*$)", () => {
    expect(PACKAGE_ID_PATTERN.source).toBe("^[A-Za-z0-9][A-Za-z0-9.+_-]*$");
  });
});
