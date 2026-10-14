import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveUnitPrice,
  endDateOrOpenEnded,
  eurosToCents,
  parseInstant,
  parsePackSize,
} from "../src/ingest/normalise.ts";

/**
 * Pack-size parsing gets its own unit tests, which is the one deliberate
 * exception to testing at the top seam. It is a pure function over strings
 * with a large awkward input space, and enumerating that space through full
 * ingest runs would be clumsy for no benefit. The end-to-end tests still
 * cover it in context.
 *
 * Every input below is a real form seen in archived responses.
 */

test("parses the plain metric forms", () => {
  assert.deepEqual(parsePackSize("500 g"), { quantity: 0.5, unit: "kg" });
  assert.deepEqual(parsePackSize("1 kg"), { quantity: 1, unit: "kg" });
  assert.deepEqual(parsePackSize("2 liter"), { quantity: 2, unit: "l" });
  assert.deepEqual(parsePackSize("300ml"), { quantity: 0.3, unit: "l" });
});

test("reads Dutch decimal commas", () => {
  assert.deepEqual(parsePackSize("1,5 kg"), { quantity: 1.5, unit: "kg" });
  assert.deepEqual(parsePackSize("0,75 liter"), { quantity: 0.75, unit: "l" });
});

test("totals a multipack rather than counting its units", () => {
  assert.deepEqual(parsePackSize("2 x 35 g"), { quantity: 0.07, unit: "kg" });
  // Must be exactly 7.2, not 7.199999999999999.
  assert.deepEqual(parsePackSize("24 x 300ml"), { quantity: 7.2, unit: "l" });
});

test("counts pieces", () => {
  assert.deepEqual(parsePackSize("Per stuk"), { quantity: 1, unit: "piece" });
  assert.deepEqual(parsePackSize("3 Stuks"), { quantity: 3, unit: "piece" });
  assert.deepEqual(parsePackSize("10 stuks"), { quantity: 10, unit: "piece" });
});

test("ignores a parenthetical aside", () => {
  assert.deepEqual(parsePackSize("1 kg (ca. 2 stuks)"), { quantity: 1, unit: "kg" });
});

test("reads a unit with no number as one of it", () => {
  // Plus prices meat by the kilo: "Per kilo" is a stated quantity, unlike
  // "Per schaal".
  assert.deepEqual(parsePackSize("Per kilo"), { quantity: 1, unit: "kg" });
  assert.deepEqual(parsePackSize("Per liter"), { quantity: 1, unit: "l" });
});

test("gives up rather than guessing when no quantity is stated", () => {
  // A container with no quantity. Such a Product is simply not a comparison
  // candidate; assuming "one of something" would invent a Unit Price.
  assert.equal(parsePackSize("Per schaal"), null);
  assert.equal(parsePackSize("Per bos"), null);
  assert.equal(parsePackSize(null), null);
  assert.equal(parsePackSize(""), null);
});

test("derives a unit price in cents", () => {
  assert.equal(deriveUnitPrice(538, { quantity: 0.5, unit: "kg" }), 1076);
  assert.equal(deriveUnitPrice(129, { quantity: 4, unit: "kg" }), 32);
  assert.equal(deriveUnitPrice(100, { quantity: 0, unit: "kg" }), null);
});

test("converts decimal euros to integer cents without drift", () => {
  assert.equal(eurosToCents(1.54), 154);
  assert.equal(eurosToCents(1.0), 100);
  // The classic float case: 0.1 + 0.2 territory.
  assert.equal(eurosToCents(29.97), 2997);
  assert.equal(eurosToCents(null), null);
});

test("parses Jumbo's bracketed timezone, which Date rejects as written", () => {
  const raw = "2026-10-07T00:01:00+02:00[Europe/Amsterdam]";
  assert.equal(Number.isNaN(new Date(raw).getTime()), true, "precondition: Date cannot read it");
  assert.equal(parseInstant(raw)?.toISOString(), "2026-10-06T22:01:00.000Z");
});

test("treats Dirk's far-future end date as open-ended", () => {
  // Storing it as written would make every un-discounted Product look like a
  // twenty-three year promotion.
  assert.equal(endDateOrOpenEnded("2049-12-31T23:59:59.000+01:00"), null);
  assert.equal(
    endDateOrOpenEnded("2026-10-20T23:59:59.000+02:00")?.toISOString(),
    "2026-10-20T21:59:59.000Z",
  );
});
