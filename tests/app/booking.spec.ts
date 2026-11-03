import { expect, test } from "@playwright/test";
import { URLS } from "../../playwright.config.ts";
import { actualResult, apiRegister, expectResult, inDays, newEmail } from "../support.ts";

async function signUpAndBook(page: import("@playwright/test").Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Booker");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
}

test("[B1] a guest books a Main Hall table and gets a reservation code", async ({ page }) => {
  expectResult("Your table is held; RSV code; 5 guests → 3 two-seat tables at Branch 2; 19:30 – 22:00");
  await signUpAndBook(page, newEmail("b1"));
  await page.getByRole("radio", { name: "Branch 2" }).check();
  await page.getByRole("radio", { name: "Main Dining Hall" }).check();
  await page.getByLabel("Date").fill(inDays(9));
  await page.getByRole("radio", { name: /^19:30/ }).check();
  await page.getByLabel("Guests").fill("5");
  await page.getByLabel("Special requests or dietary notes").fill("One vegetarian (e2e)");
  await page.getByRole("button", { name: "Hold this table" }).click();
  await expect(page.getByRole("heading", { name: "Your table is held" })).toBeVisible();
  await expect(page.getByText(/^3 tables: B2-MH-\d\d, B2-MH-\d\d, B2-MH-\d\d$/)).toBeVisible();
  await expect(page.getByText(/19:30 – 22:00/)).toBeVisible();
  actualResult(`Booked ${await page.locator(".place-card").textContent()}`);
});

test("[B2] a VIP booking for 14 joins 2 private rooms", async ({ page }) => {
  expectResult("2 rooms assigned (B1-VIP-*)");
  await signUpAndBook(page, newEmail("b2"));
  await page.getByRole("radio", { name: "VIP Private Dining" }).check();
  await page.getByLabel("Date").fill(inDays(10));
  await page.getByRole("radio", { name: /^13:30/ }).check();
  await page.getByLabel("Guests").fill("14");
  await page.getByRole("button", { name: "Hold this table" }).click();
  await expect(page.getByText(/^2 rooms: B1-VIP-\d, B1-VIP-\d$/)).toBeVisible();
});

test("[B3] a fully booked sitting can't be picked", async ({ page, request }) => {
  expectResult("After 4 VIP rooms are taken at 11:00, that sitting shows 'Fully booked' and is disabled");
  const other = await apiRegister(request, newEmail("b3-filler"));
  const fill = await request.post(`${URLS.api}/api/reservations`, { headers: other, data: { branch: "BRANCH_1", sector: "VIP_WING", date: inDays(11), startTime: "11:00", partySize: 50 } });
  expect(fill.status()).toBe(201);
  await signUpAndBook(page, newEmail("b3"));
  await page.getByRole("radio", { name: "VIP Private Dining" }).check();
  await page.getByLabel("Date").fill(inDays(11));
  await expect(page.getByRole("radio", { name: /^11:00/ })).toBeDisabled();
  await expect(page.getByText("Fully booked")).toBeVisible();
});

test("[B6] a party over 50 is explained before anything is sent", async ({ page }) => {
  expectResult("Message 'Party size must be between 1 and 50'; still on Reserve a table");
  await signUpAndBook(page, newEmail("b6"));
  await page.getByRole("radio", { name: /^11:00/ }).check();
  await page.getByLabel("Guests").fill("51");
  await page.getByRole("button", { name: "Hold this table" }).click();
  await expect(page.getByText("Party size must be between 1 and 50")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
});
