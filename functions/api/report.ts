/**
 * "Klopt niet" (#38): one report of a wrong price or match, sent from the
 * basket page and kept in the archive's R2 bucket under reports/, where
 * scripts/reports.ts reads them back grouped by Product.
 *
 * No account is needed to report, so this guards itself: a body is at most
 * 4 KB, every field is checked and capped, and one address may send at most
 * RATE_LIMIT an hour. The address itself is never stored: only a hash of it,
 * salted per day, which is what the limit counts by. What is stored is what
 * the page filled in, plus the optional note.
 */

/** The part of Cloudflare's R2 binding this uses. */
export interface ReportBucket {
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  list(options: { prefix: string; limit?: number }): Promise<{ objects: readonly unknown[] }>;
}

export interface Env {
  /** Bound in the deploy (app.yml); absent when the page is served without it. */
  readonly REPORTS?: ReportBucket;
  /** Optional secret, so an address cannot be guessed back from its hash. */
  readonly REPORT_SALT?: string;
}

export const WHAT = ["verkeerd product", "prijs klopt niet", "niet in de winkel", "anders"] as const;
export type What = (typeof WHAT)[number];

export interface Report {
  readonly what: What;
  readonly chain: string;
  readonly ref: string;
  readonly name: string;
  readonly ingredient: string | null;
  readonly variant: string | null;
  /** The price shown, in cents. */
  readonly cents: number | null;
  /** The day the catalogue's prices for that Chain are from. */
  readonly observedAt: string | null;
  /** What the person was doing: the page and view, and the typed item if any. */
  readonly context: string;
  readonly note: string;
  /** The page's language (#25), which `context` and `note` are written in; "nl" from a page that predates it. */
  readonly lang: string;
}

export const MAX_BODY = 4096;
export const RATE_LIMIT = 20;

const str = (v: unknown, max: number): string | null => (typeof v === "string" ? v.trim().slice(0, max) : null);
const strOrNull = (v: unknown, max: number): string | null => (v === null || v === undefined || v === "" ? null : str(v, max));

/** The report in a body, or why it is not one. */
export function readReport(body: unknown): Report | string {
  if (!body || typeof body !== "object") return "not an object";
  const b = body as Record<string, unknown>;
  const what = WHAT.find((w) => w === b["what"]);
  if (!what) return "unknown what";
  const chain = str(b["chain"], 40), ref = str(b["ref"], 120), name = str(b["name"], 200);
  if (!chain || !/^[a-z0-9-]+$/.test(chain)) return "bad chain";
  if (!ref || !name) return "no product";
  const cents = b["cents"] === null || b["cents"] === undefined ? null : b["cents"];
  if (cents !== null && !(typeof cents === "number" && Number.isInteger(cents) && cents >= 0 && cents < 10_000_000)) return "bad cents";
  const observedAt = strOrNull(b["observedAt"], 10);
  if (observedAt !== null && !/^\d{4}-\d{2}-\d{2}$/.test(observedAt)) return "bad observedAt";
  return {
    what, chain, ref, name, cents, observedAt,
    ingredient: strOrNull(b["ingredient"], 60),
    variant: strOrNull(b["variant"], 60),
    context: str(b["context"], 300) ?? "",
    note: str(b["note"], 500) ?? "",
    lang: /^[a-z]{2}$/.test(String(b["lang"] ?? "")) ? String(b["lang"]) : "nl",
  };
}

async function hashOf(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
}

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function handleReport(request: Request, env: Env, now = new Date()): Promise<Response> {
  if (!env.REPORTS) return reply(503, { error: "reports are not stored here" });
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY) return reply(413, { error: "too large" });
  const text = await request.text();
  if (text.length > MAX_BODY) return reply(413, { error: "too large" });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return reply(400, { error: "not JSON" }); }
  const report = readReport(body);
  if (typeof report === "string") return reply(400, { error: report });

  const iso = now.toISOString(), day = iso.slice(0, 10), hour = iso.slice(11, 13);
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const who = await hashOf((env.REPORT_SALT ?? "mealdeal") + day + address);
  // The hour and sender lead the key, so counting an address's hour is one listing.
  const prefix = `reports/${day}/${hour}-${who}-`;
  const sent = await env.REPORTS.list({ prefix, limit: RATE_LIMIT });
  if (sent.objects.length >= RATE_LIMIT) return reply(429, { error: "too many reports this hour" });

  const key = prefix + crypto.randomUUID() + ".json";
  await env.REPORTS.put(key, JSON.stringify({ receivedAt: iso, ...report }), { httpMetadata: { contentType: "application/json" } });
  return reply(201, { ok: true });
}

export const onRequestPost = ({ request, env }: { request: Request; env: Env }) => handleReport(request, env);
