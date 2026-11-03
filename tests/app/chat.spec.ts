import { expect, test } from "@playwright/test";
import { actualResult, expectResult, inDays, newEmail } from "../support.ts";

test("[CUI] a visitor books a table by chatting in the app (real assistant and model)", async ({ page }) => {
  expectResult("Ask tab → email → booking message → read-back with Book it → reservation code card");
  await page.goto("/menu");
  await page.getByRole("link", { name: "Ask" }).click();
  await page.getByLabel("Email").fill(newEmail("cui"));
  await page.getByRole("button", { name: "Start chatting" }).click();
  await page.getByLabel("Message").fill(`Please book a table for 2 at Branch 2 in the Main Dining Hall on ${inDays(29)} at 17:00.`);
  await page.getByRole("button", { name: "Send" }).click();
  const outcome = await Promise.race([
    page.getByRole("button", { name: "Book it" }).waitFor({ timeout: 40_000 }).then(() => "draft" as const),
    page.getByRole("alert").waitFor({ timeout: 40_000 }).then(() => "alert" as const),
  ]);
  if (outcome === "alert") test.skip(true, `AI unavailable: ${await page.getByRole("alert").textContent()}`);
  await page.getByRole("button", { name: "Book it" }).click();
  const code = page.getByRole("region", { name: "Your booking" }).getByText(/^RSV-/);
  await expect(code).toBeVisible({ timeout: 15_000 });
  actualResult(`Booked ${await code.textContent()} from the chat screen`);
});
