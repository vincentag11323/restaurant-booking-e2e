import { randomUUID } from "node:crypto";
import { type APIRequestContext, type Page, test } from "@playwright/test";
import { URLS } from "../playwright.config.ts";

/** Fake people loaded by `npm run db-test` (resortos-booking-api/prisma/seed-test.ts). */
export const TEST_DATA = {
  admin: { email: "admin@resortos.test", password: "Admin12345!" },
  agent: { email: "assistant@resortos.internal", password: "Agent12345!" },
  ayu: { email: "ayu@guests.test", password: "Password123" },
  budi: { email: "budi@guests.test", password: "Password123" },
  citra: { email: "citra@guests.test" },
};

export const newEmail = (label: string) => `e2e-${label}-${randomUUID().slice(0, 8)}@guests.test`;

/** Records what the scenario promises; the reporter puts it in RESULTS.md. */
export function expectResult(text: string) {
  test.info().annotations.push({ type: "expected", description: text });
}

export function actualResult(text: string) {
  test.info().annotations.push({ type: "actual", description: text });
}

/** Restaurant-local (UTC+7) date N days from now. */
export function inDays(days: number): string {
  return new Date(Date.now() + 7 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);
}

/** Real API sign-in, for setting up a scenario faster than clicking through it. */
export async function apiLogin(request: APIRequestContext, who: { email: string; password: string }) {
  const res = await request.post(`${URLS.api}/api/auth/login`, { data: who });
  if (!res.ok()) throw new Error(`login failed for ${who.email}: ${res.status()}`);
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

export async function apiRegister(request: APIRequestContext, email: string) {
  const res = await request.post(`${URLS.api}/api/auth/register`, { data: { email, password: "Password123", name: "E2E Guest" } });
  if (res.status() !== 201) throw new Error(`register failed: ${res.status()}`);
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

export async function uiSignIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
