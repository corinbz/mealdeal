import { test } from "node:test";
import assert from "node:assert/strict";
import { assessSpreads, type CheckedSpread } from "../src/catalogue/spreads.ts";

/**
 * Differences between Chains over 70% are held back until checked (#36):
 * the investigation behind bc251fa found each one a wrong match, a frozen or
 * tinned form, or a unit the Chain got wrong. Bladeren and the morning report
 * both read them from the page's own Resolution.
 */

const COLUMNS = ["ref", "name", "comparisonUnit", "shelfPriceCents", "offerPriceCents", "unitPriceCents", "packQuantity", "packUnit",
  "ingredient", "variant", "form", "flags", "ingredientUnitPriceCents", "ingredientPack"];
type Row = [ref: string, name: string, shelf: number, offer: number | null];
const row = ([ref, name, shelf, offer]: Row) => [ref, name, "kg", shelf, offer, offer ?? shelf, 1, "kg", "kaas", null, null, 0, offer ?? shelf, 1];

function catalogue(rows: Record<string, Row[]>) {
  return {
    chains: Object.keys(rows).map((id) => ({ id, name: id })),
    columns: COLUMNS,
    vocabulary: [{ id: "kaas", name: "kaas", unit: "kg", also: [], equals: {}, fresh: false, variants: [] }],
    catalogue: Object.fromEntries(Object.entries(rows).map(([id, rs]) => [id, rs.map(row)])),
  };
}

const usual = { jumbo: [["j1", "Jonge kaas", 1000, null]], plus: [["p1", "Jonge kaas", 1100, null]], vomar: [["v1", "Jonge kaas", 1200, null]] } satisfies Record<string, Row[]>;
const slipped = catalogue({ ...usual, aldi: [["a1", "Geraspte kaas", 200, null]] });

test("a difference over 70% is unchecked, and named with its Product", () => {
  const s = assessSpreads(slipped, []);
  assert.deepEqual(s.unchecked.map((u) => [u.kind, u.chain, u.ref, u.ingredient, Math.round(u.share * 100)]), [["spread", "aldi", "a1", "kaas", 81]]);
});

test("a difference of 70% or less is not reported", () => {
  assert.deepEqual(assessSpreads(catalogue({ ...usual, aldi: [["a1", "Jonge kaas", 400, null]] }), []).unchecked, []);
});

test("a checked Product is shown as any other, but not another Product of the same Ingredient", () => {
  const checked: CheckedSpread[] = [{ chain: "aldi", ref: "a1", ingredient: "kaas", why: "test" }];
  assert.deepEqual(assessSpreads(slipped, checked).unchecked, []);
  const other = catalogue({ ...usual, aldi: [["a2", "Kaasblokjes", 150, null]] });
  assert.deepEqual(assessSpreads(other, checked).unchecked.map((u) => u.ref), ["a2"]);
  assert.deepEqual(assessSpreads(other, checked).stale, checked);
});

test("an Offer over 70% below every other Chain is unchecked too", () => {
  const s = assessSpreads(catalogue({ ...usual, dirk: [["d1", "Jonge kaas", 1050, 250]] }), []);
  assert.deepEqual(s.unchecked.map((u) => [u.kind, u.chain, u.ref, u.againstCents]), [["spread", "dirk", "d1", 1050], ["offer", "dirk", "d1", 1000]]);
});
