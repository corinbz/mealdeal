import { test } from "node:test";
import assert from "node:assert/strict";
import { recordDay, reference, today, type PricedRow, type PriceHistory } from "../src/catalogue/history.ts";

/**
 * Whether an Offer is a real low (#18). The reference is the lowest price of
 * the 30 days before the reduction began, the one EU price-reduction rules
 * use, judged per Product from recorded history only.
 */

const row = (ref: string, shelf: number, offer: number | null = null, wording: string | null = null, upcoming = false): PricedRow =>
  ({ ref, shelfPriceCents: shelf, offerPriceCents: offer, offerWording: wording, offerUpcoming: upcoming });

/** Builds a history day by day from `start`, one row list per day for chain "dirk". */
function days(start: string, perDay: PricedRow[][]): PriceHistory {
  let history: PriceHistory | null = null;
  perDay.forEach((rows, i) => {
    const date = new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
    history = recordDay(history, date, { dirk: rows });
  });
  return history!;
}

test("a day's price is what the page charges: the offer price only while an Offer runs", () => {
  assert.equal(today(row("a", 299)), 299);
  assert.deepEqual(today(row("a", 299, 199)), [199]);
  assert.deepEqual(today(row("a", 299, null, "1+1 gratis")), [299]);
  assert.equal(today(row("a", 299, 199, "25% korting", true)), 299);
});

test("nothing is claimed for a Product with no history", () => {
  const h = days("2026-10-14", [[row("a", 299, 199)]]);
  assert.equal(reference(h, "dirk", "a"), null);
});

test("an Offer below every earlier price is judged against the days recorded so far", () => {
  const h = days("2026-10-01", [
    ...Array.from({ length: 12 }, () => [row("a", 299)]),
    [row("a", 299, 199)],
  ]);
  assert.deepEqual(reference(h, "dirk", "a"), { lowCents: 299, days: 12 });
});

test("an Offer no lower than a recent price says what that price was", () => {
  const h = days("2026-10-01", [[row("a", 249)], [row("a", 299)], [row("a", 299)], [row("a", 299, 249)]]);
  assert.deepEqual(reference(h, "dirk", "a"), { lowCents: 249, days: 3 });
});

test("an earlier Offer counts towards the lowest price", () => {
  const h = days("2026-10-01", [[row("a", 299, 179)], [row("a", 299)], [row("a", 299, 199)]]);
  assert.equal(reference(h, "dirk", "a")!.lowCents, 179);
});

test("the days of the same Offer still running are not its own reference", () => {
  const h = days("2026-10-01", [[row("a", 299)], [row("a", 299, 199)], [row("a", 299, 199)], [row("a", 299, 199)]]);
  assert.deepEqual(reference(h, "dirk", "a"), { lowCents: 299, days: 1 });
});

test("an Offer running since history began has nothing before it to compare with", () => {
  const h = days("2026-10-01", [[row("a", 299, 199)], [row("a", 299, 199)]]);
  assert.equal(reference(h, "dirk", "a"), null);
});

test("the reference covers 30 days at most, and gaps are skipped, not filled", () => {
  const perDay = Array.from({ length: 40 }, (_, i) => [row("a", i === 0 ? 99 : 299)]);
  perDay[30] = []; // not observed that day
  perDay.push([row("a", 299, 249)]);
  const h = days("2026-09-01", perDay);
  // Day 0's 99 is 40 days back, outside the reference period.
  assert.deepEqual(reference(h, "dirk", "a"), { lowCents: 299, days: 30 });
  assert.equal(h.chains["dirk"]!["a"]![h.dates.indexOf("2026-10-01")], null);
});

test("no Offer, no reference", () => {
  const h = days("2026-10-01", [[row("a", 299)], [row("a", 249)]]);
  assert.equal(reference(h, "dirk", "a"), null);
});

test("re-running a day replaces it, and an older day is refused", () => {
  const h = days("2026-10-13", [[row("a", 299)], [row("a", 289)]]);
  const rerun = recordDay(h, "2026-10-14", { dirk: [row("a", 279)] });
  assert.deepEqual(rerun.dates, ["2026-10-13", "2026-10-14"]);
  assert.deepEqual(rerun.chains["dirk"]!["a"], [299, 279]);
  assert.throws(() => recordDay(h, "2026-10-12", { dirk: [] }), /cannot be added/);
});

test("keeps 45 days, and forgets a Product with nothing left in them", () => {
  const perDay = Array.from({ length: 50 }, (_, i) => (i === 0 ? [row("gone", 100), row("a", 299)] : [row("a", 299)]));
  const h = days("2026-08-01", perDay);
  assert.equal(h.dates.length, 45);
  assert.equal(h.chains["dirk"]!["gone"], undefined);
  assert.equal(h.chains["dirk"]!["a"]!.length, 45);
});
