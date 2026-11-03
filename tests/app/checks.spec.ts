import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { TEST_DATA, actualResult, expectResult, uiSignIn } from "../support.ts";

test("[T4] main screens have no serious or critical accessibility violations", async ({ page }) => {
  expectResult("axe (WCAG 2 A/AA) finds no serious or critical issues on sign-in, register, menu, chat, booking, my bookings and the admin log");
  const findings: string[] = [];
  const audit = async (name: string) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    for (const v of violations) findings.push(`${name}: ${v.id} (${v.impact}, ${v.nodes.length})`);
  };
  for (const path of ["/login", "/register", "/menu", "/chat"]) {
    await page.goto(path);
    await audit(path);
  }
  await uiSignIn(page, TEST_DATA.ayu);
  await audit("/ (reserve)");
  await page.getByRole("link", { name: "Bookings", exact: true }).click();
  await audit("/bookings");
  await page.getByRole("link", { name: "Profile" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await uiSignIn(page, TEST_DATA.admin);
  await page.getByRole("link", { name: "Booking log", exact: true }).click();
  await audit("/admin/logs");
  actualResult(findings.length ? `Findings: ${findings.join("; ")}` : "No violations at all");
  expect(findings.filter((f) => /\((serious|critical),/.test(f))).toEqual([]);
});

test("[T5] key screens match their recorded look", async ({ page }) => {
  expectResult("Sign-in, register and the chat start screen match the baseline screenshots (first run records them)");
  for (const [path, name] of [["/login", "login"], ["/register", "register"], ["/chat", "chat"]] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, maxDiffPixelRatio: 0.01 });
  }
});

test("[T7] an ended session sends the guest to sign in on the next server call", async ({ page }) => {
  expectResult("The test API issues 8-second sessions; after waiting 9 s the Reserve screen is still shown, and opening My bookings sends the guest to sign in");
  await uiSignIn(page, TEST_DATA.ayu);
  const reserve = page.getByRole("heading", { level: 1, name: "Reserve a table" });
  await expect(reserve).toBeVisible();
  await page.waitForTimeout(9_000);
  await expect(reserve).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.getByRole("link", { name: "Bookings", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
