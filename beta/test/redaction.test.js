import { describe, it, expect } from "vitest";
import {
  redactLogDiagnostic,
  telemetryFingerprint,
  MAX_DIAGNOSTIC_LENGTH,
} from "../src/modules/redaction.js";

describe("redactLogDiagnostic", () => {
  it("remplace un chemin de profil par %USERPROFILE%", () => {
    const out = redactLogDiagnostic("Echec: C:\\Users\\Benjamin\\AppData\\Local\\Temp\\x.log");
    expect(out).not.toMatch(/Benjamin/);
    expect(out).toContain("%USERPROFILE%");
  });

  it("masque une adresse e-mail", () => {
    expect(redactLogDiagnostic("compte benjamin.k88000@gmail.com actif")).toBe(
      "compte [E-MAIL MASQUÉ] actif"
    );
  });

  it("masque un couple DOMAINE\\compte", () => {
    expect(redactLogDiagnostic("runAs PC-BENJAMIN\\benjamin")).toContain("[COMPTE WINDOWS]");
  });

  it("masque la valeur d'une ligne Nom d'utilisateur", () => {
    expect(redactLogDiagnostic("Nom d'utilisateur : benjamin")).toBe(
      "Nom d'utilisateur  : [MASQUÉ]"
    );
  });

  it("tronque a la longueur maximale", () => {
    expect(redactLogDiagnostic("x".repeat(1000)).length).toBe(MAX_DIAGNOSTIC_LENGTH);
  });

  it("gere null / undefined", () => {
    expect(redactLogDiagnostic(null)).toBe("");
    expect(redactLogDiagnostic(undefined)).toBe("");
  });
});

describe("telemetryFingerprint", () => {
  it("produit huit caracteres hexadecimaux majuscules", () => {
    const fp = telemetryFingerprint({
      errorCategory: "installation",
      failureStage: "download",
      targetPackage: "Google.Chrome",
      errorCode: "0x80070005",
      errorKind: "winget",
    });
    expect(fp).toMatch(/^[0-9A-F]{8}$/);
  });

  it("est stable pour un meme contexte et sensible aux changements", () => {
    const a = telemetryFingerprint({ errorCategory: "update", failureStage: "network" });
    const b = telemetryFingerprint({ errorCategory: "update", failureStage: "network" });
    const c = telemetryFingerprint({ errorCategory: "update", failureStage: "permissions" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("traite les champs manquants comme 'unknown'", () => {
    expect(telemetryFingerprint({})).toBe(telemetryFingerprint({ errorCategory: "unknown" }));
  });
});
