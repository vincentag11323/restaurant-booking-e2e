# resortos-booking-e2e

Real end-to-end tests for ResortOS Dining. **No mocking:** each run starts the real booking API on an in-memory TEST database (`npm run db-test`), the PWA's production build, and the booking assistant (with the real AI model), then drives them like a guest or admin would.

Spec: [`../requirements/e2e_spec.md`](../requirements/e2e_spec.md). Scenarios: `../requirements/test_scenarios_app.md`, `../requirements/test_scenarios_assistant.md`.

## Run
The sibling repos (`resortos-booking-api`, `-web`, `-agent`) must be installed, and the agent's `.env` must hold the Cent AI key.

```bash
npm install
npx playwright install chromium   # first time only
npm test                 # everything (assistant tests make real AI calls)
npm run test:app         # browser scenarios only, no AI calls
npm run test:assistant   # assistant scenarios only
```

Outputs:
* **`RESULTS.md`**: every scenario with expected and actual result, time and video.
* **`videos/<scenario-id>.webm`**: recording of each browser scenario (clicks slowed by 250 ms). Open in Chrome.

Ports used: test database 5433, API 4400, web 5190, assistant 4500 (dev servers on 4000/5173 are untouched).
