# End-to-End Results

Run: 2026-11-03T10:01:43.024Z · overall: **passed** · 6 passed, 0 failed, 0 skipped

Real stack, no mocking (requirements/e2e_spec.md). Scenario IDs refer to requirements/test_scenarios_app.md and test_scenarios_assistant.md.

## App (guest and admin in the browser)

| ID | Scenario | Expected | Actual | Time | Video |
|---|---|---|---|---|---|
| A1 | a new guest registers and lands on Reserve a table | Account created; signed in; 'Reserve a table' shown | ✅ As expected | 1.8s | [video](videos/A1.webm) |
| A2 | registering an email that's taken is refused | Banner: 'Email is already registered' | ✅ As expected | 1.5s | [video](videos/A2.webm) |
| A5 | a wrong password is refused | Banner: 'Invalid email or password'; still on sign in | ✅ As expected | 1.2s | [video](videos/A5.webm) |
| A7 | a signed-in guest stays signed in after a reload | After reload, Profile still shows the guest's name | ✅ As expected | 1.7s | [video](videos/A7.webm) |
| A10 | signing out protects the pages again | Back on sign in; opening My bookings redirects to sign in | ✅ As expected | 2.0s | [video](videos/A10.webm) |
| A11 | signing up with an email the assistant booked for claims its booking | citra@guests.test (not signed up, has an assistant booking) signs up and sees that booking in My bookings | ✅ Claimed; RSV-L4TUTU listed | 2.4s | [video](videos/A11.webm) |

## Assistant (guest → AI → API)

| ID | Scenario | Expected | Actual | Time | Video |
|---|---|---|---|---|---|


