import { expect, test } from "@playwright/test";
import { TEST_DATA, apiLogin, actualResult, expectResult, newEmail, uiSignIn } from "../support.ts";
import { URLS } from "../../playwright.config.ts";

test("[A1] a new guest registers and lands on Reserve a table", async ({ page }) => {
  expectResult("Account created; signed in; 'Reserve a table' shown");
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Guest");
  await page.getByLabel("Email").fill(newEmail("a1"));
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
});

test("[A2] registering an email that's taken is refused", async ({ page }) => {
  expectResult("Banner: 'Email is already registered'");
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Copy of Ayu");
  await page.getByLabel("Email").fill(TEST_DATA.ayu.email);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("alert")).toHaveText("Email is already registered");
});

test("[A5] a wrong password is refused", async ({ page }) => {
  expectResult("Banner: 'Invalid email or password'; still on sign in");
  await uiSignIn(page, { email: TEST_DATA.ayu.email, password: "not-the-password" });
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await expect(page).toHaveURL(/\/login$/);
});

test("[A7] a signed-in guest stays signed in after a reload", async ({ page }) => {
  expectResult("After reload, Profile still shows the guest's name");
  await uiSignIn(page, TEST_DATA.ayu);
  await page.getByRole("link", { name: "Profile" }).click();
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Ayu Lestari (test)");
});

test("[A10] signing out protects the pages again", async ({ page }) => {
  expectResult("Back on sign in; opening My bookings redirects to sign in");
  await uiSignIn(page, TEST_DATA.budi);
  await page.getByRole("link", { name: "Profile" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login$/);
});

test("[A11] signing up with an email the assistant booked for claims its booking", async ({ page, request }) => {
  expectResult("citra@guests.test (not signed up, has an assistant booking) signs up and sees that booking in My bookings");
  // Citra can't sign in before claiming (password-less guest account).
  expect((await request.post(`${URLS.api}/api/auth/login`, { data: { email: TEST_DATA.citra.email, password: "Password123" } })).status()).toBe(401);
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Citra (claimed)");
  await page.getByLabel("Email").fill(TEST_DATA.citra.email);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("link", { name: "Bookings", exact: true }).click();
  await expect(page.getByText("VIP Private Dining · 9 guests")).toBeVisible();
  actualResult(`Claimed; ${await page.getByText(/RSV-/).first().textContent()} listed`);
  await apiLogin(request, { email: TEST_DATA.citra.email, password: "Password123" });
});

test("[A14] signing out ends the session at once, even for a saved copy of the cookie", async ({ page, request }) => {
  expectResult("A saved copy of the session cookie gets 200 on /api/users/me before sign-out, then 401 'Invalid or expired token' right after sign-out");
  await uiSignIn(page, TEST_DATA.ayu);
  const apiCookies = await page.context().cookies(URLS.api);
  const webCookies = await page.context().cookies();
  const session = apiCookies.find((c) => c.name === "session") ?? webCookies.find((c) => c.name === "session");
  if (!session) throw new Error("no session cookie after signing in");
  const savedCookie = { Cookie: `session=${session.value}` };
  expect((await request.get(`${URLS.api}/api/users/me`, { headers: savedCookie })).status()).toBe(200);
  await page.getByRole("link", { name: "Profile" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  const after = await request.get(`${URLS.api}/api/users/me`, { headers: savedCookie });
  const body = await after.json();
  actualResult(`${after.status()} ${JSON.stringify(body)}`);
  expect(after.status()).toBe(401);
  expect(body).toEqual({ message: "Invalid or expired token" });
});
