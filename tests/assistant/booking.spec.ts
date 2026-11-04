import { expect, test } from "@playwright/test";
import { URLS } from "../../playwright.config.ts";
import { TEST_DATA, actualResult, agentHeaders, apiLogin, apiRegister, expectResult, inDays, newEmail } from "../support.ts";
import { REFUSAL, type Turn, chat } from "./chat.ts";

const ONE_BOOKING = "This email already has a booking made with the assistant. To book a different time, sign up with this email in the app, cancel that booking there, then ask me again.";

test("[C1] a guest books in one message, confirms, and admins see it as an assistant booking", async ({ request }) => {
  expectResult("Read-back of 4 guests, Branch 1, Main Dining Hall, 19:30; confirm returns an RSV code; admin log shows source AGENT for that email");
  const email = newEmail("c1");
  const ask: Turn[] = [{ role: "user", content: `Please book a table for 4 at Branch 1 in the Main Dining Hall on ${inDays(21)} at 19:30.` }];
  const first = await chat(request, email, ask);
  expect(first.pendingBooking?.draft).toMatchObject({ branch: "BRANCH_1", sector: "MAIN_HALL", date: inDays(21), startTime: "19:30", partySize: 4 });
  const done = await chat(request, email, [...ask, { role: "assistant", content: first.reply }, { role: "user", content: "Yes, book it." }], first.pendingBooking);
  expect(done.booking?.code).toMatch(/^RSV-[A-Z0-9]{6}$/);
  const admin = await apiLogin(request, TEST_DATA.admin);
  const log = await (await request.get(`${URLS.api}/api/admins/reservations?q=${email}`, { headers: admin })).json();
  expect(log.items[0]).toMatchObject({ code: done.booking?.code, source: "AGENT" });
  actualResult(`Booked ${done.booking?.code}; admin log source=${log.items[0].source}`);
});

test("[C5] a guest asks what's free and gets a plain answer", async ({ request }) => {
  expectResult("A plain-sentence answer naming at least one sitting time; no draft, no refusal");
  const res = await chat(request, newEmail("c5"), [{ role: "user", content: `Which sittings still have space at Branch 1 in the Main Dining Hall on ${inDays(22)}?` }]);
  expect(res.status).toBe(200);
  expect(res.reply).not.toBe(REFUSAL);
  expect(res.reply).toMatch(/11:00|13:30|17:00|19:30/);
  expect(res.pendingBooking).toBeUndefined();
  expect(res.reply).not.toMatch(/\|.*\||—/);
});

test("[C7] a missing detail is asked for, then the booking is drafted", async ({ request }) => {
  expectResult("First reply asks for the missing branch/room (no draft); after answering, a draft for Branch 1 Main Dining Hall");
  const email = newEmail("c7");
  const first: Turn[] = [{ role: "user", content: `I'd like a table for 2 people on ${inDays(23)} at 19:30.` }];
  const q = await chat(request, email, first);
  expect(q.pendingBooking).toBeUndefined();
  expect(q.reply).not.toBe(REFUSAL);
  const a = await chat(request, email, [...first, { role: "assistant", content: q.reply }, { role: "user", content: "Branch 1, Main Dining Hall please." }]);
  expect(a.pendingBooking?.draft).toMatchObject({ branch: "BRANCH_1", sector: "MAIN_HALL", date: inDays(23), startTime: "19:30", partySize: 2 });
});

test("[T3] 'tomorrow' is worked out from the restaurant's date", async ({ request }) => {
  expectResult(`Draft date is ${inDays(1)} (tomorrow in UTC+7)`);
  const res = await chat(request, newEmail("t3"), [{ role: "user", content: "A table for 3 at Branch 2, Main Dining Hall, tomorrow at 17:00." }]);
  expect(res.pendingBooking?.draft).toMatchObject({ date: inDays(1), startTime: "17:00", partySize: 3, branch: "BRANCH_2", sector: "MAIN_HALL" });
});

test("[F1] a party over 50 is explained, not drafted", async ({ request }) => {
  expectResult("Reply explains the 50-guest limit; no draft");
  const res = await chat(request, newEmail("f1"), [{ role: "user", content: `Book Branch 1 Main Dining Hall for 60 people on ${inDays(24)} at 19:30.` }]);
  expect(res.pendingBooking).toBeUndefined();
  expect(res.reply).toMatch(/50/);
});

test("[F2] a full sitting gets real alternatives", async ({ request }) => {
  expectResult("All 4 VIP rooms at Branch 2 19:30 are taken first; the assistant offers alternatives, none of them that sitting");
  const filler = await apiRegister(request, newEmail("f2-filler"));
  const date = inDays(25);
  expect((await request.post(`${URLS.api}/api/users/reservations`, { headers: filler, data: { branch: "BRANCH_2", sector: "VIP_WING", date, startTime: "19:30", partySize: 50 } })).status()).toBe(201);
  const res = await chat(request, newEmail("f2"), [{ role: "user", content: `A private VIP room for 10 people at Branch 2 on ${date} at 19:30, please.` }]);
  expect(res.pendingBooking).toBeUndefined();
  expect(res.alternatives?.length ?? 0).toBeGreaterThan(0);
  for (const alt of res.alternatives ?? []) expect(`${alt.draft.branch} ${alt.draft.sector} ${alt.draft.date} ${alt.draft.startTime}`).not.toBe(`BRANCH_2 VIP_WING ${date} 19:30`);
  actualResult(`Alternatives: ${(res.alternatives ?? []).map((a) => `${a.draft.branch} ${a.draft.sector} ${a.draft.date} ${a.draft.startTime}`).join("; ")}`);
});

test("[F14] an email that hasn't signed up can't get a second assistant booking", async ({ request }) => {
  expectResult(`Second request is answered with: "${ONE_BOOKING}"`);
  const email = newEmail("f14");
  const agent = agentHeaders();
  // First booking through the assistant's real API route (no AI call needed to set up).
  expect((await request.post(`${URLS.api}/api/agents/reservations`, { headers: agent, data: { email, branch: "BRANCH_1", sector: "MAIN_HALL", date: inDays(26), startTime: "11:00", partySize: 2 } })).status()).toBe(201);
  const res = await chat(request, email, [{ role: "user", content: `Book another table for 2 at Branch 1 Main Dining Hall on ${inDays(27)} at 13:30.` }]);
  expect(res.pendingBooking).toBeUndefined();
  expect(res.reply).toContain("sign up with this email in the app, cancel that booking there");
});
