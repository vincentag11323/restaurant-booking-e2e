// Real end-to-end suite (requirements/e2e_spec.md). No mocking: every server below is the real app,
// started from its own repo on test ports, against the in-memory TEST database.
import { defineConfig, devices } from "@playwright/test";

const repo = (name: string) => new URL(`../${name}`, import.meta.url).pathname;

export const URLS = {
  api: "http://localhost:4400",
  web: "http://localhost:5190",
  agent: "http://localhost:4500",
};

export default defineConfig({
  testDir: "tests",
  // One shared test database: run serially so capacity checks stay predictable.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: [["list"], ["./reporter/results-reporter.ts"]],
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
    { name: "assistant", testDir: "tests/assistant", use: { baseURL: URLS.agent } },
  ],
  webServer: [
    { command: "npm run db-test", cwd: repo("resortos-booking-api"), wait: { stdout: /TEST DATABASE/ }, timeout: 120_000, reuseExistingServer: false },
    { command: "npm run start:test", cwd: repo("resortos-booking-api"), url: `${URLS.api}/api/health`, timeout: 120_000, reuseExistingServer: false },
    { command: "npm run preview:test", cwd: repo("resortos-booking-web"), url: URLS.web, timeout: 120_000, reuseExistingServer: false },
    { command: "npm run start:test", cwd: repo("resortos-booking-agent"), url: `${URLS.agent}/health`, timeout: 120_000, reuseExistingServer: false },
  ],
});
