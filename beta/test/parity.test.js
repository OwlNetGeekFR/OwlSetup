/**
 * Garde-fou anti-derive : chaque module de `src/modules/` doit se comporter
 * EXACTEMENT comme l'implementation encore inline dans `../app.js`.
 *
 * Tant que le bundler (etape 2 du plan) n'a pas remplace le code inline par un
 * import, ce test echoue des qu'un des deux cotes change sans l'autre.
 */
import { describe, it, expect } from "vitest";
import { extractFunction, rootSource } from "./helpers/extract-from-root.js";

import { escapeHtml } from "../src/modules/escape-html.js";
import { isValidPackageId } from "../src/modules/package-id.js";
import {
  wingetInitials,
  normalizeWingetBrand,
  wingetFallbackColor,
} from "../src/modules/winget-brand.js";
import { redactLogDiagnostic, telemetryFingerprint } from "../src/modules/redaction.js";

const HTML_SAMPLES = [
  `<script>alert('x')</script>`,
  `A & B < C > D " E ' F`,
  "",
  null,
  undefined,
  42,
  "texte normal",
];

const ID_SAMPLES = [
  "Google.Chrome",
  "Microsoft.VCRedist.2015+.x64",
  "bad id",
  "Foo;calc",
  "",
  "9NT1R1C2HH7J",
  "../etc",
  "a\nb",
  "--source",
  "-e",
  ".hidden",
  "_foo",
];

const NAME_SAMPLES = [
  "Google Chrome",
  "Mozilla Firefox (x64)",
  "7-Zip 23.01",
  "Câblé Déjà",
  "Visual Studio Code Desktop Client",
  "",
  "éàùïô",
  "A",
];

const LOG_SAMPLES = [
  "Echec C:\\Users\\Benjamin\\AppData\\Local\\Temp\\run.log code 6",
  "contact benjamin.k88000@gmail.com pour le suivi",
  "Nom d'utilisateur : benjamin",
  "runAs DOMAINE-PC\\benjamin refuse",
  "x".repeat(900),
  "",
];

const FINGERPRINT_SAMPLES = [
  { errorCategory: "installation", failureStage: "download", targetPackage: "Google.Chrome" },
  {
    errorCategory: "update",
    failureStage: "network",
    errorCode: "0x80070005",
    errorKind: "winget",
  },
  {},
  { errorCategory: "uninstall" },
];

// `escapeHtml` a été MIGRÉ (lot 2, 4.0.0-beta.23) : app.js ne contient plus de
// copie inline, il utilise la fonction du module inlinée par build-js.mjs.
describe("escapeHtml — migré vers le module", () => {
  it("app.js n'a plus de copie inline `const escapeHtml =`", () => {
    expect(rootSource).not.toMatch(/\bconst\s+escapeHtml\s*=/);
  });

  it("app.js contient bien la fonction du module", () => {
    expect(rootSource).toContain("function escapeHtml(value) {");
  });

  it("le module couvre toujours les échantillons de référence", () => {
    for (const value of HTML_SAMPLES) {
      expect(typeof escapeHtml(value)).toBe("string");
    }
    expect(escapeHtml(`A & B < C > D " E ' F`)).toBe("A &amp; B &lt; C &gt; D &quot; E &#39; F");
  });
});

// `isValidPackageId` / `telemetrySafePackageId` MIGRÉS (lot 2, 4.0.0-beta.24) :
// app.js utilise le module `package-id.js` inliné par build-js.mjs.
describe("package-id — migré vers le module", () => {
  it("app.js n'a plus de copie inline `const isValidPackageId =`", () => {
    expect(rootSource).not.toMatch(/\bconst\s+isValidPackageId\s*=/);
  });

  it("app.js contient la fonction et le motif du module", () => {
    expect(rootSource).toContain("function isValidPackageId(id) {");
    expect(rootSource).toContain("const PACKAGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+_-]*$/;");
  });

  it("app.js n'a plus le test regex inline de la télémétrie", () => {
    expect(rootSource).not.toContain("[A-Za-z0-9.+_-]{0,95}$/.test(targetPackage)");
    expect(rootSource).toContain("targetPackage = telemetrySafePackageId(targetPackage);");
  });

  it("le module couvre toujours les identifiants de référence", () => {
    for (const value of ID_SAMPLES) {
      expect(typeof isValidPackageId(value)).toBe("boolean");
    }
    expect(isValidPackageId("Google.Chrome")).toBe(true);
    expect(isValidPackageId("-danger")).toBe(false);
  });
});

// `winget-brand` MIGRÉ (lot 2, 4.0.0-beta.26) : app.js utilise le module
// `winget-brand.js` inliné par build-js.mjs (comportement couvert par
// beta/test/winget-brand.test.js).
describe("winget-brand — migré vers le module", () => {
  it("app.js n'a plus les copies inline", () => {
    expect(rootSource).toContain("function wingetInitials(name) {");
    expect(rootSource).toContain("function normalizeWingetBrand(value) {");
    expect(rootSource).toContain("function wingetFallbackColor(value) {");
    // la palette n'est plus définie dans le corps de la fonction :
    expect(rootSource).not.toMatch(/const palette\s*=\s*\["#3178c6"/);
  });

  it("le module couvre toujours les noms de référence", () => {
    for (const value of NAME_SAMPLES) {
      expect(typeof wingetInitials(value)).toBe("string");
      expect(typeof normalizeWingetBrand(value)).toBe("string");
      expect(wingetFallbackColor(value)).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(wingetInitials("Google Chrome")).toBe("GC");
    expect(normalizeWingetBrand("Câblé Déjà (x64)")).toBe("cabledeja");
    expect(wingetFallbackColor("Google Chrome")).toBe(wingetFallbackColor("Google Chrome"));
  });
});

describe("parite redaction", () => {
  const inlineRedact = extractFunction("redactLogDiagnostic");
  const inlineFingerprint = extractFunction("telemetryFingerprint");

  it.each(LOG_SAMPLES.map((v) => [v]))("redactLogDiagnostic(%o)", (value) => {
    expect(redactLogDiagnostic(value)).toBe(inlineRedact(value));
  });
  it.each(FINGERPRINT_SAMPLES.map((v) => [v]))("telemetryFingerprint(%o)", (value) => {
    expect(telemetryFingerprint(value)).toBe(inlineFingerprint(value));
  });
});
