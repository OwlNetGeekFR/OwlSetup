import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseWingetTable, stripAnsi, wingetTableHasId } from "../src/modules/winget-table.js";

const fixture = (name) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8");

const ESC = String.fromCharCode(27);
const BOM_CH = String.fromCharCode(0xfeff);

describe("stripAnsi", () => {
  it("retire les séquences CSI et un BOM en tête", () => {
    expect(stripAnsi(`${ESC}[2K${ESC}[36mVLC${ESC}[0m`)).toBe("VLC");
    expect(stripAnsi(`${BOM_CH}Nom  ID`)).toBe("Nom  ID");
  });

  it("ne touche pas à un texte entre crochets sans ESC", () => {
    expect(stripAnsi("[Tag: vlc]")).toBe("[Tag: vlc]");
  });
});

describe("parseWingetTable — winget upgrade (FR)", () => {
  const { columns, rows } = parseWingetTable(fixture("winget-upgrade-fr.txt"));

  it("reconnaît les colonnes localisées", () => {
    expect(columns).toEqual(["name", "id", "version", "available", "source"]);
  });

  it("extrait les 5 mises à niveau sans la ligne de résumé", () => {
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.id)).toEqual([
      "Ankama.AnkamaLauncher",
      "Blizzard.BattleNet",
      "Microsoft.DotNet.DesktopRuntime.8",
      "Microsoft.Outlook",
      "Ubisoft.Connect",
    ]);
  });

  it("gère `Unknown` et un nom contenant sa version", () => {
    const battle = rows.find((r) => r.id === "Blizzard.BattleNet");
    expect(battle).toMatchObject({
      name: "Battle.net",
      version: "Unknown",
      available: "1.19.3.3219",
    });
  });

  it("gère une version installée avec un espace (`< 173.0.0.13316`)", () => {
    const ubi = rows.find((r) => r.id === "Ubisoft.Connect");
    expect(ubi.version).toBe("< 173.0.0.13316");
    expect(ubi.available).toBe("173.0.0.13316");
    expect(ubi.source).toBe("winget");
  });

  it("ne coupe pas un nom long à espaces multiples internes", () => {
    const dotnet = rows.find((r) => r.id === "Microsoft.DotNet.DesktopRuntime.8");
    expect(dotnet.name).toBe("Microsoft Windows Desktop Runtime - 8.0.28 (x64)");
  });
});

describe("parseWingetTable — winget search (FR)", () => {
  const { columns, rows } = parseWingetTable(fixture("winget-search-fr.txt"));

  it("reconnaît la colonne « Correspondance » comme `match`", () => {
    expect(columns).toEqual(["name", "id", "version", "match"]);
  });

  it("extrait les résultats, `match` vide toléré", () => {
    const vlc = rows.find((r) => r.id === "VideoLAN.VLC");
    expect(vlc).toMatchObject({
      name: "VLC media player",
      version: "3.0.23",
      match: "Moniker: vlc",
    });
    const nightly = rows.find((r) => r.id === "VideoLAN.VLC.Nightly");
    expect(nightly.match).toBe("");
    expect(nightly.version).toBe("4.0.0.0-nightly20260509");
  });
});

describe("parseWingetTable — winget list (FR, ids non-winget)", () => {
  const { rows } = parseWingetTable(fixture("winget-list-fr.txt"));

  it("lit les entrées même avec des ids MSIX/ARP", () => {
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.some((r) => r.id.startsWith("ARP\\Machine\\"))).toBe(true);
    expect(rows.some((r) => r.id.startsWith("MSIX\\"))).toBe(true);
  });
});

describe("parseWingetTable — tableau étroit (winget list --id X --exact)", () => {
  // Sortie où « Version » et « Source » ne sont séparés que d'UN espace parce que
  // la version est courte. L'ancien tokenizer d'en-tête fusionnait les deux et
  // la colonne ID débordait -> régression sur la résolution de désinstallation
  // (Docker.DockerDesktop, etc.).
  const { columns, rows } = parseWingetTable(fixture("winget-list-narrow-fr.txt"));

  it("sépare bien les 4 colonnes malgré l'espace unique", () => {
    expect(columns).toEqual(["name", "id", "version", "source"]);
  });

  it("ne fait pas déborder la colonne ID sur version/source", () => {
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Docker Desktop",
      id: "Docker.DockerDesktop",
      version: "4.88.1",
      source: "winget",
    });
  });

  it("wingetTableHasId retrouve l'identifiant exact", () => {
    const raw = fixture("winget-list-narrow-fr.txt");
    expect(wingetTableHasId(raw, "Docker.DockerDesktop")).toBe(true);
    expect(wingetTableHasId(raw, "docker.dockerdesktop")).toBe(true);
  });
});

describe("wingetTableHasId", () => {
  const upgrade = fixture("winget-upgrade-fr.txt");

  it("reconnaît un id présent dans la colonne ID (casse ignorée)", () => {
    expect(wingetTableHasId(upgrade, "Ubisoft.Connect")).toBe(true);
    expect(wingetTableHasId(upgrade, "blizzard.battlenet")).toBe(true);
  });

  it("rejette un id absent et les entrées vides", () => {
    expect(wingetTableHasId(upgrade, "Nope.Missing")).toBe(false);
    expect(wingetTableHasId("", "Ubisoft.Connect")).toBe(false);
    expect(wingetTableHasId(upgrade, "")).toBe(false);
  });

  it("ne confond pas l'id avec la même chaîne apparue dans une autre colonne", () => {
    const table = [
      "Name              Id             Version   Source",
      "----              --             -------   ------",
      "Acme.Helper tool  Acme.RealPkg   1.0.0     winget",
    ].join("\n");
    // "Acme.Helper" figure dans le Nom mais n'est l'ID d'aucune ligne.
    expect(wingetTableHasId(table, "Acme.Helper")).toBe(false);
    expect(wingetTableHasId(table, "Acme.RealPkg")).toBe(true);
  });
});

describe("cas dégradés", () => {
  it("sortie vide -> aucun résultat", () => {
    expect(parseWingetTable("")).toEqual({ columns: [], rows: [] });
    expect(parseWingetTable("Aucun package installé ne correspond aux critères.")).toEqual({
      columns: [],
      rows: [],
    });
  });

  it("en-tête anglais", () => {
    const en = [
      "Name    Id           Version   Source",
      "----    --           -------   ------",
      "VLC     VideoLAN.VLC 3.0.20    winget",
    ].join("\n");
    const { columns, rows } = parseWingetTable(en);
    expect(columns).toEqual(["name", "id", "version", "source"]);
    expect(rows[0]).toMatchObject({ id: "VideoLAN.VLC", version: "3.0.20" });
  });
});
