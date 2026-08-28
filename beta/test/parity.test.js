/**
 * Garde-fou anti-derive : chaque module de `src/modules/` doit se comporter
 * EXACTEMENT comme l'implementation encore inline dans `../app.js`.
 *
 * Tant que le bundler (etape 2 du plan) n'a pas remplace le code inline par un
 * import, ce test echoue des qu'un des deux cotes change sans l'autre.
 */
import { describe, it, expect } from "vitest";
import { extractFunction, extractConst, rootSource } from "./helpers/extract-from-root.js";

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

describe("parite isValidPackageId", () => {
  const inline = extractConst("isValidPackageId");
  it.each(ID_SAMPLES.map((v) => [v]))("isValidPackageId(%o)", (value) => {
    expect(isValidPackageId(value)).toBe(inline(value));
  });
});

describe("parite winget-brand", () => {
  const inlineInitials = extractFunction("wingetInitials");
  const inlineNormalize = extractFunction("normalizeWingetBrand");
  const inlineColor = extractFunction("wingetFallbackColor");

  it.each(NAME_SAMPLES.map((v) => [v]))("wingetInitials(%o)", (value) => {
    expect(wingetInitials(value)).toBe(inlineInitials(value));
  });
  it.each(NAME_SAMPLES.map((v) => [v]))("normalizeWingetBrand(%o)", (value) => {
    expect(normalizeWingetBrand(value)).toBe(inlineNormalize(value));
  });
  it.each(NAME_SAMPLES.map((v) => [v]))("wingetFallbackColor(%o)", (value) => {
    expect(wingetFallbackColor(value)).toBe(inlineColor(value));
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
