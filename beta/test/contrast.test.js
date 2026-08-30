import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

/**
 * Contrastes WCAG AA (lot 6).
 *
 * Les couleurs de texte de l'interface sont prises dans des tokens (--muted et
 * --text-*) plutot que dans des litteraux disperses : c'est ce qui permet de
 * garantir le seuil AA sur les quatre combinaisons de theme depuis un seul
 * endroit. Ce test verrouille cet invariant.
 */

const SEUIL_AA = 4.5;

function versRgb(hex) {
  const h = hex.replace("#", "");
  const plein =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [0, 2, 4].map((i) => parseInt(plein.slice(i, i + 2), 16));
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const la = luminance(versRgb(a));
  const lb = luminance(versRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Lit les tokens `--nom:#valeur` declares pour un selecteur donne.
 *
 * Le selecteur doit correspondre exactement (`:root` ne doit pas attraper
 * `:root[data-theme="light"]`), et il peut apparaitre dans plusieurs blocs :
 * ils sont fusionnes dans l'ordre du fichier, comme le ferait la cascade.
 */
function tokensDe(selecteur) {
  const echappe = selecteur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[}\\n;])\\s*${echappe}\\s*\\{([^}]*)\\}`, "g");
  const out = {};
  let trouve = false;
  for (const [, bloc] of css.matchAll(re)) {
    trouve = true;
    for (const [, nom, val] of bloc.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})/g)) {
      out[nom] = val.toLowerCase();
    }
  }
  if (!trouve) throw new Error(`bloc de tokens introuvable : ${selecteur}`);
  return out;
}

const sombre = tokensDe(":root");
const clair = { ...sombre, ...tokensDe(':root[data-theme="light"]') };
const sombreRenforce = { ...sombre, ...tokensDe("body.high-contrast") };
const clairRenforce = {
  ...clair,
  ...tokensDe(':root[data-theme="light"] body.high-contrast'),
};

const THEMES = {
  sombre,
  clair,
  "sombre + contraste renforce": sombreRenforce,
  "clair + contraste renforce": clairRenforce,
};

const TOKENS_TEXTE = [
  "--muted",
  "--text-blue",
  "--text-cyan",
  "--text-green",
  "--text-danger",
  "--text-warn",
];
const SURFACES = ["--bg", "--panel", "--panel-2"];

describe("tokens de texte : contraste AA", () => {
  it("chaque theme definit bien ses tokens de texte et ses surfaces", () => {
    for (const [nomTheme, tokens] of Object.entries(THEMES)) {
      for (const nom of [...TOKENS_TEXTE, ...SURFACES]) {
        expect(tokens[nom], `${nom} manque pour le theme ${nomTheme}`).toMatch(/^#[0-9a-f]{3,6}$/);
      }
    }
  });

  for (const [nomTheme, tokens] of Object.entries(THEMES)) {
    for (const token of TOKENS_TEXTE) {
      for (const surface of SURFACES) {
        it(`${nomTheme} : ${token} sur ${surface}`, () => {
          expect(contraste(tokens[token], tokens[surface])).toBeGreaterThanOrEqual(SEUIL_AA);
        });
      }
    }
  }
});

/**
 * Ces valeurs ont ete mesurees sous le seuil AA dans au moins une combinaison
 * de theme, puis remplacees par des tokens. Les revoir dans une declaration
 * `color:` signale une regression.
 */
const LITTERAUX_INTERDITS = [
  "#1f7a5b",
  "#1f7c8c",
  "#2b7a5b",
  "#3a67b5",
  "#475264",
  "#536174",
  "#536379",
  "#536682",
  "#545e6e",
  "#566a83",
  "#586170",
  "#58677b",
  "#596476",
  "#596776",
  "#596a82",
  "#59748f",
  "#5a6b82",
  "#5d6c80",
  "#5e6979",
  "#5f7188",
  "#5f7390",
  "#5f7780",
  "#5f7ca3",
  "#60748c",
  "#626c7d",
  "#626d7e",
  "#637186",
  "#647084",
  "#647185",
  "#647286",
  "#64758d",
  "#657085",
  "#657286",
  "#657389",
  "#6581a5",
  "#65d5a9",
  "#667184",
  "#667387",
  "#66758a",
  "#66758b",
  "#6685ad",
  "#67d9dd",
  "#687384",
  "#687588",
  "#68768a",
  "#68778b",
  "#687890",
  "#697384",
  "#697486",
  "#697487",
  "#697587",
  "#69758a",
  "#69778a",
  "#69788c",
  "#69cfe0",
  "#69d7b0",
  "#6b8db8",
  "#6c7687",
  "#6c7789",
  "#6c788b",
  "#6c8bc4",
  "#6f7888",
  "#6f7a8c",
  "#6f7c8c",
  "#6f7c8d",
  "#6f7e94",
  "#6f839b",
  "#6f88a9",
  "#707b8e",
  "#718093",
  "#718096",
  "#718197",
  "#718198",
  "#718493",
  "#718596",
  "#71859d",
  "#71879e",
  "#718a80",
  "#728094",
  "#728197",
  "#738094",
  "#747f91",
  "#748399",
  "#74849a",
  "#74869b",
  "#74dfb5",
  "#758296",
  "#758398",
  "#75869b",
  "#75869d",
  "#75889e",
  "#759889",
  "#75b7b1",
  "#768194",
  "#77869a",
  "#77869b",
  "#785b65",
  "#7890aa",
  "#78938a",
  "#796e76",
  "#798aa0",
  "#79d7b3",
  "#7d8b9e",
  "#7d8ca2",
  "#7faaff",
  "#7fb5ff",
  "#8190a5",
  "#8193aa",
  "#81958f",
  "#8493a6",
  "#8692a4",
  "#887681",
  "#8894a7",
  "#8996a8",
  "#8bdab7",
  "#8e9db1",
  "#8f7b83",
  "#8fa0b6",
  "#8fa0b7",
  "#90866e",
  "#917b72",
  "#91a0b4",
  "#93896f",
  "#9dacbf",
  "#a18e6d",
  "#a8c4ee",
  "#b6c2d3",
  "#b8324f",
  "#b9c6d8",
  "#c7d9f7",
  "#e88a9a",
  "#f18ca8",
];

describe("couleurs de texte codees en dur", () => {
  it("aucun litteral connu comme non conforme dans une declaration `color:`", () => {
    const fautifs = [];
    for (const hex of LITTERAUX_INTERDITS) {
      // `(?<![-\w])` ecarte background-color, border-color, outline-color...
      const re = new RegExp(`(?<![-\\w])color:\\s*${hex}\\b`, "gi");
      const n = (css.match(re) || []).length;
      if (n > 0) fautifs.push(`${hex} (${n}x)`);
    }
    expect(
      fautifs,
      `Utiliser var(--muted) ou var(--text-*) plutot que : ${fautifs.join(", ")}`
    ).toEqual([]);
  });

  it("le bouton .btn.ghost declare son propre fond", () => {
    // Sans fond declare, le navigateur applique sa face de bouton native
    // (#f0f0f0), illisible avec un texte clair en theme sombre.
    const bloc = css.match(/\.btn\.ghost\s*\{[^}]*\}/);
    expect(bloc, ".btn.ghost n'est declare nulle part").toBeTruthy();
    expect(bloc[0]).toMatch(/background:/);
  });
});
