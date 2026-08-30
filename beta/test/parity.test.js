/**
 * Suivi de la migration (lot 2) : chaque module de `src/modules/` qui avait un
 * jumeau inline dans `app.js` a été branché via `build-js.mjs`. Ces contrôles
 * vérifient que la copie inline a bien disparu et que la fonction du module est
 * présente ; le comportement reste couvert par le `*.test.js` de chaque module.
 */
import { describe, it, expect } from "vitest";
import { rootSource } from "./helpers/extract-from-root.js";

import { escapeHtml } from "../src/modules/escape-html.js";
import { isValidPackageId, PACKAGE_ID_PATTERN } from "../src/modules/package-id.js";
import {
  wingetInitials,
  normalizeWingetBrand,
  wingetFallbackColor,
} from "../src/modules/winget-brand.js";
import { redactLogDiagnostic, telemetryFingerprint } from "../src/modules/redaction.js";
import { SELF_MANAGED_UPDATERS, isSelfManagedUpdate } from "../src/modules/update-heuristics.js";
import { classifyStaleFailure, STALE_FAILURE_DAYS } from "../src/modules/operations-reconcile.js";

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
    // Le motif est DERIVE du module, jamais recopie : une copie litterale ici
    // aurait laisse passer le durcissement de la 4.0.0-beta.57 sans rien dire,
    // exactement comme l'a fait celle de package-id.test.js.
    expect(rootSource).toContain("function isValidPackageId(id) {");
    expect(rootSource).toContain(`const PACKAGE_ID_PATTERN = /${PACKAGE_ID_PATTERN.source}/;`);
  });

  it("app.js n'a plus le test regex inline de la télémétrie", () => {
    expect(rootSource).not.toMatch(/\{0,95\}\$\/\.test\(targetPackage\)/);
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

// `redaction` MIGRÉ (lot 2, 4.0.0-beta.27) : app.js utilise le module
// `redaction.js` inliné par build-js.mjs. Code sensible vie privée -> le
// comportement reste couvert à 100 % par beta/test/redaction.test.js.
describe("redaction — migré vers le module", () => {
  it("app.js n'a plus les copies inline", () => {
    expect(rootSource).toContain("function redactLogDiagnostic(line) {");
    expect(rootSource).toContain("function telemetryFingerprint(context) {");
    // les libellés de masquage viennent du module (const RULES), plus d'un
    // enchaînement de .replace() codé en dur dans redactLogDiagnostic :
    expect(rootSource).toContain("[E-MAIL MASQUÉ]");
    expect(rootSource).toContain("[COMPTE WINDOWS]");
  });

  it("le module masque toujours les données sensibles", () => {
    for (const value of LOG_SAMPLES) {
      const out = redactLogDiagnostic(value);
      expect(out).not.toMatch(/[A-Z]:\\Users\\[^\\\s]/i);
      expect(out).not.toContain("@gmail.com");
      expect(out.length).toBeLessThanOrEqual(420);
    }
    for (const value of FINGERPRINT_SAMPLES) {
      expect(telemetryFingerprint(value)).toMatch(/^[0-9A-F]{8}$/);
    }
    // déterminisme : même incident -> même empreinte
    expect(telemetryFingerprint(FINGERPRINT_SAMPLES[0])).toBe(
      telemetryFingerprint(FINGERPRINT_SAMPLES[0])
    );
  });
});

// `update-heuristics` MIGRÉ (lot 2, 4.0.0-beta.31) : la liste des lanceurs
// auto-gérés et les heuristiques viennent du module (miroir de
// `OwlSetupWebView.cs`), inlinées par build-js.mjs. Comportement couvert par
// beta/test/update-heuristics.test.js.
describe("update-heuristics — migré vers le module", () => {
  it("app.js n'a plus le tableau d'ids codé en dur", () => {
    expect(rootSource).not.toContain("const SELF_MANAGED_UPDATER_IDS = new Set([");
  });

  it("app.js dérive le Set de la constante du module", () => {
    expect(rootSource).toContain("const SELF_MANAGED_UPDATERS = [");
    expect(rootSource).toContain(
      "const SELF_MANAGED_UPDATER_IDS = new Set(SELF_MANAGED_UPDATERS.map(id => id.toLowerCase()));"
    );
    expect(rootSource).toContain("function isSelfManagedUpdate(id, current, available) {");
  });

  it("le module couvre toujours les cas de référence", () => {
    expect(SELF_MANAGED_UPDATERS).toContain("Ankama.AnkamaLauncher");
    expect(isSelfManagedUpdate("Ankama.AnkamaLauncher", "3.15.2", "3.16.0")).toBe(true);
    expect(isSelfManagedUpdate("Some.OtherApp", "3.15.2", "3.15.2.20509")).toBe(true);
    expect(isSelfManagedUpdate("Mozilla.Firefox", "127.0", "128.0")).toBe(false);
  });
});

// `operations-reconcile` MIGRÉ (lot 2, 4.0.0-beta.31) : la décision « cet échec
// n'en est pas vraiment un » vit dans le module ; `reconcileMaintenanceOperations`
// ne garde que les effets de bord. Comportement couvert par
// beta/test/operations-reconcile.test.js.
describe("operations-reconcile — migré vers le module", () => {
  it("reconcileMaintenanceOperations délègue à classifyStaleFailure", () => {
    expect(rootSource).toContain("function classifyStaleFailure(op, opts = {}) {");
    const fn = rootSource.slice(
      rootSource.indexOf("function reconcileMaintenanceOperations"),
      rootSource.indexOf(
        "\nfunction ",
        rootSource.indexOf("function reconcileMaintenanceOperations") + 1
      )
    );
    expect(fn).toContain("classifyStaleFailure(");
    expect(fn).not.toContain("14*24*3600*1000");
  });

  it("le module couvre toujours les cas de référence", () => {
    expect(STALE_FAILURE_DAYS).toBe(14);
    expect(
      classifyStaleFailure({
        status: "failed",
        type: "install",
        packageIds: ["Foo.Bar"],
        completedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
      })
    ).toEqual({ resolvedBy: "stale" });
    expect(classifyStaleFailure({ status: "running" })).toBeNull();
  });
});
