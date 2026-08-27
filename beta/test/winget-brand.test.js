import { describe, it, expect } from "vitest";
import {
  wingetInitials,
  normalizeWingetBrand,
  wingetFallbackColor,
  FALLBACK_PALETTE,
} from "../src/modules/winget-brand.js";

describe("wingetInitials", () => {
  it("prend la premiere lettre des deux premiers mots", () => {
    expect(wingetInitials("Google Chrome")).toBe("GC");
    expect(wingetInitials("Visual Studio Code")).toBe("VS");
  });

  it("gere le vide et se limite a trois caracteres", () => {
    // "   " : aucun mot apres filtrage -> repli complet "APP"
    expect(wingetInitials("   ")).toBe("APP");
    // null/"" : String(x || "APP") vaut "APP", dont on tire l'initiale "A"
    expect(wingetInitials(null)).toBe("A");
    expect(wingetInitials("")).toBe("A");
    expect(wingetInitials("Alpha Bravo Charlie Delta").length).toBeLessThanOrEqual(3);
  });
});

describe("normalizeWingetBrand", () => {
  it("supprime accents, ponctuation et suffixes d'architecture", () => {
    expect(normalizeWingetBrand("Mozilla Firefox (x64)")).toBe("mozillafirefox");
    expect(normalizeWingetBrand("Câblé.Déjà_Vu")).toBe("cabledejavu");
    expect(normalizeWingetBrand("Foo Desktop Client")).toBe("foo");
  });

  it("rend deux libelles equivalents comparables", () => {
    expect(normalizeWingetBrand("Mozilla Firefox x64")).toBe(
      normalizeWingetBrand("mozilla-firefox")
    );
  });

  it("gere les valeurs vides", () => {
    expect(normalizeWingetBrand(null)).toBe("");
  });
});

describe("wingetFallbackColor", () => {
  it("est deterministe", () => {
    expect(wingetFallbackColor("Postman")).toBe(wingetFallbackColor("Postman"));
  });

  it("renvoie toujours une couleur de la palette", () => {
    for (const name of ["a", "bbb", "Some.Package.Id", "", "éàù"]) {
      expect(FALLBACK_PALETTE).toContain(wingetFallbackColor(name));
    }
  });
});
