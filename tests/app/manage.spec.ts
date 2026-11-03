import { expect, test } from "@playwright/test";
import { URLS } from "../../playwright.config.ts";
import { TEST_DATA, apiRegister, expectResult, inDays, newEmail, uiSignIn } from "../support.ts";

/** A signed-up guest with one upcoming Main Hall booking, made through the real API. */
async function guestWithBooking(request: import("@playwright/test").APIRequestContext, days: number) {
  const email = newEmail("m");
  const auth = await apiRegister(request, email);
  const res = await request.post(`${URLS.api}/api/reservations`, { headers: auth, data: { branch: "BRANCH_1", sector: "MAIN_HALL", date: inDays(days), startTime: "19:30", partySize: 4 } });
  expect(res.status()).toBe(201);
  return { email, code: (await res.json()).code as string };
}

test("[M1] upcoming and past bookings are in separate tabs", async ({ page }) => {
  expectResult("Ayu (test data) sees her upcoming booking under Upcoming and Completed/Seated/Cancelled ones under Past");
  await uiSignIn(page, TEST_DATA.ayu);
  await page.getByRole("link", { name: "Bookings", exact: true }).click();
  await expect(page.getByText("Main Dining Hall · 4 guests")).toBeVisible();
  await page.getByRole("tab", { name: "Past" }).click();
  await expect(page.getByText("Seated")).toBeVisible();
  await expect(page.getByText("Cancelled")).toBeVisible();
});

test("[M2] a guest moves a booking to another sitting", async ({ page, request }) => {
  expectResult("Dialog starts at 19:30; after saving 13:30 with 6 guests the card shows 13:30 – 16:00 and 6 guests");
  const { email, code } = await guestWithBooking(request, 12);
  await uiSignIn(page, { email, password: "Password123" });
  await page.getByRole("link", { name: "Bookings", exact: true }).click();
  await page.getByRole("button", { name: `Change time for ${code}` }).click();
  const dialog = page.getByRole("dialog", { name: "Change time" });
  await expect(dialog.getByLabel("Sitting")).toHaveValue("19:30");
  await dialog.getByLabel("Sitting").selectOption("13:30");
  await dialog.getByLabel("Guests").fill("6");
  await dialog.getByRole("button", { name: "Save new time" }).click();
  await expect(page.getByText(/13:30 – 16:00/)).toBeVisible();
  await expect(page.getByText(/6 guests/)).toBeVisible();
});

test("[M4] a guest cancels a booking after confirming", async ({ page, request }) => {
  expectResult("Status becomes Cancelled; the release button disappears; the tables are free again");
  const { email, code } = await guestWithBooking(request, 13);
  await uiSignIn(page, { email, password: "Password123" });
  await page.getByRole("link", { name: "Bookings", exact: true }).click();
  await page.getByRole("button", { name: `Release booking ${code}` }).click();
  await page.getByRole("dialog", { name: "Release this table?" }).getByRole("button", { name: "Release table" }).click();
  await expect(page.getByText("Cancelled")).toBeVisible();
  await expect(page.getByRole("button", { name: `Release booking ${code}` })).toBeHidden();
  const slots = await (await request.get(`${URLS.api}/api/availability?branch=BRANCH_1&sector=MAIN_HALL&date=${inDays(13)}`)).json();
  expect(slots.find((s: { startTime: string }) => s.startTime === "19:30").freeUnits).toBe(50);
});

test("[M7] a guest with no bookings is pointed to booking", async ({ page }) => {
  expectResult("'No upcoming bookings yet.' with a Reserve a table link that works");
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Empty Guest");
  await page.getByLabel("Email").fill(newEmail("m7"));
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("link", { name: "Bookings", exact: true }).click();
  await expect(page.getByText("No upcoming bookings yet.")).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Reserve a table" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
});
