# resortos-booking-e2e

Real end-to-end tests for ResortOS Dining. **No mocking:** each run starts the real booking API on an in-memory TEST database (`npm run db-test`), the PWA's production build, and the booking assistant (with the real AI model), then drives them like a guest or admin would.

Spec: [`../requirements/E2E_SPEC.md`](../requirements/E2E_SPEC.md). Scenarios: `../requirements/TEST_SCENARIOS_APP.md`, `../requirements/TEST_SCENARIOS_ASSISTANT.md`.

## Run
The sibling repos (`resortos-booking-api`, `-web`, `-agent`) must be installed, and the agent's `.env` must hold the Cent AI key.

```bash
npm install
npx playwright install chromium   # first time only
npm test                 # everything (assistant tests make real AI calls)
npm run test:app         # browser scenarios only, no AI calls
npm run test:assistant   # assistant scenarios only
npm run test:browsers    # the idempotent scenarios on Safari (WebKit) and Firefox
npm run load             # load test against the test API (autocannon)
```

First time on a machine: `npx playwright install chromium webkit firefox`. Visual baselines live in `tests/visual/__screenshots__/`; after an intended UI change, refresh them with `npx playwright test -g T5 --update-snapshots`.

Outputs:
* **`RESULTS.md`**: every scenario with expected and actual result, time and video.
* **`videos/<scenario-id>.webm`**: recording of each browser scenario (clicks slowed by 250 ms). Open in Chrome.

Ports used: test database 5433, API 4400, web 5190, assistant 4500 (dev servers on 4000/5173 are untouched).
