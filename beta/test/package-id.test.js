import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  isValidPackageId,
  sanitizePackageIds,
  telemetrySafePackageId,
  PACKAGE_ID_PATTERN,
} from "../src/modules/package-id.js";

const native = readFileSync(new URL("../../OwlSetupWebView.cs", import.meta.url), "utf8");
const catalogue = JSON.parse(readFileSync(new URL("../catalog/apps.json", import.meta.url), "utf8"));
const applications = catalogue.applications || catalogue;

/**
 * La regle telle qu'elle est ecrite dans l'hote, extraite du fichier source.
 *
 * Aller la chercher est tout l'interet : la version precedente de ce test
 * comparait `PACKAGE_ID_PATTERN.source` a une chaine figee recopiee ici. Quand
 * l'hote a ete durci en 4.0.0-beta.57, la chaine figee n'a pas bouge, le test a
 * continue de passer, et il a affirme une egalite devenue fausse pendant deux
 * versions.
 */
function motifDeLHote() {
  const m = /static readonly Regex PackageIdPattern =\s*new Regex\(@"([^"]+)"/.exec(native);
  if (!m) throw new Error("PackageIdPattern introuvable dans OwlSetupWebView.cs");
  return m[1];
}

/**
 * Le tiret en fin de classe est deja litteral en JavaScript : l'echapper y
 * serait signale comme inutile, alors que C# l'ecrit `\-`. C'est la seule
 * difference toleree — le reste doit correspondre caractere pour caractere.
 */
function normaliser(source) {
  return source.replace(/\\-/g, "-");
}

describe("PACKAGE_ID_PATTERN reflete la regle de l'hote", () => {
  it("est la meme regle que PackageIdPattern dans OwlSetupWebView.cs", () => {
    expect(normaliser(PACKAGE_ID_PATTERN.source)).toBe(normaliser(motifDeLHote()));
  });

  it("se comporte comme la regle de l'hote sur les cas limites", () => {
    // La comparaison de chaines ci-dessus attrape une reecriture ; celle-ci
    // attrape une reformulation equivalente en apparence seulement.
    const hote = new RegExp(motifDeLHote());
    const corpus = [
      "Google.Chrome",
      "VideoLAN.VLC",
      "9NT1R1C2HH7J",
      "Microsoft.VCRedist.2015+.x64",
      "Notepad++.Notepad++",
      "Node.js_LTS+x64",
      "a",
      "a1",
      "-Force",
      "--source",
      ".hidden",
      "_x",
      "",
      "Foo Bar",
      'Foo"',
      "Foo;calc.exe",
      "A".repeat(127),
      "A".repeat(128),
      "A".repeat(129),
      "A".repeat(200),
    ];
    for (const id of corpus) {
      expect(isValidPackageId(id), JSON.stringify(id.slice(0, 40))).toBe(hote.test(id));
    }
  });
});

describe("la regle n'est ecrite qu'une fois", () => {
  const legacy = readFileSync(new URL("../src/app/legacy.js", import.meta.url), "utf8");

  it("legacy.js ne recopie pas le motif en litteral", () => {
    // Trois copies vivaient ici avant la 4.0.0-beta.59, sous DEUX regles
    // differentes : le meme identifiant etait accepte a une entree et refuse a
    // une autre. C'est la version front de ce qu'on avait retire de l'hote au
    // lot 3 (27 copies, trois regles).
    //
    // Le motif vise est la forme "[A-Za-z0-9][A-Za-z0-9" : la regex de
    // recherche etendue (`[\\p{L}\\p{N} ._+-]`) est une autre regle, sur une
    // autre donnee, et n'a pas a etre unifiee avec celle-ci.
    const copies = [...legacy.matchAll(/\[A-Za-z0-9\]\[A-Za-z0-9/g)];
    expect(copies.length, "une copie inline du motif d'identifiant est revenue").toBe(0);
  });

  it("legacy.js passe bien par le module", () => {
    expect(legacy).toContain("isValidPackageId(");
    expect(legacy).toContain("sanitizePackageIds(");
  });
});

describe("isValidPackageId", () => {
  it("accepte les identifiants WinGet reels du catalogue", () => {
    for (const id of [
      "Google.Chrome",
      "Microsoft.VCRedist.2015+.x64",
      "7zip.7zip",
      "Notepad++.Notepad++",
      "9NT1R1C2HH7J",
      "OpenJS.NodeJS.LTS",
    ]) {
      expect(isValidPackageId(id), id).toBe(true);
    }
  });

  it("accepte les identifiants de tout le catalogue livre", () => {
    // Durcir la regle ne doit rien retirer de ce qui est reellement propose.
    const refuses = applications.filter((app) => app.id && !isValidPackageId(app.id));
    expect(refuses.map((app) => app.id)).toEqual([]);
  });

  it("rejette tout ce qui pourrait s'echapper vers le shell / winget", () => {
    for (const id of [
      "",
      "Foo Bar",
      "Foo;calc.exe",
      'Foo"',
      "Foo`n",
      "Foo|bar",
      "Foo&&bar",
      "../../etc",
      "Foo\nBar",
    ]) {
      expect(isValidPackageId(id), JSON.stringify(id)).toBe(false);
    }
  });

  it("durcissement 4.0-beta : refuse un identifiant commencant par un non-alphanumerique", () => {
    for (const id of ["--source", "-e", ".hidden", "+x", "_foo", "-Google.Chrome"]) {
      expect(isValidPackageId(id), JSON.stringify(id)).toBe(false);
    }
  });

  it("borne la longueur comme l'hote (4.0.0-beta.59)", () => {
    // L'interface acceptait sans borne ce que l'hote refusait depuis la
    // beta.57 : l'application apparaissait installable et ne s'installait pas.
    expect(isValidPackageId("a")).toBe(false);
    expect(isValidPackageId("a1")).toBe(true);
    expect(isValidPackageId("A".repeat(128))).toBe(true);
    expect(isValidPackageId("A".repeat(129))).toBe(false);
  });

  it("rejette les valeurs non-chaines", () => {
    expect(isValidPackageId(null)).toBe(false);
    expect(isValidPackageId(42)).toBe(false);
    expect(isValidPackageId(["Google.Chrome"])).toBe(false);
  });
});

describe("sanitizePackageIds", () => {
  it("filtre, deduplique et conserve l'ordre", () => {
    const input = ["Google.Chrome", "bad id", "Google.Chrome", "Mozilla.Firefox", 5, null];
    expect(sanitizePackageIds(input)).toEqual(["Google.Chrome", "Mozilla.Firefox"]);
  });

  it("renvoie un tableau vide pour une entree non-tableau", () => {
    expect(sanitizePackageIds("Google.Chrome")).toEqual([]);
    expect(sanitizePackageIds(undefined)).toEqual([]);
    expect(sanitizePackageIds(null)).toEqual([]);
  });
});

describe("telemetrySafePackageId", () => {
  it("garde un identifiant court et sur", () => {
    expect(telemetrySafePackageId("Google.Chrome")).toBe("Google.Chrome");
  });

  it("efface un identifiant trop long ou invalide", () => {
    expect(telemetrySafePackageId("A".repeat(97))).toBe("");
    expect(telemetrySafePackageId("mauvais id")).toBe("");
    expect(telemetrySafePackageId(null)).toBe("");
  });

  it("reste plus strict que la regle generale", () => {
    // La telemetrie sort de la machine : sa borne est deliberement plus basse.
    expect(isValidPackageId("A".repeat(100))).toBe(true);
    expect(telemetrySafePackageId("A".repeat(100))).toBe("");
  });
});
