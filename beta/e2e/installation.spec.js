import { test, expect } from "./fixtures.js";
import {
  ECHEC_1603,
  applicationsInstallees,
  diagnosticAvantInstallation,
  installation,
} from "./faux-hote/scenarios.js";

const VLC = "VideoLAN.VLC";
const SEVENZIP = "7zip.7zip";

/**
 * Hôte qui « installe » vraiment : ce qui réussit apparaît ensuite dans la
 * détection des applications installées, comme sur un vrai PC. Sans cet état,
 * la nouvelle détection lancée après `install-complete` ferait disparaître
 * l'application et le test validerait un parcours impossible.
 *
 * Le rythme est aussi celui de l'hôte réel : `install-start` part tout de
 * suite, le reste bien plus tard. Entre les deux, l'interface passe la fenêtre
 * en arrière-plan (450 ms). Un faux hôte qui répondrait d'un bloc ferait
 * dépendre le test de qui gagne cette course — il dépendait de la charge de la
 * machine avant que `terminer` n'attende ce passage.
 */
function hoteQuiInstalle(hote, { echecs = [] } = {}) {
  const installes = [];
  hote.repondre("scan-installed", (payload) => applicationsInstallees(payload, installes));
  hote.repondre("preflight-install", diagnosticAvantInstallation);
  hote.repondre("install", (payload) => installation(payload, echecs).slice(0, 1));
  return {
    /** Laisse la fenêtre passer en arrière-plan, puis livre la fin de l'installation. */
    async terminer(page) {
      const payload = await hote.commande("install");
      await expect(page.locator("#installModal")).toBeHidden();
      await expect(page.locator("#backgroundInstall")).toBeVisible();
      installes.push(...payload.packages.filter((id) => !echecs.includes(id)));
      await hote.envoyer(...installation(payload, echecs).slice(1));
      // L'interface redemande alors la détection : on attend sa réponse.
      await expect.poll(() => hote.actions().filter((a) => a === "scan-installed").length).toBe(2);
      await hote.calme();
    },
  };
}

async function selectionner(page, ...ids) {
  for (const id of ids) await page.locator(`#catalog [data-app="${id}"]`).click();
  await expect(page.locator("#barCount")).toHaveText(String(ids.length));
  await page.locator("#viewSelection").click();
  await expect(page.locator("#queue")).toHaveClass(/\bactive\b/);
}

test.describe("installation depuis le catalogue", () => {
  test("sélection, diagnostic, installation puis détection", async ({ page, hote }) => {
    const installateur = hoteQuiInstalle(hote);
    await hote.demarrer();
    await selectionner(page, VLC, SEVENZIP);
    await expect(page.locator("#queueList .queue-item")).toHaveCount(2);

    // Le diagnostic est demandé à l'ouverture de la fenêtre, pas avant.
    expect(hote.actions()).not.toContain("preflight-install");
    await page.locator("#installBtn").click();
    const diagnostic = await hote.commande("preflight-install");
    expect(diagnostic.packages).toEqual([VLC, SEVENZIP]);

    await expect(page.locator("#preflightTitle")).toHaveText("Votre PC est prêt");
    for (const etape of ["winget", "disk", "system", "packages"]) {
      await expect(page.locator(`[data-preflight="${etape}"]`)).toHaveClass(/\bsuccess\b/);
    }
    const confirmer = page.locator("#confirmInstall");
    await expect(confirmer).toBeEnabled();
    await confirmer.click();

    // La commande reprend la sélection et les choix par défaut de la fenêtre.
    const commande = await hote.commande("install");
    expect(commande).toMatchObject({
      packages: [VLC, SEVENZIP],
      shortcut: "start",
      launchAfter: false,
      locationMode: "auto",
    });
    // `apps` sert de table de noms à l'hôte : elle suit l'ordre du catalogue.
    expect(commande.apps.map((app) => app.id).sort()).toEqual([SEVENZIP, VLC].sort());

    await installateur.terminer(page);
    await expect(page.locator("#backgroundInstallTitle")).toHaveText("Installation terminée");
    await expect(page.locator("#backgroundInstallDetail")).toHaveText("2 réussi(s) · 0 à vérifier");

    // « Voir le résultat » rouvre la fenêtre sur le bilan.
    await expect(page.locator("#showInstallProgress")).toHaveText("Voir le résultat");
    await page.locator("#showInstallProgress").click();
    await expect(page.locator("#progressTitle")).toHaveText("Installation terminée");
    await expect(page.locator("#retryFailedInstall")).toBeHidden();
    await page.locator("#finishInstall").click();

    // La sélection est vidée et les cartes passent à « installée », y compris
    // après la nouvelle détection que l'interface demande à la fin.
    await expect(page.locator("#selectionBar")).toBeHidden();
    await expect(page.locator(`#catalog [data-app="${VLC}"]`)).toHaveClass(/\binstalled\b/);
    await expect(page.locator(`#catalog [data-app="${SEVENZIP}"]`)).toHaveClass(/\binstalled\b/);
  });

  test("un paquet en échec reste signalé et peut être relancé", async ({ page, hote }) => {
    const installateur = hoteQuiInstalle(hote, { echecs: [VLC] });
    await hote.demarrer();
    await selectionner(page, VLC, SEVENZIP);
    await page.locator("#installBtn").click();
    await expect(page.locator("#confirmInstall")).toBeEnabled();
    await page.locator("#confirmInstall").click();
    await installateur.terminer(page);

    await expect(page.locator("#backgroundInstallTitle")).toHaveText(
      "Installation terminée avec vérifications"
    );
    await expect(page.locator("#backgroundInstall")).toHaveClass(/\bwarning\b/);

    await page.locator("#showInstallProgress").click();
    await expect(page.locator("#progressTitle")).toHaveText(
      "Installation terminée avec avertissement"
    );
    await expect(page.locator("#retryFailedInstall")).toBeVisible();
    await page.locator("#finishInstall").click();
    await expect(page.locator("#installModal")).toBeHidden();

    // Le message d'échec de l'hôte est celui que l'utilisateur lit.
    await page.locator("#appUpdateNotification").click();
    await expect(page.getByText(ECHEC_1603).first()).toBeVisible();

    await expect(page.locator(`#catalog [data-app="${SEVENZIP}"]`)).toHaveClass(/\binstalled\b/);
    await expect(page.locator(`#catalog [data-app="${VLC}"]`)).not.toHaveClass(/\binstalled\b/);
  });

  test("un diagnostic négatif bloque l'installation", async ({ page, hote }) => {
    hote.repondre("preflight-install", (payload) =>
      diagnosticAvantInstallation(payload).map((message) =>
        message.type === "install-preflight-complete"
          ? {
              ...message,
              ready: false,
              failedPackages: [VLC],
              message: "Corrigez les éléments signalés ou retirez les paquets indisponibles.",
            }
          : message
      )
    );
    await hote.demarrer();
    await selectionner(page, VLC);
    await page.locator("#installBtn").click();

    await expect(page.locator("#preflightTitle")).toHaveText("Action requise avant installation");
    await expect(page.locator("#confirmInstall")).toBeDisabled();
    expect(hote.actions()).not.toContain("install");
  });
});
