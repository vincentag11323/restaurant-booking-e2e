// Load test (T6, E2E_SPEC.md §6) against the test API. The test database is PGlite, which runs one
// query at a time, so these numbers are a floor for this machine, not production capacity.
import autocannon from "autocannon";
import { expect, test } from "@playwright/test";
import { URLS } from "../../playwright.config.ts";
import { actualResult, expectResult, inDays } from "../support.ts";

async function hit(name: string, options: autocannon.Options) {
  const r = await autocannon({ duration: 8, ...options });
  const line = `${name}: ${Math.round(r.requests.average)} req/s, p50 ${r.latency.p50} ms, p97.5 ${r.latency.p97_5} ms, p99 ${r.latency.p99} ms, errors ${r.errors}, timeouts ${r.timeouts}, non-2xx ${r.non2xx}`;
  console.log(`    ${line}`);
  return { r, line };
}

test("[T6] the API stays up and error-free under concurrent reads and sign-ins", async () => {
  expectResult("No errors or timeouts; reads stay 2xx with 50 concurrent connections; sign-ins stay 2xx with 10");
  const results = [
    await hit("availability x50", { url: `${URLS.api}/api/public/availabilities?branch=BRANCH_1&sector=MAIN_HALL&date=${inDays(30)}`, connections: 50 }),
    await hit("menu x50", { url: `${URLS.api}/api/public/menus`, connections: 50 }),
    await hit("sign-in x10", {
      url: `${URLS.api}/api/auth/login`,
      connections: 10,
      duration: 5,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "budi@guests.test", password: "Password123" }),
    }),
  ];
  actualResult(results.map((x) => x.line).join(" · "));
  for (const { r } of results) {
    expect(r.errors + r.timeouts).toBe(0);
    expect(r.non2xx).toBe(0);
  }
});
