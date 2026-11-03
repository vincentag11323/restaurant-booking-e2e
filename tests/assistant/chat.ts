import { type APIRequestContext, test } from "@playwright/test";
import { URLS } from "../../playwright.config.ts";

export const REFUSAL = "I can only help with table bookings at ResortOS Dining.";

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface Pending {
  draft: { branch: string; sector: string; date: string; startTime: string; partySize: number; specialRequests?: string };
  token: string;
}

export interface ChatReply {
  status: number;
  reply: string;
  pendingBooking?: Pending;
  alternatives?: Pending[];
  booking?: { code: string; tableIds: string[] };
}

/** One real POST /chat. A 503 means Cent AI refused (busy or budget): the test is skipped, not failed (E2E_SPEC.md §5). */
export async function chat(request: APIRequestContext, email: string, messages: Turn[], confirm?: Pending): Promise<ChatReply> {
  const res = await request.post(`${URLS.agent}/chat`, { data: { contact: { email }, messages, ...(confirm ? { confirm } : {}) } });
  const body = await res.json();
  const last = messages.at(-1)?.content ?? "";
  test.info().annotations.push({ type: "transcript", description: `guest: ${confirm ? "[confirms]" : last}\nassistant (${res.status()}): ${body.reply}` });
  if (res.status() === 503) test.skip(true, `AI unavailable: ${body.reply}`);
  return { status: res.status(), ...body };
}
