import { expect, test } from "@playwright/test";
import { expectResult } from "../support.ts";

test.describe("installable app", () => {
  test.use({ serviceWorkers: "allow" });

  test("[W3] the production build is installable", async ({ page, request }) => {
    expectResult("Manifest: ResortOS Dining, standalone, 192/512/maskable icons all reachable");
    await page.goto("/login");
    const manifest = await (await request.get((await page.locator('link[rel="manifest"]').getAttribute("href"))!)).json();
    expect(manifest).toMatchObject({ name: "ResortOS Dining", display: "standalone" });
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  });

  test("[W4] the app opens with no network and explains it's offline", async ({ page, context }) => {
    expectResult("After the service worker installs, the sign-in page loads offline and signing in says 'You're offline'");
    await page.goto("/login");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
    await page.getByLabel("Email").fill("ayu@guests.test");
    await page.getByLabel("Password").fill("Password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toHaveText("You're offline. Check your connection and try again.");
  });
});

test("[W1] key screens never scroll sideways on a phone", async ({ page }) => {
  expectResult("Sign in, register and menu fit the Pixel 7 width");
  for (const path of ["/login", "/register", "/menu"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
  }
});
