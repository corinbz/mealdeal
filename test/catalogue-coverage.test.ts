import { test } from "node:test";
import assert from "node:assert/strict";
import { assessCoverage, coverageMarkdown, type CoverageCatalogue } from "../src/catalogue/coverage.ts";
import { KNOWN_GAPS } from "../src/catalogue/known-gaps.ts";
import { VOCABULARY } from "../src/ingredients/vocabulary.ts";
import { COLUMNS, toRow } from "../src/catalogue/format.ts";

/**
 * The morning report of Ingredients most Chains sell but one does not (#35):
 * how mapping regressions and new gaps show up the day they happen.
 */

type R = [ref: string, ingredient: string | null, variant?: string | null, price?: number | null];
const row = ([ref, ingredient, variant = null, price = 100]: R) => toRow({ ref, ingredient, variant, ingredientUnitPriceCents: price });

function catalogue(rows: Record<string, R[]>, extra: Partial<CoverageCatalogue> = {}): CoverageCatalogue {
  return {
    chains: Object.keys(rows).map((id) => ({ id, name: id[0]!.toUpperCase() + id.slice(1), offersOnly: id === "lidl" })),
    columns: COLUMNS,
    vocabulary: [
      { id: "melk", variants: [{ id: "halfvol" }, { id: "vol" }] },
      { id: "zure room", variants: [] },
      { id: "saffraan", variants: [] },
    ],
    catalogue: Object.fromEntries(Object.entries(rows).map(([id, rs]) => [id, rs.map(row)])),
    ...extra,
  };
}

// Five Chains sell melk and zure room; saffraan is sold at one only.
const full = (id: string): R[] => [[`${id}1`, "melk", "halfvol"], [`${id}2`, "melk", "vol"], [`${id}3`, "zure room"]];
const FIVE = { dirk: full("d"), jumbo: full("j"), plus: full("p"), vomar: full("v"), aldi: full("a") };

test("lists an Ingredient every other Chain sells", () => {
  const c = assessCoverage(catalogue({ ...FIVE, aldi: [["a1", "melk", "halfvol"], ["a2", "melk", "vol"]] }), null, []);
  assert.deepEqual(c.gaps, [{ ingredient: "zure room", missingAt: ["aldi"], soldAt: 4 }]);
});

test("does not list what too few Chains sell to call it a gap", () => {
  const c = assessCoverage(catalogue({ ...FIVE, dirk: [...full("d"), ["d9", "saffraan"]] }), null, []);
  assert.deepEqual(c.gaps, []);
});

test("does not list a gap known to be real, and says when it no longer is", () => {
  const known = [{ chain: "aldi", ingredient: "zure room", why: "not in the range" }];
  const missing = assessCoverage(catalogue({ ...FIVE, aldi: [["a1", "melk", "halfvol"], ["a2", "melk", "vol"]] }), null, known);
  assert.deepEqual([missing.gaps, missing.stale], [[], []]);
  const sold = assessCoverage(catalogue(FIVE), null, known);
  assert.deepEqual(sold.stale, known);
});

test("lists a missing variant, but not at a Chain missing the whole Ingredient", () => {
  const c = assessCoverage(catalogue({ ...FIVE, dirk: [["d1", "melk", "halfvol"], ["d3", "zure room"]], aldi: [["a3", "zure room"]] }), null, []);
  assert.deepEqual(c.gaps, [
    { ingredient: "melk", missingAt: ["aldi"], soldAt: 4 },
    { ingredient: "melk/vol", missingAt: ["dirk"], soldAt: 3 },
  ]);
});

test("counts only Products comparable in the Ingredient's unit", () => {
  const c = assessCoverage(catalogue({ ...FIVE, aldi: [["a1", "melk", "halfvol"], ["a2", "melk", "vol"], ["a3", "zure room", null, null]] }), null, []);
  assert.deepEqual(c.gaps.map((g) => g.ingredient), ["zure room"]);
});

test("leaves out a Chain that lists only its Offers", () => {
  const c = assessCoverage(catalogue({ ...FIVE, lidl: [["l1", "melk", "vol"]] }), null, []);
  assert.deepEqual(c.gaps, []);
});

test("reports a sharp fall in a Chain's mapped Products since yesterday", () => {
  const today = catalogue({ ...FIVE, jumbo: [["j1", "melk", "halfvol"], ["j2", null], ["j3", null]] });
  const c = assessCoverage(today, catalogue(FIVE), []);
  assert.deepEqual(c.drops, [{ chain: "jumbo", mapped: 1, was: 3 }]);
});

test("lists EAN twins whose Chains map them to different Ingredients", () => {
  const exact = [
    { id: "8710000000001", name: "Twin", members: { dirk: "d1", jumbo: "j3" } },
    { id: "8710000000002", name: "Agreed", members: { dirk: "d2", jumbo: "j2" } },
  ];
  const c = assessCoverage(catalogue(FIVE, { exact }), null, []);
  assert.deepEqual(c.conflicts, [{ id: "8710000000001", name: "Twin", ingredients: { dirk: "melk", jumbo: "zure room" } }]);
  assert.match(coverageMarkdown(c, catalogue(FIVE), null), /Twin \(8710000000001\): Dirk melk, Jumbo zure room/);
});

test("every known gap names a real Chain and Ingredient, and says why", () => {
  const ids = new Set(VOCABULARY.flatMap((d) => [d.id, ...d.variants.map((v) => `${d.id}/${v.id}`)]));
  const chains = new Set(["aldi", "dekamarkt", "dirk", "hoogvliet", "jumbo", "lidl", "plus", "vomar"]);
  for (const k of KNOWN_GAPS) {
    assert.ok(ids.has(k.ingredient), `${k.ingredient} is not in the vocabulary`);
    assert.ok(chains.has(k.chain), `${k.chain} is not a Chain`);
    assert.ok(k.why.length > 10);
  }
});
