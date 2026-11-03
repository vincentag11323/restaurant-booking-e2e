import { expect, test } from "@playwright/test";
import { TEST_DATA, expectResult, inDays, uiSignIn } from "../support.ts";

test("[D1] the admin day view shows real numbers for a date", async ({ page }) => {
  expectResult(`On ${inDays(3)} at Branch 1: Ayu's 4-guest test booking is counted`);
  await uiSignIn(page, TEST_DATA.admin);
  await expect(page.getByRole("heading", { level: 1, name: "Today at a glance" })).toBeVisible();
  await page.getByLabel("Date").fill(inDays(3));
  await page.getByLabel("Restaurant").selectOption("BRANCH_1");
  await expect(page.getByTestId("stat-covers")).toContainText("4");
  await expect(page.getByTestId("stat-bookings")).toContainText("1");
});

test("[D2] the day view counts assistant bookings", async ({ page }) => {
  expectResult(`On ${inDays(5)} at Branch 2: 'of which 1 via AI assistant'`);
  await uiSignIn(page, TEST_DATA.admin);
  await page.getByLabel("Date").fill(inDays(5));
  await page.getByLabel("Restaurant").selectOption("BRANCH_2");
  await expect(page.getByTestId("stat-bookings")).toContainText("of which 1 via AI assistant");
});

test("[D3] the booking log finds a guest by name", async ({ page }) => {
  expectResult("Searching 'Budi' lists only Budi's test bookings");
  await uiSignIn(page, TEST_DATA.admin);
  await page.getByRole("link", { name: "Booking log", exact: true }).click();
  await page.getByLabel("Search").fill("Budi");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("Budi Santoso (test)").first()).toBeVisible();
  await expect(page.getByText("Ayu Lestari (test)")).toHaveCount(0);
});

test("[D4] the log filters to assistant bookings and to no-shows", async ({ page }) => {
  expectResult("Booked by AI assistant shows only labelled cards; status No-show shows only no-shows");
  await uiSignIn(page, TEST_DATA.admin);
  await page.getByRole("link", { name: "Booking log", exact: true }).click();
  await page.getByLabel("Booked by").selectOption("AGENT");
  await page.getByRole("button", { name: "Apply filters" }).click();
  const cards = page.getByRole("listitem");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBe(await page.getByText("Booked by AI assistant").count());
  await page.getByLabel("Booked by").selectOption("");
  await page.getByLabel("Status").selectOption("NO_SHOW");
  await page.getByRole("button", { name: "Apply filters" }).click();
  // Scoped to the results list: the Status dropdown also contains the words "No-show" and "Confirmed".
  const results = page.getByRole("list", { name: "Reservations, newest sitting first" });
  await expect(results.getByText("No-show").first()).toBeVisible();
  await expect(results.getByText("Confirmed")).toHaveCount(0);
});

test("[D6] the detail sheet shows who booked and the guest's details", async ({ page }) => {
  expectResult("Ayu's anniversary booking: phone, note and 'Guest, in the app'");
  await uiSignIn(page, TEST_DATA.admin);
  await page.getByRole("link", { name: "Booking log", exact: true }).click();
  await page.getByLabel("Search").fill("ayu@guests.test");
  await page.getByLabel("Status").selectOption("CONFIRMED");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("button", { name: /^View RSV-/ }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Anniversary (test)")).toBeVisible();
  await expect(sheet.getByText("+62 811 0000 001")).toBeVisible();
  await expect(sheet.getByText("Guest, in the app")).toBeVisible();
});

test("[D7] export downloads the filtered log as CSV", async ({ page }) => {
  expectResult("A .csv file downloads with a header row including 'source'");
  await uiSignIn(page, TEST_DATA.admin);
  await page.getByRole("link", { name: "Booking log", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^reservations-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = await (await import("node:fs/promises")).readFile((await file.path())!, "utf8");
  expect(text.split("\n")[0]).toContain(",source");
});
