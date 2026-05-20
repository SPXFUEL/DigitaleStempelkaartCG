import { expect, test } from "@playwright/test";

/**
 * Happy-path smoke: bezoek de root, beland op /welkom, vul het enroll-form
 * in, beland op /profiel. Geen barista-stap omdat die de camera-API nodig
 * heeft die headless niet realistisch is.
 *
 * Run met: `npm run e2e`. Vereist een lokale dev-server (start automatisch).
 */
test("nieuwe klant kan aanmelden en landt op /profiel", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welkom$/);

  await page.getByLabel("Je voornaam").fill("E2E Bot");
  await page.getByRole("button", { name: /Stempelkaart aanmaken/i }).click();

  await expect(page).toHaveURL(/\/profiel$/, { timeout: 10_000 });
  await expect(page.getByText(/Hoi E2E Bot/i)).toBeVisible();
  await expect(page.getByText(/Jouw stempelkaart/i)).toBeVisible();
});

test("privacy-pagina is bereikbaar", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByText(/Privacy & jouw gegevens/i)).toBeVisible();
});
