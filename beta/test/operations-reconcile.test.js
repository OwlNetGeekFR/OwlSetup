import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classifyStaleFailure, STALE_FAILURE_DAYS } from "../src/modules/operations-reconcile.js";

const NOW = Date.parse("2026-08-27T12:00:00Z");
const selfManagedIds = new Set(["ankama.ankamalauncher", "valve.steam"]);
const ignoredIds = new Set(["Some.IgnoredApp"]);
const opts = { selfManagedIds, ignoredIds, now: NOW };
const hoursAgo = (h) => new Date(NOW - h * 3600 * 1000).toISOString();
const daysAgo = (d) => new Date(NOW - d * 24 * 3600 * 1000).toISOString();

describe("classifyStaleFailure", () => {
  it("ignore ce qui n'est pas un échec", () => {
    expect(
      classifyStaleFailure({ status: "resolved", type: "update", packageIds: ["x"] }, opts)
    ).toBeNull();
    expect(classifyStaleFailure({ status: "running" }, opts)).toBeNull();
    expect(classifyStaleFailure(null, opts)).toBeNull();
  });

  it("résout un échec de MàJ dont tous les paquets sont auto-gérés", () => {
    const op = {
      status: "failed",
      type: "update",
      packageIds: ["Ankama.AnkamaLauncher"],
      completedAt: hoursAgo(2),
    };
    expect(classifyStaleFailure(op, opts)).toEqual({ resolvedBy: "self-managed" });
  });

  it("résout un échec de MàJ dont tous les paquets sont masqués", () => {
    const op = {
      status: "failed",
      type: "update",
      packageIds: ["Some.IgnoredApp"],
      completedAt: hoursAgo(2),
    };
    expect(classifyStaleFailure(op, opts)).toEqual({ resolvedBy: "update-ignored" });
  });

  it("préfère 'update-ignored' quand un paquet est à la fois masqué et auto-géré", () => {
    const both = { ...opts, ignoredIds: new Set(["Valve.Steam"]) };
    const op = {
      status: "failed",
      type: "update",
      packageIds: ["Valve.Steam"],
      completedAt: hoursAgo(2),
    };
    expect(classifyStaleFailure(op, both)).toEqual({ resolvedBy: "update-ignored" });
  });

  it("laisse un vrai échec récent en l'état", () => {
    const op = {
      status: "failed",
      type: "update",
      packageIds: ["Mozilla.Firefox"],
      completedAt: hoursAgo(2),
    };
    expect(classifyStaleFailure(op, opts)).toBeNull();
  });

  it("n'auto-résout pas un échec partiel (un seul paquet non couvert)", () => {
    const op = {
      status: "failed",
      type: "update",
      packageIds: ["Ankama.AnkamaLauncher", "Mozilla.Firefox"],
      completedAt: hoursAgo(2),
    };
    expect(classifyStaleFailure(op, opts)).toBeNull();
  });

  it("archive un échec de plus de 14 jours sans récidive", () => {
    const op = {
      status: "failed",
      type: "install",
      packageIds: ["Foo.Bar"],
      completedAt: daysAgo(20),
    };
    expect(classifyStaleFailure(op, opts)).toEqual({ resolvedBy: "stale" });
  });

  it("ne l'archive pas s'il s'est reproduit (occurrences > 1)", () => {
    const op = {
      status: "failed",
      type: "install",
      packageIds: ["Foo.Bar"],
      completedAt: daysAgo(20),
      occurrences: 3,
    };
    expect(classifyStaleFailure(op, opts)).toBeNull();
  });

  it("ne l'archive pas juste avant le seuil de 14 jours", () => {
    const op = {
      status: "failed",
      type: "install",
      packageIds: ["Foo.Bar"],
      completedAt: daysAgo(13),
    };
    expect(classifyStaleFailure(op, opts)).toBeNull();
  });

  it("utilise startedAt si completedAt manque", () => {
    const op = { status: "failed", type: "cleanup", startedAt: daysAgo(30) };
    expect(classifyStaleFailure(op, opts)).toEqual({ resolvedBy: "stale" });
  });
});

describe("parité avec app.js (reconcileMaintenanceOperations)", () => {
  const src = readFileSync(fileURLToPath(new URL("../../app.js", import.meta.url)), "utf8");
  const fn = src.slice(
    src.indexOf("function reconcileMaintenanceOperations"),
    src.indexOf("\nfunction ", src.indexOf("function reconcileMaintenanceOperations") + 1)
  );

  it("le seuil est bien de 14 jours", () => {
    expect(STALE_FAILURE_DAYS).toBe(14);
    expect(fn).toContain("14*24*3600*1000");
  });

  it("mêmes valeurs de resolvedBy", () => {
    expect(fn).toContain('resolvedBy:allIgnored?"update-ignored":"self-managed"');
    expect(fn).toContain('resolvedBy:"stale"');
  });

  it("même garde sur occurrences", () => {
    expect(fn).toContain("!(Number(item.occurrences)>1)");
  });

  it("ne s'applique qu'aux échecs de type update pour le volet auto-géré / masqué", () => {
    expect(fn).toContain('item.type==="update"&&ids.length');
  });
});
