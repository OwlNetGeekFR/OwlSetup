import { describe, it, expect } from "vitest";
import { escapeHtml } from "../src/modules/escape-html.js";

describe("escapeHtml", () => {
  it("neutralise les cinq caracteres sensibles", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;"
    );
  });

  it("traite null et undefined comme une chaine vide", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("convertit les valeurs non-chaines", () => {
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml(0)).toBe("0");
  });

  it("laisse le texte simple intact", () => {
    expect(escapeHtml("Google Chrome 123")).toBe("Google Chrome 123");
  });

  it("empeche une injection de balise script", () => {
    expect(escapeHtml("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
