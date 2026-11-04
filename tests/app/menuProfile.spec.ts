import { expect, test } from "@playwright/test";
import { TEST_DATA, expectResult, uiSignIn } from "../support.ts";

test("[P1] visitors browse the menu by type without signing in", async ({ page }) => {
  expectResult("Seasonal tab lists Seared Scallops with its price; no 'Safe for you' section");
  await page.goto("/menu");
  await page.getByRole("tab", { name: "Seasonal fine dining" }).click();
  await expect(page.getByText("Seared Scallops")).toBeVisible();
  await expect(page.getByText("Rp 320.000")).toBeVisible();
  await expect(page.getByRole("region", { name: "Safe for you" })).toBeHidden();
});

test("[P3] 'Safe for you' hides dishes with the guest's allergens", async ({ page }) => {
  expectResult("Budi saves allergy 'fish'; Safe for you shows Garden Salad but not Barramundi or Fish & Chips");
  await uiSignIn(page, TEST_DATA.budi);
  await page.getByRole("link", { name: "Profile" }).click();
  await page.getByLabel("Allergies").fill("Fish");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved");
  await page.getByRole("link", { name: "Menu" }).click();
  const safe = page.getByRole("region", { name: "Safe for you" });
  await expect(safe.getByText("Garden Salad")).toBeVisible();
  await expect(safe.getByText("Barramundi")).toBeHidden();
  await expect(safe.getByText("Fish & Chips")).toBeHidden();
});
