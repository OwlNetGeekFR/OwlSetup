import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  parseWindowsUpdateMarkers,
  summarizeWindowsUpdates,
  formatWindowsUpdateBytes,
  describeWindowsUpdates,
} from "../src/modules/windows-update.js";

const fixture = (name) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8");

describe("parseWindowsUpdateMarkers", () => {
  const { updates, completed, error } = parseWindowsUpdateMarkers(
    fixture("windows-update-lines.txt")
  );

  it("lit les 4 mises à jour et le marqueur de fin", () => {
    expect(completed).toBe(true);
    expect(error).toBeNull();
    expect(updates).toHaveLength(4);
  });

  it("classe pilotes et logiciels, conserve KB / taille / téléchargé", () => {
    const intel = updates.find((u) => u.title.startsWith("Intel"));
    expect(intel).toMatchObject({ kind: "driver", kb: "", downloaded: true, bytes: 424509440 });
    const cumulative = updates.find((u) => u.kb === "KB5037771");
    expect(cumulative).toMatchObject({
      kind: "software",
      severity: "Important",
      downloaded: false,
    });
  });

  it("ignore une ligne JSON corrompue mais garde les autres", () => {
    const out = [
      'PCSETUP_WU_ITEM|{"title":"OK","kind":"software","bytes":10}',
      "PCSETUP_WU_ITEM|{ceci n'est pas du json",
      "PCSETUP_WU_END|ok|1",
    ].join("\n");
    const r = parseWindowsUpdateMarkers(out);
    expect(r.updates.map((u) => u.title)).toEqual(["OK"]);
    expect(r.completed).toBe(true);
  });

  it("remonte le message d'erreur du script", () => {
    const r = parseWindowsUpdateMarkers("PCSETUP_WU_END|error|0x80240438 service indisponible");
    expect(r.completed).toBe(false);
    expect(r.error).toBe("0x80240438 service indisponible");
  });

  it("signale une sortie tronquée (pas de marqueur de fin)", () => {
    const r = parseWindowsUpdateMarkers('PCSETUP_WU_ITEM|{"title":"A","bytes":1}');
    expect(r.completed).toBe(false);
    expect(r.error).toMatch(/ne s'est pas terminée/);
  });

  it("titre vide -> entrée rejetée", () => {
    const r = parseWindowsUpdateMarkers(
      ['PCSETUP_WU_ITEM|{"title":"   ","bytes":1}', "PCSETUP_WU_END|ok|0"].join("\n")
    );
    expect(r.updates).toHaveLength(0);
  });
});

describe("summarizeWindowsUpdates", () => {
  const { updates } = parseWindowsUpdateMarkers(fixture("windows-update-lines.txt"));
  const s = summarizeWindowsUpdates(updates);

  it("compte pilotes, logiciels, sécurité, téléchargés et le poids total", () => {
    expect(s).toMatchObject({
      count: 4,
      driverCount: 2,
      softwareCount: 2,
      securityCount: 1,
      downloadedCount: 1,
    });
    expect(s.totalBytes).toBe(650117120 + 424509440 + 1497919328 + 912334848);
  });

  it("tolère une entrée non tableau", () => {
    expect(summarizeWindowsUpdates(null)).toMatchObject({ count: 0, driverCount: 0 });
  });
});

describe("formatWindowsUpdateBytes", () => {
  it("Mo sous 1 Go, Go au-delà, — si nul", () => {
    expect(formatWindowsUpdateBytes(650117120)).toBe("620 Mo");
    expect(formatWindowsUpdateBytes(1497919328)).toBe("1,4 Go");
    expect(formatWindowsUpdateBytes(0)).toBe("—");
    expect(formatWindowsUpdateBytes(-5)).toBe("—");
  });
});

describe("describeWindowsUpdates", () => {
  it("phrase complète avec pilotes et sécurité", () => {
    const s = summarizeWindowsUpdates(
      parseWindowsUpdateMarkers(fixture("windows-update-lines.txt")).updates
    );
    const text = describeWindowsUpdates(s);
    expect(text).toContain("4 mises à jour Windows en attente");
    expect(text).toContain("2 pilotes");
    expect(text).toContain("1 de sécurité");
  });

  it("rien en attente", () => {
    expect(describeWindowsUpdates(summarizeWindowsUpdates([]))).toBe(
      "Aucune mise à jour Windows en attente."
    );
  });
});
