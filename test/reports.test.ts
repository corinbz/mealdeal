import { test } from "node:test";
import assert from "node:assert/strict";
import { handleReport, MAX_BODY, RATE_LIMIT, readReport, type ReportBucket } from "../functions/api/report.ts";
import { groupReports, reportsMarkdown, type Stored } from "../src/reports/group.ts";

/**
 * "Klopt niet" (#38): a report is checked and capped before it is stored,
 * an address is rate-limited by a salted hash and never stored, and the
 * reports read back grouped by Product.
 */

function bucket() {
  const objects = new Map<string, string>();
  const b: ReportBucket = {
    async put(key, value) { objects.set(key, value); },
    async list({ prefix, limit }) { return { objects: [...objects.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit) }; },
  };
  return { b, objects };
}
const good = {
  what: "verkeerd product", chain: "jumbo", ref: "jumbo-123", name: "Jumbo Gehakt 500 g", ingredient: "gehakt", variant: null,
  cents: 499, observedAt: "2026-10-14", context: "Vergelijk · 500 g gehakt", note: "Dit is half-om-half",
};
const post = (body: unknown, ip = "203.0.113.7") => new Request("https://x/api/report", {
  method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "cf-connecting-ip": ip, "content-type": "application/json" },
});
const now = new Date("2026-10-15T09:30:00Z");

test("a report is stored with what the page filled in, and no address", async () => {
  const { b, objects } = bucket();
  const res = await handleReport(post(good), { REPORTS: b }, now);
  assert.equal(res.status, 201);
  const [key, value] = [...objects][0]!;
  assert.match(key!, /^reports\/2026-10-15\/09-[0-9a-f]{16}-[0-9a-f-]{36}\.json$/);
  const stored = JSON.parse(value!);
  assert.deepEqual(stored, { receivedAt: now.toISOString(), ...good, lang: "nl" });
  assert.ok(!value!.includes("203.0.113.7") && !key!.includes("203.0.113.7"));
});

test("anything not a report is refused, and nothing stored", async () => {
  const { b, objects } = bucket();
  for (const body of ["{", { ...good, what: "spam" }, { ...good, chain: "../x" }, { ...good, cents: -1 }, { ...good, observedAt: "gisteren" }, { ...good, name: "" }]) {
    assert.equal((await handleReport(post(body), { REPORTS: b }, now)).status, 400, JSON.stringify(body));
  }
  assert.equal((await handleReport(post({ ...good, note: "x".repeat(MAX_BODY) }), { REPORTS: b }, now)).status, 413);
  assert.equal(objects.size, 0);
  assert.equal((await handleReport(post(good), {}, now)).status, 503, "no bucket bound: says so");
});

test("long text is cut, not refused", () => {
  const r = readReport({ ...good, note: "a".repeat(900), context: "b".repeat(400) });
  assert.ok(typeof r !== "string");
  assert.equal(r.note.length, 500);
  assert.equal(r.context.length, 300);
});

test("one address may send so many an hour; another is not held up by it", async () => {
  const { b } = bucket();
  for (let i = 0; i < RATE_LIMIT; i++) assert.equal((await handleReport(post(good), { REPORTS: b }, now)).status, 201);
  assert.equal((await handleReport(post(good), { REPORTS: b }, now)).status, 429);
  assert.equal((await handleReport(post(good, "198.51.100.1"), { REPORTS: b }, now)).status, 201);
  assert.equal((await handleReport(post(good), { REPORTS: b }, new Date("2026-10-15T10:01:00Z"))).status, 201, "a new hour");
});

test("reports read back grouped by Product, the most reported first", () => {
  const r = (over: Partial<Stored>): Stored => ({ ...(good as unknown as Stored), receivedAt: "2026-10-15T09:00:00Z", ...over });
  const groups = groupReports([
    r({ ref: "jumbo-1", name: "Melk", what: "prijs klopt niet", note: "" }),
    r({ receivedAt: "2026-10-15T10:00:00Z" }),
    r({ what: "prijs klopt niet", note: "" }),
  ]);
  assert.deepEqual(groups.map((g) => [g.ref, g.reports.length, g.what]), [
    ["jumbo-123", 2, { "verkeerd product": 1, "prijs klopt niet": 1 }],
    ["jumbo-1", 1, { "prijs klopt niet": 1 }],
  ]);
  const md = reportsMarkdown(groups, "2026-10-08");
  assert.match(md, /3 reports on 2 Products/);
  assert.match(md, /“Dit is half-om-half”/);
  assert.equal(reportsMarkdown([], "2026-10-08").trim().endsWith("None."), true);
});

test("a report from a page in English says so, and an unknown language reads as Dutch", () => {
  assert.equal((readReport({ ...good, lang: "en" }) as { lang: string }).lang, "en");
  assert.equal((readReport({ ...good, lang: "<script>" }) as { lang: string }).lang, "nl");
  const r = (over: Partial<Stored>): Stored => ({ ...(good as unknown as Stored), receivedAt: "2026-10-15T09:00:00Z", lang: "nl", ...over });
  const md = reportsMarkdown(groupReports([r({ lang: "en", context: "Compare · 500 g ground beef", note: "This is mixed" }), r({})]), "2026-10-08");
  assert.match(md, /\[EN\] Compare · 500 g ground beef/);
  assert.match(md, /\[EN\] “This is mixed” “Dit is half-om-half”/);
});
