// Real end-to-end suite (requirements/E2E_SPEC.md). No mocking: every server below is the real app,
// started from its own repo on test ports, against the in-memory TEST database.
import { defineConfig, devices } from "@playwright/test";

const repo = (name: string) => new URL(`../${name}`, import.meta.url).pathname;

export const URLS = {
  api: "http://localhost:4400",
  web: "http://localhost:5190",
  agent: "http://localhost:4500",
};

/** Scenarios that can run once per browser without clashing (new guests, no fixed capacity). */
const CROSS_BROWSER = /\[(A1|A5|A7|A10|B1|B6|M7|P1|W1|T7)\]/;

export default defineConfig({
  testDir: "tests",
  // One shared test database: run serially so capacity checks stay predictable.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [["list"], ["./reporter/resultsReporter.ts"]],
  snapshotPathTemplate: "tests/visual/__screenshots__/{projectName}/{arg}{ext}",
  projects: [
    {
      name: "app",
      testDir: "tests/app",
      use: {
        ...devices["Pixel 7"],
        baseURL: URLS.web,
        video: "on",
        launchOptions: { slowMo: 250 },
      },
    },
    // The same idempotent scenarios on Safari (WebKit) and Firefox (E2E_SPEC.md §6, T3).
    {
      name: "webkit",
      testDir: "tests/app",
      grep: CROSS_BROWSER,
      use: { ...devices["iPhone 14"], baseURL: URLS.web, video: "on", launchOptions: { slowMo: 250 } },
    },
    {
      name: "firefox",
      testDir: "tests/app",
      grep: CROSS_BROWSER,
      use: { ...devices["Desktop Firefox"], viewport: { width: 412, height: 915 }, baseURL: URLS.web, video: "on", launchOptions: { slowMo: 250 } },
    },
    { name: "assistant", testDir: "tests/assistant", use: { baseURL: URLS.agent } },
    { name: "load", testDir: "tests/load", timeout: 120_000 },
  ],
  webServer: [
    { command: "npm run db-test", cwd: repo("resortos-booking-api"), wait: { stdout: /TEST DATABASE/ }, timeout: 120_000, reuseExistingServer: false },
    { command: "npm run start:test", cwd: repo("resortos-booking-api"), url: `${URLS.api}/api/health`, timeout: 120_000, reuseExistingServer: false },
    { command: "npm run preview:test", cwd: repo("resortos-booking-web"), url: URLS.web, timeout: 120_000, reuseExistingServer: false },
    { command: "npm run start:test", cwd: repo("resortos-booking-agent"), url: `${URLS.agent}/health`, timeout: 120_000, reuseExistingServer: false },
  ],
});
