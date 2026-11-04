import { randomUUID } from "node:crypto";
import { type APIRequestContext, type Page, test } from "@playwright/test";
import { URLS } from "../playwright.config.ts";

/** Fake people loaded by `npm run db-test` (resortos-booking-api/prisma/seedTest.ts). */
export const TEST_DATA = {
  admin: { email: "admin@resortos.test", password: "Admin12345!" },
  /** The assistant has no password: it calls the API with X-Agent-Key (same value as the API and agent start:test scripts). */
  agent: { email: "assistant@resortos.internal", apiKey: "e2e-only-agent-key-e2e-only-agent-key-0001" },
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

/** Headers the AI booking assistant sends to the API. */
export const agentHeaders = () => ({ "X-Agent-Key": TEST_DATA.agent.apiKey });

/** Turns a sign-in response into the `Cookie` header that carries its session. */
function sessionHeader(res: Response) {
  const session = res.headers.getSetCookie().find((c) => c.startsWith("session="));
  if (!session) throw new Error("no session cookie in the response");
  return { Cookie: session.split(";")[0] };
}

/**
 * Real API sign-in, for setting up a scenario faster than clicking through it.
 * Uses Node fetch (no cookie jar, no Origin header) and returns the session as an explicit `Cookie` header,
 * so one test can act as several people. `_request` is kept so call sites don't change.
 */
export async function apiLogin(_request: APIRequestContext, who: { email: string; password: string }) {
  const res = await fetch(`${URLS.api}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(who) });
  if (!res.ok) throw new Error(`login failed for ${who.email}: ${res.status}`);
  return sessionHeader(res);
}

export async function apiRegister(_request: APIRequestContext, email: string) {
  const res = await fetch(`${URLS.api}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Password123", name: "E2E Guest" }),
  });
  if (res.status !== 201) throw new Error(`register failed: ${res.status}`);
  return sessionHeader(res);
}

export async function uiSignIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
