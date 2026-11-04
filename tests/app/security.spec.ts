import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { URLS } from "../../playwright.config.ts";
import { TEST_DATA, agentHeaders, apiLogin, apiRegister, expectResult, inDays, newEmail } from "../support.ts";

const ERROR_LOG = new URL("../../../resortos-booking-api/logs/errors-test.log", import.meta.url).pathname;

test("[S1] a guest can't open another guest's booking", async ({ request }) => {
  expectResult("404 for read, reschedule and cancel; the owner's booking is unchanged");
  const owner = await apiRegister(request, newEmail("s1-owner"));
  const intruder = await apiRegister(request, newEmail("s1-intruder"));
  const booking = await (await request.post(`${URLS.api}/api/users/reservations`, { headers: owner, data: { branch: "BRANCH_1", sector: "MAIN_HALL", date: inDays(14), startTime: "11:00", partySize: 2 } })).json();
  const url = `${URLS.api}/api/users/reservations/${booking.id}`;
  expect((await request.get(url, { headers: intruder })).status()).toBe(404);
  expect((await request.patch(url, { headers: intruder, data: { date: inDays(15), startTime: "11:00" } })).status()).toBe(404);
  expect((await request.delete(url, { headers: intruder })).status()).toBe(404);
  expect((await (await request.get(url, { headers: owner })).json()).status).toBe("CONFIRMED");
});

test("[S2] a guest is kept out of the admin pages", async ({ page }) => {
  expectResult("Opening /admin/logs as Ayu lands on Reserve a table");
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_DATA.ayu.email);
  await page.getByLabel("Password").fill(TEST_DATA.ayu.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/admin/logs");
  await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
});

test("[S4] the assistant's account is refused everywhere but its own routes", async ({ request }) => {
  expectResult("401 'Authentication required' on guest, profile and admin routes for the assistant's API key (the key isn't read there)");
  const agent = agentHeaders();
  for (const path of ["/api/users/reservations", "/api/users/me", "/api/admins/stats", "/api/admins/reservations?q=guests.test"]) {
    const res = await request.get(`${URLS.api}${path}`, { headers: agent });
    expect(res.status(), path).toBe(401);
    expect(await res.json(), path).toEqual({ message: "Authentication required" });
  }
});

test("[S9] failed requests are written to the error log without secrets", async ({ request }) => {
  expectResult("A 404 and a failed login each add a JSON line to logs/errors-test.log; the password and query string aren't in it");
  await request.get(`${URLS.api}/api/no-such-route?email=leak@guests.test`);
  await request.post(`${URLS.api}/api/auth/login`, { data: { email: "nobody@guests.test", password: "TopSecret999" } });
  const lines = readFileSync(ERROR_LOG, "utf8").trim().split("\n").slice(-5).map((l) => JSON.parse(l));
  expect(lines.some((l) => l.status === 404 && l.path === "/api/no-such-route")).toBe(true);
  expect(lines.some((l) => l.status === 401 && l.path === "/api/auth/login")).toBe(true);
  expect(JSON.stringify(lines)).not.toMatch(/TopSecret999|leak@guests\.test/);
});
