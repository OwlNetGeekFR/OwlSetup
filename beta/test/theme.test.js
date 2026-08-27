import { describe, it, expect } from "vitest";
import {
  normalizeThemePreference,
  resolveTheme,
  THEME_PREFERENCES,
  DEFAULT_PREFERENCE,
} from "../src/modules/theme.js";

describe("normalizeThemePreference", () => {
  it("garde les trois valeurs connues", () => {
    for (const value of THEME_PREFERENCES) {
      expect(normalizeThemePreference(value)).toBe(value);
    }
  });

  it("retombe sur 'system' pour toute autre valeur", () => {
    for (const value of [null, "", "System", "sombre", 1, undefined]) {
      expect(normalizeThemePreference(value)).toBe(DEFAULT_PREFERENCE);
    }
  });
});

describe("resolveTheme", () => {
  it("suit Windows quand la preference est 'system'", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
  });

  it("ignore Windows quand un theme est impose", () => {
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
  });

  it("traite une preference invalide comme 'system'", () => {
    expect(resolveTheme("bogus", true)).toBe("light");
    expect(resolveTheme(undefined, false)).toBe("dark");
  });
});
