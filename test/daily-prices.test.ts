import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyPrices, perUnit, SHOWN_DAYS } from "../src/catalogue/daily.ts";
import type { PriceHistory } from "../src/catalogue/history.ts";

/**
 * The per-Product series an Ingredient's Daily Price is drawn from (#16). Each
 * day is the price paid for a pack, put per unit of the Ingredient; a day not
 * observed stays a gap.
 */

const history = (dates: string[], days: (number | [number] | null)[]): PriceHistory => ({ dates, chains: { dirk: { a: days } } });
const basis = { ref: "a", ingredientPack: 0.5, ingredientUnitPriceCents: 798, paidTodayCents: 399 };

test("a pack price becomes a price per unit, by the pack size when known", () => {
  assert.equal(perUnit(399, basis), 798);
  // Without a pack size, today's ratio between the two is used.
  assert.equal(perUnit(300, { ...basis, ingredientPack: null }), 600);
});

test("an Offer day stays marked, and a day not observed stays a gap", () => {
  const out = dailyPrices(history(["2026-10-12", "2026-10-13", "2026-10-14"], [399, null, [349]]), { dirk: [basis] });
  assert.deepEqual(out.series["dirk"]!["a"], [798, null, [698]]);
});

test("a day the refresh never ran is a gap, not closed up around", () => {
  const out = dailyPrices(history(["2026-10-12", "2026-10-14"], [399, 399]), { dirk: [basis] });
  assert.deepEqual(out.dates, ["2026-10-12", "2026-10-13", "2026-10-14"]);
  assert.deepEqual(out.series["dirk"]!["a"], [798, null, 798]);
});

test("only the last thirty days are shown", () => {
  const dates = Array.from({ length: 45 }, (_, i) => new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10));
  const out = dailyPrices(history(dates, dates.map(() => 399)), { dirk: [basis] });
  assert.equal(out.dates.length, SHOWN_DAYS);
  assert.equal(out.dates.at(-1), dates.at(-1));
});

test("a Product with no history is left out", () => {
  assert.deepEqual(dailyPrices(history(["2026-10-14"], [399]), { dirk: [{ ...basis, ref: "b" }] }).series["dirk"], {});
});
