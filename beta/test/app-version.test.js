import { describe, it, expect } from "vitest";
import {
  parseAppVersion,
  compareAppVersions,
  isNewerAppVersion,
  PRERELEASE_RANK,
} from "../src/modules/app-version.js";

describe("parseAppVersion", () => {
  it("lit X.Y.Z", () => {
    expect(parseAppVersion("4.0.0")).toEqual({ release: [4, 0, 0], pre: null });
  });

  it("tolère un `v` en tête (tags GitHub)", () => {
    expect(parseAppVersion("v4.1.2")).toEqual({ release: [4, 1, 2], pre: null });
  });

  it("lit une préversion `-beta.32`", () => {
    expect(parseAppVersion("4.0.0-beta.32")).toEqual({
      release: [4, 0, 0],
      pre: { stage: "beta", rank: PRERELEASE_RANK.beta, number: 32 },
    });
  });

  it("accepte `alpha`, `rc`, et un numéro absent", () => {
    expect(parseAppVersion("4.0.0-alpha.1").pre.rank).toBe(PRERELEASE_RANK.alpha);
    expect(parseAppVersion("4.0.0-rc.2").pre.rank).toBe(PRERELEASE_RANK.rc);
    expect(parseAppVersion("4.0.0-beta").pre).toEqual({ stage: "beta", rank: 1, number: 0 });
  });

  it("complète les segments manquants", () => {
    expect(parseAppVersion("4").release).toEqual([4, 0, 0]);
    expect(parseAppVersion("4.2").release).toEqual([4, 2, 0]);
  });

  it("rejette une chaîne illisible", () => {
    expect(parseAppVersion("")).toBeNull();
    expect(parseAppVersion("latest")).toBeNull();
    expect(parseAppVersion(null)).toBeNull();
    expect(parseAppVersion("4.0.0.0")).toBeNull();
  });
});

describe("compareAppVersions", () => {
  it("compare X.Y.Z numériquement (pas lexicalement)", () => {
    expect(compareAppVersions("4.0.9", "4.0.10")).toBe(-1);
    expect(compareAppVersions("4.2.0", "4.1.9")).toBe(1);
    expect(compareAppVersions("4.0.0", "4.0.0")).toBe(0);
  });

  it("une stable passe devant la préversion de même X.Y.Z", () => {
    expect(compareAppVersions("4.0.0-beta.32", "4.0.0")).toBe(-1);
    expect(compareAppVersions("4.0.0", "4.0.0-rc.1")).toBe(1);
  });

  it("ordonne alpha < beta < rc", () => {
    expect(compareAppVersions("4.0.0-alpha.9", "4.0.0-beta.1")).toBe(-1);
    expect(compareAppVersions("4.0.0-rc.1", "4.0.0-beta.9")).toBe(1);
  });

  it("ordonne les numéros de préversion numériquement", () => {
    expect(compareAppVersions("4.0.0-beta.9", "4.0.0-beta.32")).toBe(-1);
    expect(compareAppVersions("4.0.0-beta.32", "4.0.0-beta.32")).toBe(0);
  });

  it("renvoie NaN si une chaîne est illisible", () => {
    expect(compareAppVersions("4.0.0", "nightly")).toBeNaN();
    expect(compareAppVersions("", "4.0.0")).toBeNaN();
  });
});

describe("isNewerAppVersion", () => {
  it("vrai seulement pour une version strictement plus récente", () => {
    expect(isNewerAppVersion("4.0.0-beta.32", "4.0.0-beta.33")).toBe(true);
    expect(isNewerAppVersion("4.0.0-beta.32", "4.0.0")).toBe(true);
    expect(isNewerAppVersion("4.0.0", "4.0.0")).toBe(false);
    expect(isNewerAppVersion("4.0.0", "4.0.0-beta.99")).toBe(false);
    expect(isNewerAppVersion("4.0.0", "brouillon")).toBe(false);
  });
});
