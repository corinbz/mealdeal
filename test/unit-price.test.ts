import { test } from "node:test";
import assert from "node:assert/strict";
import { followsFromPack, isApproximate, looksDrained, unitPriceOf } from "../src/ingest/unit-price.ts";

/**
 * Which Unit Price a Product is compared on, for every Chain
 * (src/ingest/unit-price.ts). Each case is a real row from a sweep of
 * 2026-10-14: the Chain, its reference and title, the price and the Chain's
 * own figure.
 */

const kg = (quantity: number) => ({ quantity, unit: "kg" as const });
const chain = (cents: number, unit: "kg" | "l" | "piece" | null, ofCents: number) => ({ cents, unit, ofCents });
const ours = (unitPriceCents: number, comparisonUnit = "kg") => ({ unitPriceCents, comparisonUnit, unitPriceSource: "derived" });
const theirs = (unitPriceCents: number, comparisonUnit: string | null = "kg") => ({ unitPriceCents, comparisonUnit, unitPriceSource: "chain" });

test("a Chain's figure that follows from its pack is taken as it is", () => {
  // Jumbo 751918PAK "Halfvolle Melk 1 L": €0.85 at €0.85 a litre.
  assert.deepEqual(unitPriceOf(85, { quantity: 1, unit: "l" }, chain(85, "l", 85)), theirs(85, "l"));
  // Within 10%: rounding, or a pack a little over its stated weight.
  assert.deepEqual(unitPriceOf(199, kg(0.4), chain(520, "kg", 199)), theirs(520));
});

test("a figure per drained kilo gives way to the whole pack's, as the owner chose (#37)", () => {
  // Jumbo 302282POT "Jumbo Doperwten 680 g": €0.93 at €2.04 a kilo drained.
  assert.deepEqual(unitPriceOf(93, kg(0.68), chain(204, "kg", 93), { packFromTitle: true }), ours(137));
});

test("a pack read out of a title is our reading, so a Chain's figure far off it stands", () => {
  // Jumbo "Conimex Noodles Volkoren 12 x 250 g": €3.49 for one 250 g pack, €13.96 a kilo.
  assert.deepEqual(unitPriceOf(349, kg(3), chain(1396, "kg", 349), { packFromTitle: true }), theirs(1396));
  // Jumbo "Pedigree Dentastix Light 3-10kg met Kalkoen 7 Stuks": the dog's weight, not the pack's.
  assert.deepEqual(unitPriceOf(159, kg(10), chain(2741, "kg", 159), { packFromTitle: true }), theirs(2741));
  // Jumbo 747038KGR "Cheddar Kaas ca. 125 g": €3.98 at €26.54 a kilo, below the title's; weighed.
  assert.deepEqual(unitPriceOf(398, kg(0.125), chain(2654, "kg", 398), { packFromTitle: true }), theirs(2654));
});

test("Aldi's slips give way to the pack's arithmetic", () => {
  // 1219201 "Nederlandse aardbeien, 400 g": €2.99, Aldi says €11.96 a kilo, as if 250 g.
  assert.deepEqual(unitPriceOf(299, kg(0.4), chain(1196, "kg", 299)), ours(748));
  // 1225177 "3-pack crackers, 3x75 g": €1.39, Aldi says €18.53 a kilo, one pack's.
  assert.deepEqual(unitPriceOf(139, kg(0.225), chain(1853, "kg", 139)), ours(618));
  // A pack's price as the kilo's: "Varkenshaas, ca. 500 g, 6,00, 6,00 per kg".
  assert.deepEqual(unitPriceOf(600, kg(0.5), chain(600, "kg", 600), { approximate: true }), ours(1200));
  // A factor of a thousand: "200 g, 1,95, 1950,00 per kg".
  assert.deepEqual(unitPriceOf(195, kg(0.2), chain(195000, "kg", 195), { approximate: true }), ours(975));
});

test("a weighed pack keeps the Chain's figure, its weight only roughly stated", () => {
  // Aldi 1226434 spareribs, "ca. 500 g" at €4.99, €9.98 a kilo.
  assert.deepEqual(unitPriceOf(499, kg(0.5), chain(998, "kg", 499), { approximate: true }), theirs(998));
  assert.equal(isApproximate("circa 1 kg"), true);
  assert.equal(isApproximate("Calvé Pindakaas 350 g"), false);
});

test("a figure on the Shelf Price gives way to the pack under an Offer, and is scaled where there is none", () => {
  // Hoogvliet "Earl grey zwarte thee, 20 Stuks": €1.99, on Offer at €1.29, Hoogvliet says €0.10 a bag.
  assert.deepEqual(unitPriceOf(129, { quantity: 20, unit: "piece" }, chain(10, "piece", 199)), ours(6, "piece"));
  // No pack: €2.50 a kilo on a €1.25 Shelf Price, on Offer at €1.00.
  assert.deepEqual(unitPriceOf(100, null, chain(250, "kg", 125)), ours(200));
});

test("by weight or volume whenever one is known, by the piece only when none is (#3)", () => {
  // Jumbo "Tortilla Wraps 8 Stuks 320 g" at €1.99, Jumbo says €0.25 a piece.
  assert.deepEqual(unitPriceOf(199, kg(0.32), chain(25, "piece", 199), { packFromTitle: true }), ours(622));
  // A single piece at its own price is the Chain's figure.
  assert.deepEqual(unitPriceOf(95, { quantity: 1, unit: "piece" }, chain(95, "piece", 95)), theirs(95, "piece"));
});

test("a pack's price given as each piece's is shared among the pieces", () => {
  // Jumbo 435167STK "Jumbo Biologisch Paprika Duo 2 Stuks": €2.99 at "€2.99 per piece".
  assert.deepEqual(unitPriceOf(299, { quantity: 2, unit: "piece" }, chain(299, "piece", 299), { packFromTitle: true }), ours(150, "piece"));
});

test("with no figure of the Chain's, the pack's; with neither, none", () => {
  assert.deepEqual(unitPriceOf(199, kg(0.5), null), ours(398));
  assert.deepEqual(unitPriceOf(199, null, null), { unitPriceCents: null, comparisonUnit: null, unitPriceSource: null });
  // A figure whose unit the Chain left out is kept, compared with nothing.
  assert.deepEqual(unitPriceOf(199, null, chain(398, null, 199)), theirs(398, null));
});

test("the self-check measures with the same yardstick", () => {
  assert.equal(followsFromPack(520, 199, 0.4), true);
  assert.equal(followsFromPack(1196, 299, 0.4), false);
  // Within 2 cents always follows: a tissue at 0.3 cents a piece shown as 0.
  assert.equal(followsFromPack(0, 30, 100), true);
  assert.equal(looksDrained(204, 93, 0.68), true);
  assert.equal(looksDrained(85, 85, 1), false);
});
