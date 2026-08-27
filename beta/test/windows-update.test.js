import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  parseWindowsUpdateMarkers,
  summarizeWindowsUpdates,
  formatWindowsUpdateBytes,
  describeWindowsUpdates,
  defaultWindowsUpdateSelection,
  parseWindowsUpdateInstallMarkers,
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

describe("defaultWindowsUpdateSelection", () => {
  const { updates } = parseWindowsUpdateMarkers(fixture("windows-update-lines.txt"));

  it("coche les composants, pas les pilotes, par défaut", () => {
    const sel = defaultWindowsUpdateSelection(updates);
    expect(sel).toEqual([
      "9f0a1b2c-3d4e-5f60-7181-92a3b4c5d6e7",
      "aaaabbbb-cccc-dddd-eeee-ffff00001111",
    ]);
  });

  it("inclut les pilotes si demandé explicitement", () => {
    const sel = defaultWindowsUpdateSelection(updates, { includeDrivers: true });
    expect(sel).toHaveLength(4);
  });

  it("exclut les entrées sans updateId exploitable", () => {
    const sel = defaultWindowsUpdateSelection([
      { updateId: "", kind: "software" },
      { updateId: "not-a-guid", kind: "software" },
      { updateId: "9f0a1b2c-3d4e-5f60-7181-92a3b4c5d6e7", kind: "software" },
    ]);
    expect(sel).toEqual(["9f0a1b2c-3d4e-5f60-7181-92a3b4c5d6e7"]);
  });

  it("exclut les mises à jour optionnelles / préversions (browseOnly)", () => {
    const sel = defaultWindowsUpdateSelection([
      { updateId: "9f0a1b2c-3d4e-5f60-7181-92a3b4c5d6e7", kind: "software", browseOnly: false },
      { updateId: "aaaabbbb-cccc-dddd-eeee-ffff00001111", kind: "software", browseOnly: true },
    ]);
    expect(sel).toEqual(["9f0a1b2c-3d4e-5f60-7181-92a3b4c5d6e7"]);
  });
});

describe("parseWindowsUpdateInstallMarkers", () => {
  it("succès réel : resultCode 2 + IsInstalled ou redémarrage", () => {
    const out = [
      'PCSETUP_WUI_ITEM|{"updateId":"9f0a1b2c-3d4e-5f60-7181-92a3b4c5d6e7","hresult":0,"resultCode":2,"installedNow":true}',
      'PCSETUP_WUI_ITEM|{"updateId":"aaaabbbb-cccc-dddd-eeee-ffff00001111","hresult":-2145116147,"resultCode":4,"installedNow":false}',
      "PCSETUP_WUI_END|ok|reboot=0|installed=2",
    ].join("\r\n");
    const r = parseWindowsUpdateInstallMarkers(out);
    expect(r.items[0]).toMatchObject({ ok: true, notApplied: false });
    expect(r.items[1]).toMatchObject({ ok: false, resultCode: 4 });
    expect(r.installed).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.rebootRequired).toBe(false);
  });

  it("resultCode 2 sans installation ni redémarrage -> notApplied (préversion seeker)", () => {
    const out = [
      'PCSETUP_WUI_ITEM|{"updateId":"3bd9512d-7c5d-4808-ae47-68e82150d606","hresult":0,"resultCode":2,"installedNow":false}',
      "PCSETUP_WUI_END|ok|reboot=0|installed=1",
    ].join("\n");
    const r = parseWindowsUpdateInstallMarkers(out);
    expect(r.items[0]).toMatchObject({ ok: false, notApplied: true });
    expect(r.installed).toBe(0);
    expect(r.notApplied).toBe(1);
  });

  it("resultCode 2 non installé MAIS redémarrage en attente -> ok", () => {
    const out = [
      'PCSETUP_WUI_ITEM|{"updateId":"x","resultCode":2,"installedNow":false}',
      "PCSETUP_WUI_END|ok|reboot=1|installed=1",
    ].join("\n");
    const r = parseWindowsUpdateInstallMarkers(out);
    expect(r.items[0]).toMatchObject({ ok: true, notApplied: false });
    expect(r.rebootRequired).toBe(true);
    expect(r.installed).toBe(1);
  });

  it("remonte l'erreur du script élevé", () => {
    const r = parseWindowsUpdateInstallMarkers(
      "PCSETUP_WUI_END|error|Mise a jour optionnelle : installez-la depuis Windows Update."
    );
    expect(r.error).toBe("Mise a jour optionnelle : installez-la depuis Windows Update.");
  });

  it("sortie sans marqueur de fin -> erreur de troncature", () => {
    const r = parseWindowsUpdateInstallMarkers(
      'PCSETUP_WUI_ITEM|{"updateId":"x","resultCode":2,"installedNow":true}'
    );
    expect(r.error).toMatch(/ne s'est pas terminée/);
  });
});
