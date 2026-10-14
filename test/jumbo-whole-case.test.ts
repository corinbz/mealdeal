import { test } from "node:test";
import assert from "node:assert/strict";
import { drained, wholeCase } from "../src/ingest/readers/jumbo.ts";

/**
 * Jumbo sells some cases under one unit's title, and prices tins per drained
 * kilo (#37). Each figure below is a real row from the Jumbo sweep of
 * 2026-10-14: title, price, pricePerUnit.
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

test("a figure per drained kilo gives way to the whole pack's, as the owner chose", () => {
  // 302282POT "Jumbo Doperwten 680 g": €0.93 at €2.04 a kilo drained.
  assert.equal(drained(204, "kg", { quantity: 0.68, unit: "kg" }, 93), true);
  // 747038KGR "Jumbo West Country Farmhouse Cheddar Kaas ca. 125 g": weighed, so below the title's; Jumbo's stands.
  assert.equal(drained(2654, "kg", { quantity: 0.125, unit: "kg" }, 398), false);
  // 751918PAK "Halfvolle Melk 1 L": as titled.
  assert.equal(drained(85, "l", { quantity: 1, unit: "l" }, 85), false);
});
