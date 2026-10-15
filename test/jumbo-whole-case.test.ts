import { test } from "node:test";
import assert from "node:assert/strict";
import { wholeCase } from "../src/ingest/readers/jumbo.ts";

/**
 * Jumbo sells some cases under one unit's title (#37); which Unit Price such
 * a pack is compared on is in test/unit-price.test.ts. Each figure below is a
 * real row from the Jumbo sweep of 2026-10-14: title, price, pricePerUnit.
 */

test("a box priced whole but titled as one unit is that many units", () => {
  // 47868DSL "Arla Bio Halfvolle Melk 1 L": €10.74 at €1.79 a litre.
  assert.deepEqual(wholeCase({ quantity: 1, unit: "l" }, 179, "l", 1074), { quantity: 6, unit: "l" });
  // 720069TRL "Jumbo's Lungo Originale Koffiecups - 4 x 40 Stuks": €37.96 at €0.24 a cup.
  assert.deepEqual(wholeCase({ quantity: 40, unit: "piece" }, 24, "piece", 3796), { quantity: 160, unit: "piece" });
});

test("a pack that is what its title says is left alone", () => {
  // 751918PAK "Halfvolle Melk 1 L": €0.85 at €0.85 a litre.
  assert.deepEqual(wholeCase({ quantity: 1, unit: "l" }, 85, "l", 85), { quantity: 1, unit: "l" });
});

test("a jar priced per drained kilo is left as titled", () => {
  // 302282POT "Jumbo Doperwten 680 g": €0.93 at €2.04 a kilo drained.
  assert.deepEqual(wholeCase({ quantity: 0.68, unit: "kg" }, 204, "kg", 93), { quantity: 0.68, unit: "kg" });
});

test("a unit price in another unit than the pack's says nothing about the pack", () => {
  assert.deepEqual(wholeCase({ quantity: 0.32, unit: "kg" }, 25, "piece", 199), { quantity: 0.32, unit: "kg" });
});
